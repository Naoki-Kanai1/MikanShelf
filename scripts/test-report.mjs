// 単体テストを実行し、結果を tests/<機能名>/results/ に Markdown で保存する。
//
// 使い方:
//   npm run test:report -- <機能名> <テストファイル> [<テストファイル> ...]
//   例: npm run test:report -- formatDate frontend/src/utils/formatDate.test.ts
//
// - テストケースの一覧（tests/<機能名>/cases.md）にある ID（例: FD-01）と、
//   実行したテストの名前の先頭の ID を突き合わせ、実行されていないケースも結果に書く。
// - テストが1件でも失敗・スキップした、または実行されていないケースがあるときは、終了コード 1 で終わる。
// 詳しくは tests/README.md を参照。
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runVitest } from './lib/runVitest.mjs';

const [feature, ...files] = process.argv.slice(2);
if (!feature || files.length === 0) {
  console.error('使い方: npm run test:report -- <機能名> <テストファイル> [<テストファイル> ...]');
  process.exit(2);
}

const root = process.cwd();
const featureDir = path.join(root, 'tests', feature);
const casesPath = path.join(featureDir, 'cases.md');
if (!existsSync(casesPath)) {
  console.error(`テストケースの一覧がありません: tests/${feature}/cases.md`);
  console.error('tests/_template/cases.md をコピーして、先にテストケースを書いてください。');
  process.exit(2);
}

// ---- テストを実行する（画面にはいつもの形で出し、集計用に JSON にも書き出す） ----
const tmp = mkdtempSync(path.join(tmpdir(), 'mikanshelf-test-'));
const jsonPath = path.join(tmp, 'result.json');
const run = runVitest([
  'run',
  ...files,
  '--reporter=default',
  '--reporter=json',
  `--outputFile.json=${jsonPath}`,
]);
if (!existsSync(jsonPath)) {
  console.error('テストの結果を読み取れませんでした（テストを実行できていない可能性があります）。');
  process.exit(run.status ?? 1);
}
const result = JSON.parse(readFileSync(jsonPath, 'utf8'));
rmSync(tmp, { recursive: true, force: true });

// ---- 集計 ----
const ID_PATTERN = /^([A-Z][A-Z0-9]*-\d+)/;
const STATUS_LABEL = {
  passed: '✅ 成功',
  failed: '❌ 失敗',
  skipped: '⏭ スキップ',
  pending: '⏭ スキップ',
  todo: '📝 未実装',
};

const tests = result.testResults.flatMap((file) =>
  file.assertionResults.map((t) => ({
    file: path.relative(root, file.name).replaceAll('\\', '/'),
    id: t.title.match(ID_PATTERN)?.[1] ?? '（ID なし）',
    name: [...t.ancestorTitles, t.title].join(' › '),
    status: t.status,
    duration: t.duration ?? 0,
    failureMessages: t.failureMessages ?? [],
  })),
);
// テストファイル自体を読み込めなかった（文法の誤りなど）ときのエラー
const fileErrors = result.testResults
  .filter((file) => file.status === 'failed' && file.assertionResults.length === 0)
  .map((file) => ({
    file: path.relative(root, file.name).replaceAll('\\', '/'),
    message: file.message,
  }));

const caseIds = [
  ...readFileSync(casesPath, 'utf8').matchAll(/^\|\s*([A-Z][A-Z0-9]*-\d+)\s*\|/gm),
].map((m) => m[1]);
const ranIds = new Set(tests.map((t) => t.id));
const notRun = caseIds.filter((id) => !ranIds.has(id));
const notInCases = [...ranIds].filter((id) => id !== '（ID なし）' && !caseIds.includes(id));

const count = (s) => tests.filter((t) => t.status === s).length;
const passed = count('passed');
const failed = count('failed');
const skipped = tests.length - passed - failed;
// スキップ（it.skip など）や未実行のケースが残っているときも、合格にはしない
const ok =
  failed === 0 &&
  skipped === 0 &&
  fileErrors.length === 0 &&
  notRun.length === 0 &&
  tests.length > 0;

// ---- 実行した環境 ----
const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '（取得できません）';
  }
};
const dirty = git('status --porcelain') !== '';
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dateText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const timeText = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

// ---- Markdown を作る ----
const esc = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
const lines = [
  `# 単体テストの実行結果: ${feature}`,
  '',
  `- 判定: ${ok ? '✅ 合格' : '❌ 不合格'}`,
  `- 実行日時: ${dateText} ${timeText}`,
  `- 実行した人: ${git('config user.name')}`,
  `- ブランチ: ${git('branch --show-current')}`,
  `- コミット: ${git('rev-parse --short HEAD')}${dirty ? '（コミットしていない変更あり）' : ''}`,
  `- Node.js: ${process.version}`,
  `- 実行したコマンド: \`npm run test:report -- ${[feature, ...files].join(' ')}\``,
  `- テストケースの一覧: [cases.md](../cases.md)`,
  '',
  '## 集計',
  '',
  '| テストケース | 実行 | 成功 | 失敗 | スキップ | 未実行 |',
  '|---:|---:|---:|---:|---:|---:|',
  `| ${caseIds.length} | ${tests.length} | ${passed} | ${failed} | ${skipped} | ${notRun.length} |`,
  '',
  '## 結果の一覧',
  '',
  '| ID | テスト | 結果 | 時間 | テストファイル |',
  '|---|---|---|---:|---|',
  ...tests.map(
    (t) =>
      `| ${t.id} | ${esc(t.name)} | ${STATUS_LABEL[t.status] ?? t.status} | ${Math.round(t.duration)}ms | ${t.file} |`,
  ),
  ...notRun.map(
    (id) => `| ${id} | （cases.md にあるが、テストのコードがない） | ⚠ 未実行 | - | - |`,
  ),
  '',
];

// エラーの内容から、Vitest の内部の行を省き、パスをリポジトリからの相対パスにする（読みやすくするため）
const rootPattern = new RegExp(
  `(file:///)?${root.replaceAll('\\', '/').replace(/[.*+?^${}()|[\]]/g, '\\$&')}/`,
  'gi',
);
const cleanError = (message) =>
  message
    .split('\n')
    .filter((line) => !/node_modules|^\s*at new Promise/.test(line))
    .map((line) =>
      /^\s*at /.test(line) ? line.replaceAll('\\', '/').replace(rootPattern, '') : line,
    )
    .join('\n')
    .trim();

const failures = tests.filter((t) => t.status === 'failed');
if (failures.length > 0 || fileErrors.length > 0) {
  lines.push('## 失敗の内容', '');
  for (const t of failures) {
    lines.push(
      `### ${t.id}: ${t.name}`,
      '',
      '```',
      ...t.failureMessages.map(cleanError),
      '```',
      '',
    );
  }
  for (const e of fileErrors) {
    lines.push(
      `### テストファイルを実行できない: ${e.file}`,
      '',
      '```',
      cleanError(e.message),
      '```',
      '',
    );
  }
}
if (notInCases.length > 0) {
  lines.push(
    '## 注意',
    '',
    `次の ID は cases.md に書かれていません。cases.md に追加してください: ${notInCases.join(', ')}`,
    '',
  );
}

const resultsDir = path.join(featureDir, 'results');
mkdirSync(resultsDir, { recursive: true });
const outPath = path.join(resultsDir, `${dateText}_${timeText.replaceAll(':', '')}.md`);
writeFileSync(outPath, lines.join('\n'));

console.log('');
console.log(
  `判定: ${ok ? '合格' : '不合格'}（成功 ${passed} / 失敗 ${failed} / 未実行 ${notRun.length}）`,
);
console.log(`実行結果を保存しました: ${path.relative(root, outPath).replaceAll('\\', '/')}`);
process.exit(ok ? 0 : 1);
