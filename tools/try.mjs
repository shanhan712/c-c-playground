#!/usr/bin/env node
/**
 * 单点调试工具：只跑一段代码，把「实际输出」和「期望输出」并排打出来。
 *
 *   node tools/try.mjs lesson   memory-1 2      # 课程小节 id + 第几页（从 1 数）
 *   node tools/try.mjs snippet  sn-mem-malloc   # 范例库里的某一段
 *   node tools/try.mjs quiz     q-ptr-001       # 题库某题带的代码
 *   node tools/try.mjs selftest switch          # 引擎自检里名字含该关键字的用例
 *   node tools/try.mjs file     test.c          # 直接跑一个 .c 文件
 *
 * 加 --src 会顺便把源代码打出来。
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const sandbox = { console, performance };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['lexer.js', 'parser.js', 'interpreter.js', 'selftest.js']) {
  const p = path.join(ROOT, 'js', 'engine', f);
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
}
const dataDir = path.join(ROOT, 'js', 'data');
for (const f of fs.readdirSync(dataDir).filter(x => x.endsWith('.js')).sort()) {
  const p = path.join(dataDir, f);
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
}

const MC = sandbox.MC;
const argv = process.argv.slice(2);
const showSrc = argv.includes('--src');
const args = argv.filter(a => a !== '--src');

function normSrc(s) {
  if (Array.isArray(s)) return s.join('\n');
  return s == null ? '' : String(s);
}

let src = '', want = null, stdin = '', label = '';

const mode = args[0];

if (mode === 'lesson') {
  const id = args[1];
  const pageNo = parseInt(args[2] || '1', 10);
  let found = null;
  for (const g of ['CPP_LESSONS_P1', 'CPP_LESSONS_P2', 'CPP_LESSONS_P3']) {
    const arr = sandbox[g] || [];
    const L = arr.find(x => x.id === id);
    if (L) { found = L; break; }
  }
  if (!found) { console.error('找不到小节：' + id); process.exit(2); }
  const pg = found.pages[pageNo - 1];
  if (!pg) { console.error('这个小节没有第 ' + pageNo + ' 页'); process.exit(2); }
  src = normSrc(pg.code);
  want = pg.expect == null ? null : pg.expect;
  stdin = pg.stdin || '';
  label = `lesson ${id} 第 ${pageNo} 页「${pg.title || ''}」`;

} else if (mode === 'snippet') {
  const id = args[1];
  const s = (sandbox.CPP_SNIPPETS || []).find(x => x.id === id);
  if (!s) { console.error('找不到范例：' + id); process.exit(2); }
  src = normSrc(s.code);
  want = s.expect == null ? null : s.expect;
  stdin = s.stdin || '';
  label = `snippet ${id}「${s.title || ''}」`;

} else if (mode === 'quiz') {
  const id = args[1];
  const q = (sandbox.CPP_QUIZBANK || []).find(x => x.id === id);
  if (!q) { console.error('找不到题目：' + id); process.exit(2); }
  src = normSrc(q.code);
  want = null;
  label = `quiz ${id}（答案下标 ${q.answer}）`;

} else if (mode === 'selftest') {
  const needle = args[1] || '';
  const cases = MC.SELFTEST_CASES || [];
  const c = cases.find(x => (x.name || '').indexOf(needle) >= 0);
  if (!c) { console.error('找不到自检用例：' + needle); process.exit(2); }
  src = normSrc(c.src);
  want = c.expect == null ? null : c.expect;
  stdin = c.stdin || '';
  label = `selftest「${c.name}」` + (c.expectError ? `  （期望报错：${c.expectError}）` : '');

} else if (mode === 'file') {
  const p = path.resolve(args[1]);
  src = fs.readFileSync(p, 'utf8');
  label = 'file ' + p;

} else if (mode === 'list') {
  const cases = MC.SELFTEST_CASES || [];
  const r = MC.selfTest();
  for (const it of r.results) {
    console.log((it.ok ? '  ok  ' : ' FAIL ') + it.name);
  }
  console.log(`\n${r.pass}/${r.total} 通过，${r.fail} 失败`);
  process.exit(0);

} else {
  console.error('用法见文件顶部注释');
  process.exit(2);
}

const res = MC.run(src, { stdin, timeLimit: 3000 });

console.log('=== ' + label + ' ===');
if (showSrc) {
  console.log('--- 源代码 ---');
  console.log(src);
}
if (!res.ok) {
  console.log(`\x1b[31m✗ 跑不完\x1b[0m  第 ${res.error.line} 行 · phase=${res.error.phase} · ${res.error.message}`);
}
console.log('--- 实际输出 ---');
process.stdout.write(res.output || '(空)');
if (!/\n$/.test(res.output || '')) console.log('');
console.log('--- 结束 ---');
if (want != null) {
  console.log('--- 期望输出 ---');
  process.stdout.write(want);
  if (!/\n$/.test(want)) console.log('');
  console.log('--- 结束 ---');
  if (res.ok && res.output === want) console.log('\x1b[32m✓ 一致\x1b[0m');
  else console.log('\x1b[31m✗ 不一致\x1b[0m');
}
