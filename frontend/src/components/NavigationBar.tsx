import { NavLink } from 'react-router';
import { navItems } from './navItems';
import './NavigationBar.css';

// スマホ版のメニュー。画面の下に固定する（幅 600px からは AppShell.css で隠す）
export default function NavigationBar() {
  return (
    <nav className="navigation-bar" aria-label="メニュー">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} className="navigation-bar__item">
          <span className="navigation-bar__indicator">{item.icon}</span>
          <span className="navigation-bar__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
