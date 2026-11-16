import { useEffect, useState, type FormEvent } from 'react';

type Item = {
  id: number;
  name: string;
  created_at: string;
};

export default function App() {
  const [health, setHealth] = useState('checking...');
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: { status: string }) => setHealth(data.status))
      .catch(() => setHealth('error'));

    fetch('/api/items')
      .then((res) => res.json())
      .then((data: Item[]) => setItems(data))
      .catch(() => setItems([]));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const item: Item = await res.json();
    setItems((prev) => [item, ...prev]);
    setName('');
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>MikanShelf</h1>
      <p>API status: {health}</p>
      <form onSubmit={handleSubmit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="item name" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </main>
  );
}
