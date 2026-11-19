import express from 'express';
import { countBooksOnShelf } from './bookStock.js';
import { db } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

// ログイン中の人の account_id。名前は同じ人がいるかもしれないので account_id で決める
// TODO: ログイン機能ができたら、ログイン中のユーザーに置き換える（いまは「田中」さんで固定）
const CURRENT_USER_ACCOUNT_ID = 'emp0001';

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

type Book = {
  id: number;
  title: string;
  authors: string;
  location: string;
  is_restricted: 0 | 1;
  // 以下は books には持たず、loans（貸出中の行）から求める
  status: 'available' | 'borrowed';
  borrower_name: string | null;
  borrowed_at: string | null;
  created_at: string;
};

// 本詳細・貸出詳細で返す、同じ題名の本のうち棚にある冊数
type WithShelfCount<T> = T & { on_shelf_count: number };

// 本の情報に、いまの貸出状況（貸出中の loans があるか）を付けて取得する
const selectBookWithLoan = db.prepare(`
  SELECT
    b.id, b.title, b.authors, b.location, b.is_restricted, b.created_at,
    CASE WHEN l.id IS NULL THEN 'available' ELSE 'borrowed' END AS status,
    u.name AS borrower_name,
    l.borrowed_at
  FROM books b
  LEFT JOIN loans l ON l.book_id = b.id AND l.status = 'borrowed'
  LEFT JOIN users u ON u.id = l.user_id
  WHERE b.id = ?
`);

// 全ての本を、いまの貸出状況を付けて取得する（登録順）
const selectBooksWithLoan = db.prepare(`
  SELECT
    b.id, b.title, b.authors, b.location, b.is_restricted, b.created_at,
    CASE WHEN l.id IS NULL THEN 'available' ELSE 'borrowed' END AS status,
    u.name AS borrower_name,
    l.borrowed_at
  FROM books b
  LEFT JOIN loans l ON l.book_id = b.id AND l.status = 'borrowed'
  LEFT JOIN users u ON u.id = l.user_id
  ORDER BY b.id
`);

// 本の一覧を取得する
app.get('/api/books', (_req, res) => {
  res.json(selectBooksWithLoan.all() as Book[]);
});

// 本の詳細を取得する
app.get('/api/books/:id', (req, res) => {
  const book = selectBookWithLoan.get(Number(req.params.id)) as Book | undefined;
  if (!book) {
    res.status(404).json({ error: 'book not found' });
    return;
  }
  const detail: WithShelfCount<Book> = { ...book, on_shelf_count: countBooksOnShelf(book.title) };
  res.json(detail);
});

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

// 貸出の情報に、本の題名・著者・置き場所と借りた人の名前を付けて取得する
// 借りた場所は loans には持たず、本の置き場所（＝返す場所）を使う
const selectLoan = db.prepare(`
  SELECT
    l.id, l.book_id, b.title, b.authors, b.location, l.status,
    u.name AS borrower_name,
    l.borrowed_at, l.returned_at
  FROM loans l
  JOIN books b ON b.id = l.book_id
  JOIN users u ON u.id = l.user_id
  WHERE l.id = ?
`);

// 貸出1件を、同じ題名の本のうち棚にある冊数を付けて取得する（貸出詳細で使う）
function getLoanDetail(id: number): WithShelfCount<Loan> | undefined {
  const loan = selectLoan.get(id) as Loan | undefined;
  if (!loan) return undefined;
  return { ...loan, on_shelf_count: countBooksOnShelf(loan.title) };
}

// ログイン中の人の貸出を取得する（貸出中を先に、その中は借りた日が新しい順）
const selectLoansOfUser = db.prepare(`
  SELECT
    l.id, l.book_id, b.title, b.authors, b.location, l.status,
    u.name AS borrower_name,
    l.borrowed_at, l.returned_at
  FROM loans l
  JOIN books b ON b.id = l.book_id
  JOIN users u ON u.id = l.user_id
  WHERE u.account_id = ?
  ORDER BY (l.status = 'borrowed') DESC, l.borrowed_at DESC, l.id DESC
`);

// ある人がある本を借りた貸出のうち、いちばん新しいもの
const selectLatestLoanOfUser = db.prepare(
  'SELECT id, status FROM loans WHERE book_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
);

// 本を借りる（loans の行を「貸出中」にする）
// TODO: ログイン機能ができたら、名前ではなくログイン中のユーザーIDで借りる人を決める
app.post('/api/books/:id/borrow', (req, res) => {
  const borrowerName: unknown = req.body?.borrowerName;
  if (typeof borrowerName !== 'string' || !borrowerName.trim()) {
    res.status(400).json({ error: 'borrowerName is required' });
    return;
  }
  const user = db.prepare('SELECT id FROM users WHERE name = ?').get(borrowerName.trim()) as
    { id: number } | undefined;
  if (!user) {
    res.status(400).json({ error: 'user not found' });
    return;
  }

  const id = Number(req.params.id);
  const book = selectBookWithLoan.get(id) as Book | undefined;
  if (!book) {
    res.status(404).json({ error: 'book not found' });
    return;
  }
  // 持ち出し禁止の本は借りられない
  if (book.is_restricted === 1) {
    res.status(403).json({ error: 'book is restricted' });
    return;
  }
  // 同じ人が同じ本を以前借りて返却済みなら、その行（いちばん新しいもの）を貸出中に戻す。
  // 行がなければ新しく追加する。戻り値は貸出中にした貸出の ID（すでに自分が貸出中なら null）
  const borrow = db.transaction((): number | null => {
    const existing = selectLatestLoanOfUser.get(id, user.id) as
      { id: number; status: 'borrowed' | 'returned' } | undefined;
    if (existing?.status === 'borrowed') return null;
    if (existing) {
      db.prepare(
        `UPDATE loans SET status = 'borrowed', borrowed_at = datetime('now'), returned_at = NULL
         WHERE id = ?`,
      ).run(existing.id);
      return existing.id;
    }
    const result = db
      .prepare('INSERT INTO loans (book_id, user_id) VALUES (?, ?)')
      .run(id, user.id);
    return Number(result.lastInsertRowid);
  });
  let loanId: number | null;
  try {
    loanId = borrow();
  } catch (e) {
    // 貸出中は1冊1件のユニークインデックスで、ほかの人が貸出中の本を二重に借りられないようにしている
    if ((e as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'book is already borrowed' });
      return;
    }
    throw e;
  }
  if (loanId === null) {
    res.status(409).json({ error: 'book is already borrowed' });
    return;
  }
  // 借りたあとは貸出詳細画面へ遷移するため、貸出の情報を返す
  res.status(201).json(getLoanDetail(loanId));
});

// ログイン中の人の貸出の一覧を取得する
app.get('/api/loans', (_req, res) => {
  res.json(selectLoansOfUser.all(CURRENT_USER_ACCOUNT_ID) as Loan[]);
});

// 貸出の詳細を取得する
app.get('/api/loans/:id', (req, res) => {
  const loan = getLoanDetail(Number(req.params.id));
  if (!loan) {
    res.status(404).json({ error: 'loan not found' });
    return;
  }
  res.json(loan);
});

// 本を返す（貸出中の loans を返却済みにする）
// TODO: ログイン機能ができたら、借りている本人だけが返せるようにする
app.post('/api/loans/:id/return', (req, res) => {
  const id = Number(req.params.id);
  const result = db
    .prepare(
      `UPDATE loans SET status = 'returned', returned_at = datetime('now')
       WHERE id = ? AND status = 'borrowed'`,
    )
    .run(id);
  if (result.changes === 0) {
    // 更新できなかったのは、貸出が存在しないか、すでに返却済みのどちらか
    if (!selectLoan.get(id)) {
      res.status(404).json({ error: 'loan not found' });
      return;
    }
    res.status(409).json({ error: 'loan is already returned' });
    return;
  }
  res.json(getLoanDetail(id));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
