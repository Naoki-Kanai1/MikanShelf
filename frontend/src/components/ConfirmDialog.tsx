import { useId, type ReactNode, type Ref } from 'react';
import './ConfirmDialog.css';

type Props = {
  // 開くときは ref.current.showModal()、閉じるときは ref.current.close() を呼ぶ
  ref: Ref<HTMLDialogElement>;
  // 問いかけ（例:「この本を返しますか？」）
  title: string;
  // 確かめてほしいことや注意書き
  children: ReactNode;
  // 実行するボタンの文字（例:「返す」）
  confirmLabel: string;
  onConfirm: () => void;
  // やめるボタンを押したとき。ダイアログを閉じる処理を渡す
  onCancel: () => void;
};

// 大事な操作（借りる・返す）の前に、本当に実行してよいかを確かめるダイアログ
export default function ConfirmDialog({
  ref,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const id = useId();
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
    >
      <h2 id={`${id}-title`} className="confirm-dialog__title">
        {title}
      </h2>
      <div id={`${id}-message`} className="confirm-dialog__message">
        {children}
      </div>
      <div className="confirm-dialog__actions">
        <button type="button" className="confirm-dialog__button" onClick={onCancel}>
          やめる
        </button>
        <button type="button" className="confirm-dialog__button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
