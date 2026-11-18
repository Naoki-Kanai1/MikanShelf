// SQLite の datetime('now') は UTC の「YYYY-MM-DD HH:MM:SS」なので、ローカル時刻の「2026年11月2日」に変換する
export function formatDate(value: string): string {
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
