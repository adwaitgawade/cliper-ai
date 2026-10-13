/**
 * Streaming WSOLA (waveform-similarity overlap-add) time-stretcher.
 *
 * Changes tempo without changing pitch: output frames are taken from the input every `Ha = Hs * tempo`
 * samples and overlap-added every `Hs` samples. Each frame's exact position is nudged (±search) to the
 * spot that best continues the previous frame's waveform, which avoids phasiness and clicks.
 * Works on planar float audio of any channel count; memory stays bounded for arbitrarily long input.
 */
export class TimeStretcher {
  private readonly N: number; // frame length
  private readonly Hs: number; // output hop (N/2, Hann windows sum to 1)
  private readonly Ha: number; // input hop
  private readonly S: number; // search radius
  private readonly win: Float32Array;
  private readonly channels: number;

  private buf: Float32Array[]; // pending input per channel
  private bufStart = 0; // absolute input index of buf[*][0]
  private bufLen = 0;
  private anaPos = 0; // absolute (fractional) input position of the next frame
  private prev = -1; // absolute start of the previously chosen frame
  private tail: Float32Array[]; // second half of the previous windowed frame (to overlap-add)

  constructor(channels: number, sampleRate: number, tempo: number) {
    this.channels = channels;
    this.N = 2 * Math.round(sampleRate * 0.02); // ~40 ms frames
    this.Hs = this.N / 2;
    this.Ha = this.Hs * tempo;
    this.S = Math.round(sampleRate * 0.012); // ±12 ms search
    this.win = new Float32Array(this.N);
    for (let i = 0; i < this.N; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / this.N);
    this.buf = Array.from({ length: channels }, () => new Float32Array(sampleRate));
    this.tail = Array.from({ length: channels }, () => new Float32Array(this.Hs));
  }

  /** Feed planar input; returns whatever output is ready (planar, same channel count). */
  push(planes: Float32Array[]): Float32Array[] {
    this.append(planes);
    return this.drain(false);
  }

  /** Feed silence-padding and return all remaining output. */
  flush(): Float32Array[] {
    const pad = this.N + 2 * this.S;
    this.append(Array.from({ length: this.channels }, () => new Float32Array(pad)));
    return this.drain(true);
  }

  private append(planes: Float32Array[]) {
    const n = planes[0]?.length ?? 0;
    if (this.bufLen + n > this.buf[0].length) {
      const size = Math.max(this.buf[0].length * 2, this.bufLen + n);
      this.buf = this.buf.map((b) => {
        const next = new Float32Array(size);
        next.set(b.subarray(0, this.bufLen));
        return next;
      });
    }
    for (let c = 0; c < this.channels; c++) this.buf[c].set(planes[Math.min(c, planes.length - 1)], this.bufLen);
    this.bufLen += n;
  }

  private drain(final: boolean): Float32Array[] {
    const out: Float32Array[][] = Array.from({ length: this.channels }, () => []);
    const end = this.bufStart + this.bufLen;

    while (Math.round(this.anaPos) + this.S + this.N <= end) {
      const start = this.chooseStart();
      const at = start - this.bufStart;
      for (let c = 0; c < this.channels; c++) {
        const src = this.buf[c];
        const frame = new Float32Array(this.Hs);
        const tail = this.tail[c];
        for (let i = 0; i < this.Hs; i++) frame[i] = tail[i] + src[at + i] * this.win[i];
        for (let i = 0; i < this.Hs; i++) tail[i] = src[at + this.Hs + i] * this.win[this.Hs + i];
        out[c].push(frame);
      }
      this.prev = start;
      this.anaPos += this.Ha;
      this.discardBefore(Math.min(this.prev + this.Hs, Math.round(this.anaPos)) - this.S);
    }

    if (final) for (let c = 0; c < this.channels; c++) out[c].push(this.tail[c].slice());
    return out.map((frames) => {
      const total = frames.reduce((n, f) => n + f.length, 0);
      const joined = new Float32Array(total);
      let o = 0;
      for (const f of frames) {
        joined.set(f, o);
        o += f.length;
      }
      return joined;
    });
  }

  /** Best frame start near anaPos: maximizes correlation with the natural continuation of the previous frame. */
  private chooseStart() {
    const nominal = Math.round(this.anaPos);
    if (this.prev < 0) return Math.max(nominal, this.bufStart);
    const ref = this.prev + this.Hs - this.bufStart;
    const lo = Math.max(nominal - this.S, this.bufStart);
    const hi = nominal + this.S;
    const m = this.buf[0]; // channel 0 is a good enough guide; decimate x4 for speed
    let best = nominal;
    let bestScore = -Infinity;
    for (let cand = lo; cand <= hi; cand += 4) {
      const a = cand - this.bufStart;
      let dot = 0;
      let energy = 1e-9;
      for (let i = 0; i < this.Hs; i += 4) {
        const x = m[a + i];
        dot += x * m[ref + i];
        energy += x * x;
      }
      const score = dot / Math.sqrt(energy);
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }
    return best;
  }

  private discardBefore(abs: number) {
    const drop = Math.min(Math.max(0, abs - this.bufStart), this.bufLen);
    if (drop < 8192) return; // compact in larger steps
    for (const b of this.buf) b.copyWithin(0, drop, this.bufLen);
    this.bufStart += drop;
    this.bufLen -= drop;
  }
}
