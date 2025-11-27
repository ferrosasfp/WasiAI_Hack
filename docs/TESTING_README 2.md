# Testing Guide: Model Edit/Update Feature

## 📚 Guía Rápida

Este directorio contiene toda la documentación necesaria para testear la funcionalidad de **edición y actualización de modelos** en testnet.

---

## 🎯 ¿Por Dónde Empezar?

### **Opción 1: Testing Rápido (30-45 minutos)**

Si quieres probar lo esencial rápidamente:

```bash
# 1. Setup automático
./scripts/setup-testing-env.sh

# 2. Obtener fondos de testnet
# Ver links que imprime el script

# 3. Seguir el checklist simplificado
open docs/TESTING_QUICK_CHECKLIST.md
```

Marca cada checkbox mientras testeas. Al final tendrás un reporte completo.

---

### **Opción 2: Testing Completo (2-3 horas)**

Para un testing exhaustivo con documentación detallada:

```bash
# 1. Leer la guía completa
open docs/TESTING_MODEL_EDIT_TESTNET.md

# 2. Seguir todas las fases paso a paso
# 3. Documentar resultados usando el template incluido
```

Esta opción incluye:
- 35+ casos de prueba
- Troubleshooting detallado
- Template de reporte
- Criterios de aceptación

---

## 📄 Archivos Disponibles

### **Documentación**

| Archivo | Propósito | Tiempo |
|---------|-----------|--------|
| [`TESTING_QUICK_CHECKLIST.md`](./TESTING_QUICK_CHECKLIST.md) | Checklist simplificado | 30-45 min |
| [`TESTING_MODEL_EDIT_TESTNET.md`](./TESTING_MODEL_EDIT_TESTNET.md) | Guía completa con troubleshooting | 2-3 horas |
| [`MODEL_EDIT_INTEGRATION.md`](./MODEL_EDIT_INTEGRATION.md) | Documentación técnica de integración | Referencia |

### **Scripts de Utilidad**

| Script | Propósito | Uso |
|--------|-----------|-----|
| [`setup-testing-env.sh`](../scripts/setup-testing-env.sh) | Setup automático de ambiente | `./scripts/setup-testing-env.sh` |
| [`verify-model-ownership.ts`](../scripts/verify-model-ownership.ts) | Verificar ownership on-chain | `npx tsx scripts/verify-model-ownership.ts <id> <wallet>` |

---

## 🔧 Pre-requisitos

Antes de comenzar el testing, asegúrate de tener:

### 1. **Environment Variables**

Archivo `.env.local` debe contener:

```bash
# Chain ID (43113 para Fuji, 84532 para Base Sepolia)
NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=43113

# Contract address del Marketplace
NEXT_PUBLIC_EVM_MARKET_43113=0x...  # Tu address en Fuji
# o
NEXT_PUBLIC_EVM_MARKET_84532=0x...  # Tu address en Base Sepolia
```

### 2. **Wallet con Fondos**

Obtener tokens de testnet:

- **Avalanche Fuji (AVAX):** https://faucet.avax.network/
- **Base Sepolia (ETH):** https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

Necesitas al menos **0.1 AVAX/ETH** para gas fees.

### 3. **Modelo Publicado**

Debes tener un modelo publicado del cual seas owner. Puedes:

**A) Publicar uno nuevo:**
```bash
npm run dev
# Navegar a /publish/wizard
# Completar todos los steps y publicar
```

**B) Verificar ownership de uno existente:**
```bash
npx tsx scripts/verify-model-ownership.ts 1 0xYourWalletAddress
```

---

## 🧪 Flujo de Testing Recomendado

### **Fase 1: Setup (5 minutos)**

```bash
# 1. Verificar ambiente
./scripts/setup-testing-env.sh

# 2. Obtener fondos si es necesario
# Ir al faucet correspondiente

# 3. Verificar ownership
npx tsx scripts/verify-model-ownership.ts <modelId> <yourWallet>
```

### **Fase 2: Quick Edit Testing (15 minutos)**

1. Navegar a `/en/evm/models/[id]`
2. Conectar wallet (debe ser owner)
3. Verificar que ves los controles de edición
4. Probar cambios de precios
5. Probar cambios de rights
6. Probar toggle de listed/unlisted

**Documentar:** Tx hashes de cada operación

### **Fase 3: Upgrade Mode Testing (20 minutos)**

1. Click "Nueva versión"
2. Verificar prefill de Step 1
3. Cambiar cover image
4. Avanzar hasta Step 5
5. Verificar chip "🔄 Modo actualización"
6. Publicar nueva versión
7. Verificar que se crea nuevo modelId con mismo slug

**Documentar:** Nuevo modelId y tx hash

### **Fase 4: Validaciones (10 minutos)**

1. Intentar guardar con datos inválidos
2. Verificar mensajes de error
3. Probar ownership con wallet no-owner
4. Verificar que controles no son visibles

---

## 📊 Reportar Resultados

### **Durante el Testing**

Usa el checklist para ir marcando:

```markdown
- [x] Test pasó ✅
- [ ] Test falló ❌
```

### **Al Finalizar**

Completa el template en `TESTING_MODEL_EDIT_TESTNET.md`:

```markdown
## Testing Report

**Fecha:** 18/11/2024
**Tester:** Tu nombre
**Testnet:** Avalanche Fuji

### Resultados
| Test | Status | Tx Hash |
|------|--------|---------|
| Quick Edit precio | ✅ | 0xabc... |
| Toggle listed | ✅ | 0xdef... |
| Upgrade | ✅ | 0x123... |

### Issues Encontrados
1. [Describir problema si existe]

### Gas Costs
- setLicensingParams: ~150,000 gas
- setListed: ~50,000 gas
- listOrUpgrade: ~300,000 gas
```

---

## 🐛 Troubleshooting

### **Problema: "Contract address no configurado"**

```bash
# Verificar .env.local
cat .env.local | grep NEXT_PUBLIC_EVM_MARKET

# Debe mostrar:
NEXT_PUBLIC_EVM_MARKET_43113=0x...
```

### **Problema: "No ves los controles de edición"**

Verificar:
1. Wallet conectada
2. Wallet es owner del modelo
3. No hay errores en consola del navegador

```bash
# Verificar ownership
npx tsx scripts/verify-model-ownership.ts <modelId> <wallet>
```

### **Problema: "Tx falla al ejecutar"**

Causas comunes:
- Fondos insuficientes (gas)
- No eres el owner
- Parámetros inválidos

```bash
# Verificar balance
# En MetaMask o verificar on-chain
```

### **Problema: "Drawer no se abre"**

Verificar consola del navegador:
```javascript
// Buscar errores de JavaScript
// Verificar que QuickEditDrawer se importó correctamente
```

---

## ✅ Criterios de Aceptación

El feature está listo para producción cuando:

- [ ] Todos los tests de Quick Edit pasan (10+)
- [ ] Todos los tests de Upgrade Mode pasan (8+)
- [ ] Validaciones funcionan correctamente (4+)
- [ ] No hay errores en consola
- [ ] Gas costs son razonables (< 500k gas por tx)
- [ ] UX es fluida (sin lags)
- [ ] Al menos 2 testers independientes validaron

---

## 📞 Soporte

Si encuentras problemas durante el testing:

1. **Revisar troubleshooting** en `TESTING_MODEL_EDIT_TESTNET.md`
2. **Documentar el issue** con:
   - Descripción clara
   - Screenshots/video
   - Tx hash si aplica
   - Logs de consola
3. **Reportar al equipo** de desarrollo

---

## 🚀 Siguientes Pasos Post-Testing

Una vez completado el testing:

1. ✅ **Corregir bugs** encontrados
2. ✅ **Optimizar gas** si es necesario
3. ✅ **Agregar analytics** para trackear uso
4. ✅ **Deploy a producción** (mainnet)
5. ✅ **Comunicar feature** a usuarios

---

## 📝 Notas Adicionales

- **Tiempo estimado total:** 45 minutos (quick) a 3 horas (completo)
- **Testnets soportadas:** Avalanche Fuji, Base Sepolia
- **Browsers recomendados:** Chrome, Brave (con MetaMask o Coinbase Wallet)
- **Node version:** >= 18.x

---

**¡Buen testing!** 🎉

Si tienes preguntas, consulta la documentación completa en [`TESTING_MODEL_EDIT_TESTNET.md`](./TESTING_MODEL_EDIT_TESTNET.md)
