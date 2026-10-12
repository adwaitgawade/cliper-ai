// The workspace the user picked, remembered per browser and sent as X-Workspace-Id.
const STORAGE_KEY = "clippro.workspace";
const listeners = new Set<() => void>();

export function readStoredWorkspace(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage unavailable (private mode): use the personal workspace
  }
}

export function writeStoredWorkspace(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/** For useSyncExternalStore; also follows switches made in other tabs. */
export function subscribeStoredWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
