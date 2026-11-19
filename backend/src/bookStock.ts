import { db } from './db.js';

// 同じ題名の本のうち、棚にある（貸出中の loans がない）本の冊数を数える。持ち出し禁止の本も数える
const countOnShelfByTitle = db.prepare(`
  SELECT COUNT(*) AS count
  FROM books b
  WHERE b.title = ?
    AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.id AND l.status = 'borrowed')
`);

// 上と同じ数え方で、置き場所も同じ本だけを数える
const countOnShelfByTitleAndLocation = db.prepare(`
  SELECT COUNT(*) AS count
  FROM books b
  WHERE b.title = ?
    AND b.location = ?
    AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.book_id = b.id AND l.status = 'borrowed')
`);

// 全ての置き場所を合わせた、棚にある冊数（貸出詳細で使う）
export function countBooksOnShelf(title: string): number {
  return (countOnShelfByTitle.get(title) as { count: number }).count;
}

// その置き場所の棚にある冊数（本詳細で使う）。置き場所は文字が完全に同じものだけを同じとみなす
export function countBooksOnShelfAtLocation(title: string, location: string): number {
  return (countOnShelfByTitleAndLocation.get(title, location) as { count: number }).count;
}
