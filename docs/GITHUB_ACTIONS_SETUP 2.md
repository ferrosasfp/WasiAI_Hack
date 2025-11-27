# GitHub Actions Setup para Auto-Indexing

El indexer está configurado para correr automáticamente cada 15 minutos vía GitHub Actions. Este documento explica cómo configurar los secrets necesarios.

## 📋 Secrets requeridos

Ve a tu repositorio en GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Secrets obligatorios:

1. **`DATABASE_URL`**
   - Descripción: URL de conexión a Neon Postgres
   - Valor: `postgresql://neondb_owner:npg_o13lrWRXBHdZ@ep-weathered-cloud-ac0l65rx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - ⚠️ **Importante**: Usa la URL de CONNECTION POOLING desde Neon dashboard

2. **`NEXT_PUBLIC_EVM_MARKET_43113`**
   - Descripción: Dirección del contrato Marketplace en Avalanche Fuji
   - Valor: `0x3e54ad82599c23Bdb1dE222162992307a84A0830`

3. **`NEXT_PUBLIC_EVM_MARKET_84532`**
   - Descripción: Dirección del contrato Marketplace en Base Sepolia
   - Valor: `0x0C45FC606C45a85b7E53492703b4D986751858a8`

### Secrets opcionales (usan default si no se especifican):

4. **`NEXT_PUBLIC_AVALANCHE_FUJI_RPC`**
   - Default: `https://api.avax-test.network/ext/bc/C/rpc`
   - Solo necesario si quieres usar un RPC custom (Alchemy, Infura, etc.)

5. **`NEXT_PUBLIC_BASE_SEPOLIA_RPC`**
   - Default: `https://sepolia.base.org`
   - Solo necesario si quieres usar un RPC custom

## 🚀 Activar el workflow

Una vez configurados los secrets:

1. **Push a GitHub**:
   ```bash
   git add .
   git commit -m "Setup auto-indexer"
   git push origin main
   ```

2. **Verificar que funciona**:
   - Ve a tu repo → **Actions**
   - Haz clic en "Blockchain Indexer"
   - Click en "Run workflow" → "Run workflow" (trigger manual)
   - Espera ~2-3 minutos
   - Verifica que ambos jobs (chain 43113 y 84532) completen exitosamente ✅

3. **Monitoreo**:
   - El workflow correrá automáticamente cada 15 minutos
   - Puedes ver logs en la sección Actions
   - Si falla, recibirás una notificación por email

## 📊 Qué hace el indexer automáticamente

Cada 15 minutos, el workflow:

1. **Escanea la blockchain** en busca de nuevos modelos y licencias
2. **Descarga metadata IPFS** y la cachea en Neon
3. **Actualiza tablas** en Neon Postgres:
   - `models` → Nuevos modelos publicados
   - `licenses` → Nuevas licencias minteadas
   - `model_metadata` → Metadata IPFS cacheada
   - `indexer_state` → Estado de sincronización

4. **Resultado**: Tu frontend siempre muestra datos actualizados sin escanear blockchain

## ⚡ Ventajas

- ✅ **Frontend instantáneo**: Consultas a Neon en lugar de blockchain
- ✅ **Sin rate limits**: No más problemas con RPCs públicos
- ✅ **Histórico completo**: Todos los eventos desde genesis
- ✅ **Búsqueda y filtros**: SQL queries sobre metadata IPFS
- ✅ **Escalable**: Puede indexar múltiples chains en paralelo

## 🔧 Troubleshooting

### Error: "DATABASE_URL not found"
- Verifica que agregaste el secret con el nombre exacto `DATABASE_URL`
- Asegúrate de estar usando la URL de **CONNECTION POOLING** (no DIRECT)

### Error: "Chain 43113 not configured"
- Verifica que agregaste `NEXT_PUBLIC_EVM_MARKET_43113`
- El valor debe ser exacto (sin espacios ni quotes)

### Error: "Cannot connect to database"
- Ve a Neon dashboard → Settings → "Allow all IP addresses"
- O agrega las IPs de GitHub Actions runners

### El workflow no corre automáticamente
- Ve a Actions → "Blockchain Indexer" → Verifica que esté habilitado
- Si está disabled, haz clic en "Enable workflow"

## 📝 Logs útiles

En cada ejecución del workflow verás:

```
🚀 Starting indexer for chains: 43113
🔍 Starting indexer for chain 43113...
📊 Chain state: lastModelId=1, lastLicenseId=4, latestBlock=47794390
📦 Indexing 0 new models...
🎫 Scanning 1007 blocks for license events...
✅ Indexer completed: 0 models, 2 licenses in 2249ms
✅ Cached metadata for model 1
```

Esto confirma que el indexer está funcionando correctamente.

## 🎯 Próximos pasos

Una vez configurado y funcionando:

1. El indexer mantendrá Neon actualizado automáticamente
2. Tu frontend cargará en < 1 segundo (antes: 40+ segundos)
3. Puedes agregar más chains editando `.github/workflows/indexer.yml`
4. Considera agregar webhooks para notificaciones de nuevos modelos/licencias
