// New REST-based Chroma client using the HTTP API instead of CloudClient.
// This does not change the existing behavior; it is exposed via a separate function.

const DEFAULT_CHROMA_BASE_URL = "https://api.trychroma.com";
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

function getChromaBaseUrl(): string {
  return (process.env.CHROMA_BASE_URL || DEFAULT_CHROMA_BASE_URL).replace(/\/$/, "");
}

interface ChromaRestQueryResponse {
  metadatas?: Array<Array<Record<string, unknown>>>;
}

async function getOpenAIEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_EMBEDDING_MODEL;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY must be set to use OpenAI embeddings");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
      dimensions: 384,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings request failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ embedding: number[] }>;
  };

  const embedding = data.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("OpenAI embeddings response did not contain an embedding");
  }

  return embedding;
}

export async function queryViaRest(query: string): Promise<string[]> {
  const apiKey = process.env.CHROMA_API_KEY;
  const tenant = process.env.CHROMA_TENANT_ID;
  const database = process.env.CHROMA_DATABASE;
  const collectionId = process.env.CHROMA_COLLECTION_ID;

  if (!apiKey || !tenant || !collectionId) {
    throw new Error("CHROMA_API_KEY, CHROMA_TENANT_ID, and CHROMA_COLLECTION_ID must be set for REST queries");
  }

  // First, get an embedding for the query text from OpenAI.
  const embedding = await getOpenAIEmbedding(query);

  const baseUrl = getChromaBaseUrl();
  const url = `${baseUrl}/api/v2/tenants/${encodeURIComponent(
    tenant
  )}/databases/${encodeURIComponent(database || "")}/collections/${encodeURIComponent(collectionId || "")}/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-chroma-token": apiKey,
    },
    body: JSON.stringify({
      query_embeddings: [embedding],
      n_results: 10,
      include: ["metadatas"],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chroma REST query failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as ChromaRestQueryResponse;
  const metadatas = data.metadatas?.[0] ?? [];

  return metadatas
    .map((m) => {
      if (m && typeof m === "object" && typeof (m as any).permalink === "string") {
        return (m as any).permalink as string;
      }
      return null;
    })
    .filter((p): p is string => p != null);
}