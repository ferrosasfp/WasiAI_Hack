# Troubleshooting: "Modelo no encontrado" / "Model not found"

## 🐛 Problema

Cuando intentas acceder a un modelo en `http://localhost:3000/en/evm/models/1`, ves uno de estos escenarios:

1. **Primera carga**: Mensaje "Modelo no encontrado" (Model not found)
2. **Segunda carga**: Página se muestra pero con datos vacíos

## 🔍 Diagnóstico

### Paso 1: Verificar ChainID

El problema más común es que el **chainId no está configurado correctamente**.

**Verificar en consola del navegador:**

```
[ModelPageClient] Fetching model: { id: 1, evmChainId: undefined, apiUrl: '/api/models/evm/1?' }
```

Si `evmChainId` es `undefined`, el problema es que:
- No hay chainId en la URL
- No hay wallet conectada
- No hay chainId por defecto en `.env.local`

**Solución:**

1. **Opción A: Agregar chainId a la URL**
   ```
   http://localhost:3000/en/evm/models/1?chainId=43113
   ```

2. **Opción B: Configurar chainId por defecto**
   
   En `.env.local`:
   ```bash
   NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=43113  # Avalanche Fuji
   # o
   NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=84532  # Base Sepolia
   ```

3. **Opción C: Conectar wallet**
   
   Conecta tu wallet en MetaMask a la red correcta (Fuji o Base Sepolia).

---

### Paso 2: Verificar que el Modelo Existe

El modelo puede no existir en la blockchain o en la base de datos.

**Verificar en terminal del servidor:**

```bash
# Buscar logs como:
GET /api/models/evm/1?chainId=43113 500
```

Si ves un `500` error, el API está fallando.

**Verificar con script:**

```bash
npx tsx scripts/verify-model-ownership.ts 1 0xYourWalletAddress
```

Este script te dirá:
- ✅ Si el modelo existe on-chain
- ✅ Quién es el owner
- ✅ El estado del modelo (listed/unlisted)
- ✅ Los precios y configuración

---

### Paso 3: Verificar Configuración de Smart Contract

El address del contrato Marketplace debe estar configurado correctamente.

**Verificar `.env.local`:**

```bash
# Para Avalanche Fuji (chainId: 43113)
NEXT_PUBLIC_EVM_MARKET_43113=0x...YourMarketplaceAddress

# Para Base Sepolia (chainId: 84532)
NEXT_PUBLIC_EVM_MARKET_84532=0x...YourMarketplaceAddress
```

**Verificar en el código:**

```bash
# Ver archivo de configuración
cat src/config/chains.ts | grep marketAddress
```

---

### Paso 4: Verificar Logs de la Consola

Con los cambios recientes, ahora verás logs detallados en la consola del navegador:

```
[ModelPageClient] Fetching model: { id: 1, evmChainId: 43113, apiUrl: '/api/models/evm/1?chainId=43113' }
[ModelPageClient] API response: { chain: 'evm', chainId: 43113, id: 1, data: {...} }
```

**Si ves errores:**

```
[ModelPageClient] API error: 500 Internal Server Error
[ModelPageClient] Error details: {"error":"Failed to fetch model"}
```

Esto indica que el servidor no puede leer el modelo del blockchain.

**Causas posibles:**
- RPC endpoint no disponible
- Contract address incorrecto
- Modelo no existe on-chain

---

## ✅ Checklist de Soluciones

### Problema: evmChainId es undefined

- [ ] Agregar `?chainId=43113` a la URL
- [ ] Configurar `NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID` en `.env.local`
- [ ] Conectar wallet a la red correcta
- [ ] Reiniciar el servidor de desarrollo (`npm run dev`)

### Problema: API devuelve 404/500

- [ ] Verificar que el modelo existe: `npx tsx scripts/verify-model-ownership.ts 1 0xWallet`
- [ ] Verificar contract address en `.env.local`
- [ ] Verificar RPC URL está funcionando
- [ ] Revisar logs del servidor terminal (buscar errores SQL o RPC)

### Problema: Base de datos no tiene el modelo

Si el modelo existe on-chain pero no en la DB PostgreSQL:

- [ ] Verificar que el indexer esté corriendo
- [ ] Verificar tablas `models` y `model_metadata` en PostgreSQL
- [ ] Esperar que el indexer procese los bloques recientes
- [ ] Como workaround, pasar `chainId` en URL para forzar lectura desde blockchain

### Problema: Datos vacíos en la segunda carga

Esto sugiere que el modelo se cargó parcialmente pero falta metadata.

- [ ] Verificar que el modelo tiene un `uri` válido (IPFS CID)
- [ ] Verificar que el CID de IPFS existe y es accesible
- [ ] Revisar logs: `[ModelPageClient] IPFS metadata fetch error`
- [ ] Verificar `/api/ipfs/ipfs/[cid]` endpoint funciona

---

## 🚀 Flujo de Debugging Recomendado

### 1. Verificación Rápida (2 minutos)

```bash
# Terminal 1: Ver logs del servidor
npm run dev

# Terminal 2: Verificar modelo on-chain
npx tsx scripts/verify-model-ownership.ts 1 0xYourAddress

# Navegador: Abrir consola y cargar página
# URL: http://localhost:3000/en/evm/models/1?chainId=43113
```

### 2. Verificar Logs

**Navegador (Console):**
```
[ModelPageClient] Fetching model: ...
[ModelPageClient] API response: ...
```

**Servidor (Terminal):**
```
GET /api/models/evm/1?chainId=43113 200 in 2354ms
```

### 3. Interpretar Resultados

| Log | Significado | Acción |
|-----|-------------|--------|
| `evmChainId: undefined` | No hay chainId | Agregar `?chainId=43113` a URL |
| `API error: 404` | Modelo no encontrado | Verificar que modelo existe on-chain |
| `API error: 500` | Error del servidor | Revisar contract address y RPC |
| `IPFS metadata fetch error` | Metadata no accesible | Verificar CID en Pinata/IPFS |
| `data: null` | No se pudo cargar | Revisar todos los pasos anteriores |

---

## 🔧 Fixes Aplicados

Los siguientes fixes ya están implementados en el código:

### 1. **Mejor Logging** ✅

Ahora verás logs detallados en la consola:
- Request URL y parámetros
- Response del API
- Errores específicos (404, 500, timeout, JSON parse)

### 2. **Error Handling Mejorado** ✅

- Manejo de responses no-200 con mensajes claros
- Continúa con datos básicos si IPFS metadata falla
- No rompe la página completa si hay un error parcial

### 3. **UI de Error Mejorada** ✅

Cuando un modelo no se encuentra, ahora se muestra:
- Mensaje de error claro
- Model ID y Chain ID detectado
- Link a revisar consola
- Posibles causas del problema

### 4. **Validación de Datos** ✅

- Verifica que `m` no sea null antes de procesar
- Early return si no hay datos
- Setea `data` a null y `attempted` a true para mostrar error

---

## 📝 Ejemplo de Debugging Session

```bash
# 1. Iniciar servidor con logs visibles
npm run dev

# 2. En otra terminal, verificar modelo
$ npx tsx scripts/verify-model-ownership.ts 1 0x742d35...

🔍 Verificando ownership del modelo...

Chain: Avalanche Fuji (43113)
Contract: 0xABC123...
Model ID: 1
Wallet: 0x742d35...

═══════════════════════════════════════════════════════════
📊 INFORMACIÓN DEL MODELO #1
═══════════════════════════════════════════════════════════

🔑 Owner:          0xABC123...
👤 Tu wallet:      0x742d35...
❌ Eres owner:      NO

📋 Estado:         ✅ Listado
📄 URI:            ipfs://QmXYZ...
🔗 Terms Hash:     0x0000...

💰 Precios:
   Perpetual:      1.00 AVAX
   Subscription:   0.10 AVAX/month
   Duración base:  30 días

🎯 Derechos y Entrega:
   Rights:         API + Download (bitmask: 3)
   Delivery Mode:  Both (API + Download)

═══════════════════════════════════════════════════════════

# 3. Cargar en navegador con chainId
http://localhost:3000/en/evm/models/1?chainId=43113

# 4. Revisar consola del navegador
# Debe mostrar:
[ModelPageClient] Fetching model: { id: 1, evmChainId: 43113, apiUrl: '/api/models/evm/1?chainId=43113' }
[ModelPageClient] API response: { chain: 'evm', chainId: 43113, id: 1, data: { owner: '0xABC...', uri: 'ipfs://...', ... } }

# ✅ Si ves esto, el modelo se cargó correctamente
```

---

## 🆘 ¿Aún No Funciona?

Si después de todos estos pasos sigue sin funcionar:

### Opción 1: Publicar un Modelo Nuevo

```bash
# Asegurarse de tener fondos en testnet
# Ir a http://localhost:3000/publish/wizard
# Conectar wallet y publicar un modelo de prueba
# Anotar el modelId que se crea
```

### Opción 2: Verificar Configuración Completa

```bash
# Archivo: .env.local
cat .env.local

# Debe contener:
NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=43113
NEXT_PUBLIC_EVM_MARKET_43113=0x...YourContractAddress
NEXT_PUBLIC_AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc

# Si falta algo, agregar y reiniciar servidor
```

### Opción 3: Limpiar Cache

```bash
# Limpiar .next y node_modules
rm -rf .next
rm -rf node_modules/.cache

# Reinstalar y reiniciar
npm install
npm run dev
```

---

## 📚 Recursos Adicionales

- **Script de verificación**: `scripts/verify-model-ownership.ts`
- **Config de chains**: `src/config/chains.ts`
- **API de modelos EVM**: `src/app/api/models/evm/[id]/route.ts`
- **Cliente de página**: `src/app/[locale]/evm/models/[id]/ModelPageClient.tsx`

---

## ✅ Resumen

**Problema más común**: ChainID no configurado

**Fix rápido**: Agregar `?chainId=43113` a la URL

**Verificación**: Usar `scripts/verify-model-ownership.ts`

**Logs**: Revisar consola del navegador para detalles

¡Con estos pasos deberías poder diagnosticar y resolver el problema! 🚀
