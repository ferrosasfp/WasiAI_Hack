#!/bin/bash
# Script para configurar ambiente de testing en testnet

set -e

echo "🚀 Setup de Testing Environment para Model Edit/Update"
echo "========================================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para verificar si un comando existe
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Verificar Node.js
echo -e "${YELLOW}[1/6]${NC} Verificando Node.js..."
if command_exists node; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✅ Node.js instalado:${NC} $NODE_VERSION"
else
  echo -e "${RED}❌ Node.js no encontrado${NC}"
  echo "   Instalar desde: https://nodejs.org/"
  exit 1
fi

# Verificar npm
echo -e "\n${YELLOW}[2/6]${NC} Verificando npm..."
if command_exists npm; then
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}✅ npm instalado:${NC} $NPM_VERSION"
else
  echo -e "${RED}❌ npm no encontrado${NC}"
  exit 1
fi

# Verificar dependencias del proyecto
echo -e "\n${YELLOW}[3/6]${NC} Verificando dependencias..."
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  node_modules no encontrado${NC}"
  echo "   Instalando dependencias..."
  npm install
else
  echo -e "${GREEN}✅ Dependencias instaladas${NC}"
fi

# Verificar archivo .env.local
echo -e "\n${YELLOW}[4/6]${NC} Verificando configuración de environment..."
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  .env.local no encontrado${NC}"
  echo "   Creando desde .env.example..."
  
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo -e "${GREEN}✅ .env.local creado${NC}"
  else
    echo -e "${RED}❌ .env.example no encontrado${NC}"
    echo "   Crear .env.local manualmente"
  fi
else
  echo -e "${GREEN}✅ .env.local existe${NC}"
fi

# Verificar configuración de testnet
echo -e "\n${YELLOW}[5/6]${NC} Verificando configuración de testnet..."
if grep -q "NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID" .env.local; then
  CHAIN_ID=$(grep "NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID" .env.local | cut -d '=' -f2)
  echo -e "${GREEN}✅ Chain ID configurado:${NC} $CHAIN_ID"
  
  if [ "$CHAIN_ID" = "43113" ]; then
    echo "   📍 Testnet: Avalanche Fuji"
    echo "   💰 Faucet: https://faucet.avax.network/"
  elif [ "$CHAIN_ID" = "84532" ]; then
    echo "   📍 Testnet: Base Sepolia"
    echo "   💰 Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
  else
    echo -e "${YELLOW}   ⚠️  Chain ID no reconocido (esperado 43113 o 84532)${NC}"
  fi
else
  echo -e "${RED}❌ NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID no configurado en .env.local${NC}"
fi

# Verificar address del Marketplace contract
echo -e "\n${YELLOW}[6/6]${NC} Verificando addresses de smart contracts..."
if [ -f "src/config/addresses.ts" ]; then
  echo -e "${GREEN}✅ src/config/addresses.ts existe${NC}"
  echo "   👉 Verifica manualmente que contenga el address correcto del Marketplace"
else
  echo -e "${RED}❌ src/config/addresses.ts no encontrado${NC}"
fi

# Resumen final
echo ""
echo "========================================================"
echo -e "${GREEN}🎉 Setup completado!${NC}"
echo "========================================================"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. 🔑 Obtener fondos de testnet:"
if [ "$CHAIN_ID" = "43113" ]; then
  echo "   → https://faucet.avax.network/"
elif [ "$CHAIN_ID" = "84532" ]; then
  echo "   → https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
else
  echo "   → (Depende de tu testnet configurada)"
fi
echo ""
echo "2. 📝 Publicar un modelo de prueba:"
echo "   → npm run dev"
echo "   → Navegar a /publish/wizard"
echo "   → Conectar wallet y publicar modelo"
echo ""
echo "3. 🧪 Iniciar testing:"
echo "   → Abrir docs/TESTING_QUICK_CHECKLIST.md"
echo "   → Seguir los pasos marcando cada checkbox"
echo "   → Documentar tx hashes y resultados"
echo ""
echo "4. 🔍 Verificar ownership (opcional):"
echo "   → npx tsx scripts/verify-model-ownership.ts <modelId> <yourWallet>"
echo ""
echo "📚 Documentación completa:"
echo "   → docs/TESTING_MODEL_EDIT_TESTNET.md"
echo ""
echo "¡Buen testing! 🚀"
echo ""
