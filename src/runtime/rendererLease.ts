let releaseCurrent: (() => void) | undefined;

/** Revocation is synchronous so a new station never overlaps an owned renderer. */
export function acquireRendererLease(dispose: () => void): () => void {
  releaseCurrent?.();
  const release = () => {
    if (releaseCurrent !== release) return;
    releaseCurrent = undefined;
    dispose();
  };
  releaseCurrent = release;
  return release;
}
