import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config.js';
import { embedText, embedTexts } from './embedding.js';

let client = null;

function getClient() {
  if (!config.pinecone.apiKey) throw new Error('PINECONE_API_KEY not configured');
  if (!client) {
    client = new Pinecone({ apiKey: config.pinecone.apiKey });
  }
  return client;
}

export async function ensureIndex() {
  const pc = getClient();
  const indexName = config.pinecone.indexName;
  const indexes = await pc.listIndexes();
  const exists = indexes.indexes?.some((i) => i.name === indexName);
  if (!exists) {
    await pc.createIndex({
      name: indexName,
      dimension: config.embedding.dimension,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: config.pinecone.cloud,
          region: config.pinecone.region,
        },
      },
    });
  }
  return pc.index(indexName);
}

export async function upsertVectors(tenantId, chunks) {
  const index = await ensureIndex();
  const texts = chunks.map((c) => c.text);
  const embeddings = await embedTexts(texts);
  const vectors = embeddings.map((emb, i) => ({
    id: chunks[i].id,
    values: emb,
    metadata: {
      tenant_id: tenantId,
      text: chunks[i].text.substring(0, 40000),
      doc_id: chunks[i].docId || '',
    },
  }));
  await index.upsert(vectors);
}

export async function deleteByDocId(tenantId, docId) {
  const index = await ensureIndex();
  await index.deleteMany({ doc_id: docId, tenant_id: tenantId });
}

export async function querySimilar(tenantId, queryText, topK = 5) {
  const index = await ensureIndex();
  const queryEmbedding = await embedText(queryText);
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    filter: { tenant_id: tenantId },
    includeMetadata: true,
  });
  return results.matches || [];
}
