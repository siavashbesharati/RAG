import { AdminService } from './services/AdminService';
import { TranslationService } from './services/TranslationService';
import { VectorService } from './services/VectorService';
import { ClientChatService } from './services/ClientChatService';

// Example environment variables; in a real deployment use a config library.
const VOYAGE_KEY = process.env.VOYAGE_API_KEY || '';
const PINECONE_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_ENV = process.env.PINECONE_ENV || 'us-west1-gcp';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'quantivo';
const EMBEDDING_DIMENSION = 1024; // voyage-3.5-lite default

// initialise services
const vectorService = new VectorService(PINECONE_KEY, PINECONE_ENV, PINECONE_INDEX);
const adminService = new AdminService(vectorService, VOYAGE_KEY);
const translationService = new TranslationService(GEMINI_KEY);
const clientChatService = new ClientChatService(
  translationService,
  vectorService,
  VOYAGE_KEY
);

// an example `main` asynchronous runner
async function main() {
  // ensure the vector index exists
  await vectorService.ensureIndex(PINECONE_INDEX, EMBEDDING_DIMENSION);

  // ingest some sample document
  const doc = 'Your organizational knowledge base goes here...';
  await adminService.ingestText(doc, { category: 'help', sourceUrl: 'internal' });

  // simulate a chat
  const answer = await clientChatService.handleMessage(
    'session-123',
    'سلام، چگونه می‌توانم حساب خود را اصلاح کنم؟' // Persian sample
  );
  console.log('Response:', answer);
}

main().catch((err) => console.error(err));
