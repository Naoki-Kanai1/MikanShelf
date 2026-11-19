import { Outlet } from 'react-router';
import NavigationBar from './NavigationBar';
import NavigationRail from './NavigationRail';
import './AppShell.css';

// 全画面の共通の枠（App.tsx でレイアウトルートとして使う）。
// 画面の中身（Outlet）とメニューを置く。メニューはスマホ版（下）とタブレット・PC 版（左）の両方を置き、
// どちらを出すかは画面の幅に合わせて AppShell.css で切り替える
export default function AppShell() {
  return (
    <div className="app-shell">
      <NavigationBar />
      <NavigationRail />
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
