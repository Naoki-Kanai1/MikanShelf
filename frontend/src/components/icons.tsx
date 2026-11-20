import type { ReactNode } from 'react';

// 画面で使うアイコン。どれも飾りなので、読み上げの対象から外している（aria-hidden）。
// 大きさは CSS の width / height で、色は文字色（currentColor）で決まる。
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// メニュー「本一覧」と、本詳細・貸出詳細の「棚にある冊数」（本棚に並んだ本）
export function BookIcon() {
  return (
    <Icon>
      <path d="M3 21h18M5 21V5h3v16M10 21V3h3v18M15.5 7.5l2.9-.8 2.6 14.3" />
    </Icon>
  );
}

// メニュー「借りている本」（手のひらにのった本）
// 元の絵に合わせて線を他より細く（1.5）し、袖口だけ緑で塗っている
export function LoanIcon() {
  return (
    <Icon>
      <g strokeWidth="1.5">
        {/* 本と、その上の帯 */}
        <path d="M6.3 15V3.5A1.5 1.5 0 0 1 7.8 2h9.5a.8.8 0 0 1 .8.8v11.4" />
        <path d="M6.3 6.5A1.5 1.5 0 0 1 7.8 5h10.3" />
        {/* 袖口 */}
        <rect x="2.4" y="16.6" width="3.7" height="5.5" rx="1.2" fill="#05a88f" />
        {/* 親指 */}
        <path d="M5.8 16.1L7 14.85h7.4a1.3 1.3 0 0 1 0 2.6h-3.5" />
        <path d="M18.3 14.6l-3 2.7" />
        {/* 指先と、手のひらの下側 */}
        <path d="M18.1 14.2h2.3a1.5 1.5 0 0 1 1.1 2.5l-4 3.6a2.5 2.5 0 0 1-1.7.7H6.1" />
      </g>
    </Icon>
  );
}

// メニュー「蔵書リクエスト」
export function RequestIcon() {
  return (
    <Icon>
      <path d="M4 4h16v13H9l-5 4z" />
      <path d="M12 7.5v6M9 10.5h6" />
    </Icon>
  );
}

// 状態「借りられる」「返却済み」と、貸出詳細の「返した日」
export function CheckIcon() {
  return (
    <Icon>
      <path d="M4.5 12.5 9.5 17.5 19.5 7" />
    </Icon>
  );
}

// 状態「誰かが借用中」。いまは棚に無い（借りられない）ことを、バツの印で表す
export function BorrowedIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

// 「持ち出し禁止」
export function RestrictedIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </Icon>
  );
}

// 戻るボタン「←」
export function ArrowBackIcon() {
  return (
    <Icon>
      <path d="M20 12H4M10 6l-6 6 6 6" />
    </Icon>
  );
}

// 検索の入力欄の虫めがね
export function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Icon>
  );
}

// まとめた本を開く・閉じるボタンの「∨」。開いているときは CSS で上下を返す
export function ExpandIcon() {
  return (
    <Icon>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

// 検索の入力欄の右端にある、絞り込みの条件を開くボタンの印（漏斗）
export function FilterIcon() {
  return (
    <Icon>
      <path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />
    </Icon>
  );
}

// 本詳細・貸出詳細の「置き場所」「借りた場所」
export function LocationIcon() {
  return (
    <Icon>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Icon>
  );
}

// 本詳細・貸出詳細の「状態」（開いた本）
export function OpenBookIcon() {
  return (
    <Icon>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </Icon>
  );
}

// 本詳細の「いま借りている人」
export function PersonIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Icon>
  );
}

// 貸出詳細の「借りた日」
export function CalendarIcon() {
  return (
    <Icon>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </Icon>
  );
}

// 貸出詳細の「本の詳細を見る」の「›」
export function ChevronRightIcon() {
  return (
    <Icon>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

// 完了ダイアログの、丸で囲んだチェックマーク
export function CheckCircleIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d="M7.5 12.5l3 3 6-6.5" />
    </Icon>
  );
}
