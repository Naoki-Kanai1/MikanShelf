import { BorrowedIcon, CheckIcon } from './icons';
import './StatusChip.css';

type Props = {
  status: 'available' | 'borrowed';
  // 置く画面ごとの配置（位置など）を足すためのクラス名
  className?: string;
};

// 本の貸出状態の印（棚にある／貸出中）。本一覧・本詳細で共通に使う。
export default function StatusChip({ status, className }: Props) {
  const extra = className ? ` ${className}` : '';
  return status === 'available' ? (
    <span className={`status-chip status-chip--available${extra}`}>
      <CheckIcon />
      棚にある
    </span>
  ) : (
    <span className={`status-chip status-chip--borrowed${extra}`}>
      <BorrowedIcon />
      貸出中
    </span>
  );
}
