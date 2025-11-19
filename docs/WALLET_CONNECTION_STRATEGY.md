# 🔐 Estrategia de Conexión de Wallet

## 📋 Resumen Ejecutivo

La conexión de wallet **NO es requerida** para navegación y exploración. Solo se requiere para **acciones que modifican estado on-chain**.

---

## ✅ Acciones SIN Wallet (Navegación Pública)

Estas acciones funcionan sin conectar wallet usando un **chainId por defecto** configurado en `.env.local`:

### **1. Explorar Modelos**
- ✅ Ver lista de modelos publicados
- ✅ Buscar y filtrar modelos
- ✅ Ver categorías e industrias

### **2. Ver Detalle de Modelo**
- ✅ Ver información completa del modelo
- ✅ Ver precios (perpetual y subscription)
- ✅ Ver términos y condiciones
- ✅ Ver documentación técnica
- ✅ Ver requisitos de hardware
- ✅ Ver ejemplos de uso

### **3. Lectura de Información**
- ✅ Ver perfil del autor
- ✅ Leer especificaciones técnicas
- ✅ Ver artifacts disponibles
- ✅ Ver demos (si están públicas)

**Red utilizada:** La configurada en `NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID` (ejemplo: Avalanche Fuji 43113)

**Mensaje al usuario:** 
```
ℹ️ Navegando en: Avalanche Fuji. Conecta tu wallet para cambiar 
de red o realizar acciones (comprar, publicar, editar).
```

---

## 🔐 Acciones CON Wallet (Requieren Transacciones)

Estas acciones **requieren wallet conectada** porque interactúan con la blockchain:

### **1. Comprar Licencia**
- ❌ Requiere wallet conectada
- **Por qué:** Necesita firmar transacción y pagar con crypto
- **Flujo:**
  1. Usuario sin wallet click en "Comprar licencia"
  2. Muestra mensaje: "🔗 Por favor conecta tu wallet para comprar una licencia"
  3. Usuario conecta wallet
  4. Se abre diálogo de compra
  5. Usuario firma transacción

### **2. Publicar Modelo**
- ❌ Requiere wallet conectada desde el inicio
- **Por qué:** Necesita firmar transacción, pagar gas fees, y registrar modelo on-chain
- **Validación:** Al entrar al wizard `/publish/wizard`

### **3. Editar Modelo (Quick Edit)**
- ❌ Requiere wallet conectada
- **Por qué:** Necesita verificar ownership y firmar transacción
- **Validación:** Botón "Edición rápida" solo aparece si:
  - Wallet está conectada
  - `currentAddress === ownerAddress`

### **4. Upgrade de Modelo (Nueva Versión)**
- ❌ Requiere wallet conectada
- **Por qué:** Necesita verificar ownership, subir a IPFS, y firmar transacción
- **Validación:** Botón "Nueva versión" solo aparece si:
  - Wallet está conectada
  - `currentAddress === ownerAddress`

---

## 🎯 Prioridad de ChainID Detection

El sistema detecta el chainId en este orden:

### **Para Navegación (Sin Wallet)**
```typescript
1. ENV Default → NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID
   - Permite exploración sin wallet
   - Red por defecto (ej: Fuji 43113)

2. URL Param → ?chainId=84532
   - Override manual para testing
   - Útil para desarrollo

3. Wallet → Conectada opcional
   - Permite cambiar de red
   - Override del default
```

### **Para Acciones (Con Wallet)**
```typescript
1. Wallet ChainID → Auto-detect
   - Usuario puede estar en cualquier red
   - Sistema valida si es red soportada

2. Auto-switch → Si está en red incorrecta
   - Pide cambiar de red
   - Muestra cuál es la red esperada
```

---

## 🔄 Flujos de Usuario

### **Flujo 1: Explorador (Sin Wallet)**

```mermaid
Usuario → Abre /evm/models/1
  ↓
Sistema detecta chainId por defecto (Fuji)
  ↓
Muestra modelo completo
  ↓
[Info] "Navegando en: Avalanche Fuji"
  ↓
Usuario puede leer TODO sin wallet
```

**Resultado:** ✅ Experiencia completa de navegación

---

### **Flujo 2: Comprador (Conecta Wallet)**

```mermaid
Usuario → Ve modelo sin wallet
  ↓
Click en "Comprar licencia"
  ↓
[Mensaje] "🔗 Conecta tu wallet para comprar"
  ↓
Usuario conecta MetaMask (red: Fuji)
  ↓
Sistema detecta chainId de wallet
  ↓
Abre diálogo de compra
  ↓
Usuario firma transacción
  ↓
✅ Licencia NFT emitida
```

**Resultado:** ✅ Compra exitosa con wallet conectada

---

### **Flujo 3: Editor (Owner con Wallet)**

```mermaid
Usuario → Abre modelo sin wallet
  ↓
❌ Botones de edición NO visibles
  ↓
Usuario conecta wallet
  ↓
Sistema verifica: currentAddress === ownerAddress
  ↓
✅ Botones de edición aparecen
  ↓
Usuario puede editar/upgrade
```

**Resultado:** ✅ Solo el owner puede editar

---

### **Flujo 4: Cambio de Red (Wallet Conectada)**

```mermaid
Usuario → Conectado a Fuji
  ↓
Modelo cargado desde Fuji
  ↓
Usuario cambia a Base Sepolia en MetaMask
  ↓
Sistema detecta nuevo chainId
  ↓
Recarga página automáticamente
  ↓
Busca mismo modelo en Base Sepolia
```

**Resultado:** ✅ Flexibilidad multi-chain

---

## 📝 Mensajes al Usuario

### **Navegando sin Wallet (Info Azul)**
```
ℹ️ Navegando en: Avalanche Fuji
Conecta tu wallet para cambiar de red o realizar acciones 
(comprar, publicar, editar).
```

### **Acción Requiere Wallet (Warning Amarillo)**
```
🔗 Por favor conecta tu wallet para comprar una licencia
```

### **Red Incorrecta (Warning Naranja)**
```
⚠️ Tu wallet está en Ethereum Mainnet
Por favor cambia a Avalanche Fuji para ver este modelo
```

### **Error de Configuración (Error Rojo)**
```
⚙️ Configuración requerida
No se pudo detectar una red blockchain. Por favor configura 
NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID en .env.local
```

---

## ⚙️ Configuración Requerida

### **`.env.local` (Mínimo)**

```bash
# ChainID por defecto para navegación pública
NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=43113  # Avalanche Fuji (Testnet)

# Contract addresses por red
NEXT_PUBLIC_EVM_MARKET_43113=0x...  # Marketplace en Fuji
NEXT_PUBLIC_EVM_MARKET_84532=0x...  # Marketplace en Base Sepolia

# RPC URLs (opcional, usa públicos por defecto)
NEXT_PUBLIC_AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
```

### **Redes Soportadas**

| Red | ChainID | Tipo | Símbolo | Uso |
|-----|---------|------|---------|-----|
| Avalanche Fuji | 43113 | Testnet | AVAX | Testing |
| Base Sepolia | 84532 | Testnet | ETH | Testing |
| Avalanche Mainnet | 43114 | Mainnet | AVAX | Producción |
| Base Mainnet | 8453 | Mainnet | ETH | Producción |

---

## 🧪 Testing

### **Test 1: Navegación sin Wallet**
```bash
# 1. Asegúrate de NO tener wallet conectada
# 2. Abre: http://localhost:3000/en/evm/models/1
# 3. Verifica que puedes ver TODO el detalle
# 4. Verifica mensaje azul: "Navegando en: Avalanche Fuji"
# 5. Click en "Comprar licencia"
# 6. Verifica mensaje: "🔗 Conecta tu wallet"
```

**Resultado esperado:** ✅ Navegación completa sin wallet, botón de compra pide conectar

---

### **Test 2: Compra con Wallet**
```bash
# 1. Conecta MetaMask a Avalanche Fuji
# 2. Abre: http://localhost:3000/en/evm/models/1
# 3. Verifica que mensaje azul ya NO aparece (wallet conectada)
# 4. Click en "Comprar licencia"
# 5. Verifica que se abre diálogo de compra inmediatamente
# 6. Completa compra y firma transacción
```

**Resultado esperado:** ✅ Compra exitosa, licencia NFT emitida

---

### **Test 3: Edición como Owner**
```bash
# 1. Publica un modelo desde tu wallet
# 2. Anota el modelId (ej: 5)
# 3. Desconecta wallet
# 4. Abre: http://localhost:3000/en/evm/models/5
# 5. Verifica que NO hay botones de edición
# 6. Conecta wallet (misma que publicó)
# 7. Verifica que aparecen botones: "Edición rápida" y "Nueva versión"
```

**Resultado esperado:** ✅ Botones solo visibles para owner con wallet conectada

---

### **Test 4: Cambio de Red**
```bash
# 1. Conecta a Fuji, abre modelo
# 2. Verifica que carga correctamente
# 3. En MetaMask, cambia a Base Sepolia
# 4. Recarga página
# 5. Verifica que ahora busca el modelo en Base Sepolia
# 6. Si modelo no existe en Base, muestra error claro
```

**Resultado esperado:** ✅ Detección automática de cambio de red

---

## 📊 Comparación: Antes vs Ahora

### **❌ Antes (Incorrecto)**
- Requería `?chainId=43113` en URL para ver modelos
- Requería wallet conectada para navegación básica
- Usuario no podía explorar sin configurar

### **✅ Ahora (Correcto)**
- ChainID por defecto en ENV permite navegación
- Wallet solo requerida para acciones on-chain
- Usuario puede explorar libremente
- Conecta wallet solo cuando necesita comprar/editar

---

## 🎯 Ventajas

✅ **Mejor UX:** Usuarios pueden explorar sin fricción  
✅ **Menor barrera:** No requiere MetaMask para browsing  
✅ **Más conversiones:** Conectan wallet solo cuando van a comprar  
✅ **Flexible:** Usuarios con wallet pueden cambiar redes  
✅ **Claro:** Mensajes explican cuándo y por qué se requiere wallet  
✅ **Multi-chain:** Soporta múltiples redes automáticamente  

---

## 🔒 Validaciones de Seguridad

### **Ownership Check**
```typescript
// Solo muestra controles de edición si:
currentAddress === ownerAddress && isConnected
```

### **Transaction Check**
```typescript
// Solo permite transacciones si:
isConnected && 
walletChainId === evmChainId &&
marketAddress !== undefined
```

### **Network Validation**
```typescript
// Auto-switch si red incorrecta:
if (currentChainId !== desiredChainId) {
  await switchChainAsync({ chainId: desiredChainId })
}
```

---

## 📚 Archivos Relacionados

- **Detección de chainId:** `src/app/[locale]/evm/models/[id]/ModelPageClient.tsx` (líneas 63-93)
- **Validación de compra:** `ModelPageClient.tsx` (líneas 552-570)
- **Controles de edición:** `src/components/ModelEditControls.tsx`
- **Quick Edit Drawer:** `src/components/QuickEditDrawer.tsx`
- **Configuración:** `src/config/chains.ts`

---

## ✅ Resumen

**Para navegar:** No requiere wallet (usa ENV default)  
**Para comprar:** Requiere wallet conectada  
**Para editar:** Requiere wallet + ser owner  
**Para cambiar red:** Basta conectar wallet a otra red  

**Resultado:** Experiencia óptima con mínima fricción 🚀
