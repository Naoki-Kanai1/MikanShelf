import { useId, type Ref } from 'react';
import type { BookFilterStatus } from '../utils/filterByConditions';
import BookFilterFields from './BookFilterFields';
import './BookFilterDialog.css';

type Props = {
  // 開くときは ref.current.showModal() を呼び、open を true にする
  ref: Ref<HTMLDialogElement>;
  // 開いているか。閉じているあいだは中身を描かない（画面に無い文字が一覧の文字と紛れないように）
  open: boolean;
  // 閉じたとき（「閉じる」・Esc キー・背景を押したときも含む）
  onClose: () => void;
  // 選べる置き場所（本の一覧から作る）
  locations: readonly string[];
  // 選んでいる置き場所・状態（null は「すべて」）
  selectedLocations: readonly string[];
  selectedStatus: BookFilterStatus | null;
  onToggleLocation: (location: string) => void;
  onSetStatus: (status: BookFilterStatus | null) => void;
  // 「すべて解除」を押したとき
  onClear: () => void;
};

// 本一覧の絞り込みの条件（置き場所・状態）を選ぶモーダル。狭い画面（〜599px）で使う。
// 選んだ時点で一覧に反映する（「閉じる」で確定する必要はない）
export default function BookFilterDialog({
  ref,
  open,
  onClose,
  locations,
  selectedLocations,
  selectedStatus,
  onToggleLocation,
  onSetStatus,
  onClear,
}: Props) {
  const id = useId();
  return (
    <dialog
      ref={ref}
      className="book-filter-dialog"
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      // 背景（ダイアログの外）を押したときも閉じる。中身は余白ごと .book-filter-dialog__panel で
      // 包んでいるので、<dialog> そのものが押されたときは、背景が押されたときだけになる
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {open && (
        <div className="book-filter-dialog__panel">
          <h2 id={`${id}-title`} className="book-filter-dialog__title">
            絞り込み
          </h2>
          <div className="book-filter-dialog__body">
            <BookFilterFields
              layout="stacked"
              locations={locations}
              selectedLocations={selectedLocations}
              selectedStatus={selectedStatus}
              onToggleLocation={onToggleLocation}
              onSetStatus={onSetStatus}
            />
          </div>
          <form method="dialog" className="book-filter-dialog__actions">
            <button
              type="button"
              className="book-filter-dialog__button"
              onClick={onClear}
              disabled={selectedLocations.length === 0 && selectedStatus === null}
            >
              すべて解除
            </button>
            <button type="submit" className="book-filter-dialog__button">
              閉じる
            </button>
          </form>
        </div>
      )}
    </dialog>
  );
}
