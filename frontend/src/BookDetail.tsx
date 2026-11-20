import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import CompletionDialog from './components/CompletionDialog';
import PageHeader from './components/PageHeader';
import StatusChip from './components/StatusChip';
import './BookDetail.css';

type Book = {
  id: number;
  title: string;
  authors: string;
  location: string;
  // 持ち出し禁止なら 1（借りられない）
  is_restricted: 0 | 1;
  status: 'available' | 'borrowed';
  // 貸出中でなければ null
  borrower_name: string | null;
  // 同じ題名で、この本と置き場所も同じ本のうち、棚にある（貸出中でない）冊数。この本自体も棚にあれば含む
  on_shelf_count: number;
};

// TODO: ログイン機能ができたら、ログイン中のユーザーで借りるようにする
const TEMP_BORROWER_NAME = '田中';

type Props = {
  bookId: number;
};

export default function BookDetail({ bookId }: Props) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // state の更新は次の描画まで反映されないため、連打を確実に防ぐ目的で ref でも管理する
  const submittingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 借りられた貸出の ID。完了ダイアログで OK を押したら、この貸出の詳細画面へ移動する
  const borrowedLoanIdRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    fetch(`/api/books/${bookId}`)
      .then((res) => {
        if (!res.ok) throw new Error('本の情報を取得できませんでした');
        return res.json() as Promise<Book>;
      })
      .then((data) => {
        if (!ignore) setBook(data);
      })
      .catch((e: Error) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [bookId]);

  // 完了ダイアログを閉じたら、借りた貸出の詳細画面へ移動する
  const handleCompletionClose = () => {
    const loanId = borrowedLoanIdRef.current;
    if (loanId === null) return;
    borrowedLoanIdRef.current = null;
    navigate(`/loans/${loanId}`);
  };

  const handleBorrow = async () => {
    if (submittingRef.current || !book || book.status === 'borrowed' || book.is_restricted === 1)
      return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowerName: TEMP_BORROWER_NAME }),
      });
      if (res.status === 409) {
        // ほかの人が先に借りていた場合は、最新の情報（借りている人を含む）を取り直して表示を切り替える
        const latest = await fetch(`/api/books/${book.id}`);
        if (latest.ok) setBook((await latest.json()) as Book);
        else setBook({ ...book, status: 'borrowed', borrower_name: null });
        throw new Error('この本はすでに貸出中です');
      }
      if (res.status === 403) {
        // 持ち出し禁止の本だった場合は、ボタンを「貸出できません」に切り替える
        setBook({ ...book, is_restricted: 1 });
        throw new Error('この本は持ち出し禁止のため貸出できません');
      }
      if (!res.ok) throw new Error('借りられませんでした');
      // 借りたら完了ダイアログを出す。OK を押すと、その貸出の詳細画面へ移動する
      const loan = (await res.json()) as { id: number };
      borrowedLoanIdRef.current = loan.id;
      dialogRef.current?.showModal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isBorrowed = book?.status === 'borrowed';
  const isRestricted = book?.is_restricted === 1;

  return (
    <div className="screen">
      <PageHeader title="本の詳細" backTo="/books" />

      <div className="content">
        {book && (
          <>
            <h2 className="book-title">{book.title}</h2>
            <p className="book-authors">{book.authors}</p>

            <div className="info-card">
              <div className="info-row">
                <span className="info-icon">
                  <LocationIcon />
                </span>
                <div>
                  <div className="info-label">置き場所</div>
                  <div className="info-value">{book.location}</div>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">
                  <OpenBookIcon />
                </span>
                <div>
                  <div className="info-label">状態</div>
                  <StatusChip status={book.status} restricted={isRestricted} />
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">
                  <ShelfIcon />
                </span>
                <div>
                  <div className="info-label">この棚にある冊数</div>
                  <div className="info-value">{book.on_shelf_count}冊</div>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">
                  <PersonIcon />
                </span>
                <div>
                  <div className="info-label">いま借りている人</div>
                  <div className="info-value">{book.borrower_name ?? 'いません'}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={handleBorrow}
              disabled={submitting || isBorrowed || isRestricted}
            >
              {isRestricted ? 'この本は持ち出し禁止です' : submitting ? '読み込み中' : '借りる'}
            </button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      {/* 借りたあとの完了ダイアログ */}
      <CompletionDialog
        ref={dialogRef}
        message="本を借りました！"
        onClose={handleCompletionClose}
      />
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

function LocationIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

// 状態「開いた本」
function OpenBookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function ShelfIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 21h18M5 21V5h3v16M10 21V3h3v18M15.5 7.5l2.9-.8 2.6 14.3" />
    </svg>
  );
}
