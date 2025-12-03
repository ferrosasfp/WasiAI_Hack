# MoSCoW Feature Analysis - WasiAI Hackathon

**Last Updated:** 2025-12-02

## Contexto

WasiAI es una plataforma de agentes de IA sobre Avalanche que integra dos protocolos clave:
- **x402** para pagos por inferencia
- **ERC-8004** para identidad on-chain de agentes

---

## ✅ MUST HAVE – MVP Creíble End-to-End

### x402 Pay-per-Inference Protocol

| Tarea | Estado | Notas |
|-------|--------|-------|
| Diseñar endpoint x402 `/api/inference/[modelId]` | ✅ | HTTP 402 con cabeceras de pago |
| Implementar verificación de pagos USDC | ✅ | Integrado con Ultravioleta Facilitator |
| Definir cabeceras x402 | ✅ | X-Payment-Required, Amount, Token, Recipient, ChainId |
| Integrar modelo real de IA | ✅ | HuggingFace Inference API conectado |
| Crear componente X402InferencePanel | ✅ | UI completa con estados visuales |
| Implementar firma EIP-712 para USDC | ✅ | TransferWithAuthorization sin approve |
| Configurar 3 modelos de ejemplo | ✅ | Modelos hardcodeados con pricePerInference |

### ERC-8004 Agent Identity Registry

| Tarea | Estado | Notas |
|-------|--------|-------|
| Desarrollar AgentRegistry.sol | ✅ | ERC-721 con Identity Registry pattern |
| Desplegar AgentRegistry en Fuji | ✅ | Verificado en Snowtrace |
| Diseñar schema de metadata ERC-8004 | ✅ | JSON para IPFS con endpoints x402 |
| Crear endpoint /api/agents/metadata | ✅ | Genera y sube metadata a IPFS |
| Crear librería src/lib/erc8004.ts | ✅ | Interfaces + buildAgentMetadata() |
| Integrar registro de agente en wizard Step 5 | ✅ | Llama AgentRegistry.registerAgent() |
| Crear componente ERC8004Badge | ✅ | Badge "ERC-8004 Agent #N" |
| Integrar badge en página de detalle | ✅ | Visible junto al nombre del modelo |

### Integración en Marketplace

| Tarea | Estado | Notas |
|-------|--------|-------|
| Agregar pricePerInference en Step 4 | ✅ | Campo en wizard |
| Guardar precio en metadata IPFS | ✅ | licensePolicy.inference.pricePerCall |
| Mostrar X402InferencePanel en detalle | ✅ | Panel visible si tiene precio configurado |
| Mensajes UX claros | ✅ | Estados de pago, verificación, errores |

### Licensing Model (Simplificado para Hackathon)

| Tarea | Estado | Notas |
|-------|--------|-------|
| Ocultar opción de suscripción | ✅ | Solo licencias perpetuas para MVP |
| Compra directa de licencia perpetua | ✅ | Sin popup intermedio |
| Filtrar licencias perpetuas en listado | ✅ | `/[locale]/licenses` muestra solo `kind === 0` |
| Auto-registro de licencias en Neon DB | ✅ | POST `/api/indexed/licenses` |
| Licencia aparece inmediatamente | ✅ | Extrae tokenId de LicenseMinted event |
| Auto-registro de modelos en Neon DB | ✅ | POST `/api/indexed/models` en Step 5 |
| Modelo aparece inmediatamente | ✅ | Sin necesidad de indexador manual |

---

## 🔄 SHOULD HAVE – Robustez y Diferenciación

### x402 Hardening

| Tarea | Estado | Notas |
|-------|--------|-------|
| Implementar protección anti-replay | ✅ | Cache de nonces/txHash |
| Agregar rate limiting | ✅ | Máximo N requests por minuto |
| Crear endpoint de historial | ✅ | `/api/inference/history` |
| Crear componente InferenceHistory | ✅ | Tabla con historial de inferencias |
| Integrar historial en página de detalle | ✅ | Debajo del panel de inferencia |

### ERC-8004 Reputation Registry

| Tarea | Estado | Notas |
|-------|--------|-------|
| Desarrollar ReputationRegistry.sol | ✅ | Feedback on-chain (thumbs up/down) |
| Desplegar ReputationRegistry en Fuji | ✅ | Verificado en Snowtrace |
| Crear componente InferenceFeedback | ✅ | Botones thumbs up/down post-inferencia |
| Crear componente AgentReputation | ✅ | Score 0-100, barra de progreso |
| Integrar feedback post-inferencia | ✅ | Con agentId y txHash reales |
| Mostrar reputación en página de detalle | ✅ | En header junto al badge ERC-8004 |
| Protección anti-spam | ✅ | Un voto por agentId + txHash |

### Upgrade Flow con ERC-8004

| Tarea | Estado | Notas |
|-------|--------|-------|
| Detectar modelos sin agente | ✅ | `modelToAgent(modelId)` en step5/page.tsx:883-888 |
| Registrar agente en upgrade | ✅ | Auto-registro si `existingAgentId == 0` en step5/page.tsx:935-962 |

---

## 📋 COULD HAVE – Impacto Adicional

| Tarea | Estado | Notas |
|-------|--------|-------|
| Endpoints dinámicos por modelo | ✅ | Dev configura su endpoint en Step 3 |
| Revenue Split UI (Step 4 & 5) | ✅ | Muestra split para perpetual e inferencia x402 |
| Múltiples agentes publicados | ⏳ | 2-3 más usando wizard completo |
| Mostrar reputación en catálogo | ⏳ | AgentReputation compacto en ModelCard |
| Split Contract para inferencia | ❌ | Smart contract que distribuye pagos x402 automáticamente |
| Página de discovery de agentes | ❌ | Vista pública de AgentRegistry |
| Dashboard básico de creador | ❌ | Agentes, inferencias, USDC generado |

---

## ❌ WON'T HAVE – Fuera de Alcance

| Funcionalidad | Razón |
|---------------|-------|
| Despliegue en Mainnet | Requiere auditorías y liquidez real |
| USDC en compra de licencias | Modificar Marketplace.sol para ERC-20 |
| Facturación SaaS / Fiat | Todo es on-chain con USDC |
| Validation Registry (ERC-8004) | zkML, TEE muy pesado |
| Soporte Multichain | Solo Avalanche para hackathon |
| Conversión automática AVAX↔USDC | Swap manual |
| On-ramp fiat / KYC | Solo wallets cripto |
| ~~Endpoint dinámico por modelo~~ | ✅ Implementado - dev hostea su endpoint |

---

## � Resumen de Estado

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTADO DE IMPLEMENTACIÓN                     │
├─────────────────────────────────────────────────────────────────┤
│  MUST HAVE                                          ██████ 100% │
│  ├─ x402 endpoint + verificación USDC              ✅           │
│  ├─ X402InferencePanel con UX clara                ✅           │
│  ├─ AgentRegistry.sol + metadata ERC-8004          ✅           │
│  ├─ Integración en wizard (registro automático)    ✅           │
│  ├─ ERC8004Badge en UI                             ✅           │
│  ├─ 3 modelos de ejemplo configurados              ✅           │
│  └─ Licensing simplificado (solo perpetual)        ✅           │
├─────────────────────────────────────────────────────────────────┤
│  SHOULD HAVE                                        ██████ 100% │
│  ├─ Anti-replay + rate limiting                    ✅           │
│  ├─ Historial de inferencias                       ✅           │
│  ├─ ReputationRegistry.sol + feedback on-chain     ✅           │
│  ├─ InferenceFeedback + AgentReputation en UI      ✅           │
│  └─ Upgrade flow con registro de agente            ✅           │
├─────────────────────────────────────────────────────────────────┤
│  COULD HAVE                                         ███░░░ 40%  │
│  ├─ Endpoints dinámicos por modelo                 ✅           │
│  ├─ Revenue Split UI (Step 4 & 5)                  ✅           │
│  ├─ Múltiples agentes publicados                   ⏳           │
│  ├─ Reputación en catálogo                         ⏳           │
│  ├─ Split Contract para inferencia                 ❌           │
│  ├─ Página de discovery de agentes                 ❌           │
│  └─ Dashboard de creador                           ❌           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Flujo End-to-End Objetivo (Demo)

1. **Catálogo** con modelos que tienen badge ERC-8004 visible ✅
2. **Página de detalle** con:
   - Badge "ERC-8004 Agent #N" ✅
   - Score de reputación agregado ✅
   - Panel "Run with x402" mostrando precio en USDC ✅
   - Historial de inferencias recientes ✅
3. **Flujo de inferencia**:
   - Usuario escribe prompt ✅
   - Ve precio (ej: $0.01 USDC) ✅
   - Firma pago con wallet ✅
   - Recibe respuesta del modelo real ✅
   - Opcionalmente deja feedback (thumbs up/down) ✅
4. **Verificación on-chain**:
   - Pago visible en Snowtrace ✅
   - Feedback registrado en ReputationRegistry ✅
   - Agente con identidad verificable en AgentRegistry ✅

---

## 🔧 Scripts & Tools

| Script | Propósito |
|--------|-----------|
| `npm run indexer -- --chain=43113` | Indexar datos de blockchain |
| `npx tsx scripts/sync-licenses.ts` | Sincronizar licencias blockchain→DB |
| `npx tsx scripts/reset-indexer.ts` | Resetear estado del indexador |

---

## 📝 Notas

- Licencias por suscripción están **ocultas, no eliminadas** - reactivar post-hackathon
- Para reactivar suscripciones: buscar `{false &&` en wizard/detail pages
- Blockchain es fuente de verdad, Neon DB es cache para lecturas rápidas
- Contratos desplegados en Avalanche Fuji (chainId: 43113)
- **Pago x402 actual**: 100% al seller. Split UI es informativo, fees guardados en metadata IPFS

---

## 🔮 Diseño Futuro: Split Contract para Inferencia

### Problema
El facilitator x402 solo soporta un destinatario (`payTo`). Para distribuir fees entre seller, creator y marketplace se necesita un contrato intermediario.

### Arquitectura Propuesta

```
Cliente → x402 Facilitator → InferenceSplitter.sol → Acumula USDC
                                                          ↓
                                              ┌───────────┴───────────┐
                                              ↓           ↓           ↓
                                           Seller     Creator    Marketplace
                                           (90%)       (5%)        (5%)
```

### Estrategia de Gas: Pull Pattern

Cada receptor retira sus fondos cuando quiere, pagando su propio gas:

```solidity
contract InferenceSplitter {
    mapping(address => uint256) public balances;
    
    // Llamado cuando llega pago x402
    function onReceive(uint256 amount, address seller, address creator) external {
        uint256 sellerAmt = (amount * sellerBps) / 10000;
        uint256 creatorAmt = (amount * creatorBps) / 10000;
        uint256 marketAmt = amount - sellerAmt - creatorAmt;
        
        balances[seller] += sellerAmt;
        balances[creator] += creatorAmt;
        balances[MARKETPLACE_WALLET] += marketAmt;
    }
    
    // Cada parte retira cuando quiere (paga su gas)
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        balances[msg.sender] = 0;
        USDC.transfer(msg.sender, amount);
    }
}
```

### Costos de Gas (Avalanche)

| Operación | Costo Estimado |
|-----------|----------------|
| Recibir pago | ~0 (receptor pasivo) |
| withdraw() | ~0.001-0.005 AVAX (~$0.02-0.10) |

### Flujo Completo

1. **Publicación**: Wizard despliega InferenceSplitter con config de splits
2. **Pago x402**: `payTo` apunta al InferenceSplitter (no al seller)
3. **Acumulación**: Contrato registra balances por receptor
4. **Retiro**: Cada parte llama `withdraw()` cuando quiere cobrar

### Alternativa: Auto-withdraw

El marketplace puede ofrecer retiros automáticos cuando el balance supera un umbral:

```solidity
// Si balance > $10, distribuir automáticamente
function autoDistribute(address seller) external onlyRelayer {
    if (balances[seller] >= MIN_AUTO_WITHDRAW) {
        // Marketplace paga gas, lo descuenta de su fee
    }
}
```

### Estado: ❌ No implementado (post-hackathon)
