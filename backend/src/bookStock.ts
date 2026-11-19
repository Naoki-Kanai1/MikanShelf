import { db } from './db.js';

// 同じ題名の本のうち、棚にある（貸出中の loans がない）本の冊数を数える。持ち出し禁止の本も数える
const countOnShelfByTitle = db.prepare(`
  SELECT COUNT(*) AS count
  FROM books b
  WHERE b.title = ?
    AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.id AND l.status = 'borrowed')
`);

export function countBooksOnShelf(title: string): number {
  return (countOnShelfByTitle.get(title) as { count: number }).count;
}
