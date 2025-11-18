import { SuiObjectData } from '@mysten/sui/client';
import { AIModel, ModelMetadata } from './types';
import { bytesToHex } from '@noble/hashes/utils';

// Parser: Convertir SuiObjectData a AIModel
export function parseAIModel(data: SuiObjectData): AIModel | null {
  if (!data.content || data.content.dataType !== 'moveObject') {
    return null;
  }
  
  type RawFields = {
    name?: unknown;
    description?: unknown;
    ipfs_hash?: unknown;
    price?: unknown;
    owner?: unknown;
    is_listed?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
  };
  const fields = data.content.fields as unknown as RawFields;
  const name = typeof fields.name === 'string' ? fields.name : '';
  const description = typeof fields.description === 'string' ? fields.description : '';
  const ipfsHash = typeof fields.ipfs_hash === 'string' ? fields.ipfs_hash : '';
  const priceNumber =
    typeof fields.price === 'number'
      ? fields.price
      : typeof fields.price === 'string'
        ? parseInt(fields.price, 10)
        : 0;
  const owner = typeof fields.owner === 'string' ? fields.owner : '';
  const isListed = typeof fields.is_listed === 'boolean' ? fields.is_listed : false;
  const createdAt =
    typeof fields.created_at === 'number'
      ? fields.created_at
      : typeof fields.created_at === 'string'
        ? parseInt(fields.created_at, 10)
        : 0;
  const updatedAt =
    typeof fields.updated_at === 'number'
      ? fields.updated_at
      : typeof fields.updated_at === 'string'
        ? parseInt(fields.updated_at, 10)
        : 0;
  
  return {
    id: data.objectId,
    name,
    description,
    ipfs_hash: ipfsHash,
    price: priceNumber,
    owner,
    is_listed: isListed,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

// Parser: Convertir array de SuiObjectData a array de AIModel
export function parseAIModels(dataArray: SuiObjectData[]): AIModel[] {
  return dataArray
    .map(parseAIModel)
    .filter((model): model is AIModel => model !== null);
}

// Parser: Extraer metadata de IPFS hash (si está en formato JSON)
export function parseModelMetadata(metadataString: string): ModelMetadata | null {
  try {
    const metadata = JSON.parse(metadataString);
    return {
      name: metadata.name || '',
      description: metadata.description || '',
      framework: metadata.framework || 'unknown',
      version: metadata.version || '1.0.0',
      tags: metadata.tags || [],
      license: metadata.license || 'MIT',
      author: metadata.author || 'Anonymous',
    };
  } catch (error) {
    console.error('Error parsing metadata:', error);
    return null;
  }
}

// Helper: Formatear precio de MIST a SUI
export function formatPrice(mist: number): string {
  const sui = mist / 1_000_000_000;
  return sui.toFixed(4);
}

// Helper: Convertir SUI a MIST
export function suiToMist(sui: number): number {
  return Math.floor(sui * 1_000_000_000);
}

// Helper: Formatear timestamp
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper: Truncar dirección
export function truncateAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2 + 2) {
    return address;
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Helper: Truncar hash IPFS
export function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2) {
    return hash;
  }
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

// ============================================
// BCS DECODERS (get_model_info_ex)
// ============================================

export type ModelInfoEx = {
  owner: string; // 0x...
  creator: string; // 0x...
  royalty_bps: bigint;
  listed: boolean;
  price_perpetual: bigint;
  price_subscription: bigint;
  default_duration_days: bigint;
  delivery_rights_default: number;
  delivery_mode_hint: number;
  version: number;
  terms_hash: Uint8Array;
};

function readU64LE(view: DataView, offset: number): { value: bigint; next: number } {
  const lo = view.getUint32(offset, true);
  const hi = view.getUint32(offset + 4, true);
  const value = (BigInt(hi) << 32n) + BigInt(lo);
  return { value, next: offset + 8 };
}

function readU16LE(view: DataView, offset: number): { value: number; next: number } {
  const value = view.getUint16(offset, true);
  return { value, next: offset + 2 };
}

function readBool(view: DataView, offset: number): { value: boolean; next: number } {
  const b = view.getUint8(offset);
  return { value: b === 1, next: offset + 1 };
}

function readULEB128(buf: Uint8Array, offset: number): { value: number; next: number } {
  let result = 0;
  let shift = 0;
  let i = offset;
  while (i < buf.length) {
    const byte = buf[i];
    result |= (byte & 0x7f) << shift;
    i++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return { value: result, next: i };
}

export function decodeModelInfoEx(bytes: Uint8Array): ModelInfoEx {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 0;
  // address 32B -> hex 0x...
  const ownerBytes = bytes.slice(o, o + 32); o += 32;
  const creatorBytes = bytes.slice(o, o + 32); o += 32;

  const owner = `0x${bytesToHex(ownerBytes)}`;
  const creator = `0x${bytesToHex(creatorBytes)}`;

  const r1 = readU64LE(view, o); const royalty_bps = r1.value; o = r1.next;
  const b1 = readBool(view, o); const listed = b1.value; o = b1.next;
  const p1 = readU64LE(view, o); const price_perpetual = p1.value; o = p1.next;
  const p2 = readU64LE(view, o); const price_subscription = p2.value; o = p2.next;
  const d1 = readU64LE(view, o); const default_duration_days = d1.value; o = d1.next;
  const delivery_rights_default = view.getUint8(o); o += 1;
  const delivery_mode_hint = view.getUint8(o); o += 1;
  const v1 = readU16LE(view, o); const version = v1.value; o = v1.next;
  const l = readULEB128(bytes, o); const len = l.value; o = l.next;
  const terms_hash = bytes.slice(o, o + len); o += len;

  return {
    owner,
    creator,
    royalty_bps,
    listed,
    price_perpetual,
    price_subscription,
    default_duration_days,
    delivery_rights_default,
    delivery_mode_hint,
    version,
    terms_hash,
  };
}