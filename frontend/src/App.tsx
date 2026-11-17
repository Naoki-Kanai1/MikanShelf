import BookDetail from './BookDetail';

// TODO: ルーティングを入れたら本一覧から遷移するようにする。いまは ?id=1 のように本のIDを指定する
const bookId = Number(new URLSearchParams(window.location.search).get('id') ?? 1);

export default function App() {
  return <BookDetail bookId={bookId} />;
}
