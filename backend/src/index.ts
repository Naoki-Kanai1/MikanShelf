import express from 'express';
import { db } from './db.js';

type Item = {
  id: number;
  name: string;
  created_at: string;
};

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/items', (_req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY id DESC').all() as Item[];
  res.json(items);
});

app.post('/api/items', (req, res) => {
  const name: unknown = req.body?.name;
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const item = db
    .prepare('INSERT INTO items (name) VALUES (?) RETURNING *')
    .get(name.trim()) as Item;
  res.status(201).json(item);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
