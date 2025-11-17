# Indexer Setup Guide - Option 3 FREE

Esta guía te ayudará a configurar la **Opción 3 GRATIS** con Neon Postgres + GitHub Actions.

## 🎯 Arquitectura

```
Blockchain (EVM) → GitHub Actions (cada 15 min) → Neon Postgres → API Routes → Frontend
```

## 📋 Paso 1: Crear cuenta en Neon

1. Ve a https://neon.tech/
2. Sign up con GitHub (gratis)
3. Crea un nuevo proyecto: "MarketplaceAI"
4. Copia el **DATABASE_URL** (postgresql://...)

### Neon FREE tier incluye:
- ✅ 3 GB storage
- ✅ 1 database
- ✅ 100 horas compute/mes
- ✅ Suficiente para ~100k modelos + licencias

## 📋 Paso 2: Inicializar base de datos

### Opción A: Desde terminal local

```bash
# Instalar pg si no lo tienes
npm install -D pg @types/pg

# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# Ejecutar schema
psql $DATABASE_URL < db/schema.sql
```

### Opción B: Desde Neon Console

1. Ve a tu proyecto en Neon
2. Click en "SQL Editor"
3. Copia y pega todo el contenido de `db/schema.sql`
4. Click "Run"

## 📋 Paso 3: Configurar variables de entorno

### Local (.env.local)

```bash
# Neon Postgres
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# EVM Contract addresses (ya las tienes)
NEXT_PUBLIC_EVM_MARKET_43113=0x...
NEXT_PUBLIC_EVM_MARKET_84532=0x...

# RPC endpoints (ya las tienes)
NEXT_PUBLIC_AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
```

### GitHub Secrets

1. Ve a tu repo → Settings → Secrets and variables → Actions
2. Agrega estos secrets:

```
DATABASE_URL = postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_EVM_MARKET_43113 = 0x...
NEXT_PUBLIC_EVM_MARKET_84532 = 0x...
NEXT_PUBLIC_AVALANCHE_FUJI_RPC = https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_BASE_SEPOLIA_RPC = https://sepolia.base.org
```

### Vercel (cuando despliegues)

1. Ve a tu proyecto en Vercel → Settings → Environment Variables
2. Agrega `DATABASE_URL` con el valor de Neon

## 📋 Paso 4: Instalar dependencias

```bash
npm install pg
npm install -D @types/pg tsx
```

Agregar al `package.json`:

```json
{
  "scripts": {
    "indexer": "tsx scripts/run-indexer.ts"
  }
}
```

## 📋 Paso 5: Probar localmente

```bash
# Test conexión a DB
npm run indexer -- --chain=43113

# Deberías ver:
# 🚀 Starting indexer for chains: 43113
# 📊 Chain state: lastModelId=2, lastLicenseId=2, latestBlock=...
# ✅ Chain 43113: 2 models, 2 licenses, 500 blocks in 5432ms
```

## 📋 Paso 6: Activar GitHub Actions

1. Commit y push:
   ```bash
   git add .
   git commit -m "Add indexer with Neon Postgres"
   git push
   ```

2. Ve a GitHub → Actions tab
3. Deberías ver "Blockchain Indexer" workflow
4. Se ejecutará automáticamente cada 15 minutos
5. También puedes ejecutarlo manualmente: Click "Run workflow"

## 🧪 Verificar que funciona

### 1. Verificar que el indexer corre en GitHub

```
GitHub → Actions → Blockchain Indexer → Ver último run
```

Debe decir:
```
✅ Chain 43113: 2 models, 2 licenses in 3214ms
```

### 2. Verificar la API

```bash
# Local
curl http://localhost:3002/api/indexed/models?limit=10

# Debe retornar:
{
  "models": [...],
  "total": 2,
  "page": 1,
  "pages": 1
}
```

### 3. Verificar licencias (requiere wallet conectada)

```bash
curl "http://localhost:3002/api/indexed/licenses?userAddress=0xYOUR_WALLET"

# Debe retornar:
{
  "licenses": [...],
  "total": 2
}
```

## 📋 Paso 7: Actualizar frontend

### Modificar `/src/app/evm/licenses/page.tsx`

Reemplazar la función `load` para usar la nueva API:

```typescript
const load = React.useCallback(async () => {
  if (!address) return
  
  setLoading(true)
  try {
    const res = await fetch(`/api/indexed/licenses?userAddress=${address}&chainId=${evmChainId}`)
    const data = await res.json()
    setRows(data.licenses || [])
  } catch (error) {
    console.error('Failed to fetch licenses:', error)
  } finally {
    setLoading(false)
  }
}, [address, evmChainId])
```

**Resultado**: Carga en ~300ms vs 5-20s 🚀

## 🔄 Migración futura a versión PAGA

Cuando tengas >10k licencias o >$500/mes revenue:

### 1. Upgrade Neon a plan pago ($19/mes)
- Storage ilimitado
- Más compute hours
- Auto-scaling

### 2. Agregar Redis (Upstash $10/mes)
```typescript
// Cache queries en Redis
const cached = await redis.get(`models:page:${page}`)
if (cached) return JSON.parse(cached)
```

### 3. Cambiar GitHub Actions a Vercel Cron
```typescript
// /app/api/cron/indexer/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const result = await indexChain({ chainId: 43113 })
  return Response.json(result)
}
```

### 4. Optimizaciones adicionales
- Índices GIN para búsqueda full-text
- Materialized views para queries pesadas
- Connection pooling con PgBouncer
- Read replicas para queries de lectura

## 📊 Monitoring

### Neon Console
- Ve a tu proyecto → Monitoring
- Verás: Storage usado, Query performance, Connection count

### GitHub Actions
- Ve a Actions → Blockchain Indexer
- Verás: Runs history, Success rate, Duration

### Query directo a DB (debugging)
```sql
-- Total de modelos indexados
SELECT chain_id, COUNT(*) FROM models GROUP BY chain_id;

-- Total de licencias por usuario
SELECT owner, COUNT(*) FROM licenses GROUP BY owner ORDER BY COUNT(*) DESC LIMIT 10;

-- Estado del indexer
SELECT * FROM indexer_state;

-- Última sincronización
SELECT chain_id, last_sync_at, status FROM indexer_state;
```

## 🐛 Troubleshooting

### Error: "DATABASE_URL not set"
- Verifica que `.env.local` tiene DATABASE_URL
- En GitHub Actions, verifica que el secret existe

### Error: "relation 'models' does not exist"
- Ejecuta `db/schema.sql` en Neon Console

### GitHub Action falla con timeout
- Reduce `maxBlocks` en indexer options
- O aumenta frecuencia (cada 10 min en vez de 15)

### Queries lentos
- Verifica índices: `SELECT * FROM pg_indexes WHERE tablename IN ('models', 'licenses');`
- Agrega índices adicionales según tus queries más frecuentes

## 💰 Costos proyectados

| Usuarios | Modelos | Licencias | Storage | Costo/mes |
|----------|---------|-----------|---------|-----------|
| 100 | 1,000 | 5,000 | 50 MB | **$0** |
| 1,000 | 10,000 | 50,000 | 500 MB | **$0** |
| 10,000 | 100,000 | 500,000 | 2.5 GB | **$0** |
| 50,000 | 500,000 | 2,000,000 | 10 GB | **$19** (Neon Pro) |
| 100,000+ | 1,000,000+ | 5,000,000+ | 30 GB+ | **$50-100** (Enterprise) |

## ✅ Checklist final

- [ ] Neon account creada
- [ ] DATABASE_URL configurada en `.env.local`
- [ ] Schema ejecutado (`db/schema.sql`)
- [ ] Dependencies instaladas (`npm install pg`)
- [ ] GitHub Secrets configurados
- [ ] Indexer probado localmente (`npm run indexer`)
- [ ] GitHub Action activado (push to repo)
- [ ] API endpoints funcionando (`/api/indexed/models`)
- [ ] Frontend actualizado para usar nuevas APIs
- [ ] Verificar que `/en/licenses` carga rápido (<1s)

## 🎉 Resultado esperado

**Antes:**
- `/en/licenses`: 5-20 segundos ❌
- Escanea 200 licencias cada vez
- Fetcha IPFS para cada modelo
- No escala

**Después:**
- `/en/licenses`: 100-300ms ✅
- Query directo a DB con índices
- Metadata ya cacheada
- Escala a 100k+ licencias

**¡Listo para producción!** 🚀
