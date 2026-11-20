import { Route, Routes } from 'react-router';
import AppShell from './components/AppShell';
import BookDetailPage from './pages/BookDetailPage';
import BookListPage from './pages/BookListPage';
import HomePage from './pages/HomePage';
import LoanDetailPage from './pages/LoanDetailPage';
import LoanListPage from './pages/LoanListPage';
import NotFoundPage from './pages/NotFoundPage';
import { BookListStateProvider } from './state/BookListStateProvider';

export default function App() {
  return (
    // 本一覧画面の状態（絞り込みの文字など）は、画面を移動しても残すため、ルートより上で持つ
    <BookListStateProvider>
      <Routes>
        {/* どの画面にも共通の枠（下のメニュー）を付ける */}
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/books" element={<BookListPage />} />
          <Route path="/books/:bookId" element={<BookDetailPage />} />
          <Route path="/loans" element={<LoanListPage />} />
          <Route path="/loans/:loanId" element={<LoanDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BookListStateProvider>
  );
}
