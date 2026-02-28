import { CloudClient, type QueryResult } from "chromadb";

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
});

async function queryChroma(query: string): Promise<QueryResult> {
  const collection = await client.getCollection({ name: "reddit-bot-vdb" });
  const response = await collection.query({
    queryTexts: [query],
    nResults: 10,
    include: ["documents", "metadatas", "distances"],
  });
  return response;
}

export async function query(query: string): Promise<string[]> {
  const result = await queryChroma(query);
  const metadatas = result.metadatas[0] ?? [];
  return metadatas
    .map((m) => (m && typeof m.permalink === "string" ? m.permalink : null))
    .filter((p): p is string => p != null);
}