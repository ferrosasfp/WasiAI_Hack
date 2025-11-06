export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function importRawKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export async function exportRawKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

export function randomIv(bytes = 12): Uint8Array {
  const iv = new Uint8Array(bytes);
  crypto.getRandomValues(iv);
  return iv;
}

export async function encryptAESGCM(plain: Uint8Array, key: CryptoKey, iv?: Uint8Array): Promise<{ iv: Uint8Array; cipher: Uint8Array }>{
  const ivUse = iv ?? randomIv();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivUse as unknown as BufferSource },
    key,
    (plain as unknown) as BufferSource,
  );
  return { iv: ivUse, cipher: new Uint8Array(cipherBuf) };
}

export async function decryptAESGCM(cipher: Uint8Array, key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    (cipher as unknown) as BufferSource,
  );
  return new Uint8Array(buf);
}

export function toBase64(u8: Uint8Array): string {
  if (typeof window === 'undefined') return Buffer.from(u8).toString('base64');
  let s = '';
  u8.forEach((b) => (s += String.fromCharCode(b)));
  // btoa expects Latin1
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  if (typeof window === 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
