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

declare module 'react-native-qrcode-svg' {
  import { Component } from 'react';
  
  interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: any;
    logoSize?: number;
    logoBackgroundColor?: string;
    logoMargin?: number;
    logoBorderRadius?: number;
    quietZone?: number;
    enableLinearGradient?: boolean;
    linearGradient?: string[];
    gradientDirection?: string[];
    ecl?: 'L' | 'M' | 'Q' | 'H';
    getRef?: (ref: any) => void;
    onError?: (error: any) => void;
  }
  
  export default class QRCode extends Component<QRCodeProps> {}
}
