// src/utils/snapshot.ts
import * as pako from "pako";

export function compressSnapshot(html: string): string {
  const utf8 = new TextEncoder().encode(html);
  const compressed = pako.gzip(utf8);
  return btoa(String.fromCharCode(...compressed));
}

export function decompressSnapshot(base64: string): string {
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const decompressed = pako.ungzip(binary);
  return new TextDecoder().decode(decompressed);
}