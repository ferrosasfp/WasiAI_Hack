# Análisis del Sistema de Splitters para Retiros

**Fecha**: Diciembre 2024  
**Objetivo**: Analizar el sistema actual de splitters y diseñar una página de gestión de retiros.

---

## 1. Resumen Ejecutivo

Los splitters se crean **automáticamente** cuando se publica un modelo en el Step 5 del wizard. El contrato `MarketplaceV3` llama a `SplitterFactory` para crear un `ModelSplitter` por cada modelo nuevo. Los pagos x402 de inferencias se acumulan en estos splitters y pueden ser retirados por sellers, creators y el marketplace.

**Estado actual**:
- ✅ Creación automática de splitters funciona
- ✅ Almacenamiento on-chain en SplitterFactory
- ❌ No hay UI para ver/retirar fondos
- ❌ No se indexa `splitter_address` en Neon DB

---

## 2. Arquitectura de Contratos

### 2.1 Contratos Involucrados

```
┌─────────────────────────────────────────────────────────────────┐
│                      MarketplaceV3.sol                          │
│  - listOrUpgradeWithAgent()                                     │
│  - _createSplitterIfNeeded()                                    │
│  - Emite: SplitterCreated, SplitterAliased                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SplitterFactory.sol                          │
│  - createSplitter(modelId, seller, creator, royaltyBps)         │
│  - aliasSplitter(newModelId, originalModelId)                   │
│  - getSplitter(modelId) → address                               │
│  - splitterExists(modelId) → bool                               │
│  Storage:                                                       │
│  - splitters[modelId] → address                                 │
│  - splitterAlias[modelId] → originalModelId                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │ deploys (EIP-1167 clone)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ModelSplitter.sol                           │
│  Functions:                                                     │
│  - distribute() → Procesa USDC pendiente                        │
│  - withdraw() → Retira todo el balance del caller               │
│  - withdrawAmount(amount) → Retira cantidad específica          │
│  - distributeAndWithdraw() → Procesa + retira en 1 TX           │
│  View:                                                          │
│  - pendingDistribution() → USDC sin procesar                    │
│  - balances(address) → Balance disponible para retiro           │
│  - getAllBalances() → (seller, creator, marketplace)            │
│  - getSplitConfig() → (seller, creator, marketplace, royaltyBps)│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Creación de Splitter

```
Usuario publica modelo (Step 5)
        │
        ▼
listOrUpgradeWithAgent() en MarketplaceV3
        │
        ├─► ¿Es versión 1 (nuevo modelo)?
        │         │
        │         ├─► SÍ: _createSplitterIfNeeded()
        │         │       └─► splitterFactory.createSplitter()
        │         │           └─► Emite SplitterCreated(modelId, splitterAddr)
        │         │
        │         └─► NO (upgrade): splitterFactory.aliasSplitter()
        │                 └─► Emite SplitterAliased(newModelId, origModelId)
        │
        └─► Modelo publicado con splitter asociado
```

### 2.3 Flujo de Pagos x402

```
Usuario hace inferencia x402
        │
        ▼
/api/inference/[modelId]/route.ts
        │
        ├─► getSplitter(modelId) desde SplitterFactory
        │
        ├─► ¿Existe splitter?
        │         │
        │         ├─► SÍ: payTo = splitterAddress
        │         │
        │         └─► NO: payTo = seller wallet (fallback)
        │
        └─► USDC transferido a payTo
                │
                ▼ (si fue a splitter)
        USDC acumulado en ModelSplitter.pendingDistribution()
```

---

## 3. Almacenamiento de Splitters

### 3.1 On-Chain (Fuente de Verdad) ✅

| Contrato | Mapping | Descripción |
|----------|---------|-------------|
| `SplitterFactory` | `splitters[modelId]` | Dirección del splitter |
| `SplitterFactory` | `splitterAlias[modelId]` | Para upgrades: apunta al modelId original |

**Funciones de consulta**:
```solidity
function getSplitter(uint256 modelId) external view returns (address);
function splitterExists(uint256 modelId) external view returns (bool);
```

### 3.2 Off-Chain (Neon DB) ❌ NO EXISTE

La tabla `models` actualmente NO tiene columna `splitter_address`.

**Schema actual**:
```sql
CREATE TABLE models (
  model_id INTEGER PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  owner TEXT NOT NULL,
  -- ... otros campos
  inference_wallet TEXT,      -- ✅ Existe
  inference_endpoint TEXT,    -- ✅ Existe
  -- splitter_address TEXT,   -- ❌ NO EXISTE
);
```

---

## 4. Funciones del ModelSplitter

### 4.1 distribute()
```solidity
function distribute() external;
```
- Procesa USDC pendiente (`pendingDistribution`)
- Calcula split según configuración:
  - `marketplaceBps` → balance del marketplace
  - `royaltyBps` → balance del creator
  - Resto → balance del seller
- Cualquiera puede llamarla (no requiere permisos)

### 4.2 withdraw()
```solidity
function withdraw() external;
```
- Retira TODO el balance del `msg.sender`
- Solo puede retirar su propio balance
- Transfiere USDC directamente a la wallet

### 4.3 withdrawAmount(uint256 amount)
```solidity
function withdrawAmount(uint256 amount) external;
```
- Retira cantidad específica
- Útil para retiros parciales

### 4.4 distributeAndWithdraw()
```solidity
function distributeAndWithdraw() external;
```
- Combina `distribute()` + `withdraw()` en 1 TX
- Más eficiente en gas
- Recomendado para la UI

### 4.5 View Functions
```solidity
function pendingDistribution() external view returns (uint256);
function balances(address account) external view returns (uint256);
function getAllBalances() external view returns (
    uint256 sellerBalance,
    uint256 creatorBalance,
    uint256 marketplaceBalance
);
function getSplitConfig() external view returns (
    address seller,
    address creator,
    address marketplace,
    uint256 royaltyBps
);
```

---

## 5. Problemas Identificados

### 5.1 Falta de UI para Retiros
- **Problema**: No existe página para ver balances ni retirar
- **Impacto**: Sellers/creators no pueden acceder a sus fondos fácilmente
- **Solución**: Crear página `/earnings` o `/withdrawals`

### 5.2 Splitters No Indexados
- **Problema**: `splitter_address` no está en Neon DB
- **Impacto**: Requiere consulta on-chain para cada modelo
- **Solución**: Agregar columna + actualizar indexer

### 5.3 Descubrimiento de Splitters
- **Problema**: Usuario no sabe qué splitters tiene
- **Impacto**: Debe conocer modelIds para consultar
- **Solución**: Listar modelos del usuario → obtener splitters

### 5.4 Sin Notificaciones
- **Problema**: Usuario no sabe cuándo tiene fondos disponibles
- **Impacto**: Fondos pueden quedar sin reclamar
- **Solución**: Futuro: webhooks o polling periódico

---

## 6. Plan de Implementación

### Fase 1: Indexar Splitters (Opcional pero recomendado)

#### 6.1.1 Nueva Migración SQL
```sql
-- db/migrations/005_splitter_address.sql

ALTER TABLE models 
ADD COLUMN IF NOT EXISTS splitter_address TEXT;

CREATE INDEX IF NOT EXISTS idx_models_splitter 
ON models(splitter_address) 
WHERE splitter_address IS NOT NULL;

COMMENT ON COLUMN models.splitter_address 
IS 'Address of the ModelSplitter contract for x402 revenue distribution.';
```

#### 6.1.2 Actualizar Indexer
```typescript
// src/lib/indexer.ts

import SPLITTER_FACTORY_ABI from '@/abis/SplitterFactory.json';

async function indexModelSplitter(modelId: number, chainId: number) {
  const splitterFactoryAddress = getChainConfig(chainId).splitterFactoryAddress;
  
  const splitterAddress = await publicClient.readContract({
    address: splitterFactoryAddress,
    abi: SPLITTER_FACTORY_ABI.abi,
    functionName: 'getSplitter',
    args: [BigInt(modelId)]
  });
  
  if (splitterAddress !== '0x0000000000000000000000000000000000000000') {
    await sql`
      UPDATE models 
      SET splitter_address = ${splitterAddress}
      WHERE model_id = ${modelId} AND chain_id = ${chainId}
    `;
  }
}
```

### Fase 2: Página de Earnings/Withdrawals

#### 6.2.1 Estructura de Archivos
```
src/
├── app/
│   └── [locale]/
│       └── earnings/
│           └── page.tsx              # Página principal
├── components/
│   ├── EarningsSummaryCard.tsx       # Resumen total
│   ├── SplitterCard.tsx              # Card por splitter
│   └── WithdrawModal.tsx             # Modal de retiro
├── hooks/
│   ├── useUserSplitters.ts           # Obtener splitters del usuario
│   ├── useSplitterBalances.ts        # Leer balances
│   └── useSplitterWithdraw.ts        # Ejecutar retiros
```

#### 6.2.2 Hook: useUserSplitters
```typescript
// src/hooks/useUserSplitters.ts

export function useUserSplitters(userAddress: string, chainId: number) {
  const [splitters, setSplitters] = useState<SplitterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchSplitters() {
      // 1. Obtener modelos del usuario
      const res = await fetch(`/api/indexed/models?owner=${userAddress}&chainId=${chainId}`);
      const models = await res.json();
      
      // 2. Para cada modelo, obtener splitter
      const splitterPromises = models.map(async (model) => {
        // Opción A: Si está indexado
        if (model.splitter_address) {
          return { modelId: model.model_id, splitterAddress: model.splitter_address };
        }
        
        // Opción B: Consulta on-chain
        const addr = await publicClient.readContract({
          address: SPLITTER_FACTORY_ADDRESS,
          abi: splitterFactoryAbi,
          functionName: 'getSplitter',
          args: [BigInt(model.model_id)]
        });
        
        return addr !== ZERO_ADDRESS 
          ? { modelId: model.model_id, splitterAddress: addr }
          : null;
      });
      
      const results = await Promise.all(splitterPromises);
      setSplitters(results.filter(Boolean));
      setLoading(false);
    }
    
    if (userAddress) fetchSplitters();
  }, [userAddress, chainId]);
  
  return { splitters, loading };
}
```

#### 6.2.3 Hook: useSplitterBalances
```typescript
// src/hooks/useSplitterBalances.ts

export function useSplitterBalances(splitterAddress: string) {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: splitterAddress,
        abi: modelSplitterAbi,
        functionName: 'pendingDistribution',
      },
      {
        address: splitterAddress,
        abi: modelSplitterAbi,
        functionName: 'getAllBalances',
      },
      {
        address: splitterAddress,
        abi: modelSplitterAbi,
        functionName: 'getSplitConfig',
      },
    ],
  });
  
  return {
    pendingDistribution: data?.[0]?.result || 0n,
    balances: {
      seller: data?.[1]?.result?.[0] || 0n,
      creator: data?.[1]?.result?.[1] || 0n,
      marketplace: data?.[1]?.result?.[2] || 0n,
    },
    config: {
      seller: data?.[2]?.result?.[0],
      creator: data?.[2]?.result?.[1],
      marketplace: data?.[2]?.result?.[2],
      royaltyBps: data?.[2]?.result?.[3],
    },
    isLoading,
    refetch,
  };
}
```

#### 6.2.4 Hook: useSplitterWithdraw
```typescript
// src/hooks/useSplitterWithdraw.ts

export function useSplitterWithdraw(splitterAddress: string) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  
  const distribute = async () => {
    const hash = await writeContractAsync({
      address: splitterAddress,
      abi: modelSplitterAbi,
      functionName: 'distribute',
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  };
  
  const withdraw = async () => {
    const hash = await writeContractAsync({
      address: splitterAddress,
      abi: modelSplitterAbi,
      functionName: 'withdraw',
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  };
  
  const distributeAndWithdraw = async () => {
    const hash = await writeContractAsync({
      address: splitterAddress,
      abi: modelSplitterAbi,
      functionName: 'distributeAndWithdraw',
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  };
  
  return { distribute, withdraw, distributeAndWithdraw };
}
```

#### 6.2.5 Componente: EarningsSummaryCard
```tsx
// src/components/EarningsSummaryCard.tsx

interface EarningsSummaryProps {
  totalPending: bigint;
  totalAvailable: bigint;
  splitterCount: number;
}

export function EarningsSummaryCard({ totalPending, totalAvailable, splitterCount }: EarningsSummaryProps) {
  const formatUsdc = (amount: bigint) => (Number(amount) / 1e6).toFixed(2);
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        {isES ? 'Resumen de Ganancias' : 'Earnings Summary'}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {isES ? 'Pendiente de procesar' : 'Pending Distribution'}
            </Typography>
            <Typography variant="h4" color="warning.main">
              ${formatUsdc(totalPending)}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {isES ? 'Disponible para retiro' : 'Available to Withdraw'}
            </Typography>
            <Typography variant="h4" color="success.main">
              ${formatUsdc(totalAvailable)}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {isES ? 'Modelos activos' : 'Active Models'}
            </Typography>
            <Typography variant="h4">
              {splitterCount}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
```

#### 6.2.6 Componente: SplitterCard
```tsx
// src/components/SplitterCard.tsx

interface SplitterCardProps {
  modelId: number;
  modelName: string;
  splitterAddress: string;
  userRole: 'seller' | 'creator' | 'marketplace';
  onWithdraw: () => void;
}

export function SplitterCard({ modelId, modelName, splitterAddress, userRole, onWithdraw }: SplitterCardProps) {
  const { pendingDistribution, balances, config, isLoading, refetch } = useSplitterBalances(splitterAddress);
  const { distribute, withdraw, distributeAndWithdraw } = useSplitterWithdraw(splitterAddress);
  const [processing, setProcessing] = useState(false);
  
  const userBalance = balances[userRole];
  const hasPending = pendingDistribution > 0n;
  const hasBalance = userBalance > 0n;
  
  const handleDistributeAndWithdraw = async () => {
    setProcessing(true);
    try {
      await distributeAndWithdraw();
      await refetch();
      onWithdraw();
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{modelName}</Typography>
        <Typography variant="caption" color="text.secondary">
          Model #{modelId}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Pending:</Typography>
            <Typography variant="body2" color="warning.main">
              ${(Number(pendingDistribution) / 1e6).toFixed(2)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Your Balance:</Typography>
            <Typography variant="body2" color="success.main">
              ${(Number(userBalance) / 1e6).toFixed(2)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      
      <CardActions>
        {hasPending && (
          <Button 
            size="small" 
            onClick={() => distribute()}
            disabled={processing}
          >
            Process Payments
          </Button>
        )}
        
        {hasBalance && (
          <Button 
            size="small" 
            variant="contained"
            onClick={handleDistributeAndWithdraw}
            disabled={processing}
          >
            Withdraw ${(Number(userBalance) / 1e6).toFixed(2)}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
```

---

## 7. Diseño de UI/UX

### 7.1 Wireframe de Página de Earnings

```
┌─────────────────────────────────────────────────────────────────┐
│  🏦 My Earnings                                    [Connect]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  EARNINGS SUMMARY                                        │    │
│  │  ┌──────────────┬──────────────┬──────────────┐         │    │
│  │  │ Pending      │ Available    │ Models       │         │    │
│  │  │ $125.50      │ $1,234.00    │ 5            │         │    │
│  │  │ (warning)    │ (success)    │              │         │    │
│  │  └──────────────┴──────────────┴──────────────┘         │    │
│  │                                                          │    │
│  │  [Process All & Withdraw] (primary button)               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MY MODELS                                               │    │
│  │                                                          │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐       │    │
│  │  │ Crypto Sentiment    │  │ Image Classifier    │       │    │
│  │  │ Model #4            │  │ Model #7            │       │    │
│  │  │ ─────────────────── │  │ ─────────────────── │       │    │
│  │  │ Pending:   $50.25   │  │ Pending:   $75.25   │       │    │
│  │  │ Available: $500.00  │  │ Available: $734.00  │       │    │
│  │  │ ─────────────────── │  │ ─────────────────── │       │    │
│  │  │ [Process] [Withdraw]│  │ [Process] [Withdraw]│       │    │
│  │  └─────────────────────┘  └─────────────────────┘       │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Estados de UI

| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| No wallet | Usuario no conectado | "Connect Wallet" |
| No models | Usuario sin modelos | "Publish your first model" |
| No splitters | Modelos sin splitters | Info: "Splitters created on publish" |
| Pending only | Solo fondos pendientes | "Process Payments" |
| Available only | Solo fondos disponibles | "Withdraw" |
| Both | Pendientes + disponibles | "Process & Withdraw" |
| Empty | Sin fondos | Info: "No earnings yet" |

### 7.3 Flujo de Transacciones

```
Usuario hace clic en "Withdraw"
        │
        ▼
¿Hay fondos pendientes?
        │
        ├─► SÍ: Mostrar modal "Process first?"
        │         │
        │         ├─► "Process & Withdraw": distributeAndWithdraw()
        │         │
        │         └─► "Just Withdraw": withdraw()
        │
        └─► NO: withdraw() directamente
                │
                ▼
        Mostrar estado de TX (pending → confirmed)
                │
                ▼
        Refetch balances
                │
                ▼
        Mostrar Snackbar de éxito
```

---

## 8. Consideraciones de Seguridad

### 8.1 Validaciones Frontend
- Verificar que usuario es seller/creator antes de mostrar botón withdraw
- Validar que balance > 0 antes de habilitar withdraw
- Mostrar estimación de gas antes de TX

### 8.2 Protecciones del Contrato
- `withdraw()` solo permite retirar balance propio
- `distribute()` es permissionless pero no extrae fondos
- ReentrancyGuard en todas las funciones de transferencia

### 8.3 UX de Seguridad
- Mostrar dirección del splitter (verificable en explorer)
- Confirmar monto antes de TX
- Link a TX en explorer después de confirmar

---

## 9. Estimación de Esfuerzo

| Tarea | Tiempo Estimado | Prioridad |
|-------|-----------------|-----------|
| Migración SQL splitter_address | 30 min | Media |
| Actualizar indexer | 1 hora | Media |
| Hook useUserSplitters | 2 horas | Alta |
| Hook useSplitterBalances | 1 hora | Alta |
| Hook useSplitterWithdraw | 1 hora | Alta |
| EarningsSummaryCard | 2 horas | Alta |
| SplitterCard | 3 horas | Alta |
| WithdrawModal | 2 horas | Media |
| Página /earnings | 3 horas | Alta |
| Testing E2E | 2 horas | Alta |
| **Total** | **~17 horas** | |

---

## 10. Próximos Pasos

### Inmediato (Hackathon)
1. ❌ No implementar - enfocarse en features core
2. ✅ Documentar plan (este documento)

### Post-Hackathon
1. Crear migración `005_splitter_address.sql`
2. Actualizar indexer
3. Implementar hooks
4. Crear componentes
5. Crear página `/earnings`
6. Testing

---

## Apéndice A: ABIs Relevantes

### SplitterFactory ABI (parcial)
```json
[
  {
    "name": "getSplitter",
    "type": "function",
    "inputs": [{ "name": "modelId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "splitterExists",
    "type": "function",
    "inputs": [{ "name": "modelId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "bool" }]
  }
]
```

### ModelSplitter ABI (parcial)
```json
[
  {
    "name": "distribute",
    "type": "function",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "withdraw",
    "type": "function",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "distributeAndWithdraw",
    "type": "function",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "pendingDistribution",
    "type": "function",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "name": "getAllBalances",
    "type": "function",
    "inputs": [],
    "outputs": [
      { "name": "sellerBalance", "type": "uint256" },
      { "name": "creatorBalance", "type": "uint256" },
      { "name": "marketplaceBalance", "type": "uint256" }
    ]
  }
]
```

---

## Apéndice B: Direcciones de Contratos

| Contrato | Red | Dirección |
|----------|-----|-----------|
| SplitterFactory | Fuji | `0xB1bA0794FaF3D8DC4CB96F1334ed1a8AC8a66555` |
| MarketplaceV3 | Fuji | `0xb62427B1b59eE5f246f2a8B37Fe45A1a536Cf56b` |
| USDC | Fuji | `0x5425890298aed601595a70AB815c96711a31Bc65` |

---

## Apéndice C: Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_EVM_SPLITTER_FACTORY_43113=0xB1bA0794FaF3D8DC4CB96F1334ed1a8AC8a66555
NEXT_PUBLIC_EVM_MARKETPLACE_43113=0xb62427B1b59eE5f246f2a8B37Fe45A1a536Cf56b
NEXT_PUBLIC_EVM_USDC_43113=0x5425890298aed601595a70AB815c96711a31Bc65
```
