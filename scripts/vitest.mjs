// `npm test` と `npm run test:watch` から Vitest を起動する。
// Vitest を直接起動しないのは、Windows で動かないことがあるため（scripts/lib/runVitest.mjs を参照）
import { runVitest } from './lib/runVitest.mjs';

process.exit(runVitest(process.argv.slice(2)).status ?? 1);
