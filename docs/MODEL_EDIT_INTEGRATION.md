# Guía de Integración: Edición de Modelos EVM

## 📋 Estado de Implementación

### ✅ Completado

1. **Adapters de escritura** (`src/adapters/evm/write.ts`)
   - `setLicensingParamsTx()` - Actualiza pricing/licensing
   - `setListedTx()` - Cambia estado de listado
   - `listOrUpgradeTx()` - Crea nueva versión
   - Helpers: `rightsArrayToBitmask()`, `rightsBitmaskToArray()`, `isValidRights()`

2. **APIs de escritura**
   - `POST /api/models/evm/[id]/licensing` - Edición rápida de licensing
   - `POST /api/models/evm/[id]/listed` - Cambio de estado de listado
   - `POST /api/models/evm/[id]/upgrade` - Nueva versión con metadata IPFS

3. **Componentes UI**
   - `ModelEditControls` - Botones de edición (solo para owner)
   - `QuickEditDrawer` - Drawer de edición rápida con formulario completo

### 🔄 Pendiente

1. **Integración en ModelPageClient**
2. **Extensión del wizard para modo upgrade**
3. **Cache invalidation**
4. **Testing end-to-end**

---

## 🔧 Paso 1: Integrar en ModelPageClient

Archivo: `src/app/[locale]/evm/models/[id]/ModelPageClient.tsx`

### 1.1 Importar componentes

```tsx
import { ModelEditControls } from '@/components/ModelEditControls'
import { QuickEditDrawer } from '@/components/QuickEditDrawer'
import { useAccount } from 'wagmi'
```

### 1.2 Añadir estados

```tsx
export default function ModelPageClient(props: ModelPageClientProps) {
  // ... estados existentes ...
  
  // Edición de modelo
  const [quickEditOpen, setQuickEditOpen] = React.useState(false)
  const { address: currentAddress } = useAccount()
  
  // ... resto del código ...
}
```

### 1.3 Agregar controles en la UI

Insertar después del botón "Comprar licencia" y antes de las cards de licencias:

```tsx
{/* Edit controls (solo owner) */}
{data && (
  <ModelEditControls
    modelId={modelId}
    ownerAddress={data.owner}
    currentAddress={currentAddress}
    onQuickEdit={() => setQuickEditOpen(true)}
  />
)}

{/* Quick Edit Drawer */}
{data && (
  <QuickEditDrawer
    open={quickEditOpen}
    onClose={() => setQuickEditOpen(false)}
    modelId={modelId}
    chainId={evmChainId}
    chainSymbol={evmSymbol}
    initialValues={{
      pricePerpetual: String(data.price_perpetual || '0'),
      priceSubscription: String(data.price_subscription || '0'),
      defaultDurationMonths: Math.floor((data.default_duration_days || 30) / 30),
      rights: rightsBitmaskToArray(data.delivery_rights_default || 1),
      deliveryMode: data.delivery_mode_hint === 1 ? 'API' : data.delivery_mode_hint === 2 ? 'Download' : 'Both',
      termsHash: data.terms_hash || '',
      listed: data.listed ?? true,
    }}
    onSuccess={() => {
      // Invalidar cache y refrescar modelo
      mutate() // Si usas SWR
      setQuickEditOpen(false)
    }}
  />
)}
```

---

## 🔧 Paso 2: Extender Wizard para modo upgrade

Archivo: `src/app/[locale]/publish/wizard/page.tsx`

### 2.1 Detectar modo upgrade

```tsx
'use client'

import { useSearchParams } from 'next/navigation'

export default function WizardPage() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') // 'new' o 'upgrade'
  const modelId = searchParams.get('modelId')
  
  const [step, setStep] = React.useState(1)
  const [wizardData, setWizardData] = React.useState<any>({})
  
  // ... resto del código ...
}
```

### 2.2 Prefill cuando mode=upgrade

```tsx
React.useEffect(() => {
  if (mode === 'upgrade' && modelId) {
    // Cargar modelo actual
    fetch(`/api/models/evm/${modelId}`)
      .then(res => res.json())
      .then(data => {
        // Mapear a formato del wizard
        setWizardData({
          // Step 1
          name: data.name,
          tagline: data.metadata?.tagline,
          summary: data.metadata?.summary,
          cover: data.metadata?.cover,
          categories: data.categories,
          
          // Step 2
          customer: data.metadata?.customer,
          
          // Step 3
          technical: data.metadata?.technical,
          artifacts: data.metadata?.artifacts,
          demo: data.metadata?.demo,
          
          // Step 4
          royaltyPercent: (data.royalty_bps || 0) / 100,
          pricePerpetual: String(data.price_perpetual || '0'),
          priceSubscription: String(data.price_subscription || '0'),
          defaultDurationMonths: Math.floor((data.default_duration_days || 30) / 30),
          rights: rightsBitmaskToArray(data.delivery_rights_default || 1),
          deliveryMode: data.metadata?.licensing?.deliveryMode || 'API',
          termsText: data.metadata?.licensing?.terms?.textMarkdown || '',
          termsSummary: data.metadata?.licensing?.terms?.summaryBullets || [],
          
          // Metadata extra
          slug: data.slug || `model-${modelId}`,
          chainId: data.chain_id,
        })
      })
      .catch(err => console.error('Error loading model for upgrade:', err))
  }
}, [mode, modelId])
```

### 2.3 Ajustar submit final (Step 5)

```tsx
const handlePublish = async () => {
  try {
    if (mode === 'upgrade') {
      // Llamar a API de upgrade
      const res = await fetch(`/api/models/evm/${modelId}/upgrade`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chainId: wizardData.chainId,
          slug: wizardData.slug,
          name: wizardData.name,
          tagline: wizardData.tagline,
          summary: wizardData.summary,
          cover: wizardData.cover,
          categories: wizardData.categories,
          customer: wizardData.customer,
          technical: wizardData.technical,
          artifacts: wizardData.artifacts,
          demo: wizardData.demo,
          royaltyPercent: wizardData.royaltyPercent,
          pricePerpetual: wizardData.pricePerpetual,
          priceSubscription: wizardData.priceSubscription,
          defaultDurationMonths: wizardData.defaultDurationMonths,
          rights: wizardData.rights,
          deliveryMode: wizardData.deliveryMode,
          termsText: wizardData.termsText,
          termsSummary: wizardData.termsSummary,
        }),
      })
      
      const upgradeData = await res.json()
      
      // Firmar tx con wagmi
      const txHash = await writeContractAsync(upgradeData.tx)
      
      // Esperar confirmación
      await waitForTransactionReceipt({ hash: txHash })
      
      // Redirigir a nuevo modelo (el backend debe devolver newId)
      router.push(`/${locale}/evm/models/${upgradeData.newId}`)
      
    } else {
      // Flujo normal de publicación
      // ... código existente ...
    }
  } catch (err) {
    console.error('Publish error:', err)
  }
}
```

---

## 🔧 Paso 3: Cache Invalidation

### 3.1 Crear utilidad de invalidación

Archivo: `src/lib/cache/invalidateModel.ts`

```ts
/**
 * Invalidate model cache after updates
 */
export async function invalidateModelCache(modelId: number) {
  // Si usas Redis en el backend
  if (typeof window === 'undefined') {
    // Server-side: invalidar Redis
    // const redis = await getRedisClient()
    // await redis.del(`model:evm:v1:${modelId}`)
  }
  
  // Client-side: invalidar SWR/React Query
  // mutate(`/api/models/evm/${modelId}`)
  
  console.log(`Cache invalidated for model ${modelId}`)
}
```

### 3.2 Llamar tras cada cambio

En `QuickEditDrawer.tsx`:

```tsx
onSuccess?.()
invalidateModelCache(modelId) // Añadir
onClose()
```

En wizard después de upgrade:

```tsx
await waitForTransactionReceipt({ hash: txHash })
invalidateModelCache(modelId) // Añadir
router.push(`/${locale}/evm/models/${newId}`)
```

---

## 🔧 Paso 4: Validaciones adicionales

### 4.1 Backend: ownership check

Añadir en cada API route:

```ts
// Ejemplo en /api/models/evm/[id]/licensing/route.ts

// Obtener wallet address del usuario (desde header o auth)
const walletAddress = request.headers.get('X-Wallet-Address')

if (!walletAddress) {
  return NextResponse.json(
    { error: 'Wallet address required' },
    { status: 401 }
  )
}

// Verificar ownership on-chain
const modelInfo = await getModelInfo(modelId, chainId)

if (modelInfo.owner.toLowerCase() !== walletAddress.toLowerCase()) {
  return NextResponse.json(
    { error: 'Only model owner can update' },
    { status: 403 }
  )
}
```

### 4.2 Frontend: pre-validación

Antes de mostrar controles, verificar que la wallet esté conectada:

```tsx
if (!currentAddress) {
  return (
    <Alert severity="info">
      {isES 
        ? 'Conecta tu wallet para editar el modelo'
        : 'Connect your wallet to edit the model'}
    </Alert>
  )
}
```

---

## 📝 Checklist Final

### Antes de mergear

- [ ] Testear edición rápida (licensing) en Fuji/Testnet
- [ ] Testear cambio de listed status
- [ ] Testear upgrade completo (nueva versión)
- [ ] Verificar que solo owner ve controles
- [ ] Verificar validaciones de pricing/rights
- [ ] Verificar que cache se invalida correctamente
- [ ] Verificar mensajes de éxito/error localizados
- [ ] Verificar redireccionamiento tras upgrade

### Testing manual

1. **Quick Edit**
   - Conectar wallet como owner
   - Hacer clic en "Edición rápida"
   - Cambiar precio perpetuo
   - Guardar y firmar tx
   - Verificar que el detalle se actualiza

2. **Listed toggle**
   - En quick edit, cambiar estado de "Listado"
   - Guardar
   - Verificar que el modelo se deslista/lista en el listado público

3. **Upgrade**
   - Hacer clic en "Nueva versión"
   - Wizard precarga datos actuales
   - Cambiar cover image
   - Añadir nuevo artifact
   - Publicar (sube IPFS + llama listOrUpgrade)
   - Verificar redireccionamiento a nueva versión
   - Verificar que versión anterior quedó deslistada

---

## 🎯 Archivos Creados

```
src/adapters/evm/write.ts                         ✅ Adapters de tx
src/app/api/models/evm/[id]/licensing/route.ts    ✅ API licensing
src/app/api/models/evm/[id]/listed/route.ts       ✅ API listed
src/app/api/models/evm/[id]/upgrade/route.ts      ✅ API upgrade
src/components/ModelEditControls.tsx              ✅ UI controls
src/components/QuickEditDrawer.tsx                ✅ Drawer edición
docs/MODEL_EDIT_INTEGRATION.md                    ✅ Esta guía
```

---

## 🚀 Próximos Pasos

1. Integrar `ModelEditControls` y `QuickEditDrawer` en `ModelPageClient.tsx`
2. Extender wizard con modo `upgrade` y prefill
3. Añadir cache invalidation
4. Testing en testnet (Avalanche Fuji o Base Sepolia)
5. Deploy a producción

---

**Nota**: Esta implementación ya incluye todas las validaciones centralizadas (fees, royalty, timeouts) que acabamos de refactorizar. Todo se apoya en los configs de `src/config/*`.
