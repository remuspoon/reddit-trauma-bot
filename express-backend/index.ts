import 'dotenv/config';
import express from 'express';
import { requireApiKey } from './app/auth.js';
import { query } from './app/query.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

app.get('/', (_req, res) => {
  res.json({ message: 'Hello World!' });
});

app.post('/api/query', requireApiKey, async (req, res) => {
  const queryText = req.body?.query;
  if (typeof queryText !== 'string' || !queryText.trim()) {
    res.status(400).json({ error: 'Missing or invalid "query" in body' });
    return;
  }
  try {
    const permalinks = await query(queryText.trim());
    res.json({ permalinks });
  } catch (err) {
    console.error('Chroma query error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});


export default app;
