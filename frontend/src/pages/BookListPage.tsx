import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ExpandIcon, SearchIcon } from '../components/icons';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import '../styles/BookListPage.css';
import { filterBooks } from '../utils/filterBooks';
import { groupBooks, groupByLocation, type BookGroup } from '../utils/groupBooks';

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

// 1冊だけの本の行。押すと本詳細画面へ移動する
function SingleBookRow({ book }: { book: Book }) {
  return (
    <Link to={`/books/${book.id}`} className="book-row">
      <span className="book-row__title">{book.title}</span>
      <span className="book-row__authors">{book.authors}</span>
      <StatusChip
        status={book.status}
        restricted={book.is_restricted === 1}
        className="book-row__status"
      />
    </Link>
  );
}

type GroupRowProps = {
  group: BookGroup<Book>;
  expanded: boolean;
  onToggle: () => void;
};

// 同じ題名・著者の本が何冊もあるときの行。代表の1冊と冊数を出し、押すと1冊ずつの行を開く・閉じる
function BookGroupRow({ group, expanded, onToggle }: GroupRowProps) {
  const { representative, books } = group;
  const copiesId = `book-copies-${representative.id}`;
  const allRestricted = books.every((book) => book.is_restricted === 1);
  return (
    <>
      <button
        type="button"
        className="book-row book-row--group"
        aria-expanded={expanded}
        aria-controls={copiesId}
        onClick={onToggle}
      >
        <span className="book-row__title">{representative.title}</span>
        <span className="book-row__authors">{representative.authors}</span>
        <span className="book-row__trailing">
          {/* 全て持ち出し禁止のときだけ、状態の印の代わりに「持ち出し禁止」を出す */}
          <StatusChip status={representative.status} restricted={allRestricted} />
          {/* 冊数と開く・閉じるの印は、1つの札にまとめて並べる */}
          <span className="book-row__toggle">
            <span className="book-row__count">{books.length}冊</span>
            <ExpandIcon />
          </span>
        </span>
      </button>
      {expanded && (
        <ul
          id={copiesId}
          className="book-copies"
          aria-label={`${representative.title}の${books.length}冊`}
        >
          {groupByLocation(books).map((place) => {
            const { representative: book, availableCount } = place;
            const allRestricted = place.books.every((b) => b.is_restricted === 1);
            return (
              <li key={place.location} className="book-copies__item">
                {/* 押すと、この置き場所の棚にある本（無ければ最初の1冊）の本詳細画面へ移動する */}
                <Link to={`/books/${book.id}`} className="book-row book-row--copy">
                  <span className="book-row__location">置き場所：{place.location}</span>
                  <span className="book-row__trailing">
                    {/* その置き場所の本が全て持ち出し禁止のときだけ、状態の印の代わりに「持ち出し禁止」を出す */}
                    <StatusChip status={book.status} restricted={allRestricted} />
                    {/* 棚にある冊数。0冊のときも「残り0冊」と出す */}
                    <span className="book-row__remaining">残り{availableCount}冊</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// 本一覧画面（画面設計書: docs/ap/BookListPage/Screen_design.md）
export default function BookListPage() {
  // null は「まだ読み込み中」を表す
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState(false);
  // 絞り込みの入力欄に入っている文字
  const [keyword, setKeyword] = useState('');
  // 開いているまとまり（BookGroup の key）
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    fetch('/api/books')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Book[]) => setBooks(data))
      .catch(() => setError(true));
  }, []);

  // 絞り込んでから、同じ本をまとめる
  const groups = books === null ? [] : groupBooks(filterBooks(books, keyword));

  const toggle = (key: string) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="book-list-page">
      <PageHeader title="本一覧" />
      {/* 題名・著者で絞り込む（部分一致）。API は呼び直さず、読み込んだ一覧の中から探す */}
      <div className="book-search" role="search">
        <label className="book-search__field">
          <SearchIcon />
          <input
            type="search"
            className="book-search__input"
            placeholder="題名・著者で絞り込む"
            aria-label="題名・著者で絞り込む"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p className="book-list-page__message" role="alert">
          本の一覧を読み込めませんでした。時間をおいて、もう一度開いてください。
        </p>
      ) : books === null ? (
        <p className="book-list-page__message">読み込み中…</p>
      ) : books.length === 0 ? (
        <p className="book-list-page__message">登録されている本はまだありません。</p>
      ) : groups.length === 0 ? (
        <p className="book-list-page__message">条件に合う本は見つかりませんでした。</p>
      ) : (
        <ul className="book-list">
          {groups.map((group) => (
            <li key={group.key} className="book-list__item">
              {group.books.length === 1 ? (
                <SingleBookRow book={group.representative} />
              ) : (
                <BookGroupRow
                  group={group}
                  expanded={expandedKeys.has(group.key)}
                  onToggle={() => toggle(group.key)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
