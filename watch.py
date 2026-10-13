#!/usr/bin/env python3
"""CPU/RAM per ClipPro component (web, main-site, api, worker, beat) incl. child
processes like ffmpeg / Remotion / headless Chrome, plus Docker containers.

Usage: python3 clippro_usage.py [--watch SECONDS]
MEM is macOS "footprint" (what Activity Monitor shows), not raw RSS.
"""
import re, subprocess, sys, time

RULES = [  # (component, regex on command line) — nearest matching ancestor wins
    ("api", r"uvicorn app\.main"),
    ("worker", r"celery .*\bworker\b"),
    ("beat", r"celery .*\bbeat\b"),
    ("web", r"apps/web/"),
    ("main-site", r"apps/main-site/"),
]


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout


def to_mb(s):
    m = re.match(r"([\d.]+)([BKMG]?)", s)
    if not m:
        return 0.0
    n, u = float(m[1]), m[2]
    return n * {"B": 1 / 2**20, "K": 1 / 1024, "M": 1, "G": 1024, "": 1 / 2**20}[u]


def sample():
    procs = {}
    for line in sh("ps", "-axo", "pid=,ppid=,command=").splitlines():
        pid, ppid, cmd = line.strip().split(None, 2) + [""] * (3 - len(line.split(None, 2)))
        procs[int(pid)] = (int(ppid), cmd)
    # 2 samples so CPU% reflects the last second, not a since-boot average
    out = sh("top", "-l", "2", "-s", "1", "-stats", "pid,cpu,mem")
    stats = {}
    for line in out.split("PID")[-1].splitlines()[1:]:
        p = line.split()
        if len(p) >= 3 and p[0].isdigit():
            stats[int(p[0])] = (float(p[1]), to_mb(p[2]))

    memo = {}

    def classify(pid, depth=0):  # nearest ancestor (or self) matching a rule
        if pid not in procs or depth > 64:
            return None
        if pid not in memo:
            c = procs[pid][1]
            memo[pid] = next((n for n, rx in RULES if re.search(rx, c)), None) or classify(procs[pid][0], depth + 1)
        return memo[pid]

    groups = {}
    for pid in procs:
        hit = classify(pid)
        if not hit:
            continue
        root = pid  # top-most ancestor still in the same component
        while classify(procs[root][0]) == hit:
            root = procs[root][0]
        g = groups.setdefault((hit, root), {"cpu": 0.0, "mem": 0.0, "n": 0, "orphan": False})
        cpu, mem = stats.get(pid, (0.0, 0.0))
        g["cpu"] += cpu; g["mem"] += mem; g["n"] += 1
        parent = procs[root][0]
        g["orphan"] = parent == 1 or (procs.get(parent, (0, ""))[1].startswith("uv run") and procs[parent][0] == 1)
    return groups


def report():
    groups = sample()
    print(f"{'COMPONENT':<12}{'ROOT PID':>9}{'PROCS':>7}{'CPU %':>9}{'MEM MB':>10}")
    tc = tm = 0
    for (name, root), g in sorted(groups.items(), key=lambda kv: (kv[0][0], -kv[1]["mem"])):
        flag = "  <- orphaned (parent exited)" if g["orphan"] else ""
        print(f"{name:<12}{root:>9}{g['n']:>7}{g['cpu']:>9.1f}{g['mem']:>10.0f}{flag}")
        tc += g["cpu"]; tm += g["mem"]
    print(f"{'TOTAL':<12}{'':>9}{'':>7}{tc:>9.1f}{tm:>10.0f}")
    d = sh("docker", "stats", "--no-stream", "--format", "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}")
    if d.strip():
        print("\nDOCKER")
        print(d.rstrip())
    print("\n(CPU % is per core: 100 = one full core)")


if __name__ == "__main__":
    if "--watch" in sys.argv:
        every = float(sys.argv[sys.argv.index("--watch") + 1]) if len(sys.argv) > 2 else 3
        while True:
            print("\033[2J\033[H" + time.strftime("%H:%M:%S"))
            report()
            time.sleep(every)
    else:
        report()
