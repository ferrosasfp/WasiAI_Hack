# Ejemplos de Prueba para Publicación de Modelos

## Archivos de Prueba

Los archivos están en `test-assets/`:

```
test-assets/
├── example1/                    # Customer Churn Predictor
│   ├── cover.svg               # Imagen de portada
│   ├── model-weights.bin       # Artefacto: pesos del modelo
│   ├── config.json             # Artefacto: configuración
│   └── README.md               # Artefacto: documentación
│
└── example2/                    # Sentiment Analyzer
    ├── cover.svg               # Imagen de portada
    ├── model.onnx              # Artefacto: modelo ONNX
    ├── tokenizer.json          # Artefacto: tokenizador
    └── README.md               # Artefacto: documentación
```

---

# EJEMPLO 1: Customer Churn Predictor

## Step 1 - Model Identity

| Campo | Valor |
|-------|-------|
| **Model Name** | Customer Churn Predictor |
| **Slug** | customer-churn-predictor |
| **Summary** | Predict customer churn probability using machine learning. Analyzes customer behavior patterns, contract details, and service usage to identify at-risk customers before they leave. Achieve 89% accuracy in churn prediction. |
| **Cover Image** | `test-assets/example1/cover.svg` |
| **Business Category** | Marketing & Growth |
| **Model Type (Business)** | Customer Segmentation |
| **Technical Categories** | Tabular / Structured Data |
| **Technical Tags** | classification, churn-prediction, customer-analytics, scikit-learn |

## Step 2 - Customer Sheet

### Business Profile

| Campo | Valor |
|-------|-------|
| **Value Proposition** | Reduce customer churn by up to 25% by identifying at-risk customers early and enabling targeted retention campaigns. |
| **Customer Description** | SaaS companies, telecom providers, subscription businesses, and any company with recurring revenue models looking to improve customer retention. |
| **Expected Impact** | Companies typically see 15-25% reduction in churn rate within 3 months of implementation, translating to significant revenue retention. |

### How This Is Used

| Campo | Valor |
|-------|-------|
| **Inputs** | Customer tenure (months), monthly charges ($), total charges ($), contract type, payment method, internet service type, add-on services (security, tech support, etc.) |
| **Outputs** | Churn probability (0-100%), risk category (Low/Medium/High), top 3 contributing factors, recommended retention actions |
| **Examples** | Input: Customer with 12 months tenure, $70/month, month-to-month contract → Output: 73% churn probability, High Risk, Factors: short tenure, no contract lock-in, high monthly cost |

### Limitations & Prohibited Uses

| Campo | Valor |
|-------|-------|
| **Known Limitations** | Requires minimum 6 months of customer history for accurate predictions. Performance may vary for B2B vs B2C customers. Not suitable for one-time purchase businesses. |
| **Prohibited Uses** | Do not use for discriminatory pricing, denying service to customers, or any use that violates consumer protection laws. |

### Business Fit

| Campo | Valor |
|-------|-------|
| **Industries** | SaaS, Telecommunications, Subscription Services, Financial Services, E-commerce |
| **Use Cases** | Customer retention, Proactive support, Marketing targeting, Revenue forecasting, Customer health scoring |
| **Supported Languages** | English |

### Additional Info

| Campo | Valor |
|-------|-------|
| **Privacy & Compliance** | Model processes aggregated customer behavior data. No PII required for inference. GDPR compliant when used with anonymized data. |
| **Deployment Notes** | Can be deployed as REST API, batch processing, or integrated into CRM systems. Supports real-time and batch inference. |
| **Support & SLA** | Email support included. Response within 24 hours. Custom SLA available for enterprise. |

## Step 3 - Technical Setup

### Artifacts (subir estos archivos)

| Archivo | Role |
|---------|------|
| `test-assets/example1/model-weights.bin` | Model Weights |
| `test-assets/example1/config.json` | Configuration |
| `test-assets/example1/README.md` | Documentation |

### Download Notes

```
## Installation

pip install scikit-learn pandas numpy joblib

## Quick Start

import joblib
model = joblib.load('model-weights.bin')
prediction = model.predict(customer_data)

## Requirements
- Python 3.8+
- scikit-learn >= 1.0
- pandas >= 1.3
- numpy >= 1.20
```

### Technical Specifications

| Campo | Valor |
|-------|-------|
| **Tasks** | Classification |
| **Modalities** | Tabular |
| **Frameworks** | scikit-learn |
| **Architectures** | Gradient Boosting, Random Forest |
| **Precisions** | FP32 |
| **Python Version** | 3.10 |
| **Operating Systems** | Linux, macOS, Windows |

### Resource Requirements

| Campo | Valor |
|-------|-------|
| **VRAM (GB)** | 0 (CPU only) |
| **CPU Cores** | 2 |
| **RAM (GB)** | 4 |

### Inference Settings

| Campo | Valor |
|-------|-------|
| **Max Batch Size** | 1000 |
| **Context Length** | N/A |
| **Max Tokens** | N/A |

## Step 4 - Pricing & Rights

| Campo | Valor |
|-------|-------|
| **Perpetual Price** | $99 USDC |
| **Royalty (%)** | 5 |
| **Rights - API Usage** | ✅ Yes |
| **Rights - Model Download** | ✅ Yes |
| **Rights - Transferable** | ❌ No |
| **Delivery Mode** | API + Download |

### Terms & Conditions

```
CUSTOMER CHURN PREDICTOR LICENSE AGREEMENT

1. GRANT OF LICENSE
This license grants you the right to use the Customer Churn Predictor model for commercial purposes within your organization.

2. PERMITTED USES
- Deploy the model in production environments
- Integrate with your existing systems
- Use predictions for business decisions

3. RESTRICTIONS
- No redistribution or resale
- No reverse engineering
- No use for discriminatory purposes

4. WARRANTY
The model is provided "as is" with no warranty of accuracy or fitness for a particular purpose.

5. LIMITATION OF LIABILITY
Licensor shall not be liable for any damages arising from the use of this model.
```

---

# EJEMPLO 2: Product Review Sentiment Analyzer

## Step 1 - Model Identity

| Campo | Valor |
|-------|-------|
| **Model Name** | Product Review Sentiment Analyzer |
| **Slug** | sentiment-analyzer-pro |
| **Summary** | Advanced NLP model for analyzing product review sentiment. Powered by DistilBERT, it classifies reviews as positive, negative, or neutral with 94% accuracy. Supports English, Spanish, French, and German. Perfect for e-commerce and brand monitoring. |
| **Cover Image** | `test-assets/example2/cover.svg` |
| **Business Category** | Content & Media |
| **Model Type (Business)** | Content Analysis |
| **Technical Categories** | Natural Language Processing (NLP) |
| **Technical Tags** | sentiment-analysis, nlp, transformers, distilbert, multilingual, text-classification |

## Step 2 - Customer Sheet

### Business Profile

| Campo | Valor |
|-------|-------|
| **Value Proposition** | Understand customer sentiment at scale. Process thousands of reviews in minutes to extract actionable insights about product perception and customer satisfaction. |
| **Customer Description** | E-commerce platforms, brand managers, market researchers, customer experience teams, and product managers who need to analyze large volumes of customer feedback. |
| **Expected Impact** | Reduce manual review analysis time by 95%. Identify product issues 3x faster. Improve response time to negative feedback by 60%. |

### How This Is Used

| Campo | Valor |
|-------|-------|
| **Inputs** | Product review text (up to 512 tokens), language code (optional, auto-detected) |
| **Outputs** | Sentiment label (positive/negative/neutral), confidence score (0-100%), detected language, key phrases extracted |
| **Examples** | Input: "This laptop exceeded my expectations! Fast, lightweight, and the battery lasts all day." → Output: Positive (96%), Key phrases: "exceeded expectations", "fast", "battery lasts" |

### Limitations & Prohibited Uses

| Campo | Valor |
|-------|-------|
| **Known Limitations** | Maximum 512 tokens per review. Sarcasm detection is limited. Performance may vary for domain-specific jargon. Best results with reviews > 20 words. |
| **Prohibited Uses** | Do not use for censorship, suppressing legitimate criticism, manipulating public opinion, or any form of surveillance. |

### Business Fit

| Campo | Valor |
|-------|-------|
| **Industries** | E-commerce, Retail, Consumer Goods, Hospitality, Technology |
| **Use Cases** | Review analysis, Brand monitoring, Product feedback, Customer satisfaction, Competitive analysis |
| **Supported Languages** | English, Spanish, French, German |

### Additional Info

| Campo | Valor |
|-------|-------|
| **Privacy & Compliance** | Model processes text only, no user identification. Compliant with GDPR Article 22 (automated decision-making). |
| **Deployment Notes** | Optimized for ONNX Runtime. GPU recommended for batch processing. Can run on CPU for real-time single inference. |
| **Support & SLA** | Community forum access. Premium support available. 99.9% API uptime SLA for enterprise. |

## Step 3 - Technical Setup

### Artifacts (subir estos archivos)

| Archivo | Role |
|---------|------|
| `test-assets/example2/model.onnx` | Model Weights |
| `test-assets/example2/tokenizer.json` | Tokenizer |
| `test-assets/example2/README.md` | Documentation |

### Download Notes

```
## Installation

pip install onnxruntime transformers numpy

## Quick Start

import onnxruntime as ort
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
session = ort.InferenceSession("model.onnx")

inputs = tokenizer("Great product!", return_tensors="np", padding="max_length", max_length=512)
outputs = session.run(None, dict(inputs))

## Requirements
- Python 3.8+
- onnxruntime >= 1.12
- transformers >= 4.20
- numpy >= 1.20

## GPU Acceleration (optional)
pip install onnxruntime-gpu
```

### Technical Specifications

| Campo | Valor |
|-------|-------|
| **Tasks** | Text Classification, Sentiment Analysis |
| **Modalities** | Text |
| **Frameworks** | PyTorch, ONNX |
| **Architectures** | DistilBERT, Transformer |
| **Precisions** | FP32, FP16 |
| **Python Version** | 3.10 |
| **Operating Systems** | Linux, macOS, Windows |
| **CUDA Version** | 11.8 (optional) |
| **PyTorch Version** | 2.0 |

### Resource Requirements

| Campo | Valor |
|-------|-------|
| **VRAM (GB)** | 2 (GPU) or 0 (CPU) |
| **CPU Cores** | 4 |
| **RAM (GB)** | 8 |

### Inference Settings

| Campo | Valor |
|-------|-------|
| **Max Batch Size** | 32 |
| **Context Length** | 512 |
| **Max Tokens** | 512 |

## Step 4 - Pricing & Rights

| Campo | Valor |
|-------|-------|
| **Perpetual Price** | $149 USDC |
| **Royalty (%)** | 10 |
| **Rights - API Usage** | ✅ Yes |
| **Rights - Model Download** | ✅ Yes |
| **Rights - Transferable** | ✅ Yes |
| **Delivery Mode** | API + Download |

### Terms & Conditions

```
SENTIMENT ANALYZER PRO LICENSE AGREEMENT

1. GRANT OF LICENSE
This license grants you perpetual, worldwide rights to use the Sentiment Analyzer Pro model.

2. PERMITTED USES
- Commercial deployment
- Integration into products and services
- Batch and real-time processing
- Transfer to affiliated entities (if transferable license)

3. RESTRICTIONS
- No redistribution of model weights
- No fine-tuning for competing products
- No use for censorship or surveillance

4. INTELLECTUAL PROPERTY
The model architecture and weights remain the property of the licensor.

5. UPDATES
License includes access to minor version updates (2.x) for 12 months.

6. TERMINATION
License may be terminated for breach of terms. Upon termination, all copies must be destroyed.
```

---

## Checklist de Prueba

### Para cada ejemplo, verificar:

- [ ] Step 1: Todos los campos completados
- [ ] Step 1: Cover image subida correctamente
- [ ] Step 2: Business profile completo
- [ ] Step 2: Inputs/Outputs definidos
- [ ] Step 2: Limitations y prohibited uses
- [ ] Step 2: Industries y use cases
- [ ] Step 3: Artifacts subidos a IPFS
- [ ] Step 3: Download notes con instrucciones
- [ ] Step 3: Technical specs completas
- [ ] Step 4: Precio en USDC configurado
- [ ] Step 4: Rights seleccionados
- [ ] Step 4: Terms & conditions escritos
- [ ] Step 5: Review completo
- [ ] Step 5: Transacción firmada
- [ ] Step 5: Modelo visible en listing

### Después de publicar:

- [ ] Modelo aparece en `/models`
- [ ] Página de detalle muestra toda la info
- [ ] Botón "Buy" funciona
- [ ] Approve USDC (primera vez)
- [ ] Compra exitosa
- [ ] License NFT en `/licenses`
- [ ] Artifacts descargables (si tiene derecho)
