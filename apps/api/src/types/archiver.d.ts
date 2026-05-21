declare module 'archiver' {
  import { Transform } from 'stream';

  export interface ZipOptions {
    zlib?: { level?: number };
    comment?: string;
    forceLocalTime?: boolean;
    forceZip64?: boolean;
    store?: boolean;
  }

  export interface EntryData {
    name: string;
    date?: Date | string;
    mode?: number;
    prefix?: string;
    stats?: unknown;
  }

  export class Archiver extends Transform {
    append(source: Buffer | NodeJS.ReadableStream | string, data: EntryData): this;
    finalize(): Promise<void>;
    abort(): void;
    pointer(): number;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ZipOptions);
  }

  export class TarArchive extends Archiver {
    constructor(options?: Record<string, unknown>);
  }

  export class JsonArchive extends Archiver {
    constructor(options?: Record<string, unknown>);
  }
}
