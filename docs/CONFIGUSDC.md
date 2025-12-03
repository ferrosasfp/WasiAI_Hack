# Configuración de USDC para Pagos de Licencias

## Resumen

El marketplace usa **USDC (ERC-20)** para pagos de licencias perpetuas y suscripciones.

| Entorno | Token | Dirección |
|---------|-------|-----------|
| **Fuji Testnet** | MockUSDC | `0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e` |
| **Fuji Testnet** | Circle USDC | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| **Avalanche Mainnet** | Circle USDC | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |

---

## Testnet: Dos Tokens Disponibles

### MockUSDC (Recomendado para pruebas)
- **Dirección**: `0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e`
- **Ventaja**: Mint ilimitado para pruebas
- **Uso**: Licencias perpetuas/suscripciones

### Circle USDC (Oficial)
- **Dirección**: `0x5425890298aed601595a70AB815c96711a31Bc65`
- **Limitación**: Solo 3 USDC del faucet de Circle
- **Uso**: x402 Inference (requerido por facilitador externo)

---

## Cambiar Token de Pago en Testnet

### Opción 1: Usar MockUSDC (default)

1. Editar `scripts/update-payment-token.js`:
   ```javascript
   const USE_CIRCLE_USDC = false
   ```

2. Ejecutar:
   ```bash
   node scripts/update-payment-token.js
   ```

3. Actualizar `.env.local`:
   ```bash
   NEXT_PUBLIC_EVM_USDC_43113=0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e
   ```

4. Reiniciar servidor: `npm run dev`

### Opción 2: Usar Circle USDC

1. Editar `scripts/update-payment-token.js`:
   ```javascript
   const USE_CIRCLE_USDC = true
   ```

2. Ejecutar:
   ```bash
   node scripts/update-payment-token.js
   ```

3. Actualizar `.env.local`:
   ```bash
   NEXT_PUBLIC_EVM_USDC_43113=0x5425890298aed601595a70AB815c96711a31Bc65
   ```

4. Reiniciar servidor: `npm run dev`

---

## Mintear MockUSDC para Pruebas

```bash
# Mintear 1000 USDC a tu wallet
node scripts/mint-test-usdc.js 1000

# Mintear a otra wallet
node scripts/mint-test-usdc.js 1000 0xDIRECCION_WALLET
```

---

## Obtener Circle USDC (Testnet)

1. Ir a: https://faucet.circle.com/
2. Seleccionar "Avalanche Fuji"
3. Ingresar tu wallet address
4. Recibir ~3 USDC

---

## Migración a Mainnet

### Paso 1: Actualizar el contrato MarketplaceV2

Ejecutar con la wallet owner del contrato:

```javascript
// Usando ethers.js o desde Snowtrace
const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, ABI, signer)
await marketplace.setPaymentToken("0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E")
```

O crear script `scripts/mainnet-set-usdc.js`:

```javascript
const { ethers } = require('ethers')
require('dotenv').config({ path: '.env.local' })

const MARKETPLACE_ADDRESS = 'TU_MARKETPLACE_MAINNET_ADDRESS'
const CIRCLE_USDC_MAINNET = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'
const RPC_URL = process.env.NEXT_PUBLIC_AVALANCHE_MAINNET_RPC || 'https://api.avax.network/ext/bc/C/rpc'

const ABI = ['function setPaymentToken(address _token) external']

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, ABI, wallet)
  
  console.log('Setting USDC on Mainnet...')
  const tx = await marketplace.setPaymentToken(CIRCLE_USDC_MAINNET)
  await tx.wait()
  console.log('✅ Done!')
}

main()
```

### Paso 2: Actualizar `.env.local` para Mainnet

```bash
# Mainnet contracts
NEXT_PUBLIC_EVM_MARKET_43114=TU_MARKETPLACE_MAINNET_ADDRESS
NEXT_PUBLIC_EVM_LICENSE_43114=TU_LICENSE_NFT_MAINNET_ADDRESS
NEXT_PUBLIC_EVM_USDC_43114=0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E
```

### Paso 3: Actualizar `src/config/chains.ts`

El archivo ya tiene la configuración de mainnet:

```typescript
[CHAIN_IDS.AVALANCHE_MAINNET]: {
  // ...
  usdcAddress: process.env.NEXT_PUBLIC_EVM_USDC_43114 || '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
}
```

### Paso 4: Actualizar x402 Inference (si aplica)

En `src/app/api/inference/[modelId]/route.ts`, cambiar:

```typescript
const NETWORK = 'avalanche-mainnet'  // era 'avalanche-fuji'
const USDC_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'  // Circle USDC Mainnet
```

---

## Direcciones de Referencia

### Testnet (Fuji - Chain ID: 43113)
| Contrato | Dirección |
|----------|-----------|
| MarketplaceV2 | `0xdDF773Bb0a9a6F186175fB39CA166DA17994491E` |
| LicenseNFT | `0x819dF6b803Ae3E55cA2145779F7d5B53C11adE38` |
| AgentRegistryV2 | `0x7686810c46946a223B7a9baF0F52A4e2c7392B9f` |
| InferenceSplitter | `0x82357fB6c6639de2dE9582E18777D9B498f7BE65` |
| MockUSDC | `0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e` |
| Circle USDC | `0x5425890298aed601595a70AB815c96711a31Bc65` |

### Mainnet (Avalanche - Chain ID: 43114)
| Contrato | Dirección |
|----------|-----------|
| Circle USDC | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| MarketplaceV2 | *Pendiente deploy* |
| LicenseNFT | *Pendiente deploy* |

---

## Flujo de Pago (Frontend)

El flujo de compra usa **Infinite Approve** para mejor UX:

1. **Primera compra**: 
   - TX1: `approve(marketplace, MAX_UINT256)` - Solo una vez
   - TX2: `buyLicenseWithURI(...)`

2. **Compras siguientes**:
   - Solo TX: `buyLicenseWithURI(...)` - Sin approve

Ver implementación en: `src/app/[locale]/evm/models/[id]/ModelPageClient.tsx`

---

## Notas Importantes

1. **MockUSDC vs Circle USDC**: Son tokens diferentes, no intercambiables
2. **x402 siempre usa Circle USDC**: El facilitador externo lo requiere
3. **Decimales**: Ambos USDC usan 6 decimales
4. **Mainnet**: Solo usar Circle USDC oficial
5. **Seguridad**: El contrato usa SafeERC20 de OpenZeppelin
