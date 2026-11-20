import { useEffect, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router';
import { ExpandIcon, SearchIcon } from '../components/icons';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { useBookListState } from '../state/BookListStateContext';
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
      {/* 1冊だけの本は開く行が無いので、どの幅でも著者の下に置き場所を出す（開いた行と同じ書き方） */}
      <span className="book-row__place">置き場所：{book.location}</span>
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
          {/* 代表の状態を出す。棚にある（借りられる）本が1冊でもあれば「棚にある」、
              無ければ持ち出し禁止の本があれば「持ち出し禁止」、全て貸出中のときだけ「誰かが借用中」 */}
          <StatusChip
            status={representative.status}
            restricted={representative.is_restricted === 1}
          />
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
            return (
              <li key={place.location} className="book-copies__item">
                {/* 押すと、この置き場所の本のうち「棚にある（借りられる）→ 持ち出し禁止 → 誰かが借用中」の順で最初の1冊の本詳細画面へ移動する */}
                <Link to={`/books/${book.id}`} className="book-row book-row--copy">
                  <span className="book-row__location">置き場所：{place.location}</span>
                  <span className="book-row__trailing">
                    {/* 開く本の状態を出す（詳細画面の状態と同じになる）。棚にある（借りられる）本が1冊でもあれば「棚にある」、
                        無ければ持ち出し禁止の本があれば「持ち出し禁止」、全て貸出中のときだけ「誰かが借用中」 */}
                    <StatusChip status={book.status} restricted={book.is_restricted === 1} />
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
  // 絞り込みの文字・開いているまとまり・スクロール位置は、画面を離れても残す（state/BookListStateContext.ts）
  const { state, dispatch, scrollYRef } = useBookListState();
  const loaded = books !== null;

  useEffect(() => {
    fetch('/api/books')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Book[]) => setBooks(data))
      .catch(() => setError(true));
  }, []);

  // 一覧を読み込み終えたら、前に見ていたスクロール位置へ戻し、そのあとはスクロールのたびに位置を覚える。
  // 読み込み中は画面が短く、ブラウザがスクロール位置を詰めることがあるので、そのあいだは位置を覚えない。
  // 開いていたまとまりも同じ描画で出るので、高さは離れる前と同じになる
  useLayoutEffect(() => {
    if (!loaded) return;
    window.scrollTo(0, scrollYRef.current);
    const remember = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', remember);
    return () => window.removeEventListener('scroll', remember);
  }, [loaded, scrollYRef]);

  // 絞り込んでから、同じ本をまとめる
  const groups = books === null ? [] : groupBooks(filterBooks(books, state.keyword));

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
            value={state.keyword}
            onChange={(e) => dispatch({ type: 'setKeyword', keyword: e.target.value })}
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
                  expanded={state.expandedKeys.includes(group.key)}
                  onToggle={() => dispatch({ type: 'toggleExpanded', key: group.key })}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
