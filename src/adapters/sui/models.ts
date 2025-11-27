// src/adapters/sui/models.ts
import { getSuiClient } from '@/lib/sui';
import { MARKET_ID, MODULES, PACKAGE_ID, FUNCTIONS } from '@/lib/sui/constants';
import type { IModelsService } from '@/domain/models/service';
import type { GetModelsPageParams, ModelInfo, ModelSummary } from '@/domain/models/types';
import { decodeModelInfoEx } from '@/lib/sui/parsers';

function normalizeFields(ff: any): ModelSummary {
  const out: ModelSummary = {
    id: Number(ff?.model_id ?? ff?.id ?? 0),
    owner: typeof ff?.owner === 'string' ? ff.owner : undefined,
    listed: typeof ff?.listed !== 'undefined' ? Boolean(ff.listed) : undefined,
    price_perpetual: ff?.price_perpetual ? Number(ff.price_perpetual) : undefined,
    price_subscription: ff?.price_subscription ? Number(ff.price_subscription) : undefined,
    default_duration_days: ff?.default_duration_days ? Number(ff.default_duration_days) : undefined,
    version: ff?.version ? Number(ff.version) : undefined,
    uri: typeof ff?.uri === 'string' ? ff.uri : undefined,
    slug: typeof ff?.slug === 'string' ? ff.slug : undefined,
    name: typeof ff?.name === 'string' ? ff.name : undefined,
    description: typeof ff?.description === 'string' ? ff.description : undefined,
  };
  return out;
}

async function getModelsParentId(): Promise<string | null> {
  // En este deployment, los Dynamic Fields de modelos cuelgan directamente del MARKET_ID
  try {
    const test = await getSuiClient().getDynamicFields({ parentId: MARKET_ID, limit: 1 });
    if (Array.isArray(test?.data)) return MARKET_ID;
  } catch {}
  return MARKET_ID; // preferir MARKET_ID aunque la lista esté vacía
}

async function fetchModelDFById(id: number): Promise<ModelSummary | null> {
  const client = getSuiClient();
  const modelsTableId = await getModelsParentId();
  if (!modelsTableId) return null;
  const keyType = `${PACKAGE_ID}::${MODULES.MARKETPLACE}::ModelKey`;
  try {
    let obj: any;
    try {
      obj = await (client as any).getDynamicFieldObject({
        parentId: modelsTableId,
        name: {
          type: keyType,
          value: { id: String(id) },
        },
      });
    } catch {
      if (modelsTableId !== MARKET_ID) {
        obj = await (client as any).getDynamicFieldObject({
          parentId: MARKET_ID,
          name: {
            type: keyType,
            value: { id: String(id) },
          },
        });
      } else {
        throw new Error('DF not found');
      }
    }
    const ffAny: any = obj?.data?.content?.fields;
    const ff: any = ffAny?.value?.fields ?? ffAny;
    if (ff) {
      const item = normalizeFields(ff);
      // Forzar el id correcto desde la clave del DF
      item.id = id;
      return item;
    }
  } catch {}
  return null;
}

export function getSuiModelsService(): IModelsService {
  return {
    async getModelsPage({ start, limit, order, listedOnly, q }: GetModelsPageParams): Promise<ModelSummary[]> {
      const client = getSuiClient();
      const all: any[] = [];
      let cursor: string | null = null;
      const byId = new Map<number, ModelSummary>();

      const modelsTableId = await getModelsParentId();
      if (modelsTableId) {
        do {
          try {
            const page = await client.getDynamicFields({ parentId: modelsTableId, limit: 50, cursor: cursor || undefined });
            all.push(...page.data);
            cursor = page.hasNextPage ? page.nextCursor : null;
          } catch {
            if (modelsTableId !== MARKET_ID) {
              const page = await client.getDynamicFields({ parentId: MARKET_ID, limit: 50, cursor: cursor || undefined });
              all.push(...page.data);
              cursor = page.hasNextPage ? page.nextCursor : null;
            } else {
              throw new Error('DF get failed');
            }
          }
        } while (cursor);

        // 1) Agregar todos los IDs desde ModelKey
        for (const f of all) {
          try {
            const t: string | undefined = (f as any)?.name?.type;
            if (!t || !t.toLowerCase().endsWith('::modelkey')) continue;
            const rawId = (f as any)?.name?.value?.id;
            const idNum = Number(rawId);
            if (!Number.isFinite(idNum)) continue;
            if (!byId.has(idNum)) byId.set(idNum, { id: idNum });
          } catch {}
        }

        // 2) Intentar hidratar solo entradas ModelKey
        for (const f of all) {
          try {
            const t: string | undefined = (f as any)?.name?.type;
            if (!t || !t.toLowerCase().endsWith('::modelkey')) continue;
            const rawId = (f as any)?.name?.value?.id;
            const idNum = Number(rawId);
            if (!Number.isFinite(idNum)) continue;
            let obj;
            try {
              obj = await client.getDynamicFieldObject({ parentId: modelsTableId, name: f.name });
            } catch {
              if (modelsTableId !== MARKET_ID) {
                obj = await client.getDynamicFieldObject({ parentId: MARKET_ID, name: f.name });
              } else {
                throw new Error('DF get failed');
              }
            }
            const ffAny: any = (obj as any)?.data?.content?.fields;
            const ff: any = ffAny?.value?.fields ?? ffAny;
            if (!ff) continue;
            const item = normalizeFields(ff);
            // Forzar id correcto desde la clave del DF
            item.id = idNum;
            byId.set(idNum, { ...byId.get(idNum), ...item });
          } catch {}
        }
      }

      // 2) Fallback: owned objects del MARKET (sin filtrar por tipo) y detectar Model por forma
      try {
        let cursor2: string | null = null;
        do {
          const owned = await client.getOwnedObjects({ owner: MARKET_ID, options: { showType: true, showContent: true }, cursor: cursor2 || undefined, limit: 50 });
          for (const o of (owned.data || [])) {
            try {
              const ff: any = (o as any)?.data?.content?.fields;
              if (!ff || typeof ff !== 'object') continue;
              const hasId = typeof ff.id !== 'undefined' || typeof ff.model_id !== 'undefined';
              const hasModelShape = (typeof ff.price_perpetual !== 'undefined' || typeof ff.price_subscription !== 'undefined') && typeof ff.listed !== 'undefined';
              if (!hasId || !hasModelShape) continue;
              const item = normalizeFields(ff);
              if (item.id && !byId.has(item.id)) byId.set(item.id, item);
            } catch {}
          }
          cursor2 = owned.hasNextPage ? (owned.nextCursor || null) : null;
        } while (cursor2);
      } catch {}

      // 1c) Hidratación: para cualquier id con datos incompletos, intentar DF directo
      const idsToHydrate = Array.from(byId.keys());
      const limitConc = 4;
      let idx = 0;
      const runners: Promise<void>[] = [];
      const runOne = async (id: number) => {
        try {
          const got = await fetchModelDFById(id);
          if (got) byId.set(id, { ...byId.get(id), ...got });
        } catch {}
      };
      while (idx < idsToHydrate.length) {
        while (runners.length < limitConc && idx < idsToHydrate.length) {
          const id = idsToHydrate[idx++];
          const p = runOne(id).finally(() => {
            const k = runners.indexOf(p as any);
            if (k >= 0) runners.splice(k, 1);
          });
          runners.push(p as any);
        }
        if (runners.length >= limitConc) await Promise.race(runners);
      }
      await Promise.all(runners);

      let list = Array.from(byId.values());
      // Búsqueda por nombre/slug (case-insensitive)
      const query = (q || '').trim().toLowerCase();
      if (query) {
        list = list.filter((m) => {
          const name = (m.name || '').toLowerCase();
          const slug = (m.slug || '').toLowerCase();
          return name.includes(query) || slug.includes(query);
        });
      }
      // Filtro por listados
      if (listedOnly) {
        list = list.filter((m) => !!m.listed);
      }
      // Orden
      const byPrice = (a: ModelSummary, b: ModelSummary) => Number((b.price_perpetual ?? 0) - (a.price_perpetual ?? 0));
      if (order === 'price_desc') list.sort(byPrice);
      else if (order === 'price_asc') list.sort((a, b) => Number((a.price_perpetual ?? 0) - (b.price_perpetual ?? 0)));
      else if (order === 'version_desc') list.sort((a, b) => Number((b.version ?? 0) - (a.version ?? 0)));
      else if (order === 'recent_desc') list.sort((a, b) => Number((b.id ?? 0) - (a.id ?? 0)));
      else if (order === 'recent_asc') list.sort((a, b) => Number((a.id ?? 0) - (b.id ?? 0)));
      else {
        // featured: listados primero, luego por precio
        list.sort((a, b) => {
          const la = !!a.listed, lb = !!b.listed;
          if (la !== lb) return la ? -1 : 1;
          return byPrice(a, b);
        });
      }
      if (list.length > 0) return list.slice(start, start + limit);

      // 3) Fallback final: devInspect get_models_page (summary inmediato)
      try {
        const client = getSuiClient();
        const txMod = await import('@mysten/sui/transactions');
        const tx = new txMod.Transaction();
        tx.moveCall({ target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${FUNCTIONS.GET_MODELS_PAGE}`, arguments: [tx.object(MARKET_ID), tx.pure.u64(0), tx.pure.u64(200)] });
        const DEFAULT_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000001';
        const r: any = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: DEFAULT_SENDER });
        const b64: string | undefined = r?.results?.[0]?.returnValues?.[0]?.[0];
        if (b64) {
          const bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
          // Decoder local (copiado mínimo)
          const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
          const readU16LE = (off: number) => ({ v: view.getUint16(off, true), n: off + 2 });
          const readU64LE = (off: number) => { const lo = view.getUint32(off, true); const hi = view.getUint32(off + 4, true); return { v: (BigInt(hi) << 32n) + BigInt(lo), n: off + 8 }; };
          const readULEB128 = (buf: Uint8Array, off: number) => { let result = 0, shift = 0, i = off; while (i < buf.length) { const byte = buf[i]; result |= (byte & 0x7f) << shift; i++; if ((byte & 0x80) === 0) break; shift += 7; } return { v: result, n: i }; };
          let o = 0; const { v: len, n } = readULEB128(bytes, 0); o = n; const out: ModelSummary[] = [];
          for (let i = 0; i < len; i++) {
            const idV = readU64LE(o); o = idV.n;
            const ownerBytes = bytes.slice(o, o + 32); o += 32;
            const listed = bytes[o] === 1; o += 1;
            const pd = readU64LE(o); o = pd.n; const pp = readU64LE(o); o = pp.n; const ps = readU64LE(o); o = ps.n; const dd = readU64LE(o); o = dd.n; const ver = readU16LE(o); o = ver.n;
            const owner = `0x${Array.from(ownerBytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
            out.push({ id: Number(idV.v), owner, listed, price_perpetual: Number(pp.v), price_subscription: Number(ps.v), default_duration_days: Number(dd.v), version: ver.v });
          }
          return out.slice(start, start + limit);
        }
      } catch {}
      return [];
    },

    async getModelInfo(id: number): Promise<ModelInfo | null> {
      const base = await fetchModelDFById(id);
      if (base) return { ...base };
      // Fallback: devInspect get_model_info_ex
      try {
        const client = getSuiClient();
        const txMod = await import('@mysten/sui/transactions');
        const tx = new txMod.Transaction();
        tx.moveCall({ target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${FUNCTIONS.GET_MODEL_INFO_EX}`, arguments: [tx.object(MARKET_ID), tx.pure.u64(id)] });
        const DEFAULT_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000001';
        const r: any = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: DEFAULT_SENDER });
        const b64: string | undefined = r?.results?.[0]?.returnValues?.[0]?.[0];
        if (b64) {
          const bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
          const ex = decodeModelInfoEx(bytes);
          const termsHex = ex.terms_hash && ex.terms_hash.length ? `0x${Array.from(ex.terms_hash).map((b) => b.toString(16).padStart(2, '0')).join('')}` : undefined;
          return {
            id,
            owner: ex.owner,
            creator: ex.creator,
            listed: ex.listed,
            price_perpetual: Number(ex.price_perpetual ?? 0n),
            price_subscription: Number(ex.price_subscription ?? 0n),
            default_duration_days: Number(ex.default_duration_days ?? 0n),
            version: ex.version,
            royalty_bps: Number(ex.royalty_bps ?? 0n),
            terms_hash: termsHex,
            delivery_rights_default: ex.delivery_rights_default,
          } as ModelInfo;
        }
      } catch {}
      return null;
    },
  };
}
