// Vitest を起動する。テストを実行するスクリプト（scripts/vitest.mjs、scripts/test-report.mjs）から使う。
//
// Windows でカレントディレクトリのドライブ文字が小文字（c:\）だと（VS Code のターミナルなど）、
// Vitest が同じファイルを別のものとして2回読み込み、どのテストも
// 「Cannot read properties of undefined (reading 'config')」で失敗する。
// カレントディレクトリと Vitest のファイルのパスの両方を、ドライブ文字を大文字（C:\）にそろえて起動し、これを避ける。
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const upperDrive = (p) => p.replace(/^[a-z]:/, (drive) => drive.toUpperCase());

export function runVitest(args, options = {}) {
  const cwd = upperDrive(process.cwd());
  const pkgPath = createRequire(import.meta.url).resolve('vitest/package.json');
  const vitestBin = upperDrive(path.join(path.dirname(pkgPath), 'vitest.mjs'));
  return spawnSync(process.execPath, [vitestBin, ...args], { cwd, stdio: 'inherit', ...options });
}
