import { Link } from 'react-router';

// 開発用の仮ホーム画面。分担開発中の各画面へ移動するためのリンク集。
export default function HomePage() {
  return (
    <main>
      <h1>MikanShelf</h1>
      <p>開発中の画面へのリンク</p>
      <ul>
        <li>
          <Link to="/books">本一覧画面</Link>
        </li>
        <li>
          <Link to="/books/1">本詳細画面（ID: 1）</Link>
        </li>
        <li>
          <Link to="/loans/1">貸出詳細画面（ID: 1）</Link>
        </li>
      </ul>
    </main>
  );
}
