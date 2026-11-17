import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { RestrictedIcon } from '../components/icons';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import '../styles/BookListPage.css';

// GET /api/books が返す本1冊分のデータ（backend/src/index.ts の Book と同じ形）
type Book = {
  id: number;
  title: string;
  authors: string;
  location: string;
  is_restricted: 0 | 1;
  status: 'available' | 'borrowed';
  borrower_name: string | null;
  borrowed_at: string | null;
  created_at: string;
};

// 本一覧画面（画面設計書: docs/ap/BookListPage/Screen_design.md）
export default function BookListPage() {
  // null は「まだ読み込み中」を表す
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/books')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Book[]) => setBooks(data))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="book-list-page">
      <PageHeader title="本" />
      {/* TODO: 絞り込み（題名・著者）は別のPBIで、ここに入力欄を置く */}

      {error ? (
        <p className="book-list-page__message" role="alert">
          本の一覧を読み込めませんでした。時間をおいて、もう一度開いてください。
        </p>
      ) : books === null ? (
        <p className="book-list-page__message">読み込み中…</p>
      ) : books.length === 0 ? (
        <p className="book-list-page__message">登録されている本はまだありません。</p>
      ) : (
        <ul className="book-list">
          {books.map((book) => (
            <li key={book.id} className="book-list__item">
              <Link to={`/books/${book.id}`} className="book-row">
                <span className="book-row__title">{book.title}</span>
                <span className="book-row__authors">{book.authors}</span>
                <span className="book-row__badges">
                  <StatusChip status={book.status} className="book-row__status" />
                  {book.is_restricted === 1 && (
                    <span className="book-row__restricted">
                      <RestrictedIcon />
                      持ち出し禁止
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
