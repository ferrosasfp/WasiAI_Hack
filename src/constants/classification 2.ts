// Technical classification constants (centralized with i18n keys)
export type TechnicalCategoryValue =
  | 'NLP & text'
  | 'Computer vision'
  | 'Speech & audio'
  | 'Video'
  | 'Tabular / structured data'
  | 'Time series'
  | 'Recommender systems'
  | 'Multi-modal'
  | 'Graph / network'
  | 'Agents & orchestration'
  | 'Foundation models / LLMs'
  | 'Retrieval & search'

export const TECHNICAL_CATEGORIES: { value: TechnicalCategoryValue; i18nKey: string }[] = [
  { value: 'NLP & text', i18nKey: 'technical.categories.nlpText' },
  { value: 'Computer vision', i18nKey: 'technical.categories.vision' },
  { value: 'Speech & audio', i18nKey: 'technical.categories.speechAudio' },
  { value: 'Video', i18nKey: 'technical.categories.video' },
  { value: 'Tabular / structured data', i18nKey: 'technical.categories.tabular' },
  { value: 'Time series', i18nKey: 'technical.categories.timeSeries' },
  { value: 'Recommender systems', i18nKey: 'technical.categories.recommenders' },
  { value: 'Multi-modal', i18nKey: 'technical.categories.multimodal' },
  { value: 'Graph / network', i18nKey: 'technical.categories.graph' },
  { value: 'Agents & orchestration', i18nKey: 'technical.categories.agentsOrchestration' },
  { value: 'Foundation models / LLMs', i18nKey: 'technical.categories.foundationLlms' },
  { value: 'Retrieval & search', i18nKey: 'technical.categories.retrievalSearch' },
]

export type TechnicalTagValue = string

export const TECH_TAG_OPTIONS: TechnicalTagValue[] = [
  // NLP & text
  'Text classification',
  'Sentiment analysis',
  'Topic modeling',
  'Named entity recognition (NER)',
  'Summarization',
  'Semantic search',
  'Embedding model',
  'Question answering',
  'Document classification',
  'Document parsing',
  'OCR',
  'Chatbot / assistant',

  // Computer vision
  'Image classification',
  'Object detection',
  'Image segmentation',
  'Face recognition',
  'Image generation',
  'Style transfer',

  // Speech & audio
  'Speech-to-text (ASR)',
  'Text-to-speech (TTS)',
  'Speaker diarization',
  'Keyword spotting',
  'Music / audio generation',

  // Video
  'Video classification',
  'Action recognition',
  'Video summarization',

  // Tabular / structured data & time series
  'Time-series forecasting',
  'Anomaly detection',
  'Churn prediction',
  'Credit risk scoring',
  'Demand forecasting',
  'Pricing optimization',

  // Recommenders / search
  'Recommendation system',
  'Next best offer',
  'Upsell / cross-sell',
  'Ranking / search',

  // Graph
  'Graph neural network',

  // Agents & orchestration
  'Tool-using agent',
  'Workflow orchestration',

  // Retrieval / RAG
  'RAG (retrieval-augmented generation)'
]

export const TECH_TAGS_BY_CATEGORY: Record<TechnicalCategoryValue, TechnicalTagValue[]> = {
  'NLP & text': [
    'Text classification',
    'Sentiment analysis',
    'Topic modeling',
    'Named entity recognition (NER)',
    'Summarization',
    'Semantic search',
    'Embedding model',
    'Question answering',
    'Document classification',
    'Document parsing',
    'OCR',
    'Chatbot / assistant',
  ],
  'Computer vision': [
    'Image classification',
    'Object detection',
    'Image segmentation',
    'Face recognition',
    'Image generation',
    'Style transfer',
    'OCR',
  ],
  'Speech & audio': [
    'Speech-to-text (ASR)',
    'Text-to-speech (TTS)',
    'Speaker diarization',
    'Keyword spotting',
    'Music / audio generation',
  ],
  'Video': [
    'Video classification',
    'Action recognition',
    'Video summarization',
    'Object detection',
  ],
  'Tabular / structured data': [
    'Time-series forecasting',
    'Anomaly detection',
    'Churn prediction',
    'Credit risk scoring',
    'Demand forecasting',
    'Pricing optimization',
  ],
  'Time series': [
    'Time-series forecasting',
    'Anomaly detection',
    'Demand forecasting',
  ],
  'Recommender systems': [
    'Recommendation system',
    'Next best offer',
    'Upsell / cross-sell',
    'Ranking / search',
  ],
  'Multi-modal': [
    'RAG (retrieval-augmented generation)',
    'Embedding model',
    'Recommendation system',
  ],
  'Graph / network': [
    'Graph neural network',
    'Anomaly detection',
    'Recommendation system',
  ],
  'Agents & orchestration': [
    'Chatbot / assistant',
    'Tool-using agent',
    'Workflow orchestration',
  ],
  'Foundation models / LLMs': [
    'Chatbot / assistant',
    'Code generation',
    'Summarization',
    'Question answering',
    'RAG (retrieval-augmented generation)',
    'Embedding model',
  ],
  'Retrieval & search': [
    'Semantic search',
    'RAG (retrieval-augmented generation)',
    'Ranking / search',
    'Embedding model',
  ],
}

// i18n keys for technical tags
export const TECH_TAG_I18N: Record<string, string> = {
  // NLP & text
  'Text classification': 'technical.tags.textClassification',
  'Sentiment analysis': 'technical.tags.sentimentAnalysis',
  'Topic modeling': 'technical.tags.topicModeling',
  'Named entity recognition (NER)': 'technical.tags.ner',
  'Summarization': 'technical.tags.summarization',
  'Semantic search': 'technical.tags.semanticSearch',
  'Embedding model': 'technical.tags.embeddingModel',
  'Question answering': 'technical.tags.questionAnswering',
  'Document classification': 'technical.tags.documentClassification',
  'Document parsing': 'technical.tags.documentParsing',
  'OCR': 'technical.tags.ocr',
  'Chatbot / assistant': 'technical.tags.chatbotAssistant',

  // Computer vision
  'Image classification': 'technical.tags.imageClassification',
  'Object detection': 'technical.tags.objectDetection',
  'Image segmentation': 'technical.tags.imageSegmentation',
  'Face recognition': 'technical.tags.faceRecognition',
  'Image generation': 'technical.tags.imageGeneration',
  'Style transfer': 'technical.tags.styleTransfer',

  // Speech & audio
  'Speech-to-text (ASR)': 'technical.tags.asr',
  'Text-to-speech (TTS)': 'technical.tags.tts',
  'Speaker diarization': 'technical.tags.speakerDiarization',
  'Keyword spotting': 'technical.tags.keywordSpotting',
  'Music / audio generation': 'technical.tags.musicAudioGeneration',

  // Video
  'Video classification': 'technical.tags.videoClassification',
  'Action recognition': 'technical.tags.actionRecognition',
  'Video summarization': 'technical.tags.videoSummarization',

  // Tabular / structured data & time series
  'Time-series forecasting': 'technical.tags.timeSeriesForecasting',
  'Anomaly detection': 'technical.tags.anomalyDetection',
  'Churn prediction': 'technical.tags.churnPrediction',
  'Credit risk scoring': 'technical.tags.creditRiskScoring',
  'Demand forecasting': 'technical.tags.demandForecasting',
  'Pricing optimization': 'technical.tags.pricingOptimization',

  // Recommenders / search
  'Recommendation system': 'technical.tags.recommendationSystem',
  'Next best offer': 'technical.tags.nextBestOffer',
  'Upsell / cross-sell': 'technical.tags.upsellCrossSell',
  'Ranking / search': 'technical.tags.rankingSearch',

  // Graph
  'Graph neural network': 'technical.tags.graphNeuralNetwork',

  // Agents & orchestration
  'Tool-using agent': 'technical.tags.toolUsingAgent',
  'Workflow orchestration': 'technical.tags.workflowOrchestration',

  // Retrieval / RAG
  'RAG (retrieval-augmented generation)': 'technical.tags.rag',
}
