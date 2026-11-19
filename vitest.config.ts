import { defineConfig } from 'vitest/config';

// 日付のテストが、実行する人のパソコンのタイムゾーンで結果が変わらないように、日本時間に固定する
process.env.TZ = 'Asia/Tokyo';

// 単体テストの設定。フロントエンドとバックエンドのテストを、ルートの `npm test` でまとめて実行する。
// テストの書き方・テストケースと実行結果の置き場所は tests/README.md を参照
export default defineConfig({
  test: {
    include: ['frontend/src/**/*.test.{ts,tsx}', 'backend/src/**/*.test.ts'],
    // 画面の部品（React）をテストするときは、そのテストファイルの先頭に
    // `// @vitest-environment jsdom` と書く（jsdom のインストールが必要）
    environment: 'node',
    env: {
      // テスト中に backend/src/db.ts を読み込んでしまっても、本物の DB（backend/data/app.db）を
      // 開かず、メモリ上の使い捨ての DB を使うようにする
      DB_PATH: ':memory:',
    },
  },
});
