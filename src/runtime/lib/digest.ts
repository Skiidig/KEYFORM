/** Small digest helpers used by the versioned asset/mapping verification path. */
export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Copy into a plain ArrayBuffer so the WebCrypto BufferSource type is exact.
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
