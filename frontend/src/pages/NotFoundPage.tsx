import { Link } from 'react-router';

// 存在しないURLにアクセスしたときの画面
export default function NotFoundPage() {
  return (
    <main>
      <h1>ページが見つかりません</h1>
      <p>
        <Link to="/">ホームへ戻る</Link>
      </p>
    </main>
  );
}
