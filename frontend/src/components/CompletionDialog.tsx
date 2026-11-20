import { useId, type Ref } from 'react';
import { CheckCircleIcon } from './icons';
import './CompletionDialog.css';

type Props = {
  // 開くときは ref.current.showModal() を呼ぶ
  ref: Ref<HTMLDialogElement>;
  // 知らせる内容（例:「本を借りました！」）
  message: string;
  // OK を押したとき（Esc キーで閉じたときも含む）。次の画面への移動などを渡す
  onClose: () => void;
};

// 借りる・返すが終わったことを知らせるダイアログ
export default function CompletionDialog({ ref, message, onClose }: Props) {
  const id = useId();
  return (
    <dialog
      ref={ref}
      className="completion-dialog"
      aria-labelledby={`${id}-message`}
      // OK ボタンでも Esc キーでも、閉じたら同じ処理を行う
      onClose={onClose}
    >
      <p id={`${id}-message`} className="completion-dialog__message">
        {message}
      </p>
      <div className="completion-dialog__icon">
        <CheckCircleIcon />
      </div>
      <form method="dialog" className="completion-dialog__actions">
        <button type="submit" className="completion-dialog__button" autoFocus>
          OK
        </button>
      </form>
    </dialog>
  );
}
