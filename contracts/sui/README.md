# MarketplaceAI – Contratos Move (Sui)

Este directorio aloja el código fuente del contrato MarketplaceAI en Move para Sui.

## Estructura
- `Move.toml`: manifest del paquete Move.
- `sources/`: módulos `.move` del marketplace.
- `build/`: artefactos compilados (se genera tras `sui move build`).

## Requisitos
- Sui CLI instalado y en PATH
  - macOS (brew): `brew install sui`
  - Verifica: `sui --version`

## Comandos
Desde `contracts/sui/`:

- Compilar
```bash
sui move build
```

- Probar (si hay tests)
```bash
sui move test
```

- Publicar (testnet)
```bash
# Asegúrate de tener una cuenta activa y fondos en testnet
sui client switch --env testnet
sui client addresses
sui client active-address

# Publicar paquete
sui client publish --gas-budget 100000000 --json > publish.out.json
```

- Extraer PACKAGE_ID y objetos
```bash
jq -r '.effects.created[]?.reference.objectId' publish.out.json
```

## Entorno frontend
Tras publicar, copia los IDs al `.env.local` en la raíz del proyecto:
- `NEXT_PUBLIC_PACKAGE_ID=<package_id>`
- `NEXT_PUBLIC_MARKET_ID=<market_object_id>`
- Opcionalmente otros IDs que exponga tu contrato

## Flujo de trabajo
1. Copia tus módulos `.move` a `sources/`.
2. `sui move build` y corrige errores.
3. `sui move test` (opcional, si hay tests).
4. `sui client publish` en testnet y captura IDs.
5. Actualiza `.env.local` y verifica el frontend.

## Notas
- No commitees `build/` (está ignorado).
- Usa ramas/PRs para cambios en contratos y mantén el CHANGELOG.
