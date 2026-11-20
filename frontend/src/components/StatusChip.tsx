import { BorrowedIcon, CheckIcon, RestrictedIcon } from './icons';
import './StatusChip.css';

type Props = {
  status: 'available' | 'borrowed';
  // 持ち出し禁止の本なら true。棚にあるときは「棚にある」の代わりに「持ち出し禁止」を出す
  restricted?: boolean;
  // 置く画面ごとの配置（位置など）を足すためのクラス名
  className?: string;
};

// 本の貸出状態の印（棚にある／誰かが借用中／持ち出し禁止）。
// 「貸出中」だと借りられるのかと誤解されやすいので、ほかの人が借りていると分かる「誰かが借用中」と出す。本一覧・本詳細で共通に使う。
// 持ち出し禁止の本は借りられないので、いつも棚にある。そのため「棚にある」の代わりに「持ち出し禁止」を出す。
// 万一、持ち出し禁止の本が貸出中のデータになっていたときは、実際の状態の「誰かが借用中」を出す。
export default function StatusChip({ status, restricted = false, className }: Props) {
  const extra = className ? ` ${className}` : '';
  if (status === 'borrowed') {
    return (
      <span className={`status-chip status-chip--borrowed${extra}`}>
        <BorrowedIcon />
        誰かが借用中
      </span>
    );
  }
  return restricted ? (
    <span className={`status-chip status-chip--restricted${extra}`}>
      <RestrictedIcon />
      持ち出し禁止
    </span>
  ) : (
    <span className={`status-chip status-chip--available${extra}`}>
      <CheckIcon />
      棚にある
    </span>
  );
}
