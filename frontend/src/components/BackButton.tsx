import { useNavigate } from 'react-router';
import { ArrowBackIcon } from './icons';
import './BackButton.css';

type Props = {
  // 戻る先のURL。指定するとその画面へ移動する。
  // 指定しないときは、ひとつ前に見ていた画面（ブラウザの「戻る」と同じ）へ戻る
  to?: string;
  // to を指定せず、戻る先の履歴もない（URLを直接開いた）ときに移動する先
  fallbackTo?: string;
};

// 各画面の左上に置く戻るボタン「←」
export default function BackButton({ to, fallbackTo = '/' }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to !== undefined) {
      navigate(to);
      return;
    }
    // react-router は履歴の位置を history.state.idx に入れている。0 ならこのアプリ内に戻る先がない
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallbackTo);
  };

  return (
    <button type="button" className="back-button" aria-label="戻る" onClick={handleClick}>
      <ArrowBackIcon />
    </button>
  );
}
