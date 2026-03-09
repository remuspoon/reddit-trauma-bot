# mh-support-bot

A Devvit app that listens for new posts and automatically comments with semantically similar posts from the vector database, helping users find relevant mental health discussions while they wait for replies.

Please see https://github.com/remuspoon/reddit-trauma-bot for the full repository.


## How it works

1. A new post is created in the subreddit.
2. The `PostCreate` trigger fires and fetches the post's title and body.
3. The combined text is sent to the Express backend (`POST /api/query`), which embeds it and runs a nearest-neighbor search against ChromaDB.
4. Up to 5 matching Reddit permalinks are returned and posted as a comment on the new post, authored as the app account.

## HTTP Fetch Policy

The following domains are requested for this app:

- https://reddit-trauma-bot.vercel.app/

This is a stateless backend that communicates with ChromaDB. The repository for the server is publicly available at https://github.com/remuspoon/reddit-trauma-bot. This repository contains files for the express backend, devvit, and jupyter notebook for constructing the vector database.

This server currently supports the *query endpoint*. A *tagging endpoint* is currently WIP. Please see the details of both endpoints below:

### Query API
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

### Tagging API

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

## Triggers

### `PostCreate`

Fires whenever a new post is submitted to an installed subreddit.

**What it does:**
- Reads `EXPRESS_BACKEND_URL` and `EXPRESS_API_KEY` from app settings.
- Fetches the post by ID to get title and body.
- Sends `POST /api/query` with the post text as the query.
- Formats up to 5 returned permalinks into a welcome comment and posts it via `post.addComment({ runAs: "APP" })`.

**Skips silently if:**
- The post has no title or body.
- Either app setting is missing.
- The backend returns an error.

---

## App Settings

| Setting | Type | Description |
|---------|------|-------------|
| `EXPRESS_BACKEND_URL` | string | Base URL of the Express backend (`https://reddit-trauma-bot.vercel.app/`) |
| `EXPRESS_API_KEY` | string (secret) | API key sent as `x-api-key` on every request to the backend |