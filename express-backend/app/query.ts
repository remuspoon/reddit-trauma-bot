import OpenAI from "openai";

const DEFAULT_CHROMA_BASE_URL = "https://api.trychroma.com";
const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

interface ChromaRestQueryResponse {
  metadatas?: Array<Array<Record<string, unknown>>>;
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY must be set to use OpenAI embeddings");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

async function getOpenAIEmbedding(input: string): Promise<number[]> {
  const client = getOpenAIClient();
  const model = DEFAULT_OPENAI_EMBEDDING_MODEL;

  const response = await client.embeddings.create({
    model,
    input,
  });

  const embedding = response.data?.[0]?.embedding;
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

  const url = `${DEFAULT_CHROMA_BASE_URL}/api/v2/tenants/${encodeURIComponent(
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