#!/bin/bash

# =============================================================================
# WasiAI Hackathon - Script para preparar repo limpio
# =============================================================================
# Este script crea una copia limpia del proyecto en /tmp/WasiAI_Hack
# con solo los archivos esenciales para el hackathon.
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorios
SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="/tmp/WasiAI_Hack"
GITHUB_REPO="https://github.com/ferrosasfp/WasiAI_Hack.git"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  WasiAI Hackathon - Repo Preparation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Source: ${YELLOW}$SOURCE_DIR${NC}"
echo -e "Target: ${YELLOW}$TARGET_DIR${NC}"
echo ""

# Limpiar directorio destino si existe
if [ -d "$TARGET_DIR" ]; then
    echo -e "${YELLOW}Limpiando directorio existente...${NC}"
    rm -rf "$TARGET_DIR"
fi

mkdir -p "$TARGET_DIR"

# =============================================================================
# Función para copiar archivos/carpetas
# =============================================================================
copy_item() {
    local src="$1"
    local dest="$2"
    if [ -e "$SOURCE_DIR/$src" ]; then
        mkdir -p "$(dirname "$TARGET_DIR/$dest")"
        cp -r "$SOURCE_DIR/$src" "$TARGET_DIR/$dest"
        echo -e "  ${GREEN}✓${NC} $src"
    else
        echo -e "  ${RED}✗${NC} $src (no existe)"
    fi
}

# =============================================================================
# 1. Archivos raíz esenciales
# =============================================================================
echo -e "\n${BLUE}[1/8] Copiando archivos raíz...${NC}"

copy_item ".env.example" ".env.example"
copy_item ".eslintrc.json" ".eslintrc.json"
copy_item ".gitignore" ".gitignore"
copy_item ".prettierrc" ".prettierrc"
copy_item "next.config.mjs" "next.config.mjs"
copy_item "next-env.d.ts" "next-env.d.ts"
copy_item "next-intl.config.ts" "next-intl.config.ts"
copy_item "package.json" "package.json"
copy_item "package-lock.json" "package-lock.json"
copy_item "tsconfig.json" "tsconfig.json"
copy_item "middleware.ts" "middleware.ts"
copy_item "i18n.ts" "i18n.ts"
copy_item "vercel.json" "vercel.json"

# =============================================================================
# 2. Carpeta src completa
# =============================================================================
echo -e "\n${BLUE}[2/8] Copiando src/...${NC}"

mkdir -p "$TARGET_DIR/src"
cp -r "$SOURCE_DIR/src/abis" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/adapters" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/components" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/config" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/constants" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/contexts" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/data" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/domain" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/hooks" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/i18n" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/lib" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/messages" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/server" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/store" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/styles" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/types" "$TARGET_DIR/src/"
cp -r "$SOURCE_DIR/src/viewmodels" "$TARGET_DIR/src/"
cp "$SOURCE_DIR/src/middleware.ts" "$TARGET_DIR/src/" 2>/dev/null || true

# src/app - copiar selectivamente
mkdir -p "$TARGET_DIR/src/app"
cp -r "$SOURCE_DIR/src/app/[locale]" "$TARGET_DIR/src/app/"
cp -r "$SOURCE_DIR/src/app/api" "$TARGET_DIR/src/app/"
cp -r "$SOURCE_DIR/src/app/fonts" "$TARGET_DIR/src/app/" 2>/dev/null || true
cp "$SOURCE_DIR/src/app/favicon.ico" "$TARGET_DIR/src/app/" 2>/dev/null || true
cp "$SOURCE_DIR/src/app/globals.css" "$TARGET_DIR/src/app/"
cp "$SOURCE_DIR/src/app/layout.tsx" "$TARGET_DIR/src/app/"
cp "$SOURCE_DIR/src/app/not-found.tsx" "$TARGET_DIR/src/app/"
cp "$SOURCE_DIR/src/app/page.tsx" "$TARGET_DIR/src/app/"
cp "$SOURCE_DIR/src/app/providers-evm.tsx" "$TARGET_DIR/src/app/"
cp "$SOURCE_DIR/src/app/page.module.css" "$TARGET_DIR/src/app/" 2>/dev/null || true

# emotion registry (necesario para MUI)
mkdir -p "$TARGET_DIR/src/app/emotion"
cp "$SOURCE_DIR/src/app/emotion/registry.tsx" "$TARGET_DIR/src/app/emotion/"

echo -e "  ${GREEN}✓${NC} src/ (completo)"

# =============================================================================
# 3. Contratos EVM (solo esenciales)
# =============================================================================
echo -e "\n${BLUE}[3/8] Copiando contracts/evm/...${NC}"

mkdir -p "$TARGET_DIR/contracts/evm"
cp -r "$SOURCE_DIR/contracts/evm/contracts" "$TARGET_DIR/contracts/evm/"
cp -r "$SOURCE_DIR/contracts/evm/artifacts" "$TARGET_DIR/contracts/evm/"
cp "$SOURCE_DIR/contracts/evm/hardhat.config.js" "$TARGET_DIR/contracts/evm/"
cp "$SOURCE_DIR/contracts/evm/package.json" "$TARGET_DIR/contracts/evm/"
cp "$SOURCE_DIR/contracts/evm/deploy.avax.v2.json" "$TARGET_DIR/contracts/evm/"
cp "$SOURCE_DIR/contracts/evm/remappings.txt" "$TARGET_DIR/contracts/evm/" 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} contracts/evm/ (esenciales)"

# =============================================================================
# 4. Base de datos
# =============================================================================
echo -e "\n${BLUE}[4/8] Copiando db/...${NC}"

cp -r "$SOURCE_DIR/db" "$TARGET_DIR/"
echo -e "  ${GREEN}✓${NC} db/"

# =============================================================================
# 5. Prisma
# =============================================================================
echo -e "\n${BLUE}[5/8] Copiando prisma/...${NC}"

cp -r "$SOURCE_DIR/prisma" "$TARGET_DIR/"
echo -e "  ${GREEN}✓${NC} prisma/"

# =============================================================================
# 6. Public
# =============================================================================
echo -e "\n${BLUE}[6/8] Copiando public/...${NC}"

cp -r "$SOURCE_DIR/public" "$TARGET_DIR/"
echo -e "  ${GREEN}✓${NC} public/"

# =============================================================================
# 7. Scripts (solo indexer)
# =============================================================================
echo -e "\n${BLUE}[7/8] Copiando scripts esenciales...${NC}"

mkdir -p "$TARGET_DIR/scripts"
cp "$SOURCE_DIR/scripts/run-indexer.ts" "$TARGET_DIR/scripts/"
echo -e "  ${GREEN}✓${NC} scripts/run-indexer.ts"

# =============================================================================
# 8. Documentación esencial
# =============================================================================
echo -e "\n${BLUE}[8/8] Copiando documentación...${NC}"

mkdir -p "$TARGET_DIR/docs"
cp "$SOURCE_DIR/docs/MOSCOW.md" "$TARGET_DIR/docs/"
cp "$SOURCE_DIR/docs/ARCHITECTURE.md" "$TARGET_DIR/docs/"
cp "$SOURCE_DIR/docs/x402-inference-examples.md" "$TARGET_DIR/docs/"
cp "$SOURCE_DIR/docs/metadata.schema.json" "$TARGET_DIR/docs/" 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} docs/ (esenciales)"

# =============================================================================
# Limpiar archivos innecesarios
# =============================================================================
echo -e "\n${BLUE}Limpiando archivos innecesarios...${NC}"

# Eliminar .DS_Store
find "$TARGET_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# Eliminar carpetas vacías de rutas no usadas
rm -rf "$TARGET_DIR/src/app/(auth)" 2>/dev/null || true
rm -rf "$TARGET_DIR/src/app/(dashboard)" 2>/dev/null || true
rm -rf "$TARGET_DIR/src/app/(marketing)" 2>/dev/null || true
rm -rf "$TARGET_DIR/src/app/publish" 2>/dev/null || true
rm -rf "$TARGET_DIR/src/app/evm" 2>/dev/null || true
rm -rf "$TARGET_DIR/src/app/emotion" 2>/dev/null || true

# Eliminar .codeiumignore
find "$TARGET_DIR" -name ".codeiumignore" -delete 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} Limpieza completada"

# =============================================================================
# Crear README para hackathon
# =============================================================================
echo -e "\n${BLUE}Creando README.md para hackathon...${NC}"

cat > "$TARGET_DIR/README.md" << 'HEREDOC'
# WasiAI - AI Model Marketplace on Avalanche

<p align="center">
  <img src="public/logo.svg" alt="WasiAI Logo" width="200"/>
</p>

## 🎯 What is WasiAI?

WasiAI is a decentralized marketplace for AI models and agents built on Avalanche. It enables:

- **AI Model Licensing**: Buy perpetual licenses as NFTs
- **Pay-per-Inference (x402)**: Pay only for what you use with USDC
- **On-chain Agent Identity (ERC-8004)**: Verifiable AI agent identities
- **Reputation System**: On-chain feedback for AI agents

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.18.0
- npm or yarn
- MetaMask or compatible wallet
- Avalanche Fuji testnet configured

### Installation

```bash
# Clone the repository
git clone https://github.com/ferrosasfp/WasiAI_Hack.git
cd WasiAI_Hack

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Environment Variables

Create `.env.local` with:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...

# IPFS (Pinata)
PINATA_JWT=...
NEXT_PUBLIC_PINATA_GATEWAY=...

# Blockchain
NEXT_PUBLIC_EVM_CHAIN_ID=43113
NEXT_PUBLIC_EVM_MARKETPLACE_43113=0xb62427B1b59eE5f246f2a8B37Fe45A1a536Cf56b
NEXT_PUBLIC_EVM_LICENSE_NFT_43113=0x...
NEXT_PUBLIC_EVM_AGENT_REGISTRY_43113=0x...
NEXT_PUBLIC_EVM_REPUTATION_REGISTRY_43113=0x...
NEXT_PUBLIC_EVM_USDC_43113=0x5425890298aed601595a70AB815c96711a31Bc65

# x402 Facilitator
X402_FACILITATOR_URL=https://x402-facilitator-fuji.ultravioleta.io
```

## 📱 Demo Flow

### 1. Browse Models
Navigate to `/en/models` to see the AI model catalog.

### 2. View Model Details
Click on any model to see:
- Model description and capabilities
- ERC-8004 Agent badge
- Reputation score
- Pricing (perpetual license + x402 inference)

### 3. Run Inference (x402)
1. Enter a prompt in the inference panel
2. See the price in USDC
3. Sign the payment with your wallet
4. Receive the AI response
5. Optionally leave feedback (thumbs up/down)

### 4. Buy License
1. Click "Buy License"
2. Approve USDC spending
3. Confirm transaction
4. Receive License NFT

### 5. Publish a Model
Navigate to `/en/publish/wizard/step1` to publish your own AI model.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ├── Catalog (/models)                                          │
│  ├── Model Detail (/evm/models/[id])                            │
│  ├── Publish Wizard (/publish/wizard/step1-5)                   │
│  └── My Licenses (/licenses)                                    │
├─────────────────────────────────────────────────────────────────┤
│                         API Routes                               │
│  ├── /api/inference/[modelId] - x402 pay-per-inference          │
│  ├── /api/indexed/models - Model catalog                        │
│  ├── /api/reputation - Agent reputation                         │
│  └── /api/agents/metadata - ERC-8004 metadata                   │
├─────────────────────────────────────────────────────────────────┤
│                      Smart Contracts (Fuji)                      │
│  ├── MarketplaceV3.sol - Model registry & licensing             │
│  ├── LicenseNFTV2.sol - License NFTs                            │
│  ├── AgentRegistryV2.sol - ERC-8004 agent identity              │
│  ├── ReputationRegistryV2.sol - On-chain feedback               │
│  ├── ModelSplitter.sol - Revenue distribution                   │
│  └── SplitterFactory.sol - Splitter deployment                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📜 Smart Contracts (Avalanche Fuji)

| Contract | Address |
|----------|---------|
| MarketplaceV3 | `0xb62427B1b59eE5f246f2a8B37Fe45A1a536Cf56b` |
| LicenseNFTV2 | `0x...` |
| AgentRegistryV2 | `0x...` |
| ReputationRegistryV2 | `0x...` |
| SplitterFactory | `0xB1bA0794FaF3D8DC4CB96F1334ed1a8AC8a66555` |
| USDC (Mock) | `0x5425890298aed601595a70AB815c96711a31Bc65` |

## 🔑 Key Features

### x402 Protocol Integration
- HTTP 402 Payment Required flow
- USDC payments via EIP-712 signatures
- No gas fees for users (facilitator pays)

### ERC-8004 Agent Identity
- On-chain verifiable AI agent identities
- Metadata stored on IPFS
- Linked to model registry

### Revenue Splitting
- Automatic splitter creation on model publish
- Configurable splits: seller, creator, marketplace
- Pull-pattern withdrawals

### Reputation System
- On-chain thumbs up/down feedback
- Anti-spam protection (1 vote per txHash)
- Aggregated reputation scores

## 📁 Project Structure

```
WasiAI_Hack/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── config/           # Chain configuration
├── contracts/evm/        # Solidity contracts
├── db/                   # Database schema
├── prisma/               # Prisma ORM
└── docs/                 # Documentation
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, MUI
- **Blockchain**: Avalanche, wagmi, viem
- **Payments**: x402 protocol, USDC
- **Storage**: IPFS (Pinata), Neon PostgreSQL
- **Identity**: ERC-8004, ERC-721

## 📄 License

MIT

## 🤝 Team

Built for the Avalanche Hackathon 2024
HEREDOC

echo -e "  ${GREEN}✓${NC} README.md creado"

# =============================================================================
# Resumen
# =============================================================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Preparación completada!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Directorio: ${YELLOW}$TARGET_DIR${NC}"
echo ""
echo -e "Próximos pasos:"
echo -e "  1. ${BLUE}cd $TARGET_DIR${NC}"
echo -e "  2. ${BLUE}npm install${NC}"
echo -e "  3. ${BLUE}npm run build${NC} (verificar que compila)"
echo -e "  4. ${BLUE}git init${NC}"
echo -e "  5. ${BLUE}git remote add origin $GITHUB_REPO${NC}"
echo -e "  6. ${BLUE}git add .${NC}"
echo -e "  7. ${BLUE}git commit -m \"Initial commit - WasiAI Hackathon MVP\"${NC}"
echo -e "  8. ${BLUE}git push -u origin main${NC}"
echo ""

# Calcular tamaño
TOTAL_SIZE=$(du -sh "$TARGET_DIR" | cut -f1)
FILE_COUNT=$(find "$TARGET_DIR" -type f | wc -l | tr -d ' ')

echo -e "Estadísticas:"
echo -e "  - Tamaño total: ${YELLOW}$TOTAL_SIZE${NC}"
echo -e "  - Archivos: ${YELLOW}$FILE_COUNT${NC}"
echo ""
