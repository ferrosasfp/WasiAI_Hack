# Customer Churn Predictor

## Installation

```bash
pip install scikit-learn pandas numpy
```

## Usage

```python
import joblib
import pandas as pd

# Load model
model = joblib.load('model-weights.bin')

# Prepare input
data = pd.DataFrame({
    'tenure_months': [12],
    'monthly_charges': [70.5],
    'total_charges': [846.0],
    'contract_type': ['Month-to-month'],
    'payment_method': ['Electronic check'],
    'internet_service': ['Fiber optic'],
    'online_security': ['No'],
    'tech_support': ['No']
})

# Predict
prediction = model.predict(data)
probability = model.predict_proba(data)

print(f"Churn prediction: {prediction[0]}")
print(f"Churn probability: {probability[0][1]:.2%}")
```

## API Endpoint

```bash
curl -X POST https://api.example.com/predict \
  -H "Content-Type: application/json" \
  -d '{"tenure_months": 12, "monthly_charges": 70.5, ...}'
```

## License

Commercial license required. See marketplace for pricing.
