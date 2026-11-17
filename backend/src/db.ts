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
// 初期データ（users が空のとき＝初回起動時だけ入れる）
// 貸出（loans）と予約（reservations）は空のまま。
// つまり全ての本が「棚にある」状態で、順番待ちも誰もいない状態から始まる。
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

const seedBooks: [title: string, authors: string, location: string, isRestricted: 0 | 1][] = [
  ['リーダブルコード', 'Dustin Boswell、Trevor Foucher', '3階 書架A', 0],
  ['オブジェクト指向UIデザイン', 'ソシオメディア株式会社', '3階 書架A', 0],
  ['達人プログラマー', 'David Thomas、Andrew Hunt', '3階 書架B', 0],
  ['誰のためのデザイン？', 'D. A. ノーマン', '3階 書架B', 0],
  ['ノンデザイナーズ・デザインブック', 'Robin Williams', '3階 書架B', 0],
  ['人月の神話', 'Frederick P. Brooks, Jr.', '3階 書架C', 1],
  ['リファクタリング', 'Martin Fowler', '3階 書架A', 0],
  ['テスト駆動開発', 'Kent Beck', '3階 書架A', 0],
  ['ドメイン駆動設計', 'Eric Evans', '3階 書架C', 1],
  ['Clean Code', 'Robert C. Martin', '3階 書架A', 0],
  ['エンジニアリング組織論への招待', '広木大地', '4階 書架A', 0],
  ['チーム・ジャーニー', '市谷聡啓', '4階 書架A', 0],
  ['アジャイルサムライ', 'Jonathan Rasmusson', '4階 書架A', 0],
  ['SQLアンチパターン', 'Bill Karwin', '3階 書架D', 0],
  ['プログラミング言語Go', 'Alan A. A. Donovan、Brian W. Kernighan', '3階 書架D', 0],
  ['Webを支える技術', '山本陽平', '3階 書架D', 0],
  ['イシューからはじめよ', '安宅和人', '4階 書架B', 0],
  ['ユーザーインタフェースデザインの教科書', '原田秀司', '3階 書架B', 0],
  ['データ指向アプリケーションデザイン', 'Martin Kleppmann', '3階 書架C', 1],
  ['ソフトウェアアーキテクチャの基礎', 'Mark Richards、Neal Ford', '3階 書架C', 0],
];

// [リクエストした人の account_id, 題名, 著者（わからなければ null）, リクエスト日時]
const seedRequests: [accountId: string, title: string, authors: string | null, requestedAt: string][] = [
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
