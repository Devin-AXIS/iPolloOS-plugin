declare module 'decompress' {
  export type DecompressFile = {
    path: string;
    type?: 'file' | 'directory';
    data?: Buffer | Uint8Array;
  };

  export default function decompress(input: Buffer | Uint8Array): Promise<DecompressFile[]>;
}
