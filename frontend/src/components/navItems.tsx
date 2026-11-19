import type { ReactNode } from 'react';
import { BookIcon, LoanIcon, RequestIcon } from './icons';

export type NavItem = {
  // この URL で始まる画面を開いているあいだ、その項目が選択中の見た目になる
  to: string;
  label: string;
  // 幅の狭い左の縦メニューで使う、改行の位置を決めた名前。無ければ label を使う
  railLabel?: ReactNode;
  icon: ReactNode;
};

// メニューの項目。スマホ版の下のメニュー（NavigationBar）とタブレット・PC 版の左の縦メニュー（NavigationRail）で同じものを使う
// TODO: 蔵書リクエスト（/requests）の画面はまだ無いので、いまは「ページが見つかりません」が開く
export const navItems: NavItem[] = [
  { to: '/books', label: '本一覧', icon: <BookIcon /> },
  { to: '/loans', label: '借りている本', icon: <LoanIcon /> },
  {
    to: '/requests',
    label: '蔵書リクエスト',
    railLabel: (
      <>
        蔵書
        <br />
        リクエスト
      </>
    ),
    icon: <RequestIcon />,
  },
];
