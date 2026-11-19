import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH ?? path.join(dataDir, 'app.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
// SQLite は外部キー制約がデフォルトで無効なので、接続ごとに有効にする
db.pragma('foreign_keys = ON');

// 以前の books テーブル（status / borrower_name を持っていた形）が残っていると、
// 新しいテーブル定義と食い違って動かないため、起動時に止めて知らせる
const oldBookColumns = db.prepare(`SELECT name FROM pragma_table_info('books')`).all() as {
  name: string;
}[];
if (oldBookColumns.some((c) => c.name === 'borrower_name')) {
  throw new Error(
    `古い形式の books テーブルが残っています。${dbPath}（と -wal / -shm ファイル）を削除してから起動し直してください。`,
  );
}

// テーブル構成は docs/ER_diagram.md を参照
db.exec(`
  -- 利用者
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL UNIQUE,  -- 会社アカウントの識別子
    name TEXT NOT NULL,               -- 表示名
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 本
  -- 「棚にある／貸出中」はここには持たず、loans に borrowed の行があるかで判定する
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,                -- 「、」区切り
    location TEXT NOT NULL,               -- 置き場所
    is_restricted INTEGER NOT NULL DEFAULT 0 CHECK (is_restricted IN (0, 1)),  -- 持ち出し禁止
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 貸出
  -- status: 'borrowed' = 貸出中 / 'returned' = 返却済み
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned')),
    borrowed_at TEXT NOT NULL DEFAULT (datetime('now')),
    returned_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK ((status = 'returned') = (returned_at IS NOT NULL))
  );
  -- 同じ本を同時に2人が借りられないようにする
  CREATE UNIQUE INDEX IF NOT EXISTS loans_one_borrowed_per_book
    ON loans(book_id) WHERE status = 'borrowed';
  CREATE INDEX IF NOT EXISTS loans_user ON loans(user_id, status);

  -- 予約（順番待ち）
  -- status: 'waiting' = 順番待ち / 'fulfilled' = 順番が来て借りた / 'canceled' = 予約取消
  -- 順番は waiting の reserved_at が古い順（同じ日時なら id の小さい順）
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'fulfilled', 'canceled')),
    reserved_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,  -- 借りた日時 or 取り消した日時
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK ((status = 'waiting') = (resolved_at IS NULL))
  );
  -- 同じ人が同じ本に二重に並ばないようにする
  CREATE UNIQUE INDEX IF NOT EXISTS reservations_one_waiting_per_user
    ON reservations(book_id, user_id) WHERE status = 'waiting';
  -- 何番目か・何人待っているかを数えるため
  CREATE INDEX IF NOT EXISTS reservations_queue ON reservations(book_id, status, reserved_at);

  -- 蔵書リクエスト
  -- status: 'open' = 受付中 / 'done' = 対応済み / 'withdrawn' = 取り下げ
  CREATE TABLE IF NOT EXISTS book_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    authors TEXT,  -- わかれば
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'withdrawn')),
    book_id INTEGER REFERENCES books(id),  -- 対応済みで登録された本
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------------------
// 初期データ
// - 利用者・本・蔵書リクエストは、users が空のとき＝初回起動時だけ入れる
// - 貸出（loans）と予約（reservations）のサンプルは、loans と reservations がどちらも空のときに入れる
//   （初回起動後のDBにも入るよう、条件を分けている。自分で借りたり予約したりした後は入れない）
// - 同じ題名の本が複数あるとき、貸出・予約のサンプルは最初に登録した本（ID が小さい方）に付ける
// ---------------------------------------------------------------------------

const seedUsers: [accountId: string, name: string, email: string][] = [
  ['emp0001', '田中', 'tanaka@example.com'],
  ['emp0002', '佐藤', 'sato@example.com'],
  ['emp0003', '鈴木', 'suzuki@example.com'],
  ['emp0004', '高橋', 'takahashi@example.com'],
  ['emp0005', '伊藤', 'ito@example.com'],
  ['emp0006', '渡辺', 'watanabe@example.com'],
  ['emp0007', '山本', 'yamamoto@example.com'],
  ['emp0008', '中村', 'nakamura@example.com'],
  ['emp0009', '小林', 'kobayashi@example.com'],
  ['emp0010', '加藤', 'kato@example.com'],
  ['emp0011', '吉田', 'yoshida@example.com'],
  ['emp0012', '山田', 'yamada@example.com'],
  ['emp0013', '佐々木', 'sasaki@example.com'],
  ['emp0014', '山口', 'yamaguchi@example.com'],
  ['emp0015', '松本', 'matsumoto@example.com'],
  ['emp0016', '井上', 'inoue@example.com'],
  ['emp0017', '木村', 'kimura@example.com'],
  ['emp0018', '林', 'hayashi@example.com'],
  ['emp0019', '清水', 'shimizu@example.com'],
  ['emp0020', '森', 'mori@example.com'],
];

// 置き場所
const LOC_YOKOHAMA_13F = '横浜 13F 共用'; // IT関連の雑誌。すべて持ち出し禁止
const LOC_YOKOHAMA_14F = '横浜 14F SD部'; // 技術書。ほとんど貸出可能
const LOC_TORANOMON_20F = '虎ノ門 20F 共用'; // 技術書。持ち出し禁止と貸出可能が混在
const LOC_SHINKAWA_777F = '新川 777F 共用'; // 技術書。持ち出し禁止と貸出可能が混在

// 本（1冊目）。ID はこの順に 1〜20 になる。すべて横浜 14F SD部に置く
const firstCopies: [title: string, authors: string, location: string, isRestricted: 0 | 1][] = [
  ['リーダブルコード', 'Dustin Boswell、Trevor Foucher', LOC_YOKOHAMA_14F, 0],
  ['オブジェクト指向UIデザイン', 'ソシオメディア株式会社', LOC_YOKOHAMA_14F, 0],
  ['達人プログラマー', 'David Thomas、Andrew Hunt', LOC_YOKOHAMA_14F, 0],
  ['誰のためのデザイン？', 'D. A. ノーマン', LOC_YOKOHAMA_14F, 0],
  ['ノンデザイナーズ・デザインブック', 'Robin Williams', LOC_YOKOHAMA_14F, 0],
  ['人月の神話', 'Frederick P. Brooks, Jr.', LOC_YOKOHAMA_14F, 1],
  ['リファクタリング', 'Martin Fowler', LOC_YOKOHAMA_14F, 0],
  ['テスト駆動開発', 'Kent Beck', LOC_YOKOHAMA_14F, 0],
  ['ドメイン駆動設計', 'Eric Evans', LOC_YOKOHAMA_14F, 1],
  ['Clean Code', 'Robert C. Martin', LOC_YOKOHAMA_14F, 0],
  ['エンジニアリング組織論への招待', '広木大地', LOC_YOKOHAMA_14F, 0],
  ['チーム・ジャーニー', '市谷聡啓', LOC_YOKOHAMA_14F, 0],
  ['アジャイルサムライ', 'Jonathan Rasmusson', LOC_YOKOHAMA_14F, 0],
  ['SQLアンチパターン', 'Bill Karwin', LOC_YOKOHAMA_14F, 0],
  ['プログラミング言語Go', 'Alan A. A. Donovan、Brian W. Kernighan', LOC_YOKOHAMA_14F, 0],
  ['Webを支える技術', '山本陽平', LOC_YOKOHAMA_14F, 0],
  ['イシューからはじめよ', '安宅和人', LOC_YOKOHAMA_14F, 0],
  ['ユーザーインタフェースデザインの教科書', '原田秀司', LOC_YOKOHAMA_14F, 0],
  ['データ指向アプリケーションデザイン', 'Martin Kleppmann', LOC_YOKOHAMA_14F, 1],
  ['ソフトウェアアーキテクチャの基礎', 'Mark Richards、Neal Ford', LOC_YOKOHAMA_14F, 0],
];

// 同じ題名の本（2冊目以降）。「棚にある冊数」を確かめるためのもの。著者は1冊目と同じ
// - 初期状態で貸出中の本（seedLoans で返した日が null の本）は、合わせて3冊以上にする
// - ほかの本も合わせて1〜5冊（平均で3冊くらい）にする
// - 横浜 14F SD部・虎ノ門 20F 共用・新川 777F 共用に振り分ける。14F はほとんど貸出可能、
//   虎ノ門と新川は持ち出し禁止と貸出可能を混ぜる（同じ置き場所に同じ題名の両方がある本も作る）
// - 既存の DB に入った本と食い違わないよう、同じ題名の中の順番は変えずに、増やすときは後ろに足す
const extraCopies: [title: string, location: string, isRestricted: 0 | 1][] = [
  ['リーダブルコード', LOC_YOKOHAMA_14F, 0],
  ['リーダブルコード', LOC_TORANOMON_20F, 0],
  ['オブジェクト指向UIデザイン', LOC_TORANOMON_20F, 0],
  ['テスト駆動開発', LOC_TORANOMON_20F, 1],
  ['リーダブルコード', LOC_SHINKAWA_777F, 1],
  ['オブジェクト指向UIデザイン', LOC_SHINKAWA_777F, 0],
  ['テスト駆動開発', LOC_TORANOMON_20F, 0],
  ['SQLアンチパターン', LOC_YOKOHAMA_14F, 0],
  ['SQLアンチパターン', LOC_SHINKAWA_777F, 1],
  ['達人プログラマー', LOC_YOKOHAMA_14F, 0],
  ['達人プログラマー', LOC_TORANOMON_20F, 1],
  ['誰のためのデザイン？', LOC_YOKOHAMA_14F, 0],
  ['誰のためのデザイン？', LOC_SHINKAWA_777F, 0],
  ['ノンデザイナーズ・デザインブック', LOC_YOKOHAMA_14F, 0],
  ['ノンデザイナーズ・デザインブック', LOC_TORANOMON_20F, 0],
  ['リファクタリング', LOC_YOKOHAMA_14F, 0],
  ['リファクタリング', LOC_SHINKAWA_777F, 1],
  ['リファクタリング', LOC_SHINKAWA_777F, 0],
  ['ドメイン駆動設計', LOC_TORANOMON_20F, 1],
  ['ドメイン駆動設計', LOC_TORANOMON_20F, 0],
  ['Clean Code', LOC_YOKOHAMA_14F, 0],
  ['Clean Code', LOC_TORANOMON_20F, 0],
  ['Clean Code', LOC_SHINKAWA_777F, 1],
  ['エンジニアリング組織論への招待', LOC_YOKOHAMA_14F, 0],
  ['エンジニアリング組織論への招待', LOC_SHINKAWA_777F, 0],
  ['チーム・ジャーニー', LOC_TORANOMON_20F, 0],
  ['アジャイルサムライ', LOC_YOKOHAMA_14F, 0],
  ['アジャイルサムライ', LOC_SHINKAWA_777F, 1],
  ['プログラミング言語Go', LOC_YOKOHAMA_14F, 0],
  ['プログラミング言語Go', LOC_TORANOMON_20F, 1],
  ['Webを支える技術', LOC_YOKOHAMA_14F, 0],
  ['Webを支える技術', LOC_SHINKAWA_777F, 0],
  ['イシューからはじめよ', LOC_YOKOHAMA_14F, 0],
  ['イシューからはじめよ', LOC_TORANOMON_20F, 1],
  ['イシューからはじめよ', LOC_TORANOMON_20F, 0],
  ['イシューからはじめよ', LOC_SHINKAWA_777F, 0],
  ['ユーザーインタフェースデザインの教科書', LOC_SHINKAWA_777F, 0],
  ['データ指向アプリケーションデザイン', LOC_TORANOMON_20F, 1],
  ['ソフトウェアアーキテクチャの基礎', LOC_YOKOHAMA_14F, 0],
  ['ソフトウェアアーキテクチャの基礎', LOC_SHINKAWA_777F, 1],
];

// 雑誌（横浜 13F 共用）。1タイトル1冊で、すべて持ち出し禁止。著者の欄には出版社を入れる
const magazines: [title: string, publisher: string][] = [
  ['Software Design 2026年11月号', '技術評論社'],
  ['Software Design 2026年10月号', '技術評論社'],
  ['日経コンピュータ 2026年11月13日号', '日経BP'],
  ['日経コンピュータ 2026年10月30日号', '日経BP'],
  ['日経ソフトウエア 2026年11月号', '日経BP'],
  ['日経ソフトウエア 2026年9月号', '日経BP'],
  ['日経NETWORK 2026年11月号', '日経BP'],
  ['日経NETWORK 2026年10月号', '日経BP'],
  ['Interface 2026年12月号', 'CQ出版社'],
  ['Interface 2026年11月号', 'CQ出版社'],
];

// 入れる本の全部。既存の本の ID を変えないよう、1冊目 → 2冊目以降 → 雑誌の順に並べる
const authorsByTitle = new Map(firstCopies.map(([title, authors]) => [title, authors]));
export const seedBooks: [title: string, authors: string, location: string, isRestricted: 0 | 1][] =
  [
    ...firstCopies,
    ...extraCopies.map(([title, location, isRestricted]): (typeof firstCopies)[number] => {
      const authors = authorsByTitle.get(title);
      if (authors === undefined)
        throw new Error(`extraCopies の「${title}」が firstCopies にありません`);
      return [title, authors, location, isRestricted];
    }),
    ...magazines.map(([title, publisher]): (typeof firstCopies)[number] => [
      title,
      publisher,
      LOC_YOKOHAMA_13F,
      1,
    ]),
  ];

// [リクエストした人の account_id, 題名, 著者（わからなければ null）, リクエスト日時]
const seedRequests: [
  accountId: string,
  title: string,
  authors: string | null,
  requestedAt: string,
][] = [
  ['emp0001', 'Clean Architecture', 'Robert C. Martin', '2026-11-10 10:12:00'],
  ['emp0001', 'UXデザインの法則', 'Jon Yablonski', '2026-11-04 15:30:00'],
  ['emp0002', 'Team Geek', 'Brian W. Fitzpatrick、Ben Collins-Sussman', '2026-10-21 09:05:00'],
  ['emp0003', 'Effective TypeScript', 'Dan Vanderkam', '2026-11-12 11:40:00'],
  ['emp0004', 'レガシーコード改善ガイド', 'Michael C. Feathers', '2026-11-11 17:20:00'],
  ['emp0005', 'デザインパターン', null, '2026-11-09 13:00:00'],
  ['emp0006', 'Googleのソフトウェアエンジニアリング', 'Titus Winters ほか', '2026-11-08 10:45:00'],
  ['emp0007', 'ゼロから作るDeep Learning', '斎藤康毅', '2026-11-07 16:10:00'],
  ['emp0008', 'エッセンシャル思考', 'グレッグ・マキューン', '2026-11-06 12:25:00'],
  ['emp0009', 'Design It!', 'Michael Keeling', '2026-11-05 09:50:00'],
  ['emp0010', 'ハッカーと画家', 'Paul Graham', '2026-11-03 14:35:00'],
  ['emp0011', 'カイゼン・ジャーニー', null, '2026-11-02 11:15:00'],
  ['emp0012', 'マイクロサービスアーキテクチャ', 'Sam Newman', '2026-11-01 18:00:00'],
  ['emp0013', '入門 監視', 'Mike Julian', '2026-10-31 10:30:00'],
  ['emp0014', 'Docker/Kubernetes 実践コンテナ開発入門', '山田明憲', '2026-10-30 15:55:00'],
  ['emp0015', 'SRE サイトリライアビリティエンジニアリング', null, '2026-10-29 13:20:00'],
  ['emp0016', 'プロダクトマネジメントのすべて', '及川卓也ほか', '2026-10-28 09:40:00'],
  ['emp0017', 'インサイドボックス', null, '2026-10-27 16:45:00'],
  ['emp0018', 'Refactoring UI', 'Adam Wathan、Steve Schoger', '2026-10-26 11:05:00'],
  ['emp0019', '体験デザインの教科書', null, '2026-10-25 14:15:00'],
];

const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
if (count === 0) {
  const insertUser = db.prepare('INSERT INTO users (account_id, name, email) VALUES (?, ?, ?)');
  const insertBook = db.prepare(
    'INSERT INTO books (title, authors, location, is_restricted) VALUES (?, ?, ?, ?)',
  );
  const insertRequest = db.prepare(
    `INSERT INTO book_requests (user_id, title, authors, requested_at)
     VALUES ((SELECT id FROM users WHERE account_id = ?), ?, ?, ?)`,
  );

  // 途中で失敗したときに中途半端なデータが残らないよう、まとめて1つのトランザクションで入れる
  db.transaction(() => {
    for (const u of seedUsers) insertUser.run(...u);
    for (const b of seedBooks) insertBook.run(...b);
    // status は既定値の 'open'（受付中）
    for (const r of seedRequests) insertRequest.run(...r);
  })();
}

// 古い置き場所の名前（「3階 書架A」など）が残っている DB を、新しい置き場所に書き換える。
// 題名ごとに「n 冊目」（ID の小さい順）を books の n 冊目と対応させ、置き場所と持ち出し禁止を合わせる。
// - 今貸出中の本は、持ち出し禁止にすると話が合わなくなるので、置き場所だけ書き換える
// - 書き換えた本は古い名前ではなくなるので、何度呼んでも結果は変わらない
// - books に対応する本がない本（自分で足した本など）は、そのままにする
export function migrateOldLocations(
  database: Database.Database,
  books: readonly (readonly [
    title: string,
    authors: string,
    location: string,
    isRestricted: 0 | 1,
  ])[],
): void {
  const copiesByTitle = database.prepare(
    'SELECT id, location FROM books WHERE title = ? ORDER BY id',
  );
  const isBorrowed = database.prepare(
    `SELECT 1 FROM loans WHERE book_id = ? AND status = 'borrowed'`,
  );
  const updateBook = database.prepare(
    'UPDATE books SET location = ?, is_restricted = ? WHERE id = ?',
  );
  const updateLocation = database.prepare('UPDATE books SET location = ? WHERE id = ?');
  const isOldLocation = (location: string) => /^.階 書架.$/.test(location);
  database.transaction(() => {
    const seen = new Map<string, number>();
    for (const [title, , location, isRestricted] of books) {
      const nth = (seen.get(title) ?? 0) + 1; // この題名の何冊目か
      seen.set(title, nth);
      const copy = (copiesByTitle.all(title) as { id: number; location: string }[])[nth - 1];
      if (copy === undefined || !isOldLocation(copy.location)) continue;
      if (isBorrowed.get(copy.id)) updateLocation.run(location, copy.id);
      else updateBook.run(location, isRestricted, copy.id);
    }
  })();
}
migrateOldLocations(db, seedBooks);

// 初回起動より後に seedBooks へ足した本（同じ題名の2冊目以降など）を、既存の DB にも入れる。
// 題名ごとに、DB の冊数が seedBooks の冊数より少なければ、足りない分だけ入れる（何度起動しても増え続けない）
{
  const countByTitle = db.prepare('SELECT COUNT(*) AS count FROM books WHERE title = ?');
  const insertBook = db.prepare(
    'INSERT INTO books (title, authors, location, is_restricted) VALUES (?, ?, ?, ?)',
  );
  db.transaction(() => {
    const seen = new Map<string, number>();
    for (const b of seedBooks) {
      const nth = (seen.get(b[0]) ?? 0) + 1; // この題名の何冊目か
      seen.set(b[0], nth);
      const { count } = countByTitle.get(b[0]) as { count: number };
      if (count < nth) insertBook.run(...b);
    }
  })();
}

// 貸出のサンプル（並び順が ID 順になる。/loans/1 が「貸出中」、/loans/2 が「返却済み」の例）
// 日時は datetime('now') と同じく UTC。日本時間で日付がずれないよう 15:00 UTC より前の時刻にしている
// [借りた人の account_id, 本の題名, 借りた日時, 返した日時（貸出中なら null）]
const seedLoans: [
  accountId: string,
  title: string,
  borrowedAt: string,
  returnedAt: string | null,
][] = [
  ['emp0001', 'リーダブルコード', '2026-11-02 01:00:00', null],
  ['emp0001', '達人プログラマー', '2026-10-05 02:30:00', '2026-11-13 06:00:00'],
  ['emp0002', 'オブジェクト指向UIデザイン', '2026-11-06 03:15:00', null],
  ['emp0003', 'テスト駆動開発', '2026-11-10 04:00:00', null],
  ['emp0004', 'Clean Code', '2026-10-20 05:20:00', '2026-11-01 07:40:00'],
  ['emp0005', 'SQLアンチパターン', '2026-11-12 00:45:00', null],
  ['emp0001', 'イシューからはじめよ', '2026-09-01 02:00:00', '2026-09-20 08:10:00'],
];

// 予約（順番待ち）のサンプル。すべて waiting（順番待ち中）
// [待っている人の account_id, 本の題名, 予約した日時]
const seedReservations: [accountId: string, title: string, reservedAt: string][] = [
  ['emp0001', 'オブジェクト指向UIデザイン', '2026-11-08 01:30:00'],
  ['emp0006', 'オブジェクト指向UIデザイン', '2026-11-09 02:00:00'],
  ['emp0007', 'リーダブルコード', '2026-11-05 03:00:00'],
];

const { loanCount } = db.prepare('SELECT COUNT(*) AS loanCount FROM loans').get() as {
  loanCount: number;
};
const { reservationCount } = db
  .prepare('SELECT COUNT(*) AS reservationCount FROM reservations')
  .get() as { reservationCount: number };
if (loanCount === 0 && reservationCount === 0) {
  const insertLoan = db.prepare(
    `INSERT INTO loans (book_id, user_id, status, borrowed_at, returned_at)
     VALUES (
       (SELECT id FROM books WHERE title = ? ORDER BY id LIMIT 1),
       (SELECT id FROM users WHERE account_id = ?),
       ?, ?, ?
     )`,
  );
  const insertReservation = db.prepare(
    `INSERT INTO reservations (book_id, user_id, reserved_at)
     VALUES ((SELECT id FROM books WHERE title = ? ORDER BY id LIMIT 1), (SELECT id FROM users WHERE account_id = ?), ?)`,
  );

  db.transaction(() => {
    for (const [accountId, title, borrowedAt, returnedAt] of seedLoans) {
      const status = returnedAt === null ? 'borrowed' : 'returned';
      insertLoan.run(title, accountId, status, borrowedAt, returnedAt);
    }
    // status は既定値の 'waiting'（順番待ち中）
    for (const [accountId, title, reservedAt] of seedReservations) {
      insertReservation.run(title, accountId, reservedAt);
    }
  })();
}
