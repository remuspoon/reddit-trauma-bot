import { CloudClient, type QueryResult } from "chromadb";



async function queryChroma(query: string, client: CloudClient): Promise<QueryResult> {
  const collection = await client.getCollection({ name: "reddit-bot-vdb" });
  const response = await collection.query({
    queryTexts: [query],
    nResults: 10,
    include: ["documents", "metadatas", "distances"],
  });
  return response;
}

export async function query(query: string, client: CloudClient): Promise<string[]> {
  const result = await queryChroma(query, client);
  const metadatas = result.metadatas[0] ?? [];
  return metadatas
    .map((m) => (m && typeof m.permalink === "string" ? m.permalink : null))
    .filter((p): p is string => p != null);
}