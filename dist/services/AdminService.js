"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const chunking_1 = require("../utils/chunking");
/**
 * Responsible for taking raw text/documents, splitting them
 * into overlapping chunks and embedding them via Voyage AI.
 */
class AdminService {
    constructor(vectorService, voyageApiKey) {
        this.vectorService = vectorService;
        this.voyageApiKey = voyageApiKey;
    }
    /**
     * Accepts a large body of text and ingests it into Pinecone.
     * Automatically chunks, embeds and upserts with metadata.
     */
    async ingestText(text, metadata = {}) {
        const trimmed = (text || '').trim();
        if (!trimmed) {
            throw new Error('No text to ingest. Please provide document content.');
        }
        // chunk into 500-char pieces with 15% overlap
        const chunks = (0, chunking_1.smartChunk)(trimmed);
        const embeddings = await this.embedChunks(chunks);
        if (embeddings.length !== chunks.length) {
            throw new Error(`Embedding count mismatch: got ${embeddings.length}, expected ${chunks.length}`);
        }
        const vectors = chunks.map((chunk, i) => ({
            id: `${metadata.sourceUrl || 'doc'}-${i}`,
            values: embeddings[i],
            metadata: {
                ...metadata,
                originalText: chunk,
            },
        }));
        // Pinecone recommends up to 1000 vectors per upsert
        const UPSERT_BATCH = 1000;
        for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
            const batch = vectors.slice(i, i + UPSERT_BATCH);
            await this.vectorService.upsertVectors(batch);
        }
    }
    /**
     * Calls the Voyage AI embedding API. Batches into groups of 1000 (Voyage limit).
     */
    async embedChunks(chunks) {
        if (!chunks.length)
            return [];
        const BATCH_SIZE = 1000; // Voyage API limit per request
        const allEmbeddings = [];
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const url = 'https://api.voyageai.com/v1/embeddings';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.voyageApiKey}`,
                },
                body: JSON.stringify({
                    input: batch,
                    model: 'voyage-3.5-lite',
                    input_type: 'document',
                }),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Voyage embedding failed: ${text}`);
            }
            const json = await res.json();
            const data = json?.data;
            if (!Array.isArray(data)) {
                throw new Error('Voyage API returned unexpected format');
            }
            // Sort by index to preserve order (Voyage may return out of order)
            const sorted = [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            for (const d of sorted) {
                const raw = d?.embedding;
                if (raw == null)
                    throw new Error('Voyage API returned missing embedding');
                // Voyage may return Float32Array or number[]; ensure we have number[]
                let emb;
                if (Array.isArray(raw)) {
                    emb = raw;
                }
                else if (typeof raw === 'object' && typeof raw.length === 'number') {
                    const len = raw.length;
                    if (len < 0 || len > 10000 || !Number.isFinite(len)) {
                        throw new Error('Voyage API returned embedding with invalid length');
                    }
                    emb = [];
                    for (let j = 0; j < len; j++) {
                        const v = raw[j];
                        if (typeof v !== 'number')
                            throw new Error('Voyage API returned invalid embedding values');
                        emb.push(v);
                    }
                }
                else {
                    throw new Error('Voyage API returned invalid embedding format');
                }
                allEmbeddings.push(emb);
            }
        }
        return allEmbeddings;
    }
}
exports.AdminService = AdminService;
