import { Link, useParams } from 'react-router';

// 本詳細画面（仮実装）
export default function BookDetailPage() {
  const { bookId } = useParams();

  return (
    <main>
      <h1>本詳細画面</h1>
      <p>本ID: {bookId}</p>
      <p>
        <Link to="/">ホームへ戻る</Link>
      </p>
    </main>
  );
}
