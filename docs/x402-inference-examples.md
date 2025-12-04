# x402 Inference - Ejemplos y Batería de Pruebas

## Modelos Disponibles

| Model ID | Nombre | Tipo | Precio | HuggingFace Model |
|----------|--------|------|--------|-------------------|
| **14** | Smart Contract Security Classifier | zero-shot-classification | $0.02 USDC | `facebook/bart-large-mnli` |
| **20** | Crypto Sentiment Analyzer | sentiment-analysis | $0.005 USDC | `ProsusAI/finbert` |
| **23** | Blockchain Topic Classifier | zero-shot-classification | $0.01 USDC | `facebook/bart-large-mnli` |

---

## Model 14: Smart Contract Security Classifier

**URL**: `http://localhost:3000/en/evm/models/14`

Clasifica textos relacionados con seguridad de smart contracts en categorías:
- Reentrancy, Access Control, Integer Overflow, Front-running
- Oracle Manipulation, Flash Loan Attack, Gas Optimization, Best Practice

### Ejemplos de Prueba

| # | Prompt | Resultado Esperado |
|---|--------|-------------------|
| 1 | `What are the risks of using delegatecall in Solidity?` | Access Control / Reentrancy |
| 2 | `Always use SafeMath for arithmetic operations` | Integer Overflow / Best Practice |
| 3 | `The contract reads price from a single DEX without TWAP` | Oracle Manipulation |
| 4 | `Attacker can call withdraw() before balance is updated` | Reentrancy |
| 5 | `Use nonReentrant modifier on all external functions` | Best Practice / Reentrancy |
| 6 | `Sandwich attack on AMM swap transactions` | Front-running |
| 7 | `Borrow 1M USDC, manipulate price, repay in same tx` | Flash Loan Attack |
| 8 | `Pack multiple variables into single storage slot` | Gas Optimization |
| 9 | `Missing access control on admin functions` | Access Control |
| 10 | `Unchecked return value from external call` | Best Practice |

### Resultado Ejemplo

```json
{
  "task": "zero-shot-classification",
  "input_text": "What are the risks of using delegatecall in Solidity?",
  "labels": ["Access Control", "Reentrancy", "Best Practice", ...],
  "scores": [0.42, 0.28, 0.15, ...],
  "top_label": "Access Control",
  "top_score": 0.42,
  "model": "facebook/bart-large-mnli",
  "model_name": "Smart Contract Security Classifier",
  "agent": "agent-1"
}
```

---

## Model 20: Crypto Sentiment Analyzer

**URL**: `http://localhost:3000/en/evm/models/20`

Analiza el sentimiento de noticias financieras y crypto:
- **positive**: Noticias alcistas, partnerships, adopción
- **negative**: Hacks, regulación negativa, caídas
- **neutral**: Información factual sin sesgo

### Ejemplos de Prueba

| # | Prompt | Resultado Esperado |
|---|--------|-------------------|
| 1 | `Avalanche announces major partnership with Amazon Web Services, TVL expected to double` | positive (0.85+) |
| 2 | `Bitcoin crashes 20% as SEC announces new regulations` | negative (0.80+) |
| 3 | `Ethereum completed the merge to proof of stake` | neutral/positive |
| 4 | `Major DeFi protocol hacked for $100M, funds drained` | negative (0.90+) |
| 5 | `BlackRock files for Bitcoin spot ETF approval` | positive (0.75+) |
| 6 | `Crypto exchange reports quarterly trading volume of $50B` | neutral |
| 7 | `Solana network experiences 12-hour outage` | negative (0.70+) |
| 8 | `Institutional investors increase crypto allocation to 5%` | positive (0.65+) |
| 9 | `Central bank announces CBDC pilot program` | neutral |
| 10 | `NFT marketplace sees 90% decline in trading volume` | negative (0.75+) |

### Resultado Ejemplo

```json
{
  "task": "sentiment-analysis",
  "input_text": "Avalanche announces major partnership with Amazon Web Services",
  "sentiment": "positive",
  "confidence": 0.87,
  "all_scores": [
    {"label": "positive", "score": 0.87},
    {"label": "neutral", "score": 0.10},
    {"label": "negative", "score": 0.03}
  ],
  "model": "ProsusAI/finbert",
  "model_name": "Crypto Sentiment Analyzer",
  "agent": "agent-2"
}
```

---

## Model 23: Blockchain Topic Classifier

**URL**: `http://localhost:3000/en/evm/models/23`

Clasifica textos blockchain en categorías temáticas:
- DeFi, NFT, Layer 2, Security, Governance, Trading, Development, Tokenomics

### Ejemplos de Prueba

| # | Prompt | Resultado Esperado |
|---|--------|-------------------|
| 1 | `How to stake AVAX tokens and earn rewards while participating in network validation` | DeFi / Governance |
| 2 | `Mint your unique digital collectible on OpenSea` | NFT |
| 3 | `Arbitrum and Optimism compete for Ethereum scaling dominance` | Layer 2 |
| 4 | `Smart contract audit reveals critical vulnerability` | Security |
| 5 | `Token holders vote on treasury allocation proposal` | Governance |
| 6 | `Set stop-loss orders to manage downside risk` | Trading |
| 7 | `Deploy your first Solidity contract on Remix IDE` | Development |
| 8 | `New token has 2% burn on every transaction` | Tokenomics |
| 9 | `Provide liquidity to Uniswap V3 concentrated pools` | DeFi |
| 10 | `Bridge assets from Ethereum to Avalanche using LayerZero` | Layer 2 / DeFi |

### Resultado Ejemplo

```json
{
  "task": "zero-shot-classification",
  "input_text": "How to stake AVAX tokens and earn rewards",
  "labels": ["DeFi", "Governance", "Trading", "Tokenomics", ...],
  "scores": [0.52, 0.23, 0.12, 0.08, ...],
  "top_label": "DeFi",
  "top_score": 0.52,
  "model": "facebook/bart-large-mnli",
  "model_name": "Blockchain Topic Classifier",
  "agent": "agent-3"
}
```

---

## Batería de Pruebas Rápidas (Copy-Paste)

### Model 14 - Security
```
What are the risks of using delegatecall in Solidity?
```
```
Attacker can call withdraw() before balance is updated
```
```
Missing access control on admin functions
```

### Model 20 - Sentiment
```
Avalanche announces major partnership with Amazon Web Services, TVL expected to double by Q1 2025
```
```
Major DeFi protocol hacked for $100M, all funds drained overnight
```
```
Bitcoin price remains stable at $45,000 amid low trading volume
```

### Model 23 - Topics
```
How to stake AVAX tokens and earn rewards while participating in network validation
```
```
Deploy your first Solidity smart contract using Hardhat and ethers.js
```
```
New governance proposal to reduce protocol fees by 50%
```

---

## Límites de HuggingFace Free Tier

### Rate Limits (Diciembre 2024)

| Tier | Requests/min | Requests/día | Costo |
|------|--------------|--------------|-------|
| **Free** | ~30 | ~1,000 | $0 |
| **Pro** | 1,000+ | Ilimitado | $9/mes |

### Notas Importantes

1. **Warm-up Time**: Los modelos en free tier pueden tardar 20-30 segundos en "despertar" si no han sido usados recientemente.

2. **Queue**: En horas pico, las requests pueden quedar en cola.

3. **Modelos Usados**:
   - `facebook/bart-large-mnli`: Muy popular, generalmente disponible
   - `ProsusAI/finbert`: Modelo especializado, puede tener más latencia

4. **Para el Hackathon**: Con ~1,000 requests/día tienes suficiente para:
   - ~300 demos del Model 14
   - ~300 demos del Model 20  
   - ~300 demos del Model 23

5. **Si necesitas más**: Considera HuggingFace Pro ($9/mes) o usar Inference Endpoints dedicados.

---

## Verificar Estado de la API

```bash
# Test Model 20 (FinBERT)
curl -X POST "https://router.huggingface.co/hf-inference/models/ProsusAI/finbert" \
  -H "Authorization: Bearer $HUGGINGFACE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Bitcoin is going up"}'

# Test Model 23 (BART)
curl -X POST "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli" \
  -H "Authorization: Bearer $HUGGINGFACE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "How to stake tokens", "parameters": {"candidate_labels": ["DeFi", "NFT", "Trading"]}}'
```

---

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `"Fallback to mock"` | Token inválido o modelo no disponible | Verificar `HUGGINGFACE_API_TOKEN` en `.env.local` |
| `503 Service Unavailable` | Modelo cargando (cold start) | Esperar 20-30 segundos y reintentar |
| `429 Too Many Requests` | Rate limit alcanzado | Esperar 1 minuto o upgrade a Pro |
| `TransportError(NullResp)` | Error de red/facilitator | Verificar conexión y reintentar |

---

## URLs de Prueba

- **Model 14**: http://localhost:3000/en/evm/models/14
- **Model 20**: http://localhost:3000/en/evm/models/20
- **Model 23**: http://localhost:3000/en/evm/models/23

---

*Última actualización: Diciembre 2024*


----------


Voy a verificar si FinBERT es adecuado para el caso de uso y buscar alternativas.









Tengo toda la información necesaria. Aquí está el análisis completo:

---

# Validación de Modelos para CryptoSentiment ES

## ✅ ProsusAI/finbert - Análisis

| Aspecto | Evaluación |
|---------|------------|
| **Dominio** | ✅ Financiero (entrenado con Financial PhraseBank) |
| **Idioma** | ❌ **Solo inglés** |
| **Tipo de texto** | Noticias financieras formales, no tweets |
| **Output** | positive / negative / neutral |
| **Crypto** | ⚠️ No específico, pero funciona con texto financiero general |

**Veredicto**: FinBERT es excelente para texto financiero **en inglés**, pero **no soporta español**. No es ideal para "CryptoSentiment ES".

---

## 🏆 Recomendación: cardiffnlp/twitter-xlm-roberta-base-sentiment

| Aspecto | Evaluación |
|---------|------------|
| **Dominio** | ✅ Twitter/Social media |
| **Idiomas** | ✅ **Multilingüe incluyendo español** (Ar, En, Fr, De, Hi, It, **Sp**, Pt) |
| **Entrenamiento** | ~198M tweets |
| **Output** | Positive / Neutral / Negative |
| **HF Inference** | ✅ Gratuito |

**Endpoint:**
```
https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-xlm-roberta-base-sentiment
```

**Este es el modelo perfecto para CryptoSentiment ES** porque:
- ✅ Entrenado específicamente en tweets
- ✅ Soporta español nativamente
- ✅ Maneja emojis y jerga de redes sociales
- ✅ Free tier en HuggingFace Inference API

---

## Alternativas Válidas (Free Inference)

### 1. **tabularisai/multilingual-sentiment-analysis**
```
https://api.tabularis.ai/
```
| Pro | Contra |
|-----|--------|
| 22+ idiomas incluyendo español | Requiere licencia comercial |
| 5 clases (Very Negative → Very Positive) | API externa (no HF) |
| Optimizado para social media | |

### 2. **nlptown/bert-base-multilingual-uncased-sentiment**
```
https://router.huggingface.co/hf-inference/models/nlptown/bert-base-multilingual-uncased-sentiment
```
| Pro | Contra |
|-----|--------|
| Español incluido | Entrenado en reviews de productos |
| 5 estrellas (1-5) | No específico para tweets |
| HF Free tier | |

### 3. **cardiffnlp/twitter-roberta-base-sentiment** (Solo inglés)
```
https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-roberta-base-sentiment
```
| Pro | Contra |
|-----|--------|
| Mejor para tweets en inglés | ❌ No soporta español |
| ~58M tweets de entrenamiento | |

### 4. **finiteautomata/bertweet-base-sentiment-analysis** (Solo inglés)
```
https://router.huggingface.co/hf-inference/models/finiteautomata/bertweet-base-sentiment-analysis
```
| Pro | Contra |
|-----|--------|
| Específico para tweets | ❌ Solo inglés |
| Muy popular | |

---

## 📋 Actualización del Test Data

Para el ejemplo **CryptoSentiment ES**, actualiza Step 3:

| Field | Updated Value |
|-------|---------------|
| `inferenceEndpoint` | `https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-xlm-roberta-base-sentiment` |
| `inferencePaymentWallet` | (tu wallet address) |

### Test Request
```bash
curl -X POST "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-xlm-roberta-base-sentiment" \
  -H "Authorization: Bearer $HUGGINGFACE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Bitcoin rompiendo resistencias, esto se va a la luna 🚀"}'
```

### Expected Response
```json
[
  {"label": "Positive", "score": 0.85},
  {"label": "Neutral", "score": 0.12},
  {"label": "Negative", "score": 0.03}
]
```

---

## Resumen de Endpoints Gratuitos

| Modelo | Endpoint | Idiomas | Mejor para |
|--------|----------|---------|------------|
| **twitter-xlm-roberta-base-sentiment** ⭐ | `cardiffnlp/twitter-xlm-roberta-base-sentiment` | ES, EN, +6 | Tweets multilingües |
| **finbert** | `ProsusAI/finbert` | EN | Noticias financieras EN |
| **bert-multilingual-sentiment** | `nlptown/bert-base-multilingual-uncased-sentiment` | ES, EN, +4 | Reviews de productos |
| **twitter-roberta-sentiment** | `cardiffnlp/twitter-roberta-base-sentiment` | EN | Tweets en inglés |

**Recomendación final**: Usa `cardiffnlp/twitter-xlm-roberta-base-sentiment` para el test de CryptoSentiment ES.