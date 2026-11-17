import BackButton from './BackButton';
import './PageHeader.css';

type Props = {
  // 画面の名前
  title: string;
  // 指定すると、画面の名前の左に戻るボタン「←」を置き、押すとこのURLへ移動する
  backTo?: string;
};

// 各画面の上に置く、画面の名前の帯。全画面で同じ見た目にする
export default function PageHeader({ title, backTo }: Props) {
  return (
    <header className="page-header">
      {backTo !== undefined && <BackButton to={backTo} />}
      <h1 className="page-header__title">{title}</h1>
    </header>
  );
}
