import { Link } from 'react-router';
import PageHeader from '../components/PageHeader';
import '../styles/SimplePage.css';

// 存在しないURLにアクセスしたときの画面
export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="ページが見つかりません" />
      <div className="simple-page">
        <p>
          <Link to="/">ホームへ戻る</Link>
        </p>
      </div>
    </>
  );
}
