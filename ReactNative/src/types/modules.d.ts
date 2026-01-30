// Déclarations de types pour les modules sans types

declare module 'pako' {
  export function deflate(data: string | Uint8Array, options?: { level?: number }): Uint8Array;
  export function inflate(data: Uint8Array, options?: { to?: string }): string | Uint8Array;
}

declare module 'buffer' {
  export class Buffer {
    static from(data: string | Uint8Array, encoding?: string): Buffer;
    toString(encoding?: string): string;
  }
}
