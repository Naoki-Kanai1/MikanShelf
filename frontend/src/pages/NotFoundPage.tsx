import { Link } from 'react-router';
import '../styles/SimplePage.css';

// 存在しないURLにアクセスしたときの画面
export default function NotFoundPage() {
  return (
    <div className="simple-page">
      <h1>ページが見つかりません</h1>
      <p>
        <Link to="/">ホームへ戻る</Link>
      </p>
    </div>
  );
}
