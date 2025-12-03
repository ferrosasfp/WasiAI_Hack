# Product Review Sentiment Analyzer

## Installation

```bash
pip install onnxruntime transformers numpy
```

## Usage

```python
import onnxruntime as ort
from transformers import AutoTokenizer
import numpy as np

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
session = ort.InferenceSession("model.onnx")

# Prepare input
text = "This product exceeded my expectations! Great quality and fast shipping."
inputs = tokenizer(text, return_tensors="np", padding="max_length", max_length=512)

# Run inference
outputs = session.run(None, {
    "input_ids": inputs["input_ids"],
    "attention_mask": inputs["attention_mask"]
})

# Get sentiment
logits = outputs[0]
sentiment = "positive" if np.argmax(logits) == 1 else "negative"
confidence = np.max(np.softmax(logits))

print(f"Sentiment: {sentiment}")
print(f"Confidence: {confidence:.2%}")
```

## Supported Languages

- English
- Spanish
- French
- German

## License

Commercial license required. See marketplace for pricing.
