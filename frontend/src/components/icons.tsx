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

// メニュー「本」
export function BookIcon() {
  return (
    <Icon>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M5 15h14" />
    </Icon>
  );
}

// メニュー「貸出」
export function LoanIcon() {
  return (
    <Icon>
      <path d="M4 8h15M15 4l4 4-4 4" />
      <path d="M20 16H5M9 12l-4 4 4 4" />
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

// 状態「棚にある」
export function CheckIcon() {
  return (
    <Icon>
      <path d="M4.5 12.5 9.5 17.5 19.5 7" />
    </Icon>
  );
}

// 状態「貸出中」
export function BorrowedIcon() {
  return (
    <Icon>
      <path d="M10 4H5v16h5" />
      <path d="M10 12h10M16 8l4 4-4 4" />
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
