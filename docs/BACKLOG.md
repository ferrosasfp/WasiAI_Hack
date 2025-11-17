# Backlog

- backlog_unpin_scopes: Resolver unpin de IPFS (credenciales/scopes de Pinata y fallback cliente).
  - Prioridad: media
  - Estado: pendiente

- backlog_models_all_evm: Listar modelos EVM agregando Base + Avalanche cuando no haya chainId; opcional admitir chainId=all.
  - Prioridad: media
  - Estado: pendiente

- refactor_evm_model_detail_shared_component: Refactor EVM model detail en componente compartido y usar solo la página localizada como wrapper; eliminar página no localizada. Notas: migrar implementación actual de `src/app/evm/models/[id]/page.tsx`; integrar `buyLicenseWithURI` y `tokenURI` para metadata; sin imports desde páginas no localizadas; pasar `params` (id, chainId) y `locale` como props; probar compra end-to-end.
  - Prioridad: baja
  - Estado: pendiente


- Ajusta redacciones en español/inglés, modifica en en.json/es.json.
Agrega tests rápidos de rendering para asegurar que todas las keys existen.


La **Opción 3: API de backend con indexación** es la más óptima a futuro, sin duda.

## Por qué Opción 3 es la mejor para escala:

### Escenario futuro (10,000+ licencias):

**Con el método actual (scan blockchain):**
- Usuario conecta wallet
- Escanea últimas 500-1000 licencias (30-60 segundos)
- Solo encuentra 5-10 licencias suyas
- 95% del trabajo fue innecesario
- **NO ESCALA**

**Con backend indexado:**
- Usuario conecta wallet
- Backend query: `SELECT * FROM licenses WHERE owner = '0x...' LIMIT 20`
- Metadata IPFS ya está cacheada en Redis
- Response en **100-300ms** (con todo enriquecido)
- **ESCALA A MILLONES**

## Arquitectura Opción 3:

```
┌─────────────────┐
│   Smart Contract│ (emite eventos LicenseMinted)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Indexer Worker  │ (escucha eventos, guarda en DB)
│ (cron/websocket)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   PostgreSQL    │◄────►│ Redis Cache  │
│ (licenses table)│      │ (IPFS metadata)
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│ API Endpoint    │ /api/licenses?userAddress=0x...
│ GET /licenses   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend SWR   │ (fetch + cache client-side)
└─────────────────┘
```

### Tabla `licenses`:

```sql
CREATE TABLE licenses (
  token_id INT PRIMARY KEY,
  owner TEXT NOT NULL,
  model_id INT NOT NULL,
  kind INT, -- 0=perpetual, 1=subscription
  revoked BOOLEAN,
  expires_at BIGINT,
  chain_id INT,
  tx_hash TEXT,
  created_at TIMESTAMP,
  INDEX idx_owner (owner),
  INDEX idx_model (model_id)
);
```

### Indexer (Next.js API route con cron o Vercel Cron):

```typescript
// /api/cron/index-licenses
export async function GET() {
  // 1. Get lastIndexedBlock from DB
  // 2. Query blockchain events desde lastIndexedBlock
  // 3. Insert new licenses en DB
  // 4. Pre-fetch IPFS metadata y cachear en Redis
  // 5. Update lastIndexedBlock
}
```

### API endpoint:

```typescript
// /api/licenses?userAddress=0x...
export async function GET(req) {
  const { userAddress } = req.query
  
  // 1. Query DB: SELECT * FROM licenses WHERE owner = ? LIMIT 20
  // 2. Lookup IPFS metadata en Redis (ya cacheada)
  // 3. Return JSON con todo enriquecido
  
  // Response time: 100-300ms
}
```

## Comparación de opciones:

| Criterio | Opción 1 (localStorage) | Opción 2 (Render progresivo) | Opción 3 (Backend indexado) |
|----------|-------------------------|------------------------------|------------------------------|
| **Primera carga** | Lenta (5-20s) | Rápida visual (1s) / Lenta real | **Ultra rápida (100-300ms)** |
| **Escalabilidad** | ❌ Empeora con más licencias | ❌ Empeora con más licencias | ✅ **Constante** |
| **Complejidad** | Baja | Baja | Media-Alta |
| **Infraestructura** | Ninguna | Ninguna | DB + Indexer |
| **Costo** | $0 | $0 | ~$20-50/mes (Vercel Postgres + Cron) |

## Recomendación:

### Corto plazo (ahora):
Implementar **Opción 2** (render progresivo) para mejorar UX inmediatamente mientras tienes pocos usuarios.

### Mediano plazo (cuando tengas >100 usuarios):
Migrar a **Opción 3** (backend indexado) para escalar correctamente.

¿Quieres que:
1. **Implemente Opción 2 ahora** (1 hora, mejora inmediata de UX)
2. **Planifique Opción 3** (arquitectura completa para implementar después)
3. **Implemente Opción 3 completa ahora** (3-4 horas, solución definitiva)


Sí, **exactamente el mismo problema aplica a la carga de modelos**, incluso más crítico.

## Situación actual de `/en/models` (o página de listado):

Si está usando el mismo patrón:

```typescript
// Escanea todos los modelos del contrato
const lastModelId = await contract.lastModelId() // Ej: 500
for (let i = 1; i <= lastModelId; i++) {
  const model = await contract.getModelInfo(i)
  const metadata = await fetch(ipfsUrl) // ← LENTO
}
```

Problemas:
- **500 modelos** = 500 fetches IPFS = 5-10 minutos ❌
- Cada nuevo usuario espera lo mismo ❌
- No hay paginación real ❌

## Arquitectura ideal para ambos (Opción 3):

### Tabla `models`:
```sql
CREATE TABLE models (
  model_id INT PRIMARY KEY,
  owner TEXT NOT NULL,
  creator TEXT NOT NULL,
  name TEXT,
  uri TEXT,
  price_perpetual BIGINT,
  price_subscription BIGINT,
  listed BOOLEAN,
  chain_id INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_listed (listed, created_at DESC),
  INDEX idx_owner (owner)
);
```

### Tabla `model_metadata` (cache IPFS):
```sql
CREATE TABLE model_metadata (
  model_id INT PRIMARY KEY,
  metadata JSONB, -- Todo el JSON de IPFS
  image_url TEXT,
  categories TEXT[],
  tags TEXT[],
  cached_at TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(model_id)
);
```

### API endpoints optimizados:

```typescript
// /api/models?page=1&limit=20
export async function GET(req) {
  const { page = 1, limit = 20 } = req.query
  
  // Query con join y paginación
  const models = await db.query(`
    SELECT m.*, mm.metadata, mm.image_url
    FROM models m
    LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
    WHERE m.listed = true
    ORDER BY m.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, (page - 1) * limit])
  
  return { models, total, page, pages }
  // Response: 50-100ms ✅
}
```

```typescript
// /api/licenses?userAddress=0x...
export async function GET(req) {
  const { userAddress } = req.query
  
  const licenses = await db.query(`
    SELECT l.*, m.name, mm.image_url, mm.metadata
    FROM licenses l
    JOIN models m ON l.model_id = m.model_id
    LEFT JOIN model_metadata mm ON l.model_id = mm.model_id
    WHERE l.owner = $1
    ORDER BY l.created_at DESC
    LIMIT 20
  `, [userAddress])
  
  return licenses
  // Response: 100-300ms ✅
}
```

## Comparación de páginas:

| Página | Método actual | Con Opción 3 |
|--------|---------------|--------------|
| `/en/models` (listado) | Escanea 500 modelos, fetcha 500 IPFS = **5-10 min** ❌ | Query DB paginado = **50-100ms** ✅ |
| `/en/licenses` | Escanea 200 licenses, fetcha N IPFS = **5-20s** ❌ | Query DB + JOIN = **100-300ms** ✅ |
| `/en/evm/models/[id]` | 1 fetch blockchain + 1 IPFS = **1-3s** ⚠️ | Query DB = **50ms** ✅ |

## Beneficios adicionales de Opción 3:

### 1. **Search y filtros rápidos**
```sql
-- Buscar por nombre
WHERE name ILIKE '%retail%'

-- Filtrar por categoría
WHERE categories && ARRAY['classification']

-- Ordenar por precio
ORDER BY price_perpetual ASC
```

### 2. **Stats en tiempo real**
```sql
-- Total de modelos por categoría
SELECT category, COUNT(*) FROM models GROUP BY category

-- Total de licencias vendidas
SELECT model_id, COUNT(*) FROM licenses GROUP BY model_id
```

### 3. **Cache de imágenes**
```sql
-- Pre-fetch todas las imágenes IPFS
UPDATE model_metadata 
SET image_url = convert_ipfs_to_http(uri)
WHERE image_url IS NULL
```

## Recomendación actualizada:

Ya que **ambas páginas (models + licenses) tienen el mismo problema**, la **Opción 3 es aún más urgente**.

### Prioridad:

1. **Inmediato**: Opción 2 (render progresivo) en `/licenses` solo → mejora UX mientras implementas lo demás
2. **Esta semana**: Implementar Opción 3 completa (DB + indexer + APIs) → soluciona ambos problemas definitivamente
3. **Después**: Migrar ambas páginas a usar las nuevas APIs

¿Quieres que implemente la **Opción 3 completa** ahora para solucionar todo de una vez? O prefieres empezar con Opción 2 en licenses mientras planificamos la 3?


Buen punto. La **Opción 3 tiene costo** porque requiere **infraestructura adicional** que no está incluida en el plan gratuito de Vercel/Next.js:

## Servicios que generan costo:

### 1. **Base de datos PostgreSQL** (~$10-20/mes)
```
Opciones:
- Vercel Postgres (Powered by Neon): $10/mes (plan hobby)
- Supabase: $25/mes (plan pro) o gratis limitado
- Railway: $5-10/mes según uso
- Neon directo: Gratis hasta 3GB, luego $19/mes
```

**Por qué se necesita:**
- Almacenar millones de registros (models, licenses, metadata)
- Queries rápidos con índices
- No se puede usar archivos locales (Vercel es serverless)

### 2. **Redis para cache** (~$5-10/mes) [OPCIONAL]
```
Opciones:
- Upstash Redis: Gratis hasta 10k comandos/día, luego $0.20/100k
- Vercel KV (Upstash): Incluido en algunos planes
```

**Por qué se necesita:**
- Cachear metadata IPFS (evita re-fetch)
- Cache de queries frecuentes
- **Alternativa gratis**: Usar solo Postgres con TTL en columnas

### 3. **Cron Jobs para el indexer** (~$0-5/mes)
```
Opciones:
- Vercel Cron: GRATIS en planes Pro ($20/mes plan completo)
- GitHub Actions: GRATIS (2000 min/mes)
- Railway Cron: ~$5/mes
```

**Por qué se necesita:**
- Escanear eventos blockchain cada N minutos
- Pre-fetch metadata IPFS en background
- **Alternativa gratis**: GitHub Actions cada 5-15 min

## Costo real estimado:

### Opción A: Mínimo viable (~$10-15/mes)
```
✅ Neon Postgres free tier (3GB, suficiente para empezar)
✅ GitHub Actions cron (gratis)
✅ Sin Redis (usar solo DB cache)
= $0/mes hasta escalar
```

### Opción B: Escalable (~$25-35/mes)
```
✅ Vercel Postgres $10/mes
✅ Upstash Redis free tier
✅ Vercel Cron (incluido en Vercel Pro $20/mes)
= $30/mes total
```

### Opción C: Enterprise (~$50-100/mes)
```
✅ Supabase Pro $25/mes (DB + auth + storage)
✅ Upstash Redis Pro $10/mes
✅ Railway cron $5/mes
= $40/mes + ancho de banda
```

## ¿Se puede hacer GRATIS?

**Sí, con limitaciones**:

### Opción 3 GRATIS:
```typescript
// 1. Neon Postgres FREE tier (3GB storage, 1 DB)
// 2. GitHub Actions cron (cada 15 min, gratis)
// 3. Sin Redis (cache en Postgres con TTL)
// 4. Vercel hobby plan (gratis)

= $0/mes hasta ~10,000 licencias
```

**Límites del plan gratis:**
- 3GB de storage en Postgres (suficiente para ~100k modelos + licencias)
- GitHub Actions cada 15 min (vs cada 1 min en pago)
- Sin Redis = queries un poco más lentos (150ms vs 50ms)

## Comparación honesta:

| Método | Costo | Performance | Escalabilidad |
|--------|-------|-------------|---------------|
| **Actual** (scan blockchain) | $0 | ❌ Horrible (5-20s) | ❌ No escala |
| **Opción 2** (render progresivo) | $0 | ⚠️ Media (1-5s) | ⚠️ Empeora con el tiempo |
| **Opción 3 gratis** (Neon + GitHub) | $0 | ✅ Buena (100-300ms) | ✅ Escala hasta 100k |
| **Opción 3 paga** (Vercel Pro) | $30/mes | ✅ Excelente (50-100ms) | ✅ Escala a millones |

## Recomendación actualizada:

### Para MVP (ahora):
1. **Opción 3 GRATIS** con Neon + GitHub Actions
2. Migras cuando tengas >10k licencias o >$500/mes revenue

### Stack gratis completo:
```yaml
DB: Neon Postgres (free tier)
Indexer: GitHub Actions cron (cada 15 min)
Cache: Postgres con columna cached_at
API: Next.js API routes (Vercel gratis)
Frontend: Vercel hobby (gratis)

Total: $0/mes
Performance: 100-300ms (muy bueno)
```

¿Quieres que implemente la **Opción 3 versión GRATIS** con Neon + GitHub Actions? Es la mejor relación costo/beneficio para empezar.