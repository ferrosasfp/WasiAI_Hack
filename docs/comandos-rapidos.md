# Comandos Rápidos - WasiAI Verification

## Pre-requisitos

```bash
# Navegar a la carpeta de contratos
cd contracts/evm
```

---

## 1. Sincronizar Base de Datos (Blockchain → Neon)

```bash
# Sync completo de todos los modelos
npx hardhat run scripts/syncToNeon.ts --network avax

# Sync de un modelo específico
MODEL_ID=2 npx hardhat run scripts/syncToNeon.ts --network avax
```

**Via API (alternativa):**
```bash
# Sync modelo específico
curl "http://localhost:3000/api/indexer/recache?modelId=2&sync=true&chainId=43113"

# Sync todos los modelos
curl "http://localhost:3000/api/indexer/recache?all=true&sync=true"

# Solo re-indexar nuevos (sin sync completo)
curl "http://localhost:3000/api/indexer?chainId=43113"
```

---

## 2. Verificación End-to-End (Completa)

```bash
# Verificación completa del modelo #2
MODEL_ID=2 npx hardhat run scripts/e2eVerification.ts --network avax

# Verificación del modelo #1
MODEL_ID=1 npx hardhat run scripts/e2eVerification.ts --network avax
```

**Output esperado:**
```
✅ Model exists
✅ Model listed
✅ Agent registered
✅ Agent endpoint (https://...)
✅ x402 enabled
✅ Model in DB
...
Summary: X passed, Y warnings, Z failed
```

---

## 3. Verificar Modelo y Agent

```bash
# Ver detalles del modelo y su agent
MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax
```

**Qué verifica:**
- ✅ Modelo existe y está listado
- ✅ Agent registrado con ID correcto
- ✅ Endpoint configurado (no localhost)
- ✅ NFT del Agent minteado
- ✅ Wallet de pagos configurada

---

## 4. Verificar x402 Inference

```bash
# Ver configuración de x402 pay-per-inference
MODEL_ID=2 npx hardhat run scripts/verifyX402.ts --network avax
```

**Qué verifica:**
- ✅ Precio por inferencia configurado
- ✅ Endpoint externo (HuggingFace, etc.)
- ✅ Endpoint alcanzable (HTTP test)
- ✅ Wallet de pagos

---

## 5. Verificar Licencias

```bash
# Ver todas las licencias de un modelo
MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax

# Ver una licencia específica
LICENSE_ID=1 npx hardhat run scripts/verifyLicense.ts --network avax
```

**Qué verifica:**
- ✅ Licencias vendidas
- ✅ Estado (válida/revocada)
- ✅ Tipo (Perpetua/Suscripción)
- ✅ Derechos (API/Download)

---

## 6. Verificar Contratos Configurados

```bash
# Verificar que AgentRegistry está vinculado a Marketplace
MARKETPLACE_ADDRESS=0x278E6E5417d7af738368dA4a105A0ca80b89C7db npx hardhat run scripts/verifyAgentRegistry.ts --network avax
```

---

## Ejemplos Completos

### Después de publicar un nuevo modelo:

```bash
cd contracts/evm

# 1. Verificar que se registró correctamente
MODEL_ID=3 npx hardhat run scripts/verifyModelAgent.ts --network avax

# 2. Sincronizar con la base de datos
MODEL_ID=3 npx hardhat run scripts/syncToNeon.ts --network avax

# 3. Verificación completa
MODEL_ID=3 npx hardhat run scripts/e2eVerification.ts --network avax
```

### Después de comprar una licencia:

```bash
cd contracts/evm

# Verificar la licencia comprada
LICENSE_ID=1 npx hardhat run scripts/verifyLicense.ts --network avax

# O ver todas las licencias del modelo
MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax
```

### Debug de problemas con x402:

```bash
cd contracts/evm

# Ver configuración completa de x402
MODEL_ID=2 npx hardhat run scripts/verifyX402.ts --network avax

# Verificar que el endpoint responde
curl -X POST "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-xlm-roberta-base-sentiment" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Bitcoin is going to the moon!"}'
```

---

## Direcciones de Contratos (Fuji Testnet)

| Contrato | Dirección |
|----------|-----------|
| MarketplaceV2 | `0x278E6E5417d7af738368dA4a105A0ca80b89C7db` |
| AgentRegistryV2 | `0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD` |
| LicenseNFT | `0x94263370CbBDbFb40AEcd24C29d310Bf7E00F1c5` |
| USDC (Test) | `0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e` |

---

## Links Snowtrace

- [MarketplaceV2](https://testnet.snowtrace.io/address/0x278E6E5417d7af738368dA4a105A0ca80b89C7db)
- [AgentRegistryV2](https://testnet.snowtrace.io/address/0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD)
- [LicenseNFT](https://testnet.snowtrace.io/address/0x94263370CbBDbFb40AEcd24C29d310Bf7E00F1c5)

---

## Troubleshooting

### Error: "MODEL_ID environment variable is required"
```bash
# Asegúrate de pasar el MODEL_ID antes del comando
MODEL_ID=2 npx hardhat run scripts/...
```

### Error: "Network avax doesn't exist"
```bash
# Usa el nombre correcto de la red
npx hardhat run scripts/... --network avax
# O verifica hardhat.config.ts para ver las redes disponibles
```

### Warning: "Node.js v25.0.0 not supported"
```bash
# Ignorar el warning, funciona igual
# O usar nvm para cambiar a Node 18/20
nvm use 18
```

### Agent endpoint es "localhost"
```bash
# El modelo se publicó antes del fix
# Solución: Hacer upgrade del modelo con el endpoint correcto en Step 3
```





---

## 7. ModelSplitter (Revenue Split para x402) - Arquitectura por Modelo

```bash
# Crear splitter para un modelo
SPLITTER_FACTORY_ADDRESS=0xf8d8C220181CAe9A748b8e817BFE337AB5b74731 MODEL_ID=1 npx hardhat run scripts/createModelSplitter.ts --network avax

# Ver estado de un splitter
SPLITTER_FACTORY_ADDRESS=0xf8d8C220181CAe9A748b8e817BFE337AB5b74731 MODEL_ID=1 npx hardhat run scripts/checkModelSplitter.ts --network avax
```

**Direcciones:**
- **SplitterFactory**: `0xf8d8C220181CAe9A748b8e817BFE337AB5b74731`
- **ModelSplitter Impl**: `0x63533c50AdD0252feEcE2A708bdFFcd997Da5e47`
- **USDC (x402)**: `0x5425890298aed601595a70AB815c96711a31Bc65`

**Splitters por modelo:**
- **Model 1**: `0xdD3db35F2dB2632Af4a5D28CA9458F8B3b5Acae6`
- **Model 2**: `0xEb4f017f8E2bB3e2FE779A3e7De000a67Ef7782a`

**Flujo de pagos x402:**
1. x402 Facilitator → USDC va al Splitter del modelo (payTo)
2. Cualquiera llama `distribute()` para distribuir fondos
3. Cada parte llama `withdraw()` para retirar
4. **Mejor**: `distributeAndWithdraw()` hace todo en 1 TX

**Ventajas de esta arquitectura:**
- ✅ Cada modelo tiene su propio splitter con royalty fijo
- ✅ No hay confusión entre pagos de diferentes modelos
- ✅ El API no paga gas (solo configura payTo)
- ✅ Clones baratos (~$0.10-0.30 por modelo)

**Split ejemplo para $1.00:**
- Seller: $0.925 (92.5%)
- Creator: $0.05 (5% royalty)
- Marketplace: $0.025 (2.5% fee)

---

## Tabla de Comandos Rápidos

| Comando | Propósito |
|---------|-----------|
| `MODEL_ID=2 npx hardhat run scripts/e2eVerification.ts --network avax` | Verificación completa E2E |
| `MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax` | Verificar modelo + agent |
| `MODEL_ID=2 npx hardhat run scripts/verifyX402.ts --network avax` | Verificar x402 inference |
| `MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax` | Verificar licencias |
| `MODEL_ID=2 npx hardhat run scripts/syncToNeon.ts --network avax` | Sync DB |
| `npx hardhat run scripts/checkSplitterBalances.ts --network avax` | Ver balances del splitter |
| `npx hardhat run scripts/configureSplits.ts --network avax` | Configurar splits |

**Recuerda:** Siempre ejecutar desde `contracts/evm/`