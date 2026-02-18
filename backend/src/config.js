import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY,
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    indexName: process.env.PINECONE_INDEX_NAME || 'rag-support',
    cloud: process.env.PINECONE_CLOUD || 'aws',
    region: process.env.PINECONE_REGION || 'us-east-1',
  },
  embedding: {
    model: 'text-embedding-004',
    dimension: 768,
  },
  database: {
    path: process.env.DATABASE_PATH || './data/rag.db',
  },
};
