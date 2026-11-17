import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { BookIcon, LoanIcon, RequestIcon } from './icons';
import './AppShell.css';

// メニューの項目。to で始まるURLを開いているあいだ、その項目が選択中の見た目になる
// TODO: 貸出一覧（/loans）と蔵書リクエスト（/requests）の画面はまだ無いので、
//       いまは「ページが見つかりません」が開く。画面ができたらURLを合わせる
const navItems = [
  { to: '/books', label: '本', icon: <BookIcon /> },
  { to: '/loans', label: '貸出', icon: <LoanIcon /> },
  { to: '/requests', label: '蔵書リクエスト', icon: <RequestIcon /> },
];

// 各画面の共通の枠。画面の中身（children）と、画面の下に固定したメニューを置く
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <nav className="app-nav" aria-label="メニュー">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="app-nav__item">
            <span className="app-nav__indicator">{item.icon}</span>
            <span className="app-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
