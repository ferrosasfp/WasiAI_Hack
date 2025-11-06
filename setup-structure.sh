#!/bin/bash

# ============================================
# MARKETPLACEAI - SETUP ESTRUCTURA
# ============================================
# Script para crear toda la estructura de carpetas y archivos base
# Autor: MarketplaceAI Team
# Fecha: 2025
# ============================================

set -e  # Salir si hay algún error

echo "🚀 Iniciando setup de estructura MarketplaceAI..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# FUNCIÓN: Crear directorio
# ============================================
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}✓${NC} Creado: $1"
    else
        echo -e "${YELLOW}⊙${NC} Ya existe: $1"
    fi
}

# ============================================
# FUNCIÓN: Crear archivo vacío
# ============================================
create_file() {
    if [ ! -f "$1" ]; then
        touch "$1"
        echo -e "${GREEN}✓${NC} Creado: $1"
    else
        echo -e "${YELLOW}⊙${NC} Ya existe: $1"
    fi
}

# ============================================
# ESTRUCTURA PRINCIPAL
# ============================================

echo -e "${BLUE}📁 Creando estructura de carpetas...${NC}"
echo ""

# Directorio src principal
create_dir "src"

# ============================================
# APP DIRECTORY (Next.js 14 App Router)
# ============================================
echo -e "${BLUE}📱 App Router...${NC}"
create_dir "src/app"
create_dir "src/app/(auth)"
create_dir "src/app/(auth)/login"
create_dir "src/app/(auth)/register"
create_dir "src/app/(marketing)"
create_dir "src/app/(marketing)/about"
create_dir "src/app/(marketing)/how-it-works"
create_dir "src/app/(dashboard)"
create_dir "src/app/(dashboard)/models"
create_dir "src/app/(dashboard)/models/[id]"
create_dir "src/app/(dashboard)/models/[id]/purchase"
create_dir "src/app/(dashboard)/my-models"
create_dir "src/app/(dashboard)/upload"
create_dir "src/app/(dashboard)/profile"
create_dir "src/app/api"
create_dir "src/app/api/models"
create_dir "src/app/api/ipfs"
create_dir "src/app/api/health"

# ============================================
# COMPONENTS
# ============================================
echo -e "${BLUE}🧩 Componentes...${NC}"
create_dir "src/components"
create_dir "src/components/layout"
create_dir "src/components/layout/Header"
create_dir "src/components/layout/Footer"
create_dir "src/components/layout/Sidebar"
create_dir "src/components/layout/Navigation"

create_dir "src/components/wallet"
create_dir "src/components/wallet/WalletButton"
create_dir "src/components/wallet/WalletInfo"
create_dir "src/components/wallet/NetworkSelector"

create_dir "src/components/models"
create_dir "src/components/models/ModelCard"
create_dir "src/components/models/ModelList"
create_dir "src/components/models/ModelDetail"
create_dir "src/components/models/ModelFilters"
create_dir "src/components/models/ModelSearch"

create_dir "src/components/upload"
create_dir "src/components/upload/UploadForm"
create_dir "src/components/upload/FileUploader"
create_dir "src/components/upload/MetadataForm"
create_dir "src/components/upload/PriceInput"

create_dir "src/components/purchase"
create_dir "src/components/purchase/PurchaseModal"
create_dir "src/components/purchase/PurchaseConfirmation"
create_dir "src/components/purchase/TransactionStatus"

create_dir "src/components/common"
create_dir "src/components/common/Button"
create_dir "src/components/common/Card"
create_dir "src/components/common/Input"
create_dir "src/components/common/Modal"
create_dir "src/components/common/Loading"
create_dir "src/components/common/ErrorBoundary"
create_dir "src/components/common/Toast"
create_dir "src/components/common/Badge"
create_dir "src/components/common/Avatar"
create_dir "src/components/common/Tabs"

# ============================================
# HOOKS
# ============================================
echo -e "${BLUE}🪝 Hooks...${NC}"
create_dir "src/hooks"
create_dir "src/hooks/wallet"
create_dir "src/hooks/models"
create_dir "src/hooks/transactions"
create_dir "src/hooks/ipfs"

# ============================================
# LIB (Librerías y utilidades)
# ============================================
echo -e "${BLUE}📚 Librerías...${NC}"
create_dir "src/lib"
create_dir "src/lib/sui"
create_dir "src/lib/sui/contract"
create_dir "src/lib/sui/client"
create_dir "src/lib/sui/parsers"
create_dir "src/lib/ipfs"
create_dir "src/lib/utils"
create_dir "src/lib/validators"

# ============================================
# STORE (Zustand)
# ============================================
echo -e "${BLUE}🗄️  Store...${NC}"
create_dir "src/store"
create_dir "src/store/slices"

# ============================================
# TYPES
# ============================================
echo -e "${BLUE}📝 Types...${NC}"
create_dir "src/types"

# ============================================
# CONFIG
# ============================================
echo -e "${BLUE}⚙️  Config...${NC}"
create_dir "src/config"

# ============================================
# STYLES
# ============================================
echo -e "${BLUE}🎨 Styles...${NC}"
create_dir "src/styles"

# ============================================
# TESTS
# ============================================
echo -e "${BLUE}🧪 Tests...${NC}"
create_dir "__tests__"
create_dir "__tests__/components"
create_dir "__tests__/hooks"
create_dir "__tests__/lib"
create_dir "__tests__/integration"
create_dir "__tests__/e2e"

# ============================================
# PUBLIC
# ============================================
echo -e "${BLUE}🌐 Public...${NC}"
create_dir "public"
create_dir "public/images"
create_dir "public/icons"
create_dir "public/fonts"

# ============================================
# CREAR ARCHIVOS INDEX
# ============================================
echo ""
echo -e "${BLUE}📄 Creando archivos index...${NC}"

# Components index files
create_file "src/components/layout/index.ts"
create_file "src/components/wallet/index.ts"
create_file "src/components/models/index.ts"
create_file "src/components/upload/index.ts"
create_file "src/components/purchase/index.ts"
create_file "src/components/common/index.ts"

# Hooks index files
create_file "src/hooks/index.ts"
create_file "src/hooks/wallet/index.ts"
create_file "src/hooks/models/index.ts"
create_file "src/hooks/transactions/index.ts"
create_file "src/hooks/ipfs/index.ts"

# Lib index files
create_file "src/lib/sui/index.ts"
create_file "src/lib/ipfs/index.ts"
create_file "src/lib/utils/index.ts"

# Store index file
create_file "src/store/index.ts"

# Types index file
create_file "src/types/index.ts"

# ============================================
# CREAR ARCHIVOS GITKEEP
# ============================================
echo ""
echo -e "${BLUE}📌 Creando .gitkeep para carpetas vacías...${NC}"

find src -type d -empty -exec touch {}/.gitkeep \;
find public -type d -empty -exec touch {}/.gitkeep \;
find __tests__ -type d -empty -exec touch {}/.gitkeep \;

# ============================================
# CREAR ARCHIVOS DE CONFIGURACIÓN BASE
# ============================================
echo ""
echo -e "${BLUE}⚙️  Creando archivos de configuración...${NC}"

# .gitignore adicional para archivos específicos
if [ ! -f ".gitignore.marketplace" ]; then
    cat > .gitignore.marketplace << 'EOF'
# MarketplaceAI specific
.env.local
.env.production.local
*.log
.DS_Store
.vscode/
.idea/

# IPFS cache
.ipfs-cache/

# Build
.next/
out/
build/
dist/

# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Misc
*.pem
*.key
.vercel
EOF
    echo -e "${GREEN}✓${NC} Creado: .gitignore.marketplace"
fi

# README para cada sección principal
cat > src/components/README.md << 'EOF'
# Components

Estructura de componentes del MarketplaceAI.

## Organización

- **layout/**: Componentes de layout (Header, Footer, Sidebar)
- **wallet/**: Componentes relacionados con wallet de Sui
- **models/**: Componentes para mostrar y gestionar modelos
- **upload/**: Componentes para subir modelos
- **purchase/**: Componentes para proceso de compra
- **common/**: Componentes reutilizables
EOF

cat > src/hooks/README.md << 'EOF'
# Hooks

Custom hooks para MarketplaceAI.

## Categorías

- **wallet/**: Hooks para interacción con wallet
- **models/**: Hooks para gestión de modelos
- **transactions/**: Hooks para transacciones blockchain
- **ipfs/**: Hooks para IPFS
EOF

cat > src/lib/README.md << 'EOF'
# Libraries

Librerías y utilidades core del proyecto.

## Módulos

- **sui/**: Cliente y funciones para interactuar con Sui blockchain
- **ipfs/**: Cliente para IPFS/Pinata
- **utils/**: Utilidades generales
- **validators/**: Validadores con Zod
EOF

# ============================================
# RESUMEN
# ============================================
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ESTRUCTURA CREADA EXITOSAMENTE${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

# Contar directorios y archivos creados
dir_count=$(find src -type d | wc -l)
file_count=$(find src -type f | wc -l)

echo -e "${BLUE}📊 Estadísticas:${NC}"
echo -e "   Directorios: ${GREEN}$dir_count${NC}"
echo -e "   Archivos: ${GREEN}$file_count${NC}"
echo ""

echo -e "${BLUE}📁 Estructura principal:${NC}"
tree -L 2 -d src 2>/dev/null || find src -type d -maxdepth 2 | sed 's|^|   |'

echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo "   1. Revisar la estructura creada"
echo "   2. Crear archivos de configuración (.env.local)"
echo "   3. Implementar componentes base"
echo "   4. Configurar providers en src/app/providers.tsx"
echo ""
echo -e "${GREEN}🚀 ¡Listo para comenzar a desarrollar!${NC}"
