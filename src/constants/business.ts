export const BUSINESS_CATEGORIES = [
  { value: 'Marketing & growth', i18nKey: 'business.categories.marketingGrowth' },
  { value: 'Sales & CRM', i18nKey: 'business.categories.salesCrm' },
  { value: 'Risk & fraud', i18nKey: 'business.categories.riskFraud' },
  { value: 'Finance & pricing', i18nKey: 'business.categories.financePricing' },
  { value: 'Operations & logistics', i18nKey: 'business.categories.operationsLogistics' },
  { value: 'Supply chain & inventory', i18nKey: 'business.categories.supplyInventory' },
  { value: 'Customer support & CX', i18nKey: 'business.categories.supportCx' },
  { value: 'HR & people analytics', i18nKey: 'business.categories.hrPeople' },
  { value: 'Product & UX', i18nKey: 'business.categories.productUx' },
  { value: 'IT & security', i18nKey: 'business.categories.itSecurity' },
  { value: 'General purpose / cross-domain', i18nKey: 'business.categories.general' }
] as const

export type BusinessCategoryValue = typeof BUSINESS_CATEGORIES[number]['value']

export const MODEL_TYPES = [
  // Marketing & growth / Sales & CRM
  'Customer segmentation',
  'Lead scoring',
  'Campaign response prediction',
  'Propensity to buy',
  'Recommendation system',
  'Next best offer',
  'Upsell / cross-sell',
  'Customer churn prediction',
  'Customer lifetime value (LTV)',
  'Sales forecasting',
  'Opportunity win-rate prediction',

  // Risk & fraud
  'Credit risk scoring',
  'Payment fraud detection',
  'Transaction anomaly detection',

  // Finance & pricing
  'Dynamic pricing / pricing optimization',
  'Revenue forecasting',

  // Ops / Supply chain
  'Demand forecasting',
  'Inventory optimization',
  'Replenishment optimization',
  'Route optimization',
  'Workforce / staffing forecasting',
  'Predictive maintenance',
  'Quality inspection / defect detection',
  'Stock-out prediction',
  'Supplier risk scoring',

  // Support & CX
  'Support ticket routing',
  'Support intent classification',
  'Sentiment analysis',
  'CSAT / NPS prediction',

  // HR & people analytics
  'Employee attrition prediction',
  'Workforce planning',
  'Talent matching / candidate ranking',

  // Product & UX
  'Feature adoption prediction',
  'Search ranking / relevance',
  'Experiment outcome prediction',

  // IT & security
  'Log anomaly detection',
  'Threat / intrusion detection',
  'Access risk scoring',

  // General-purpose
  'General time-series forecasting',
  'General anomaly detection',
  'Document classification',
  'Text classification / intent detection',
  'Semantic search / similarity',
] as const

export type ModelTypeValue = typeof MODEL_TYPES[number]

export const MODEL_TYPES_BY_BUSINESS: Record<BusinessCategoryValue, ModelTypeValue[]> = {
  'Marketing & growth': [
    'Customer segmentation',
    'Lead scoring',
    'Campaign response prediction',
    'Propensity to buy',
    'Recommendation system',
    'Next best offer',
    'Customer churn prediction',
    'Customer lifetime value (LTV)',
  ],
  'Sales & CRM': [
    'Lead scoring',
    'Next best offer',
    'Upsell / cross-sell',
    'Sales forecasting',
    'Opportunity win-rate prediction',
    'Customer churn prediction',
    'Customer lifetime value (LTV)',
  ],
  'Risk & fraud': [
    'Credit risk scoring',
    'Payment fraud detection',
    'Transaction anomaly detection',
    'General anomaly detection',
  ],
  'Finance & pricing': [
    'Dynamic pricing / pricing optimization',
    'Revenue forecasting',
    'Credit risk scoring',
    'General time-series forecasting',
    'General anomaly detection',
  ],
  'Operations & logistics': [
    'Demand forecasting',
    'Route optimization',
    'Workforce / staffing forecasting',
    'Predictive maintenance',
    'Quality inspection / defect detection',
  ],
  'Supply chain & inventory': [
    'Demand forecasting',
    'Inventory optimization',
    'Replenishment optimization',
    'Stock-out prediction',
    'Supplier risk scoring',
    'Dynamic pricing / pricing optimization',
  ],
  'Customer support & CX': [
    'Support ticket routing',
    'Support intent classification',
    'Sentiment analysis',
    'CSAT / NPS prediction',
    'Customer churn prediction',
    'Recommendation system',
  ],
  'HR & people analytics': [
    'Employee attrition prediction',
    'Workforce planning',
    'Talent matching / candidate ranking',
    'General time-series forecasting',
  ],
  'Product & UX': [
    'Recommendation system',
    'Search ranking / relevance',
    'Feature adoption prediction',
    'Experiment outcome prediction',
    'Customer segmentation',
  ],
  'IT & security': [
    'Log anomaly detection',
    'Threat / intrusion detection',
    'Access risk scoring',
    'General anomaly detection',
  ],
  'General purpose / cross-domain': [
    'General time-series forecasting',
    'General anomaly detection',
    'Document classification',
    'Text classification / intent detection',
    'Semantic search / similarity',
  ],
}

export const MODEL_TYPE_I18N: Record<ModelTypeValue, string> = {
  'Customer segmentation': 'business.modelTypes.customerSegmentation',
  'Lead scoring': 'business.modelTypes.leadScoring',
  'Campaign response prediction': 'business.modelTypes.campaignResponsePrediction',
  'Propensity to buy': 'business.modelTypes.propensityToBuy',
  'Recommendation system': 'business.modelTypes.recommendationSystem',
  'Next best offer': 'business.modelTypes.nextBestOffer',
  'Upsell / cross-sell': 'business.modelTypes.upsellCrossSell',
  'Customer churn prediction': 'business.modelTypes.customerChurnPrediction',
  'Customer lifetime value (LTV)': 'business.modelTypes.customerLtv',
  'Sales forecasting': 'business.modelTypes.salesForecasting',
  'Opportunity win-rate prediction': 'business.modelTypes.opportunityWinRate',
  'Credit risk scoring': 'business.modelTypes.creditRiskScoring',
  'Payment fraud detection': 'business.modelTypes.paymentFraudDetection',
  'Transaction anomaly detection': 'business.modelTypes.transactionAnomalyDetection',
  'Dynamic pricing / pricing optimization': 'business.modelTypes.dynamicPricing',
  'Revenue forecasting': 'business.modelTypes.revenueForecasting',
  'Demand forecasting': 'business.modelTypes.demandForecasting',
  'Inventory optimization': 'business.modelTypes.inventoryOptimization',
  'Replenishment optimization': 'business.modelTypes.replenishmentOptimization',
  'Route optimization': 'business.modelTypes.routeOptimization',
  'Workforce / staffing forecasting': 'business.modelTypes.workforceForecasting',
  'Predictive maintenance': 'business.modelTypes.predictiveMaintenance',
  'Quality inspection / defect detection': 'business.modelTypes.qualityInspection',
  'Stock-out prediction': 'business.modelTypes.stockoutPrediction',
  'Supplier risk scoring': 'business.modelTypes.supplierRiskScoring',
  'Support ticket routing': 'business.modelTypes.supportTicketRouting',
  'Support intent classification': 'business.modelTypes.supportIntentClassification',
  'Sentiment analysis': 'business.modelTypes.sentimentAnalysis',
  'CSAT / NPS prediction': 'business.modelTypes.csatNpsPrediction',
  'Employee attrition prediction': 'business.modelTypes.employeeAttritionPrediction',
  'Workforce planning': 'business.modelTypes.workforcePlanning',
  'Talent matching / candidate ranking': 'business.modelTypes.talentMatching',
  'Feature adoption prediction': 'business.modelTypes.featureAdoptionPrediction',
  'Search ranking / relevance': 'business.modelTypes.searchRanking',
  'Experiment outcome prediction': 'business.modelTypes.experimentOutcomePrediction',
  'Log anomaly detection': 'business.modelTypes.logAnomalyDetection',
  'Threat / intrusion detection': 'business.modelTypes.threatIntrusionDetection',
  'Access risk scoring': 'business.modelTypes.accessRiskScoring',
  'General time-series forecasting': 'business.modelTypes.generalTsForecasting',
  'General anomaly detection': 'business.modelTypes.generalAnomalyDetection',
  'Document classification': 'business.modelTypes.documentClassification',
  'Text classification / intent detection': 'business.modelTypes.textClassification',
  'Semantic search / similarity': 'business.modelTypes.semanticSearch',
}
