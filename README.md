# WasiAI - AI Agent Marketplace on Avalanche

> **Hack2Build: Payments x402 Hackathon Submission**

WasiAI is the home of AI agents on Avalanche. It turns AI models into on-chain agents that get paid per inference using the x402 protocol and have verifiable identity via ERC-8004.

## 🎯 Hackathon Submission

**Event:** Hack2Build: Payments x402  
**Track:** AI Agent Monetization on Avalanche  
**Team:** Fernando Rosas ([@ferrosasfp](https://github.com/ferrosasfp))

## 🚀 What We're Building

WasiAI enables AI model creators to monetize their models through:

1. **x402 Pay-per-Inference** - HTTP 402 payment flow for per-call billing in AVAX
2. **ERC-8004 Agent Identity** - On-chain identity registry for AI agents
3. **License NFTs** - Perpetual/subscription access via NFTs on Avalanche

## 📋 Progress Tracker

### Must Have
- [ ] x402 inference endpoint (`/api/inference/[modelId]`)
- [ ] On-chain payment verification
- [ ] Per-inference pricing in metadata
- [ ] Simple inference UI with payment flow
- [ ] AgentRegistry.sol (ERC-8004 Identity)
- [ ] Agent registration file (IPFS)
- [ ] Wizard integration for agent registration
- [ ] ERC-8004 badge in UI

### Should Have
- [ ] Replay protection (txHash caching)
- [ ] Inference history view
- [ ] Rate limiting
- [ ] ReputationRegistry.sol (ERC-8004)
- [ ] Feedback UI (👍/👎)
- [ ] USDC payment support

### Could Have
- [ ] Real AI model (not mock)
- [ ] LicenseNFT holder perks
- [ ] Creator dashboard

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         WasiAI                               │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14 + Material UI)                         │
│  ├── Publish Wizard (5 steps)                               │
│  ├── Model Catalog (infinite scroll + filters)              │
│  ├── Model Detail Page                                       │
│  └── x402 Inference UI                                       │
├─────────────────────────────────────────────────────────────┤
│  Backend (Next.js API Routes)                                │
│  ├── /api/inference/[modelId] ← x402 gateway                │
│  ├── /api/agents/register ← ERC-8004 registration           │
│  ├── /api/models/publish ← IPFS + tx params                 │
│  └── Indexer (blockchain events → Postgres cache)           │
├─────────────────────────────────────────────────────────────┤
│  Smart Contracts (Avalanche Fuji / C-Chain)                  │
│  ├── Marketplace.sol - Model registry + license sales       │
│  ├── LicenseNFT.sol - ERC-721 license tokens                │
│  ├── AgentRegistry.sol - ERC-8004 Identity (TBD)            │
│  └── ReputationRegistry.sol - ERC-8004 Reputation (TBD)     │
├─────────────────────────────────────────────────────────────┤
│  Storage                                                     │
│  ├── IPFS (Pinata) - Metadata, artifacts, agent files       │
│  └── Neon Postgres - Indexed cache for fast queries         │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Material UI |
| **Blockchain** | Avalanche C-Chain, Solidity, wagmi, viem, RainbowKit |
| **Storage** | IPFS (Pinata), Neon Postgres |
| **Wallet** | RainbowKit + wagmi + Thirdweb In-App Wallets |
| **i18n** | next-intl (English/Spanish) |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your keys (see below)

# Run development server
npm run dev

# Open http://localhost:3000
```

## 📝 Environment Variables

Create `.env.local` with:

```bash
# Blockchain (Avalanche Fuji)
NEXT_PUBLIC_AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_LICENSE_NFT_ADDRESS=0x...

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud

# Database (Neon Postgres)
DATABASE_URL=postgresql://...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Thirdweb (Social Login / In-App Wallets)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
```

See `.env.example` for all available options.

## 🔐 Thirdweb Setup (Social Login)

WasiAI supports social login (Google, Apple, Email, Passkey) via Thirdweb In-App Wallets. This allows non-crypto users to onboard easily.

### Quick Setup

1. **Get a Client ID** from [Thirdweb Dashboard](https://thirdweb.com/dashboard)
2. Create a project and add your domains (`localhost:3000`, `localhost:3002`, your production domain)
3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here
   ```

### Features
- **Google Login** - One-click sign in with Google account
- **Apple Login** - Sign in with Apple ID
- **Email Login** - Passwordless email authentication
- **Passkey** - Biometric authentication (Face ID, Touch ID)
- **Hybrid Mode** - Users can also connect traditional wallets (MetaMask, WalletConnect)

### How It Works
```
User clicks "Connect Wallet"
        ↓
┌─────────────────────────────┐
│     Quick Sign In           │
│  [Google] [Apple] [Email]   │
│         ─── or ───          │
│     Connect Wallet          │
│  [MetaMask, WalletConnect]  │
└─────────────────────────────┘
```

The Thirdweb in-app wallet creates a non-custodial wallet linked to the user's social account, fully compatible with wagmi/viem.

## 🔗 Deployed Contracts (Avalanche Fuji - 43113)

| Contract | Address | Status |
|----------|---------|--------|
| MarketplaceV3 | `0xf1eA59d71C67e9E6Ea481Aa26911641a6c97370C` | ✅ Deployed |
| LicenseNFTV2 | `0xC657F1B26fc56A0AA1481F502BCC6532B93d7426` | ✅ Deployed |
| AgentRegistryV2 | `0x3421c2cDE342afF48C12Fe345eD81cA1ac4D89A6` | ✅ Deployed |
| SplitterFactory | `0xf8d8C220181CAe9A748b8e817BFE337AB5b74731` | ✅ Deployed |
| MockUSDC | `0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e` | ✅ Deployed |
| Circle USDC (x402) | `0x5425890298aed601595a70AB815c96711a31Bc65` | ✅ External |

## 📁 Project Structure

```
├── contracts/evm/                    # Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── MarketplaceV3.sol         # Model registry + license sales + splitter integration
│   │   ├── LicenseNFTV2.sol          # ERC-721 license tokens
│   │   ├── AgentRegistryV2.sol       # ERC-8004 Agent Identity
│   │   ├── ReputationRegistryV2.sol  # ERC-8004 Reputation (planned)
│   │   ├── SplitterFactory.sol       # Creates ModelSplitter clones per model
│   │   ├── ModelSplitter.sol         # Revenue split (seller/creator/marketplace)
│   │   └── MockUSDC.sol              # Test token for Fuji
│   └── scripts/                      # Deploy & verification scripts
│
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── [locale]/                 # i18n routes (en/es)
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── models/               # Model catalog (indexed from DB)
│   │   │   ├── evm/models/[id]/      # Model detail page (blockchain + IPFS)
│   │   │   ├── licenses/             # User's license NFTs
│   │   │   └── publish/wizard/       # 5-step publish wizard
│   │   │       ├── step1/            # Basic info + cover image
│   │   │       ├── step2/            # Business & technical metadata
│   │   │       ├── step3/            # Artifacts upload (IPFS)
│   │   │       ├── step4/            # Pricing & licensing terms
│   │   │       └── step5/            # Review & publish to blockchain
│   │   └── api/                      # API routes
│   │       ├── inference/[modelId]/  # x402 pay-per-inference gateway
│   │       ├── models/               # Model CRUD, drafts, publish
│   │       ├── ipfs/                 # IPFS proxy & upload
│   │       ├── indexed/              # Cached data from Neon DB
│   │       └── keys/                 # Protected content key management
│   │
│   ├── components/                   # React components
│   │   ├── ConnectWalletModal.tsx    # Hybrid wallet modal (Thirdweb + RainbowKit)
│   │   ├── SocialLoginButtons.tsx    # Google/Apple/Email/Passkey login
│   │   ├── UnifiedConnectButtonEvm.tsx # Main connect button
│   │   ├── ModelCard.tsx             # Model card for catalog
│   │   ├── ModelDetailView.tsx       # Shared detail page UI
│   │   ├── X402InferencePanel.tsx    # Pay-per-inference UI
│   │   └── QuickEditDrawer.tsx       # Edit pricing/rights without republish
│   │
│   ├── adapters/evm/                 # Blockchain interaction layer
│   │   ├── read.ts                   # Read from contracts (wagmi)
│   │   └── write.ts                  # Write to contracts (transactions)
│   │
│   ├── viewmodels/                   # Data transformation layer
│   │   ├── types.ts                  # ViewModel interfaces
│   │   ├── factories.ts              # Create ViewModels from raw data
│   │   └── adapters.ts               # Adapt between data sources
│   │
│   ├── lib/                          # Utilities
│   │   ├── indexer.ts                # Blockchain → Neon DB sync
│   │   ├── ipfs.ts                   # IPFS helpers
│   │   └── db.ts                     # Neon Postgres client
│   │
│   ├── hooks/                        # Custom React hooks
│   ├── config/                       # Chain configs, ABIs, constants
│   ├── contexts/                     # React contexts (Wallet, Wizard)
│   ├── messages/                     # i18n translations (en.json, es.json)
│   └── styles/                       # MUI theme
│
├── db/                               # Database
│   └── migrations/                   # SQL migrations for Neon
│
├── scripts/                          # Node.js utilities
│   ├── run-indexer.ts                # Sync blockchain to Neon
│   └── cache-all-metadata.ts         # Pre-cache IPFS metadata
│
├── docs/                             # Documentation
│   └── analysis/                     # Technical analysis docs
│
└── public/                           # Static assets
```

## 🎮 Key Features

### For Model Creators
- **5-Step Publish Wizard** - Guided flow to publish AI models
- **IPFS Storage** - Decentralized metadata and artifact storage
- **Flexible Pricing** - Perpetual licenses, subscriptions, and per-inference
- **Royalties** - Earn on every license sale

### For Model Users
- **Browse & Search** - Discover AI models with filters
- **License NFTs** - Own perpetual or subscription access
- **x402 Pay-per-Use** - Pay only for what you use
- **Wallet Integration** - Seamless RainbowKit experience

## 🛠️ Development

```bash
# Run dev server
npm run dev

# Run on specific port
npm run dev -- -p 3002

# Build for production
npm run build

# Run indexer (sync blockchain events)
npm run indexer

# Type check
npm run typecheck
```

## 📖 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Smart Contract Docs](./contracts/evm/README.md)
- [API Reference](./docs/API.md)

## 🔮 Roadmap

### Hackathon (Current)
- [x] Model marketplace with license NFTs
- [x] 5-step publish wizard
- [x] IPFS metadata storage
- [ ] x402 pay-per-inference
- [ ] ERC-8004 agent identity

### Post-Hackathon
- [ ] USDC payment support
- [ ] ERC-8004 Reputation Registry
- [ ] Real AI model integration
- [ ] Creator analytics dashboard
- [ ] Multi-chain support (Base, etc.)

## 📄 License

MIT

## 🙏 Acknowledgments

- [Avalanche](https://www.avax.network/) - Blockchain infrastructure
- [x402 Protocol](https://www.x402.org/) - Payment standard
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity standard
- [Pinata](https://pinata.cloud/) - IPFS pinning service
- [Thirdweb](https://thirdweb.com/) - In-App Wallets & Account Abstraction
