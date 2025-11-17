# Backlog

- backlog_unpin_scopes: Resolver unpin de IPFS (credenciales/scopes de Pinata y fallback cliente).
  - Prioridad: media
  - Estado: pendiente

- backlog_models_all_evm: Listar modelos EVM agregando Base + Avalanche cuando no haya chainId; opcional admitir chainId=all.
  - Prioridad: media
  - Estado: pendiente

- refactor_evm_model_detail_shared_component: Refactor EVM model detail en componente compartido y usar solo la página localizada como wrapper; eliminar página no localizada. Notas: migrar implementación actual de `src/app/evm/models/[id]/page.tsx`; integrar `buyLicenseWithURI` y `tokenURI` para metadata; sin imports desde páginas no localizadas; pasar `params` (id, chainId) y `locale` como props; probar compra end-to-end.
  - Prioridad: baja
  - Estado: pendiente


- Ajusta redacciones en español/inglés, modifica en en.json/es.json.
Agrega tests rápidos de rendering para asegurar que todas las keys existen.
