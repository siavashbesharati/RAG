import { VectorData, QueryResult } from '../types';

const PINECONE_CONTROL_URL = 'https://api.pinecone.io';
const PINECONE_API_VERSION = '2024-07';

/**
 * Thin wrapper around Pinecone REST API. Handles index creation,
 * upserts and simple similarity queries.
 * Uses Pinecone control plane (api.pinecone.io) for index ops and
 * data plane (index host) for upsert/query.
 */
export class VectorService {
  private apiKey?: string;
  private indexName?: string;
  private environment: string;
  private cachedHost: string | null = null;

  constructor(apiKey?: string, environment?: string, indexName?: string) {
    this.apiKey = apiKey;
    this.environment = environment || 'us-west1-gcp';
    this.indexName = indexName;
    if (!apiKey) {
      console.warn('VectorService: Pinecone API key not provided; operations will be no-ops');
    }
  }

  private controlHeaders() {
    return {
      'Api-Key': this.apiKey!,
      'Content-Type': 'application/json',
      'X-Pinecone-Api-Version': PINECONE_API_VERSION,
    };
  }

  private dataHeaders() {
    return {
      'Api-Key': this.apiKey!,
      'Content-Type': 'application/json',
      'X-Pinecone-Api-Version': PINECONE_API_VERSION,
    };
  }

  /**
   * Resolve the index host from Pinecone control plane.
   * Cache for reuse.
   */
  private async resolveHost(): Promise<string | null> {
    if (this.cachedHost) return this.cachedHost;
    if (!this.apiKey || !this.indexName) return null;

    try {
      const url = `${PINECONE_CONTROL_URL}/indexes/${this.indexName}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.controlHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Pinecone describe index failed: ${await res.text()}`);
      }
      const json = await res.json();
      this.cachedHost = json.host ?? null;
      return this.cachedHost;
    } catch (err: any) {
      console.error('VectorService.resolveHost failed', err);
      return null;
    }
  }

  /**
   * Ensure an index exists with the given dimension; if not, create it.
   */
  public async ensureIndex(name: string, dimension: number): Promise<void> {
    this.indexName = name;
    if (!this.apiKey) {
      console.log('ensureIndex skipped (no Pinecone configuration)');
      return;
    }
    try {
      // Try to describe first
      const describeUrl = `${PINECONE_CONTROL_URL}/indexes/${name}`;
      const describeRes = await fetch(describeUrl, {
        method: 'GET',
        headers: this.controlHeaders(),
      });

      if (describeRes.ok) {
        const json = await describeRes.json();
        this.cachedHost = json.host ?? null;
        return;
      }

      if (describeRes.status !== 404) {
        throw new Error(`Pinecone describe failed: ${await describeRes.text()}`);
      }

      // Index doesn't exist - create it (serverless)
      const createUrl = `${PINECONE_CONTROL_URL}/indexes`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: this.controlHeaders(),
        body: JSON.stringify({
          name,
          dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
          deletion_protection: 'disabled',
        }),
      });
      if (!createRes.ok) {
        const txt = await createRes.text();
        throw new Error(`Failed to create index: ${txt}`);
      }
      // Wait for index to be ready, then cache host
      const createJson = await createRes.json();
      this.cachedHost = createJson.host ?? null;
    } catch (err: any) {
      console.error('VectorService.ensureIndex failed', err);
      // don't rethrow so server can start even if Pinecone is unreachable
    }
  }

  /**
   * Upsert an array of vectors into the index.
   */
  public async upsertVectors(vectors: VectorData[]): Promise<void> {
    const host = await this.resolveHost();
    if (!host || !this.apiKey) {
      console.log('upsertVectors skipped (no Pinecone configuration or index host)');
      return;
    }
    const url = `https://${host}/vectors/upsert`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.dataHeaders(),
      body: JSON.stringify({ vectors }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Pinecone upsert failed', txt);
      throw new Error(`Pinecone upsert failed: ${txt}`);
    }
  }

  /**
   * Query the index with a provided embedding and return top-K matches.
   */
  public async queryEmbedding(
    embedding: number[],
    topK = 5
  ): Promise<QueryResult[]> {
    const host = await this.resolveHost();
    if (!host || !this.apiKey) {
      console.log('queryEmbedding skipped (no Pinecone configuration or index host)');
      return [];
    }
    const url = `https://${host}/query`;
    const payload = {
      vector: embedding,
      topK,
      includeValues: true,
      includeMetadata: true,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: this.dataHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Pinecone query failed', txt);
      throw new Error(`Pinecone query failed: ${txt}`);
    }
    const json = await res.json();
    return (json.matches || []).map((m: any) => ({
      id: m.id,
      score: m.score,
      values: m.values,
      metadata: m.metadata,
    }));
  }
}
