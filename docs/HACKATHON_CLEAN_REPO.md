# WasiAI Hackathon - Análisis de Código Esencial

**Fecha**: 2025-12-05  
**Objetivo**: Identificar archivos esenciales para repo limpio `WasiAI_Hack`

---

## 📊 Resumen del Análisis

### Estructura Actual
```
marketplaceai-frontend/
├── src/                    ~183 items (ESENCIAL)
├── contracts/evm/          ~178 items (PARCIALMENTE ESENCIAL)
├── contracts/sui/          ~5 items (NO ESENCIAL - no usado en hackathon)
├── docs/                   ~27 items (PARCIALMENTE ESENCIAL)
├── scripts/                ~26 items (PARCIALMENTE ESENCIAL)
├── db/                     ~7 items (ESENCIAL)
├── prisma/                 ~5 items (ESENCIAL)
├── public/                 ~7 items (ESENCIAL)
├── test-assets/            ~11 items (NO ESENCIAL)
├── __tests__/              vacío (NO ESENCIAL)
└── archivos raíz           varios
```

---

## ✅ ARCHIVOS ESENCIALES (Incluir en WasiAI_Hack)

### Raíz del Proyecto
```
.env.example                 # Template de variables (sin secrets)
.eslintrc.json
.gitignore
.prettierrc
README.md                    # Actualizar para hackathon
next.config.mjs
next-env.d.ts
next-intl.config.ts
package.json
package-lock.json
tsconfig.json
middleware.ts
i18n.ts
vercel.json
```

### /src (TODO - es el core de la app)
```
src/
├── abis/                   # ABIs de contratos
├── adapters/               # Adaptadores EVM
├── app/                    # Next.js App Router
│   ├── [locale]/           # Páginas localizadas
│   │   ├── evm/            # Detalle de modelos
│   │   ├── licenses/       # Mis licencias
│   │   ├── models/         # Catálogo
│   │   └── publish/        # Wizard de publicación
│   ├── api/                # API Routes
│   ├── providers-evm.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/             # Componentes React
├── config/                 # Configuración de chains
├── constants/
├── contexts/
├── hooks/
├── lib/                    # Utilidades core
├── messages/               # i18n
├── styles/
├── types/
└── viewmodels/
```

### /contracts/evm (Solo lo necesario)
```
contracts/evm/
├── contracts/              # Contratos Solidity actuales
│   ├── AgentRegistryV2.sol
│   ├── LicenseNFTV2.sol
│   ├── MarketplaceV3.sol
│   ├── ModelSplitter.sol
│   ├── ReputationRegistryV2.sol
│   ├── SplitterFactory.sol
│   ├── MockUSDC.sol
│   └── interfaces/
├── artifacts/              # ABIs compilados (necesarios)
├── hardhat.config.js
├── package.json
├── deploy.avax.v2.json     # Direcciones desplegadas
└── remappings.txt
```

### /db
```
db/
├── schema.sql              # Schema principal
├── migrations/             # Migraciones SQL
└── run-migration.js
```

### /prisma
```
prisma/
├── schema.prisma
└── migrations/
```

### /public
```
public/
├── favicon.ico
├── logo.svg (si existe)
└── otros assets necesarios
```

### /docs (Solo documentación clave)
```
docs/
├── MOSCOW.md               # Objetivos del hackathon
├── ARCHITECTURE.md         # Arquitectura del sistema
├── README.md (nuevo)       # Guía rápida para jueces
└── x402-inference-examples.md
```

---

## ❌ ARCHIVOS A EXCLUIR (No incluir en WasiAI_Hack)

### Carpetas Completas a Excluir
```
contracts/sui/              # No usado en hackathon (solo Avalanche)
contracts/evm/deprecated/   # Contratos obsoletos
contracts/evm/coverage/     # Reportes de coverage
contracts/evm/test/         # Tests de contratos
contracts/evm/scripts/      # Scripts de deployment (ya desplegado)
test-assets/                # Assets de prueba
__tests__/                  # Tests vacíos
.next/                      # Build cache
node_modules/               # Dependencias (se instalan)
.git/                       # Historia git del repo original
```

### Archivos Raíz a Excluir
```
.env                        # Secrets reales
.env.local                  # Secrets locales
.DS_Store                   # macOS
tsconfig.tsbuildinfo        # Cache de TypeScript
setup-structure.sh          # Script de setup viejo
*.md (documentación vieja):
  - CHANGELOG.md
  - FIXES_IMAGE_OVERFLOW_API_ERROR.md
  - IMAGE_OPTIMIZATION_IMPROVEMENTS.md
  - MIGRATION_STRATEGY.md
  - MODEL_DETAIL_UX_OPTIMIZATIONS.md
  - NAVIGATION_UX_OPTIMIZATIONS.md
  - PERFORMANCE.md
  - PERFORMANCE_IMPLEMENTATION.md
  - VIEWMODELS_STATUS.md
```

### /scripts a Excluir (la mayoría)
```
# Mantener solo:
scripts/run-indexer.ts      # Para indexar datos

# Excluir el resto (son para desarrollo/testing):
scripts/cache-all-metadata.ts
scripts/check-*.ts
scripts/clean-all.js
scripts/env-switch.js
scripts/force-refresh-metadata.ts
scripts/generate-pdf.mjs
scripts/migrate-*.ts
scripts/mint-test-usdc.js
scripts/reset-*.ts
scripts/scan-*.ts
scripts/setup-testing-env.sh
scripts/sync-*.ts
scripts/test-*.js
scripts/update-*.js
scripts/verify-*.ts
```

### /docs a Excluir
```
docs/ARCHITECTURE.html      # Duplicado (hay .md)
docs/ARCHITECTURE.pdf       # Duplicado
docs/BACKLOG.md
docs/CLEANUP_SUMMARY.md
docs/CODE_CLEANUP_ANALYSIS.md
docs/CONFIGUSDC.md
docs/GITHUB_ACTIONS_SETUP.md
docs/HARDCODE_ANALYSIS.md
docs/INDEXER_SETUP.md
docs/MODEL_EDIT_INTEGRATION.md
docs/MULTICHAIN_STRATEGY.md
docs/TEST-EXAMPLES.md
docs/TESTING*.md
docs/TROUBLESHOOTING*.md
docs/WALLET_CONNECTION_STRATEGY.md
docs/analysis/              # Análisis internos
docs/comandos-rapidos.md
docs/gihubcomand.md
docs/verification-scripts.md
```

### /src/app Rutas No Usadas
```
src/app/(auth)/             # Login/register vacío
src/app/(dashboard)/        # Dashboard vacío
src/app/(marketing)/        # Marketing vacío
src/app/publish/            # Duplicado de [locale]/publish
src/app/evm/                # Duplicado de [locale]/evm
src/app/emotion/            # No esencial
```

---

## 📁 Estructura Final de WasiAI_Hack

```
WasiAI_Hack/
├── README.md               # Nuevo - Guía para jueces
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── next.config.mjs
├── next-env.d.ts
├── next-intl.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── middleware.ts
├── i18n.ts
├── vercel.json
│
├── src/
│   ├── abis/
│   ├── adapters/
│   ├── app/
│   │   ├── [locale]/       # Páginas principales
│   │   ├── api/            # API Routes
│   │   ├── providers-evm.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   ├── globals.css
│   │   └── fonts/
│   ├── components/
│   ├── config/
│   ├── constants/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── messages/
│   ├── styles/
│   ├── types/
│   └── viewmodels/
│
├── contracts/
│   └── evm/
│       ├── contracts/      # Solo contratos actuales
│       ├── artifacts/      # ABIs compilados
│       ├── hardhat.config.js
│       ├── package.json
│       └── deploy.avax.v2.json
│
├── db/
│   ├── schema.sql
│   ├── migrations/
│   └── run-migration.js
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│
├── scripts/
│   └── run-indexer.ts      # Solo el indexer
│
└── docs/
    ├── MOSCOW.md
    ├── ARCHITECTURE.md
    └── x402-inference-examples.md
```

---

## 🚀 Pasos para Crear WasiAI_Hack

### 1. Crear directorio temporal
```bash
mkdir -p /tmp/WasiAI_Hack
```

### 2. Copiar archivos esenciales (script automatizado)
Ver script `prepare-hackathon-repo.sh` generado

### 3. Crear README para jueces
Incluir:
- Qué es WasiAI
- Cómo instalar y ejecutar
- Flujo de demo
- Contratos desplegados
- Variables de entorno necesarias

### 4. Push a GitHub
```bash
cd /tmp/WasiAI_Hack
git init
git remote add origin https://github.com/ferrosasfp/WasiAI_Hack.git
git add .
git commit -m "Initial commit - WasiAI Hackathon MVP"
git push -u origin main
```

---

## ⚠️ Notas Importantes

1. **No incluir secrets**: El `.env.example` debe tener placeholders, no valores reales
2. **Contratos ya desplegados**: No es necesario incluir scripts de deploy
3. **Sui no usado**: El hackathon es solo Avalanche, excluir contracts/sui
4. **Tests vacíos**: No aportan valor, excluir __tests__
5. **Documentación interna**: Solo incluir lo relevante para jueces

---

## 📋 Checklist Pre-Push

- [ ] README.md actualizado con instrucciones claras
- [ ] .env.example con todas las variables necesarias (sin valores reales)
- [ ] package.json limpio
- [ ] Verificar que `npm install && npm run build` funciona
- [ ] Verificar que `npm run dev` levanta la app
- [ ] Probar flujo principal: catálogo → detalle → x402 inference
- [ ] Verificar que wizard de publicación funciona
