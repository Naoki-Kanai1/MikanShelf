import { BorrowedIcon, CheckIcon } from './icons';
import './StatusChip.css';
import './LoanStatusChip.css';

type Props = {
  status: 'borrowed' | 'returned';
  // 置く画面ごとの配置（位置など）を足すためのクラス名
  className?: string;
};

// 貸出の状態の印（貸出中／返却済み）。貸出一覧・貸出詳細で共通に使う。
// 大きさなどの共通の見た目は StatusChip.css の .status-chip を使う
export default function LoanStatusChip({ status, className }: Props) {
  const extra = className ? ` ${className}` : '';
  return status === 'borrowed' ? (
    <span className={`status-chip loan-status-chip--borrowed${extra}`}>
      <BorrowedIcon />
      貸出中
    </span>
  ) : (
    <span className={`status-chip loan-status-chip--returned${extra}`}>
      <CheckIcon />
      返却済み
    </span>
  );
}
