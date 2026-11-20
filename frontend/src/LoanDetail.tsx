import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import CompletionDialog from './components/CompletionDialog';
import {
  BookIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  LocationIcon,
  OpenBookIcon,
} from './components/icons';
import LoanStatusChip from './components/LoanStatusChip';
import PageHeader from './components/PageHeader';
import { formatDate } from './utils/formatDate';
import './BookDetail.css';
import './LoanDetail.css';
import './styles/PageMessage.css';

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
  // 同じ題名の本のうち、棚にある（貸出中でない）冊数
  on_shelf_count: number;
};

// 貸出の状態ごとの、画面のタイトル
const LOAN_DETAIL_TITLES: Record<Loan['status'], string> = {
  borrowed: '借りている本の詳細',
  returned: '返却済みの本の詳細',
};

type Props = {
  loanId: number;
};

async function fetchLoan(loanId: number): Promise<Loan> {
  const res = await fetch(`/api/loans/${loanId}`);
  if (res.status === 404) throw new Error('貸出が見つかりません');
  if (!res.ok) throw new Error('貸出の情報を取得できませんでした');
  return (await res.json()) as Loan;
}

export default function LoanDetail({ loanId }: Props) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // state の更新は次の描画まで反映されないため、連打を確実に防ぐ目的で ref でも管理する
  const submittingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 返したあとの最新の貸出。完了ダイアログで OK を押したら画面に反映する
  const returnedLoanRef = useRef<Loan | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchLoan(loanId)
      .then((data) => {
        if (!ignore) setLoan(data);
      })
      .catch((e: Error) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [loanId]);

  // 完了ダイアログを閉じたら、返却済みの表示に切り替える
  const handleCompletionClose = () => {
    const returned = returnedLoanRef.current;
    if (!returned) return;
    returnedLoanRef.current = null;
    setLoan(returned);
  };

  const handleReturn = async () => {
    if (submittingRef.current || !loan || loan.status !== 'borrowed') return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/loans/${loan.id}/return`, { method: 'POST' });
      if (res.status === 409) {
        // 別の画面などで先に返していた場合は、最新の状態を表示し直す
        setLoan(await fetchLoan(loan.id));
        throw new Error('この本はすでに返却済みです');
      }
      if (!res.ok) throw new Error('返却できませんでした');
      // 返したら完了ダイアログを出す。OK を押すと、返却済みの表示に切り替わる
      returnedLoanRef.current = (await res.json()) as Loan;
      dialogRef.current?.showModal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isBorrowed = loan?.status === 'borrowed';

  // 画面のタイトルは貸出の状態で変える。
  // 読み込み中と読み込めなかったときは状態が分からないため、タイトルを空にする
  const pageTitle = loan ? LOAN_DETAIL_TITLES[loan.status] : '';

  return (
    <div className="screen loan-detail">
      <PageHeader title={pageTitle} backTo="/loans" />

      <div className="content">
        {loan && (
          <>
            <h2 className="book-title">{loan.title}</h2>
            <p className="book-authors loan-book-authors">{loan.authors}</p>
            <Link to={`/books/${loan.book_id}`} className="loan-book-link">
              本の詳細を見る
              <ChevronRightIcon />
            </Link>

            <div className="info-card">
              <div className="info-row">
                <span className="info-icon">
                  <LocationIcon />
                </span>
                <div>
                  <div className="info-label">借りた場所</div>
                  <div className="info-value">{loan.location}</div>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">
                  <OpenBookIcon />
                </span>
                <div>
                  <div className="info-label">状態</div>
                  <LoanStatusChip status={loan.status} />
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">
                  <BookIcon />
                </span>
                <div>
                  <div className="info-label">全フロアの残り冊数</div>
                  <div className="info-value">{loan.on_shelf_count}冊</div>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">
                  <CalendarIcon />
                </span>
                <div>
                  <div className="info-label">借りた日</div>
                  <div className="info-value">{formatDate(loan.borrowed_at)}</div>
                </div>
              </div>

              {loan.returned_at && (
                <div className="info-row">
                  <span className="info-icon">
                    <CheckIcon />
                  </span>
                  <div>
                    <div className="info-label">返した日</div>
                    <div className="info-value">{formatDate(loan.returned_at)}</div>
                  </div>
                </div>
              )}
            </div>

            {isBorrowed ? (
              <button
                type="button"
                className="primary-button"
                onClick={handleReturn}
                disabled={submitting}
              >
                {submitting ? '読み込み中' : '返す'}
              </button>
            ) : (
              <p className="loan-notice">
                この本は返却済みです。もう一度読むときは、本の詳細から借りられます。
              </p>
            )}
          </>
        )}
        {!loan && !error && <p className="page-message">読み込み中…</p>}
        {error && (
          <p className="page-message page-message--error" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* 返したあとの完了ダイアログ */}
      <CompletionDialog
        ref={dialogRef}
        message="本を返しました！"
        onClose={handleCompletionClose}
      />
    </div>
  );
}
