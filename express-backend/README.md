# Express Backend

REST API that sits between the Devvit app and ChromaDB. Handles semantic search queries against the vector database.

All protected endpoints require an `x-api-key` header matching the `EXPRESS_API_KEY` environment variable.

---

## Endpoints

### `GET /`

Health check.

**Response**
```json
{ "message": "Hello World!" }
```

---

### `POST /api/query`

**Auth required:** yes

Accepts a natural-language query, generates an embedding via OpenAI, and runs a nearest-neighbor search against the ChromaDB collection. Returns up to 10 matching Reddit post permalinks ranked by semantic similarity.

**Request body**
```json
{ "query": "I feel numb and disconnected from everything" }
```

**Response**
```json
{
  "permalinks": [
    "/r/ptsd/comments/abc123/...",
    "/r/CPTSD/comments/xyz789/..."
  ]
}
```

**Errors**

| Status | Meaning |
|--------|---------|
| 400 | Missing or non-string `query` field |
| 401 | Missing or invalid API key |
| 500 | Embedding or ChromaDB query failed |

---

## WIP Endpoints

### `POST /api/mark-deleted` _(not yet implemented)_

Many posts in the vector database have since been deleted on Reddit. When the Devvit app receives a batch of permalinks from `/api/query`, it can use the Reddit API (available natively inside Devvit) to verify which posts still exist. Any that return a 404 or are otherwise inaccessible should be reported back here so they can be flagged in ChromaDB and excluded from future query results.

**Planned request body**
```json
{
  "permalinks": [
    "/r/ptsd/comments/abc123/...",
    "/r/CPTSD/comments/xyz789/..."
  ]
}
```

**Planned behavior**
1. Receive the list of confirmed-deleted permalinks from Devvit.
2. Look up the corresponding ChromaDB document IDs by matching metadata `permalink` values.
3. Update those documents' metadata to set `deleted: true`.
4. Future `/api/query` calls will filter out documents where `deleted === true`.

**Planned response**
```json
{ "marked": 2 }
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPRESS_API_KEY` | Shared secret for authenticating requests |
| `OPENAI_API_KEY` | Used to generate query embeddings |
| `CHROMA_API_KEY` | ChromaDB Cloud API token |
| `CHROMA_TENANT_ID` | ChromaDB tenant |
| `CHROMA_DATABASE` | ChromaDB database name |
| `CHROMA_COLLECTION_ID` | ChromaDB collection to query |
