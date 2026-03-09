# Repository for Reddit Trauma Bot

A reddit bot that uses a user's post to query a vector database (VDB) and recommends similar posts.

It aims to help people feel more supported / not alone by giving them instant feedback when they post on mental health related subreddits.

## Data Source
Reddit archive from 2005 - 2025 (The VDB only contains entries from the last 2 years)

**Filename:** mentalhealth_submissions.jsonl

**From:** https://academictorrents.com/details/3e3f64dee22dc304cdd2546254ca1f8e8ae542b4

## Setup
```
        +----------------+                     +--------------------+                     +----------------+
        |                | 1. POST body JSON   |                    | 2. Vector search    |                |
        |  Devvit Bot    +--------------------->  Express Backend   +-------------------->   Chroma VDB    |
        |  (Reddit app)  |                     |   (Node/Express)   |   (similar posts)   |                |
        +--------+-------+                     +---------+----------+                     +--------+-------+
                 ^                                       |                                         |
                 |                                       | 3. List of post IDs                     |
                 |        5. "tag deleted" for ID        |<----------------------------------------+
                 |<--------------------------------------+
                 |
     4. Check each recommended post via Reddit API
        - If post exists: show to user
        - If post is deleted: call Express "tag deleted" endpoint
```
- `/devvit` contains logic for devvit bot / mod tool.
- `/express-backend` contains APIs to query ChromaDB. Runs on an express.js server.
- `/chroma-db` contains an Jupyter Notebook on how the vector database was created.