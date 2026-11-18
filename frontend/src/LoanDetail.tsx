import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import ConfirmDialog from './components/ConfirmDialog';
import LoanStatusChip from './components/LoanStatusChip';
import PageHeader from './components/PageHeader';
import { formatDate } from './utils/formatDate';
import './BookDetail.css';
import './LoanDetail.css';

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

  const openDialog = () => {
    setError(null);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleReturn = async () => {
    if (submittingRef.current || !loan || loan.status !== 'borrowed') return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    closeDialog();
    try {
      const res = await fetch(`/api/loans/${loan.id}/return`, { method: 'POST' });
      if (res.status === 409) {
        // 別の画面などで先に返していた場合は、最新の状態を表示し直す
        setLoan(await fetchLoan(loan.id));
        throw new Error('この本はすでに返却済みです');
      }
      if (!res.ok) throw new Error('返却できませんでした');
      setLoan((await res.json()) as Loan);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isBorrowed = loan?.status === 'borrowed';

  return (
    <div className="screen">
      <PageHeader title="貸出の詳細" backTo="/loans" />

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
                  <SwapIcon />
                </span>
                <div>
                  <div className="info-label">状態</div>
                  <LoanStatusChip status={loan.status} />
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
                    <CheckIcon size={24} />
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
                onClick={openDialog}
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
        {error && <p className="error">{error}</p>}
      </div>

      {/* 返す前の確認ダイアログ */}
      <ConfirmDialog
        ref={dialogRef}
        title="この本を返しますか？"
        confirmLabel="返す"
        onConfirm={handleReturn}
        onCancel={closeDialog}
      >
        <ul>
          <li>返却する本のタイトルに間違いはありませんか？</li>
          <li>正しい書架の前に到着しましたか？</li>
        </ul>
        <p>返すと元に戻せません。もう一度読むときは、本の詳細から借りられます。</p>
      </ConfirmDialog>
    </div>
  );
}

// ---- アイコン ----

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

function ChevronRightIcon() {
  return (
    <svg {...iconProps} width={20} height={20}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps} width={size} height={size}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
