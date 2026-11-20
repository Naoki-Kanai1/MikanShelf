import { NavLink } from 'react-router';
import { navItems } from './navItems';
import './NavigationRail.css';

// タブレット・PC 版のメニュー（幅 600px から）。画面の左に縦に並べて固定する（スマホ版では AppShell.css で隠す）
export default function NavigationRail() {
  return (
    <nav className="navigation-rail" aria-label="メニュー">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} className="navigation-rail__item">
          <span className="navigation-rail__indicator">{item.icon}</span>
          <span className="navigation-rail__label">{item.railLabel ?? item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
