import { Route, Routes } from 'react-router';
import BookDetailPage from './pages/BookDetailPage';
import BookListPage from './pages/BookListPage';
import HomePage from './pages/HomePage';
import LoanDetailPage from './pages/LoanDetailPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/books" element={<BookListPage />} />
      <Route path="/books/:bookId" element={<BookDetailPage />} />
      <Route path="/loans/:loanId" element={<LoanDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
