import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    dynamoDBTablePrefix: process.env.DYNAMODB_TABLE_PREFIX || 'gemini-form-builder',
  },
  
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  },
  
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    secondaryUrl: process.env.AI_FORM_BUILDER_URL || 'http://localhost:3000',
  },
  genaiServiceUrl: process.env.GENAI_SERVICE_URL || 'http://localhost:4002',
  
  oauth_callback_base_url: process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3001/api/auth',
  
  rateLimit: {
    free: parseInt(process.env.RATE_LIMIT_FREE || '60', 10),
    pro: parseInt(process.env.RATE_LIMIT_PRO || '600', 10),
    enterprise: parseInt(process.env.RATE_LIMIT_ENTERPRISE || '6000', 10),
  },
  
  subscriptionLimits: {
    free: {
      forms: parseInt(process.env.FREE_TIER_FORMS_LIMIT || '10', 10),
      fields: parseInt(process.env.FREE_TIER_FIELDS_LIMIT || '100', 10),
      apiCalls: parseInt(process.env.FREE_TIER_API_CALLS_LIMIT || '1000', 10),
      aiQuestionsGenerated: parseInt(process.env.FREE_TIER_AI_QUESTIONS_LIMIT || '50', 10), // 50 AI generations per month
    },
    pro: {
      forms: parseInt(process.env.PRO_TIER_FORMS_LIMIT || '100', 10),
      fields: parseInt(process.env.PRO_TIER_FIELDS_LIMIT || '999999', 10),
      apiCalls: parseInt(process.env.PRO_TIER_API_CALLS_LIMIT || '50000', 10),
      aiQuestionsGenerated: parseInt(process.env.PRO_TIER_AI_QUESTIONS_LIMIT || '5000', 10), // 5000 AI generations per month
    },
    enterprise: {
      forms: parseInt(process.env.ENTERPRISE_TIER_FORMS_LIMIT || '999999', 10),
      fields: parseInt(process.env.ENTERPRISE_TIER_FIELDS_LIMIT || '999999', 10),
      apiCalls: parseInt(process.env.ENTERPRISE_TIER_API_CALLS_LIMIT || '999999', 10),
      aiQuestionsGenerated: parseInt(process.env.ENTERPRISE_TIER_AI_QUESTIONS_LIMIT || '999999', 10), // Unlimited
    },
  },
  
  pricing: {
    per100ApiCalls: parseInt(process.env.PRICE_PER_100_API_CALLS || '1', 10),
    per10Forms: parseInt(process.env.PRICE_PER_10_FORMS || '100', 10),
  },
};


