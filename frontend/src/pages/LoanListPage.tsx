import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CheckIcon } from '../components/icons';
import LoanStatusChip from '../components/LoanStatusChip';
import PageHeader from '../components/PageHeader';
import { formatDate } from '../utils/formatDate';
import '../styles/LoanListPage.css';

// GET /api/loans が返す貸出1件分のデータ（backend/src/index.ts の Loan と同じ形）
type Loan = {
  id: number;
  book_id: number;
  title: string;
  authors: string;
  location: string;
  status: 'borrowed' | 'returned';
  borrower_name: string;
  borrowed_at: string;
  returned_at: string | null;
};

// 一覧の絞り込み。画面上部のチップで切り替える
type Filter = 'borrowed' | 'returned' | 'all';

const FILTERS: { value: Filter; label: string; emptyMessage: string }[] = [
  { value: 'borrowed', label: 'いま借りている本', emptyMessage: 'いま借りている本はありません。' },
  { value: 'returned', label: '返却済みの本', emptyMessage: '返却済みの本はまだありません。' },
  { value: 'all', label: 'すべて', emptyMessage: '借りた本はまだありません。' },
];

// 貸出一覧画面（画面設計書: docs/ap/LoanListPage/Screen_design.md）
// ログイン中の人の貸出だけを表示する（だれの貸出かはバックエンドが決める）
export default function LoanListPage() {
  // null は「まだ読み込み中」を表す
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState(false);
  // 最初は「いま借りている本」を表示する
  const [filter, setFilter] = useState<Filter>('borrowed');

  useEffect(() => {
    fetch('/api/loans')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Loan[]) => setLoans(data))
      .catch(() => setError(true));
  }, []);

  const visibleLoans =
    loans === null || filter === 'all' ? loans : loans.filter((loan) => loan.status === filter);
  const emptyMessage = FILTERS.find((f) => f.value === filter)!.emptyMessage;

  return (
    <div className="loan-list-page">
      <PageHeader title="借りている本" />
      {/* TODO: 「自分の貸出／すべて」の絞り込みと、予約（予約中）の表示は別のPBIで作る */}

      <div className="loan-filter" role="group" aria-label="表示する貸出">
        {FILTERS.map((f) => {
          const selected = f.value === filter;
          return (
            <button
              key={f.value}
              type="button"
              className={`loan-filter__chip${selected ? ' loan-filter__chip--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => setFilter(f.value)}
            >
              {selected && <CheckIcon />}
              {f.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="loan-list-page__message" role="alert">
          貸出の一覧を読み込めませんでした。時間をおいて、もう一度開いてください。
        </p>
      ) : visibleLoans === null ? (
        <p className="loan-list-page__message">読み込み中…</p>
      ) : visibleLoans.length === 0 ? (
        <p className="loan-list-page__message">{emptyMessage}</p>
      ) : (
        <ul className="loan-list">
          {visibleLoans.map((loan) => (
            <li key={loan.id} className="loan-list__item">
              <Link to={`/loans/${loan.id}`} className="loan-row">
                <span className="loan-row__title">{loan.title}</span>
                <span className="loan-row__date">借りた日 {formatDate(loan.borrowed_at)}</span>
                <LoanStatusChip status={loan.status} className="loan-row__status" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
