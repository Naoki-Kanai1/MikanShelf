import { useEffect, useRef, useState } from 'react';
import './BookDetail.css';

type Book = {
  id: number;
  title: string;
  authors: string;
  location: string;
  status: 'available' | 'borrowed';
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

  const handleBorrow = async () => {
    if (submittingRef.current || !book || book.status === 'borrowed') return;
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
        // ほかの人が先に借りていた場合は、貸出中の表示に切り替える
        setBook({ ...book, status: 'borrowed' });
        throw new Error('この本はすでに貸出中です');
      }
      if (!res.ok) throw new Error('借りられませんでした');
      setBook((await res.json()) as Book);
      // TODO: 貸出詳細画面へ遷移する
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isBorrowed = book?.status === 'borrowed';

  return (
    <div className="screen">
      <header className="app-bar">
        <button type="button" className="icon-button" aria-label="戻る">
          <ArrowBackIcon />
        </button>
        <h1 className="app-bar-title">本の詳細</h1>
      </header>

      <main className="content">
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
                  <BookIcon />
                </span>
                <div>
                  <div className="info-label">状態</div>
                  {isBorrowed ? (
                    <span className="chip chip-borrowed">貸出中</span>
                  ) : (
                    <span className="chip chip-available">
                      <CheckIcon />
                      棚にある
                    </span>
                  )}
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon">
                  <PersonIcon />
                </span>
                <div>
                  <div className="info-label">いま借りている人</div>
                  {/* TODO: 借りている人の表示は未実装。いまは固定で「いません」と表示する */}
                  <div className="info-value">いません</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={handleBorrow}
              disabled={submitting || isBorrowed}
            >
              {submitting ? '読み込み中' : '借りる'}
            </button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </main>

      {/* 見た目のみ。遷移は未実装 */}
      <nav className="bottom-nav">
        <button type="button" className="nav-item active">
          <span className="nav-icon">
            <BookIcon />
          </span>
          <span className="nav-label">本</span>
        </button>
        <button type="button" className="nav-item">
          <span className="nav-icon">
            <SwapIcon />
          </span>
          <span className="nav-label">貸出</span>
        </button>
        <button type="button" className="nav-item">
          <span className="nav-icon">
            <RequestIcon />
          </span>
          <span className="nav-label">蔵書リクエスト</span>
        </button>
      </nav>
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

function ArrowBackIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 12H4M10 6l-6 6 6 6" />
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

function BookIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M5 15h14" />
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

function CheckIcon() {
  return (
    <svg {...iconProps} width={18} height={18}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
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

function RequestIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 4h16v12H8l-4 4z" />
      <path d="M12 7v6M9 10h6" />
    </svg>
  );
}
