import { useEffect, useState } from 'react';
import { Link } from 'react-router';
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

// 貸出一覧画面（画面設計書: docs/ap/LoanListPage/Screen_design.md）
// ログイン中の人の貸出だけを表示する（だれの貸出かはバックエンドが決める）
export default function LoanListPage() {
  // null は「まだ読み込み中」を表す
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/loans')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Loan[]) => setLoans(data))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="loan-list-page">
      <PageHeader title="貸出" />
      {/* TODO: 「自分の貸出／すべて」の絞り込みと、予約（予約中）の表示は別のPBIで作る */}

      {error ? (
        <p className="loan-list-page__message" role="alert">
          貸出の一覧を読み込めませんでした。時間をおいて、もう一度開いてください。
        </p>
      ) : loans === null ? (
        <p className="loan-list-page__message">読み込み中…</p>
      ) : loans.length === 0 ? (
        <p className="loan-list-page__message">借りた本はまだありません。</p>
      ) : (
        <ul className="loan-list">
          {loans.map((loan) => (
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
