import { Link } from 'react-router';

// 本一覧画面（仮実装）
export default function BookListPage() {
  return (
    <main>
      <h1>本一覧画面</h1>
      <p>
        <Link to="/">ホームへ戻る</Link>
      </p>
    </main>
  );
}
