# Quick Testing Checklist ✅

Usa este checklist durante tu sesión de testing para marcar cada prueba.

## Pre-Testing Setup
- [ ] Wallet con fondos en testnet (> 0.1 AVAX/ETH)
- [ ] Modelo publicado (anotar modelId: _____)
- [ ] Wallet conectada es owner del modelo
- [ ] Dev server corriendo (`npm run dev`)

---

## FASE 1: Quick Edit - Precios 💰

### Test: Cambio de precio perpetual
- [ ] Abrir Quick Edit Drawer
- [ ] Campos prellenados correctamente
- [ ] Cambiar precio perpetual (ej: 1 → 2 AVAX)
- [ ] Tx exitosa (anotar hash: _____________)
- [ ] Snackbar de éxito visible
- [ ] Página recarga automáticamente
- [ ] Nuevo precio visible en UI

### Test: Cambio de precio suscripción
- [ ] Cambiar precio suscripción (ej: 0.1 AVAX/mes)
- [ ] Cambiar duración base (ej: 6 meses)
- [ ] Tx exitosa (hash: _____________)
- [ ] Cambios reflejados en página

---

## FASE 2: Quick Edit - Derechos 🎯

### Test: Cambiar rights
- [ ] Desmarcar "Descarga del modelo"
- [ ] Dejar solo "Uso de API"
- [ ] Tx exitosa (hash: _____________)
- [ ] Chip "API Access" visible
- [ ] Chip "Download" no visible
- [ ] Botón descarga disabled

### Test: Cambiar delivery mode
- [ ] Cambiar a "Solo API" o "Solo descarga"
- [ ] Tx exitosa (hash: _____________)
- [ ] Cambio visible en UI

---

## FASE 3: Toggle Listed Status 📋

### Test: Deslistar modelo
- [ ] Desactivar switch "Listado"
- [ ] Tx exitosa (hash: _____________)
- [ ] Ir a `/evm/models` - modelo NO visible

### Test: Re-listar modelo
- [ ] URL directa `/evm/models/[id]` funciona
- [ ] Activar switch "Listado"
- [ ] Tx exitosa (hash: _____________)
- [ ] Ir a `/evm/models` - modelo visible nuevamente

---

## FASE 4: Upgrade Mode 🔄

### Test: Navegación al wizard
- [ ] Click "Nueva versión"
- [ ] Redirige a wizard con `?mode=upgrade&modelId=X`
- [ ] Loading spinner visible

### Test: Prefill Step 1
- [ ] Nombre prellenado
- [ ] Summary prellenado
- [ ] Slug prellenado (bloqueado)
- [ ] Cover image cargada
- [ ] Categories prellenadas
- [ ] Tags prellenados
- [ ] Business category prellenada
- [ ] Model type prellenado
- [ ] Author info prellenada

### Test: Modificar cover
- [ ] Subir nueva imagen
- [ ] Upload exitoso (nuevo CID: _____________)
- [ ] Preview visible

### Test: Step 5 - Upgrade mode
- [ ] Chip naranja "🔄 Modo actualización" visible
- [ ] Review muestra datos correctos

### Test: Publicar nueva versión
- [ ] Click "Publicar"
- [ ] Tx exitosa (hash: _____________)
- [ ] Mensaje de éxito visible
- [ ] Anotar nuevo modelId: _____
- [ ] Verificar mismo slug que antes

### Test: Verificación post-upgrade
- [ ] Ir a `/evm/models` - solo nueva versión visible
- [ ] Nueva cover image visible
- [ ] Nuevo modelId en URL
- [ ] Slug permanece igual
- [ ] URL directa versión anterior - todavía accesible pero no listada

---

## FASE 5: Validaciones ✔️

### Test: Validaciones de formulario
- [ ] Intentar ambos precios = 0 → Error
- [ ] Suscripción sin duración → Error
- [ ] Sin derechos seleccionados → Error
- [ ] Botón "Guardar" disabled en todos los casos

### Test: Ownership
- [ ] Desconectar wallet owner
- [ ] Conectar wallet diferente
- [ ] Controles de edición NO visibles

---

## FASE 6: Performance & UX ⚡

### Test: Tiempos de carga
- [ ] Quick Edit drawer abre < 1s
- [ ] Prefill Step 1 carga < 5s
- [ ] Page reload tras edit < 3s

### Test: UX
- [ ] Sin errores en consola
- [ ] Snackbars se cierran automáticamente
- [ ] Drawer cierra suavemente
- [ ] Transiciones fluidas

---

## Resumen Final 📊

**Total Tests:** 35
**Pasaron:** ___ / 35
**Fallaron:** ___ / 35

### Issues Encontrados:
1. 
2. 
3. 

### Tx Hashes Importantes:
- Quick Edit precio: _______________
- Toggle listed: _______________
- Upgrade: _______________

### Gas Costs Observados:
- setLicensingParams: ~_____ gas
- setListed: ~_____ gas
- listOrUpgrade: ~_____ gas

### Notas Adicionales:
(Agregar cualquier observación)

---

## ✅ Ready for Production?
- [ ] Todos los tests críticos pasan (25/25)
- [ ] Gas costs razonables (< 500k por tx)
- [ ] UX fluida sin lags
- [ ] Sin errores en consola
- [ ] Al menos 2 testers validaron

**Fecha completada:** _______________
**Tester:** _______________
**Testnet:** Avalanche Fuji / Base Sepolia
