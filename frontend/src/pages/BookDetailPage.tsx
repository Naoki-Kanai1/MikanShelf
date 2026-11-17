import { useParams } from 'react-router';
import BookDetail from '../BookDetail';
import NotFoundPage from './NotFoundPage';

// 本詳細画面
export default function BookDetailPage() {
  const bookId = Number(useParams().bookId);
  if (!Number.isInteger(bookId)) return <NotFoundPage />;
  return <BookDetail bookId={bookId} />;
}
