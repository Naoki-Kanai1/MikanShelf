import { Link, useParams } from 'react-router';

// 貸出詳細画面（仮実装）
export default function LoanDetailPage() {
  const { loanId } = useParams();

  return (
    <main>
      <h1>貸出詳細画面</h1>
      <p>貸出ID: {loanId}</p>
      <p>
        <Link to="/">ホームへ戻る</Link>
      </p>
    </main>
  );
}
