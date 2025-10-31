# Changelog

## MarketPlaceWeb3v0.1.0 — 2025-10-30

- Homepage rediseñada con enfoque marketero y profesional
  - Hero con imagen responsive, CTAs claras
  - Beneficios, pasos, testimonios, logos de confianza y CTA final
- Explorar modelos
  - Paginación infinita con `useInfiniteQuery` + IntersectionObserver
  - Búsqueda por nombre/slug (debounce 300ms)
  - Orden y filtro “Solo listados” aplicados en backend (`/api/models-page`)
  - Carga por página de 12 ítems, grid optimizado y skeletons
- Detalle/listado: compra de licencias
  - Botones separados: Perpetua y Suscripción
  - Selector de meses para suscripción (1–12)
  - Llamado on-chain usando `buildBuyLicenseTx(kind, months)`
- Publicación de modelos (upload)
  - Validaciones robustas (tamaño, tipos, precios decimales)
  - Nombres de archivos únicos para IPFS (evita colisiones)
  - Feedback con Snackbar/Alert
- IPFS
  - Uso de gateway configurable (`NEXT_PUBLIC_PINATA_GATEWAY`)
  - Fetch con límites de concurrencia
- Ajustes de build
  - Ignorar ESLint en build para corte inicial (`next.config.mjs`)
  - Rutas API marcadas como dinámicas cuando usan `request.url`
  - Suspense en `/models` para `useSearchParams`

### Notas
- Multichain (Base/EVM) planificada vía adapters; actualmente Sui activo.
- Recomendado: completar tipados y reactivar reglas ESLint en CI progresivamente.
