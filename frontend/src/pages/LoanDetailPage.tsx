import { useParams } from 'react-router';
import LoanDetail from '../LoanDetail';
import NotFoundPage from './NotFoundPage';

// 貸出詳細画面
export default function LoanDetailPage() {
  const loanId = Number(useParams().loanId);
  if (!Number.isInteger(loanId)) return <NotFoundPage />;
  return <LoanDetail loanId={loanId} />;
}
