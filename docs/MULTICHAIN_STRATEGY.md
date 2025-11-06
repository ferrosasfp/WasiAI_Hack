# Estrategia Multichain (Sui + Base + Avalanche)

## Objetivo
Hacer el frontend agnóstico de blockchain permitiendo operar inicialmente en Sui, Base y Avalanche (C‑Chain), con una capa de dominio común y adapters por cadena.

## Diseño por capas
- Capa de dominio (interfaces): expone operaciones de marketplace neutrales a la cadena.
- Adapters por cadena: implementaciones concretas (SuiAdapter, EvmAdapter parametrizado para Base/Avalanche).
- Selector de cadena: UI + persistencia + valores por defecto desde env.
- Config/utilidades: RPCs, explorers, unidades, formateo de montos y fees.

## Interfaces de dominio (propuesta)
```ts
export type ChainKind = 'sui' | 'base' | 'avax';

export type LicenseKind = 'perpetual' | 'subscription';

export interface TxResult { digest: string; explorerUrl?: string }

export interface BuyInput {
  modelId: number | string;
  kind: LicenseKind;
  months?: number;        // requerido si kind = subscription
  transferable?: boolean; // aplica según cadena
  amount: bigint;         // nativo (Mist/wei)
}

export interface ModelsService {
  getModelsPage(params: { start: number; limit: number; order?: 'featured'|'price_desc'|'price_asc'|'version_desc'|'recent_desc'|'recent_asc'; listedOnly?: boolean; q?: string }): Promise<ModelSummary[]>;
  getModelInfo(idOrSlug: number | string): Promise<ModelInfo | null>;
}

export interface MarketplaceClient {
  buyLicense(input: BuyInput): Promise<TxResult>;
  renewLicense(input: { modelId: number | string; months: number; amount: bigint }): Promise<TxResult>;
}

export interface WalletService {
  connect(): Promise<{ address: string }>
  getAccount(): { address: string } | undefined
  signAndSendTx(prepared: unknown): Promise<TxResult>
}
```

## Adapters por cadena
- SuiAdapter
  - Reutiliza: `buildBuyLicenseTx`, `getDynamicFields/devInspect`, parsers.
  - Unidades: Mist↔SUI.
  - Explorer: Sui Explorer (testnet/mainnet).
- EvmAdapter (Base/Avalanche)
  - Librerías: `viem` + `wagmi`.
  - Contrato Solidity (Marketplace) con métodos:
    - `buyLicense(uint256 modelId, uint8 kind, uint16 months, bool transferable)` payable
    - `renewLicense(...)`
    - `getModelInfo`, `getModelsPage` (opcional; se puede usar indexador offchain)
  - Unidades: wei↔ETH (Base) / wei↔AVAX (Avalanche).
  - Explorers: BaseScan, SnowTrace.
  - Parametrización por red: `{ chainId, rpcUrl, explorerBase, contractAddress }`.

## Selección de cadena (UI y estado)
- Env por defecto: `NEXT_PUBLIC_CHAIN_DEFAULT=sui|base|avax`.
- Selector en header: persiste en `localStorage` y expone `useChain()`.
- Fábrica: `getClients(chain)` retorna `{ models, market, wallet }` acorde a la selección.

## Endpoints y backend
- `/api/models-page` acepta `chain` además de `start/limit/order/listed/q`.
- La API llama al adapter correspondiente en el server (Sui/EVM).
- Para EVM:
  - Si el contrato no soporta filtros/búsqueda, usar un servicio indexador offchain o filtrar en server con cache.

## Unidades/fees y helpers
- `Amount` helpers: `toNative(amountDecimal, chainKind)`, `formatNative(native, chainKind)`.
- Fees:
  - Sui: `gasBudget` (sim o heurística).
  - EVM: `estimateGas` + `maxFeePerGas`.

## Wallets
- Sui: `@mysten/dapp-kit` para conexión y firma.
- EVM: `wagmi` + WalletConnect/RainbowKit.
- UX: si el usuario cambia de cadena, desconectar la anterior y ofrecer conectar la correcta.

## Plan de implementación
1) Interfaces y fábrica (Fase 1)
- Crear `src/domain/marketplace/` con interfaces y helpers comunes.
- Alinear el SuiAdapter a la interfaz y actualizar la UI para usar la capa de dominio.

2) EVM base (Fase 2)
- Crear `EvmMarketplaceAdapter` con viem/wagmi y mocks para `getModelsPage/getModelInfo`.
- Integrar selector de cadena en header.

3) Contrato y conexión real (Fase 3)
- Integrar ABI, direcciones y unit tests de compra perp/sub en Base y Avalanche (testnet).
- Ajustar fees y formateo de unidades.

4) APIs y e2e (Fase 4)
- Extender endpoints con `chain`.
- Pruebas e2e de compra en Sui/Base/Avalanche.

## Riesgos y mitigaciones
- Indexación en EVM para búsqueda/orden: usar servicio temporal offchain.
- Desalineación de unidades: helpers centralizados.
- Divergencia de UI: mantener interfaces estables y componentes neutrales.

## Definition of Done (fase inicial)
- UI de listado y detalle funcionando en Sui vía interfaces de dominio.
- Selector de cadena visible y persistente (aunque Base/Avalanche usen mocks).
- `/api/models-page` soporta `chain` y delega al adapter correcto.
