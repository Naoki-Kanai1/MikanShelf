import { useId, type ReactNode } from 'react';
import { BOOK_FILTER_STATUSES, type BookFilterStatus } from '../utils/filterByConditions';
import './BookFilterFields.css';

type Props = {
  // 選べる置き場所（本の一覧から作る）
  locations: readonly string[];
  // 選んでいる置き場所・状態（null は「すべて」）
  selectedLocations: readonly string[];
  selectedStatus: BookFilterStatus | null;
  onToggleLocation: (location: string) => void;
  onSetStatus: (status: BookFilterStatus | null) => void;
  // 並べ方。stacked: 1つの選択肢を1行に（モーダル）、inline: 項目ごとに横1行に（広い画面の検索ボックスの下）
  layout: 'stacked' | 'inline';
  // ステータスの行の最後に置くもの（広い画面の「すべて解除」など）
  statusTrailing?: ReactNode;
};

// 「すべて」を含む、ステータスの選択肢
const STATUS_OPTIONS: readonly { value: BookFilterStatus | null; label: string }[] = [
  { value: null, label: 'すべて' },
  ...BOOK_FILTER_STATUSES,
];

// 本一覧の絞り込みの選択肢。場所はチェックボックス（いくつでも）、ステータスはラジオボタン（1つだけ）。
// 押した時点で一覧に反映する
export default function BookFilterFields({
  locations,
  selectedLocations,
  selectedStatus,
  onToggleLocation,
  onSetStatus,
  layout,
  statusTrailing,
}: Props) {
  // ラジオボタンの name。モーダルと広い画面の欄で、別々のまとまりにする
  const radioName = useId();
  // 選んでいるのに一覧に無い置き場所（本が無くなったなど）も、外せるように並べる
  const locationOptions = [
    ...locations,
    ...selectedLocations.filter((loc) => !locations.includes(loc)),
  ];

  return (
    <div className={`book-filter-fields book-filter-fields--${layout}`}>
      <fieldset className="book-filter-fields__group">
        <legend className="book-filter-fields__legend">場所</legend>
        <div className="book-filter-fields__options">
          {locationOptions.length === 0 ? (
            <p className="book-filter-fields__message">登録されている場所はありません。</p>
          ) : (
            locationOptions.map((location) => (
              <label key={location} className="book-filter-fields__option">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(location)}
                  onChange={() => onToggleLocation(location)}
                />
                <span>{location}</span>
              </label>
            ))
          )}
        </div>
      </fieldset>
      <fieldset className="book-filter-fields__group">
        <legend className="book-filter-fields__legend">ステータス</legend>
        <div className="book-filter-fields__options">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <label key={label} className="book-filter-fields__option">
              <input
                type="radio"
                name={radioName}
                checked={selectedStatus === value}
                onChange={() => onSetStatus(value)}
              />
              <span>{label}</span>
            </label>
          ))}
          {statusTrailing}
        </div>
      </fieldset>
    </div>
  );
}
