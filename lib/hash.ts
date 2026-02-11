// SHA-256 hashing with universal runtime support (browser via SubtleCrypto,
// Node.js via crypto module). Returns a 0x-prefixed hex string.

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const sha256Hex = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return `0x${toHex(digest)}`;
  }
  const { createHash } = await import('crypto');
  return `0x${createHash('sha256').update(data).digest('hex')}`;
};
