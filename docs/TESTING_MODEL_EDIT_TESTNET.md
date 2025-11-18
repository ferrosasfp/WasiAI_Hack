# Guía de Testing: Model Edit/Update en Testnet

## 📋 Pre-requisitos

### 1. **Wallet Setup**
- [ ] Wallet instalada (MetaMask, Coinbase Wallet, etc.)
- [ ] Conectada a testnet (Avalanche Fuji o Base Sepolia)
- [ ] Fondos de testnet disponibles

### 2. **Obtener Fondos de Testnet**

**Avalanche Fuji (chainId: 43113):**
```bash
# Faucet oficial
https://faucet.avax.network/
# Pedir AVAX a tu address
```

**Base Sepolia (chainId: 84532):**
```bash
# Faucet de Coinbase
https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
# O usar bridge desde Sepolia ETH
```

### 3. **Verificar Configuración del Proyecto**

```bash
# Verificar que las variables de entorno estén configuradas
cat .env.local

# Debe incluir:
NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=43113  # Para Fuji
# o
NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=84532  # Para Base Sepolia

# Verificar address del smart contract
# src/config/addresses.ts debe tener el address correcto del Marketplace
```

### 4. **Tener un Modelo Publicado**

Para testing necesitas:
- [ ] Un modelo ya publicado en testnet
- [ ] Conocer el `modelId` (ej: 1, 2, 3...)
- [ ] La wallet conectada debe ser el **owner** del modelo
- [ ] El modelo debe tener `listed: true` inicialmente

---

## 🧪 Plan de Testing

### **Fase 1: Verificación de Ownership**

#### Test 1.1: Owner ve controles
**URL:** `/en/evm/models/[id]`

**Pasos:**
1. Conectar wallet que **es owner** del modelo
2. Navegar a la página del modelo
3. Scroll hasta después de "Technical Configuration"

**Resultado esperado:**
✅ Ves un Paper violeta con título "Opciones de edición" / "Edit options"
✅ Dos botones visibles:
   - 🟣 "Edición rápida" (contained, gradient purple)
   - 🟪 "Nueva versión" (outlined, purple border)

**Screenshot:** Capturar para documentación

---

#### Test 1.2: Non-owner NO ve controles
**Pasos:**
1. Desconectar wallet actual
2. Conectar una wallet **diferente** (que no sea owner)
3. Navegar a la misma página `/en/evm/models/[id]`

**Resultado esperado:**
✅ NO ves el Paper de "Opciones de edición"
✅ La sección simplemente no existe en la página

---

### **Fase 2: Quick Edit - Cambio de Precios**

#### Test 2.1: Abrir Quick Edit Drawer
**Pasos:**
1. Como owner, click en "Edición rápida"

**Resultado esperado:**
✅ Drawer se abre desde la derecha
✅ Título: "Edición rápida" / "Quick edit"
✅ Todos los campos prellenados con valores actuales:
   - Precio perpetuo (en wei)
   - Precio suscripción (en wei)
   - Duración base (meses)
   - Checkboxes de derechos (API, Download)
   - Select de modo de entrega
   - Terms hash
   - Switch de "Listado"

**Screenshot:** Capturar drawer abierto

---

#### Test 2.2: Modificar precio perpetual
**Setup previo:**
```bash
# Anotar precio actual del modelo
# Ejemplo: 1000000000000000000 wei (1 AVAX)
```

**Pasos:**
1. En drawer, modificar "Precio perpetuo (wei)"
2. Cambiar a: `2000000000000000000` (2 AVAX)
3. Click "Guardar" / "Save"
4. Aprobar la transacción en MetaMask
5. Esperar confirmación

**Resultado esperado:**
✅ Snackbar verde: "Modelo actualizado exitosamente. Recargando..."
✅ Drawer se cierra
✅ Página se recarga después de 1.5s
✅ Verificar en la página que el precio ahora dice "2.00 AVAX"

**Verificación on-chain:**
```bash
# Opción 1: Ver en block explorer
https://testnet.snowtrace.io/ (Fuji)
https://sepolia.basescan.org/ (Base)

# Buscar la tx por hash
# Verificar evento emitido: LicensingParamsSet
# Verificar args: modelId, newPricePerpetual=2000000000000000000
```

---

#### Test 2.3: Modificar precio suscripción y duración
**Pasos:**
1. Abrir drawer nuevamente
2. Modificar "Precio suscripción (wei)": `100000000000000000` (0.1 AVAX/mes)
3. Modificar "Duración base (meses)": `6`
4. Guardar y aprobar tx

**Resultado esperado:**
✅ Tx confirmada
✅ Página recargada
✅ Precio de suscripción visible: "0.10 AVAX/mo"
✅ En la info del modelo debe reflejar "6 meses de duración base"

---

#### Test 2.4: Cambiar derechos (rights)
**Pasos:**
1. Abrir drawer
2. **Desmarcar** checkbox "Descarga del modelo" (Download)
3. Dejar solo "Uso de API" (API) marcado
4. Guardar y aprobar tx

**Resultado esperado:**
✅ Tx confirmada
✅ En la sección de precios/rights de la página:
   - ✅ Chip "API Access" visible
   - ❌ Chip "Model Download" NO visible o tachado
✅ Botón "Descargar artifacts" debe estar disabled

**Verificación on-chain:**
```bash
# En block explorer, verificar evento LicensingParamsSet
# rights bitmask debe ser 1 (solo API)
# Antes era 3 (API + Download)
```

---

### **Fase 3: Quick Edit - Toggle Listed Status**

#### Test 3.1: Deslistar modelo
**Pasos:**
1. Verificar que modelo esté listado (visible en `/en/evm/models`)
2. Abrir Quick Edit Drawer
3. **Desactivar** switch "Listado" / "Listed"
4. Guardar y aprobar tx

**Resultado esperado:**
✅ Tx confirmada con evento `ListedSet(modelId, false)`
✅ Página recargada
✅ Navegar a `/en/evm/models`
✅ El modelo **NO debe aparecer** en la lista pública

---

#### Test 3.2: Re-listar modelo
**Pasos:**
1. Navegar directamente a `/en/evm/models/[id]` (URL directa)
2. Como owner, abrir Quick Edit Drawer
3. **Activar** switch "Listado" / "Listed"
4. Guardar y aprobar tx

**Resultado esperado:**
✅ Tx confirmada con evento `ListedSet(modelId, true)`
✅ Navegar a `/en/evm/models`
✅ El modelo **vuelve a aparecer** en la lista pública

---

### **Fase 4: Upgrade Mode - Nueva Versión**

#### Test 4.1: Navegar al wizard en modo upgrade
**Pasos:**
1. En página del modelo, click "Nueva versión" / "New version"
2. Verificar redirección

**Resultado esperado:**
✅ URL: `/en/publish/wizard/step1?mode=upgrade&modelId=[id]`
✅ Page loading muestra "Cargando modelo existente..." / "Loading existing model..."

---

#### Test 4.2: Verificar prefill en Step 1
**Esperar carga completa (~3-5 segundos)**

**Resultado esperado - Campos prellenados:**
✅ **Nombre**: Mismo que el modelo original
✅ **Summary/Tagline**: Mismo texto
✅ **Slug**: Mismo slug (campo debe estar bloqueado/readonly)
✅ **Cover image**: Imagen del modelo cargada desde IPFS
✅ **Technical categories**: Chips prellenados
✅ **Technical tags**: Chips prellenados
✅ **Business category**: Dropdown con valor seleccionado
✅ **Model type**: Dropdown con valor seleccionado
✅ **Author display name**: Prellenado
✅ **Social links**: Prellenados si existen

**Screenshot:** Capturar Step 1 completamente prellenado

---

#### Test 4.3: Modificar cover image
**Pasos:**
1. Click en botón de upload de cover image
2. Seleccionar una imagen **diferente** a la actual
3. Esperar upload a IPFS (~10-30 segundos)
4. Verificar preview de nueva imagen

**Resultado esperado:**
✅ Nueva imagen visible en preview
✅ Upload exitoso con nuevo CID

---

#### Test 4.4: Avanzar a Step 2-4
**Pasos:**
1. Click "Siguiente" en Step 1
2. Navegar rápidamente por Steps 2, 3, 4 sin modificar
   - (Opcionalmente modificar algunos campos para testing)
3. Click "Siguiente" hasta llegar a Step 5

**Nota:** Por ahora Steps 2-4 NO se precargan automáticamente
(Esto está en la lista de mejoras futuras)

---

#### Test 4.5: Verificar Step 5 - Upgrade Mode
**En Step 5:**

**Resultado esperado:**
✅ Junto al título "Review & Publish" ves un chip naranja:
   - 🔄 "Modo actualización" (ES)
   - 🔄 "Upgrade mode" (EN)
✅ Review muestra todos los datos (Step 1 modificado + Steps 2-4)

**Screenshot:** Capturar chip de upgrade mode

---

#### Test 4.6: Publicar nueva versión
**Setup previo:**
```bash
# Anotar:
# - modelId actual: [ej: 1]
# - slug actual: [ej: "customer-segmentation-model"]
```

**Pasos:**
1. Verificar fondos suficientes en wallet (gas fees)
2. Marcar checkbox "Acepto términos y condiciones"
3. Click "Publicar" / "Publish"
4. Aprobar transacción en MetaMask
5. Esperar confirmación (~30-60 segundos)

**Resultado esperado:**
✅ Mensaje: "Actualización completada" / "Upgrade completed"
✅ Result box verde con tx hash
✅ Dialog "¿Empezar un nuevo listado?"

**Verificación on-chain:**
```bash
# En block explorer:
# 1. Buscar evento ModelPublished
#    - Verificar nuevo modelId (ej: 5)
#    - Verificar slug es el MISMO que antes
#    - Verificar nuevo URI (nuevo CID de IPFS)

# 2. Buscar evento ListedSet
#    - Debe haber uno para el nuevo modelId (true)
#    - Debe haber uno para el viejo modelId (false)
```

---

#### Test 4.7: Verificar nueva versión publicada
**Pasos:**
1. Navegar a `/en/evm/models`
2. Buscar el modelo por su nombre

**Resultado esperado:**
✅ Solo aparece **UNA versión** del modelo
✅ Es la versión **nueva** (nuevo modelId)
✅ Cover image es la **nueva** que subiste
✅ Slug permanece **igual**

---

#### Test 4.8: Verificar versión anterior deslistada
**Pasos:**
1. Navegar directamente a `/en/evm/models/[oldModelId]`
   (URL del modelo antiguo)

**Resultado esperado:**
✅ Modelo todavía visible (no se elimina)
✅ Pero debe tener algún indicador de "Deslistado" o no aparecer en lista pública
✅ Owner puede ver ambas versiones con URLs directas

---

### **Fase 5: Edge Cases y Validaciones**

#### Test 5.1: Validación de precios
**Pasos:**
1. Abrir Quick Edit Drawer
2. Intentar guardar con **ambos precios en 0**

**Resultado esperado:**
❌ Error: "Se requiere al menos un precio" / "At least one price required"
❌ Botón "Guardar" disabled

---

#### Test 5.2: Validación de suscripción sin duración
**Pasos:**
1. Establecer precio suscripción > 0
2. Establecer duración = 0
3. Intentar guardar

**Resultado esperado:**
❌ Error: "Suscripción requiere duración > 0"
❌ Botón "Guardar" disabled

---

#### Test 5.3: Validación de derechos
**Pasos:**
1. **Desmarcar** ambos checkboxes (API y Download)
2. Intentar guardar

**Resultado esperado:**
❌ Error: "Debe seleccionar al menos un derecho"
❌ Botón "Guardar" disabled

---

#### Test 5.4: Cancelar edición
**Pasos:**
1. Abrir drawer
2. Modificar varios campos
3. Click "Cancelar" / "Cancel"

**Resultado esperado:**
✅ Drawer se cierra
✅ Cambios NO se guardan
✅ Modelo permanece sin cambios

---

## 📊 Checklist de Completitud

### Quick Edit
- [ ] Owner ve controles
- [ ] Non-owner NO ve controles
- [ ] Drawer abre con prefill correcto
- [ ] Cambio de precio perpetual funciona
- [ ] Cambio de precio suscripción funciona
- [ ] Cambio de duración funciona
- [ ] Cambio de derechos (rights) funciona
- [ ] Cambio de delivery mode funciona
- [ ] Toggle listed ON funciona
- [ ] Toggle listed OFF funciona
- [ ] Validaciones funcionan correctamente
- [ ] Snackbar muestra mensaje de éxito
- [ ] Página recarga con datos actualizados

### Upgrade Mode
- [ ] Navegación al wizard funciona
- [ ] Step 1 se precarga correctamente
- [ ] Modificación de cover funciona
- [ ] Step 5 muestra chip de upgrade mode
- [ ] Publicación crea nueva versión
- [ ] Mismo slug, nuevo modelId
- [ ] Nueva versión aparece en lista pública
- [ ] Versión anterior se deslista automáticamente
- [ ] Wizard se resetea tras éxito

---

## 🐛 Troubleshooting

### Problema: "Drawer no abre"
**Causa probable:** Error de JavaScript
**Solución:**
```bash
# Verificar consola del navegador
# Buscar errores en DevTools
# Verificar que todos los imports estén correctos
```

### Problema: "Campos no se precargan"
**Causa probable:** Data fetching falla
**Solución:**
```bash
# Verificar Network tab en DevTools
# Asegurarse que /api/models/evm/[id] devuelve 200
# Verificar que model.uri_cid existe y es válido
# Verificar que IPFS gateway funciona
```

### Problema: "Tx falla al ejecutar"
**Causas probables:**
1. Fondos insuficientes (gas)
2. No eres el owner
3. Parámetros inválidos

**Solución:**
```bash
# Verificar fondos en wallet
# Verificar ownership en smart contract:
# - Llamar a Marketplace.getModel(modelId)
# - Verificar model.owner === walletAddress

# Verificar parámetros en consola antes de enviar tx
console.log({ pricePerpetual, priceSubscription, rights, ... })
```

### Problema: "Página no recarga tras éxito"
**Causa probable:** setTimeout no se ejecuta
**Solución:**
```bash
# Verificar que onSuccess callback se ejecuta
# Agregar console.log en ModelPageClient.tsx línea ~1622
console.log('Quick edit success callback fired')
```

---

## 📝 Documentación de Resultados

### Template de reporte de testing

```markdown
## Testing Report - Model Edit/Update

**Fecha:** [DD/MM/YYYY]
**Testnet:** [Avalanche Fuji / Base Sepolia]
**Chain ID:** [43113 / 84532]
**Tester:** [Tu nombre]

### Wallet Info
- Address: 0x...
- Fondos iniciales: X AVAX/ETH
- Fondos finales: Y AVAX/ETH

### Modelo de Prueba
- Model ID original: [1]
- Slug: [customer-segmentation]
- Owner: [0x...]

### Resultados

#### Quick Edit
| Test | Status | Notes | Tx Hash |
|------|--------|-------|---------|
| Cambio precio perpetual | ✅/❌ | | 0x... |
| Cambio precio suscripción | ✅/❌ | | 0x... |
| Cambio derechos | ✅/❌ | | 0x... |
| Toggle listed OFF | ✅/❌ | | 0x... |
| Toggle listed ON | ✅/❌ | | 0x... |

#### Upgrade Mode
| Test | Status | Notes | Tx Hash |
|------|--------|-------|---------|
| Prefill Step 1 | ✅/❌ | | N/A |
| Cambio cover | ✅/❌ | Nuevo CID: Qm... | N/A |
| Publicar nueva versión | ✅/❌ | Nuevo modelId: X | 0x... |

### Screenshots
- [Adjuntar screenshots]

### Issues Encontrados
- [Listar cualquier bug o problema]

### Gas Costs (Aproximados)
- setLicensingParams: ~XXX,XXX gas
- setListed: ~XX,XXX gas
- listOrUpgrade: ~XXX,XXX gas
```

---

## ✅ Criterios de Aceptación Final

La funcionalidad está lista para producción cuando:

- [ ] Todos los tests de Quick Edit pasan (13/13)
- [ ] Todos los tests de Upgrade Mode pasan (9/9)
- [ ] Edge cases validados (4/4)
- [ ] No hay errores en consola
- [ ] Gas costs son razonables
- [ ] UX es fluida (sin lags, reloads funcionan)
- [ ] Documentación de testing completa
- [ ] Al menos 2 personas han testeado exitosamente

---

## 🚀 Siguientes Pasos Post-Testing

1. **Corregir bugs** encontrados durante testing
2. **Optimizar gas costs** si son muy altos
3. **Agregar analytics** para trackear uso
4. **Deployment a producción** (mainnet)
5. **Comunicar feature** a usuarios existentes

---

## 📞 Contacto y Soporte

Si encuentras problemas durante el testing:
1. Documentar claramente el issue
2. Capturar screenshots/video
3. Incluir tx hash si aplica
4. Compartir con el equipo de desarrollo
