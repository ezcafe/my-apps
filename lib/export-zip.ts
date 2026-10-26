/**
 * Minimal ZIP (STORE only) for feature Export-all / Import-all.
 * No compression — CSVs stay readable and size-capped before packing.
 */

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export type ZipEntry = { name: string; data: Uint8Array };

/** Build an uncompressed ZIP archive. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const localHeader = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);
    localParts.push(localHeader, entry.data);

    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    centralParts.push(central);
    offset += localHeader.length + entry.data.length;
  }

  const centralDir = concat(centralParts);
  const local = concat(localParts);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(local.length),
    u16(0),
  ]);
  return concat([local, centralDir, end]);
}

function readU16(buf: Uint8Array, i: number): number {
  return buf[i]! | (buf[i + 1]! << 8);
}

function readU32(buf: Uint8Array, i: number): number {
  return (
    buf[i]! |
    (buf[i + 1]! << 8) |
    (buf[i + 2]! << 16) |
    (buf[i + 3]! << 24)
  ) >>> 0;
}

/** List STORE entries from a ZIP (deflated entries are skipped with empty data). */
export function readZip(buf: Uint8Array): ZipEntry[] {
  // Find EOCD
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (readU32(buf, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Invalid ZIP: missing end of central directory");

  const count = readU16(buf, eocd + 10);
  let cdOffset = readU32(buf, eocd + 16);
  const out: ZipEntry[] = [];

  for (let n = 0; n < count; n++) {
    if (readU32(buf, cdOffset) !== 0x02014b50) {
      throw new Error("Invalid ZIP: bad central directory");
    }
    const method = readU16(buf, cdOffset + 10);
    const compSize = readU32(buf, cdOffset + 20);
    const nameLen = readU16(buf, cdOffset + 28);
    const extraLen = readU16(buf, cdOffset + 30);
    const commentLen = readU16(buf, cdOffset + 32);
    const localOff = readU32(buf, cdOffset + 42);
    const name = new TextDecoder().decode(
      buf.subarray(cdOffset + 46, cdOffset + 46 + nameLen),
    );
    cdOffset += 46 + nameLen + extraLen + commentLen;

    if (readU32(buf, localOff) !== 0x04034b50) {
      throw new Error(`Invalid ZIP local header for ${name}`);
    }
    const localNameLen = readU16(buf, localOff + 26);
    const localExtra = readU16(buf, localOff + 28);
    const dataStart = localOff + 30 + localNameLen + localExtra;
    const data =
      method === 0
        ? buf.subarray(dataStart, dataStart + compSize)
        : new Uint8Array(0);
    if (method !== 0) {
      throw new Error(`ZIP entry ${name} uses compression; only STORE is supported`);
    }
    out.push({ name, data: new Uint8Array(data) });
  }
  return out;
}

export function zipResponse(filename: string, zip: Uint8Array): Response {
  return new Response(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
