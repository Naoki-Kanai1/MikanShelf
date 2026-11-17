# MikanShelf

ブラウザで使う Web アプリです。画面（フロントエンド）とデータ処理（バックエンド）を、このリポジトリ 1 つでまとめて開発します。

---

## 全体像

アプリは次の 3 つの部品でできています。

```
ブラウザ
  │  http://localhost:5173 にアクセス
  ▼
フロントエンド（Vite + React）……… 画面を表示する
  │  /api/... へのリクエストだけを転送
  ▼
バックエンド（Express）………………… データの読み書きを受け付ける（ポート 3000）
  │
  ▼
データベース（SQLite）………………… backend/data/app.db という 1 つのファイル
```

| 部品           | 使っている技術                                          | ひとことで言うと                                                                                                       |
| -------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| フロントエンド | [React](https://react.dev/) + [Vite](https://vite.dev/) | 画面を作るライブラリ（React）と、それを動かす開発サーバー（Vite）。コードを保存するとブラウザに即座に反映されます      |
| バックエンド   | [Express](https://expressjs.com/)                       | Node.js で Web API を作るための定番ライブラリ。「この URL にアクセスされたらこの処理をする」という対応を書いていきます |
| データベース   | [SQLite](https://www.sqlite.org/)                       | データベースサーバーを別に用意しなくても、1 つのファイルにデータを保存できる軽量なデータベース                         |

どの部品も **TypeScript**（型が付いた JavaScript）で書きます。

### Express（バックエンド）とは

Express は「リクエストを受け取って、レスポンスを返す」サーバーを作るための仕組みです。たとえば `backend/src/index.ts` の次のコードは、「`GET /api/health` にアクセスされたら、`{"status":"ok"}` という JSON を返す」という意味です。

```ts
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});
```

今ある API は次の 3 つです。

| メソッド | URL                    | 内容                                                                     |
| -------- | ---------------------- | ------------------------------------------------------------------------ |
| GET      | `/api/health`          | サーバーが動いているかを確認する（`{"status":"ok"}` が返る）             |
| GET      | `/api/books/:id`       | 本の詳細（置き場所・貸出中かどうか・借りている人）を取得する             |
| POST     | `/api/books/:id/borrow` | 本を借りる（`{"borrowerName": "田中"}` のように、借りる人の名前を送る） |

> **補足：** フロントエンド（5173 番）からバックエンド（3000 番）へは、Vite が `/api` で始まるリクエストを自動で転送しています（`frontend/vite.config.ts` の `proxy` 設定）。そのため、フロントエンドのコードでは `fetch('/api/books/1')` のように書くだけで済みます。

---

## 開発環境（Dev Container）について

### Dev Container とは

**Dev Container** は、開発に必要なもの（Node.js、SQLite のコマンドなど）をまとめて入れた「開発専用の箱（コンテナ）」を作り、VS Code をその中につないで作業する仕組みです。

- 自分の PC に Node.js などを直接インストールする必要がありません
- チーム全員が同じバージョン・同じ設定で開発できるので、「自分の PC だけ動かない」が起きにくくなります
- VS Code の拡張機能や設定も自動でそろいます

この箱の中身は `.devcontainer/` フォルダで定義されています。

| ファイル                          | 内容                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `.devcontainer/Dockerfile`        | 箱の中身。Node.js 22 と `sqlite3` コマンドが入っています                           |
| `.devcontainer/devcontainer.json` | VS Code の拡張機能・設定、ポート転送、初回セットアップの手順（`npm install` など） |

### 事前に必要なもの

自分の PC に、次のものを入れておいてください。

1. **Docker（Docker Engine と docker CLI）**  
   Docker Desktop は使わず、Linux に Docker Engine を直接インストールします。Windows の場合は、WSL 2 の Linux（Ubuntu など）の中にインストールします。  
   https://docs.docker.com/engine/install/
2. **Visual Studio Code**  
   https://code.visualstudio.com/
3. VS Code の拡張機能 **Dev Containers**（`ms-vscode-remote.remote-containers`）
4. （Windows の場合）VS Code の拡張機能 **WSL**（`ms-vscode-remote.remote-wsl`）

#### Docker のインストール例（Ubuntu / WSL 2 の Ubuntu）

[公式手順](https://docs.docker.com/engine/install/ubuntu/)でリポジトリを登録してから、次のように実行します。

```bash
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin
# sudo なしで docker コマンドを使えるようにする（実行後、ターミナルを開き直す）
sudo usermod -aG docker $USER
```

インストールできたかは、次のコマンドで確認できます。

```bash
docker run --rm hello-world
```

`Hello from Docker!` と表示されれば OK です。

### 初めて開くとき

1. Docker が起動していることを確認します（`docker info` がエラーにならなければ OK）。  
   起動していない場合は `sudo service docker start` を実行します。
2. このリポジトリを clone し、VS Code でフォルダを開きます。  
   Windows の場合は、WSL の Ubuntu の中（`~/` 以下など）に clone します。そのフォルダで `code .` を実行するか、VS Code の `F1` →「WSL: Connect to WSL」で接続してから開いてください。Docker が WSL の中にあるので、VS Code も WSL 経由で開く必要があります。
3. 右下に「コンテナーで再度開く (Reopen in Container)」と表示されたらクリックします。  
   表示されない場合は、`F1` キーを押して **「Dev Containers: Reopen in Container」** を実行します。
4. 初回は箱の作成と `npm install` が自動で走るため、数分かかります。終わると VS Code の左下に `Dev Container: MikanShelf` と表示されます。

これで準備は完了です。以降のコマンドはすべて **VS Code のターミナル（コンテナの中）** で実行します。

---

## アプリを起動する

```bash
npm run dev
```

フロントエンドとバックエンドが同時に起動します。ターミナルには `[backend]`（青）と `[frontend]`（緑）のログが並んで表示されます。

- 画面：http://localhost:5173 （自動でブラウザが開くこともあります）
- API：http://localhost:3000/api/health

コードを保存すると自動で再読み込みされるので、起動し直す必要はありません。止めるときはターミナルで `Ctrl + C` を押します。

> コンテナの中で動いているサーバーに自分の PC のブラウザからアクセスできるのは、VS Code が 5173 番と 3000 番のポートを自動で転送しているためです。

---

## よく使うコマンド

リポジトリのルート（一番上のフォルダ）で実行します。

| コマンド               | 内容                                  |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | 開発用にアプリを起動する              |
| `npm run build`        | 本番用にビルドする                    |
| `npm run lint`         | ESLint でコードの問題をチェックする   |
| `npm run lint:fix`     | ESLint で直せる問題を自動修正する     |
| `npm run format`       | Prettier で全ファイルの見た目を整える |
| `npm run format:check` | 見た目が整っているか確認だけする      |
| `npm run typecheck`    | TypeScript の型エラーをチェックする   |

### 自動フォーマット

VS Code でファイルを保存すると、**Prettier** が自動でインデントや改行を整えます（設定は `.prettierrc.json`）。必要な拡張機能は Dev Container に最初から入っています。

---

## フォルダ構成

```
MikanShelf/
├── .devcontainer/      開発環境（Dev Container）の定義
├── .vscode/            VS Code の設定・推奨拡張機能
├── backend/            バックエンド（Express）
│   ├── src/
│   │   ├── index.ts    API の定義（サーバーの入口）
│   │   └── db.ts       データベースへの接続とテーブル作成
│   └── data/           SQLite のデータファイル置き場（Git では管理しない）
├── frontend/           フロントエンド（React + Vite）
│   ├── src/
│   │   ├── main.tsx    画面の入口
│   │   └── App.tsx     メインの画面
│   ├── index.html
│   └── vite.config.ts  Vite の設定（/api の転送など）
├── package.json        ルートの設定・共通コマンド
└── eslint.config.js    ESLint の設定
```

ルートの `package.json` で npm の **workspaces** という機能を使い、`frontend` と `backend` を 1 つのリポジトリでまとめて管理しています。どちらかのパッケージだけにライブラリを追加したいときは、`-w` で対象を指定します。

```bash
npm install <パッケージ名> -w backend    # バックエンドに追加
npm install <パッケージ名> -w frontend   # フロントエンドに追加
```

---

## データベースの中身を見る

データは `backend/data/app.db` に保存されます。テーブルはバックエンドの起動時に自動で作られます（`backend/src/db.ts`）。

```bash
sqlite3 backend/data/app.db
```

```sql
.tables                 -- テーブルの一覧
SELECT * FROM books;    -- books テーブルの中身
.quit                   -- 終了
```

データをまっさらに戻したいときは、バックエンドを止めてから `backend/data/` の中の `app.db*` ファイルを削除します。次に起動したとき、空のデータベースが作り直されます。

---

## 困ったときは

| 症状                                                 | 対処                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| コードを保存しても画面に反映されない                 | Windows 側のフォルダを開いているとファイルの変更が検知されないことがあります。`VITE_USE_POLLING=true npm run dev` で起動してください |
| `Port 5173 is already in use` と表示される           | すでに別の `npm run dev` が動いています。動いている方のターミナルで `Ctrl + C` を押して止めてください                                |
| 拡張機能や設定がおかしい、`.devcontainer` を変更した | `F1` →「Dev Containers: Rebuild Container」で箱を作り直してください                                                                  |
| `npm install` でエラーになる                         | コンテナの中のターミナルで実行しているか確認してください（VS Code の左下に `Dev Container` と表示されていれば OK）                   |

### 環境変数（必要に応じて）

| 変数               | 既定値                | 内容                                                                                                  |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------------------------- |
| `PORT`             | `3000`                | バックエンドのポート番号（変える場合は `frontend/vite.config.ts` の転送先も合わせて変更してください） |
| `DB_PATH`          | `backend/data/app.db` | データベースファイルの場所                                                                            |
| `VITE_USE_POLLING` | 未設定                | `true` にすると、ファイルの変更を一定間隔で確認する方式に切り替わる                                   |
