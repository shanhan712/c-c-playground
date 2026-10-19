#!/usr/bin/env node
/**
 * 作者：山寒
 * quiz-audit.mjs —— 用**真实的 gcc / g++** 当金标准，审计题库里每一道带代码的题的答案。
 *
 * 用法（在 D:\小程序 目录下）：
 *     node tools/quiz-audit.mjs                # 审计全部
 *     node tools/quiz-audit.mjs --only q-ptr  # 只审计 id 里含 q-ptr 的
 *     node tools/quiz-audit.mjs --dir <文件夹>  # 指定 js/data 所在目录（默认本仓库）
 *     node tools/quiz-audit.mjs --quiet        # 只打印有问题的
 *
 * 它做的事：
 *   1. 把每道题的 code 分别交给 gcc / g++ 真编译真运行，拿到**真实输出**
 *   2. 同一段代码再喂给本项目的模拟器，拿到模拟器输出
 *   3. 两者逐字节比对（不一致 = 模拟器 bug，或者这道题用了模拟器不支持的子集）
 *   4. 检查 answer 指向的那个选项是否**真的等于**程序输出
 *      （把「和」「/」、换行都归一成空格后比对，因为选项是人写的展示文本）
 *
 * 退出码：全部对得上 = 0，有可疑 = 1。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const argv = process.argv.slice(2);
const opt = { only: null, dir: null, quiet: false };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--only') opt.only = argv[++i];
  else if (argv[i] === '--dir') opt.dir = argv[++i];
  else if (argv[i] === '--quiet') opt.quiet = true;
}

const DATA_DIR = opt.dir ? path.resolve(opt.dir) : path.join(ROOT, 'js', 'data');
const ENGINE_DIR = opt.dir ? path.resolve(opt.dir, '..', 'engine') : path.join(ROOT, 'js', 'engine');

const C = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`
};

/* ------------------------------------------------------------------ *
 * 0. 找编译器
 * ------------------------------------------------------------------ */
function findExe(name) {
  const r = spawnSync(name, ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}
const HAS_GCC = findExe('gcc');
const HAS_GXX = findExe('g++');

/* ------------------------------------------------------------------ *
 * 1. 装引擎 + 数据
 * ------------------------------------------------------------------ */
function loadSandbox() {
  const sb = { console, performance };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  for (const f of ['lexer.js', 'parser.js', 'interpreter.js']) {
    const p = path.join(ENGINE_DIR, f);
    if (!fs.existsSync(p)) throw new Error('缺少引擎文件：' + p);
    vm.runInContext(fs.readFileSync(p, 'utf8'), sb, { filename: p });
  }
  const qb = path.join(DATA_DIR, 'quizbank.js');
  if (!fs.existsSync(qb)) throw new Error('缺少题库：' + qb);
  vm.runInContext(fs.readFileSync(qb, 'utf8'), sb, { filename: qb });
  if (!Array.isArray(sb.CPP_QUIZBANK)) throw new Error('quizbank.js 没有产出 window.CPP_QUIZBANK 数组');
  return sb;
}

/* ------------------------------------------------------------------ *
 * 2. 真编译器跑一遍
 * ------------------------------------------------------------------ */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpp-quiz-'));

function looksCpp(code) {
  return /\bstd::|\bcout\b|\bcin\b|\bendl\b|\bclass\s+\w|\bpublic\s*:|\bprivate\s*:|\bprotected\s*:|\btemplate\s*<|#include\s*<(iostream|string|vector|algorithm|utility|functional|map|set)>|\bnew\s+\w|\bdelete\s*(\[\s*\])?\s*\w|\bnamespace\s+\w|\bnullptr\b|\bvirtual\b|\boperator\b/.test(code);
}

function runReal(code, id) {
  const isCpp = looksCpp(code);
  const exe = isCpp ? 'g++' : 'gcc';
  if (isCpp && !HAS_GXX) return { skip: '没有 g++' };
  if (!isCpp && !HAS_GCC) return { skip: '没有 gcc' };

  const ext = isCpp ? '.cpp' : '.c';
  const src = path.join(TMP, id + ext);
  const bin = path.join(TMP, id + '.exe');
  fs.writeFileSync(src, code, 'utf8');

  const cargs = [src, '-o', bin, '-w'];
  if (isCpp) cargs.push('-std=c++14');
  const comp = spawnSync(exe, cargs, { encoding: 'utf8', timeout: 30000 });
  if (comp.status !== 0) {
    const msg = (comp.stderr || '').split('\n').filter(l => /error/.test(l)).slice(0, 2).join(' | ');
    return { compileError: msg || '编译失败', compiler: exe };
  }
  const run = spawnSync(bin, [], { encoding: 'utf8', timeout: 8000, input: '', maxBuffer: 4 * 1024 * 1024 });
  // Windows 上 C 程序的标准输出是文本模式，printf("\n") 实际写出 "\r\n"。
  // 模拟器是跨平台的 "\n"，所以比对前必须把 CRLF 归一成 LF，否则每一道题都会误报。
  const out = (run.stdout || '').replace(/\r\n/g, '\n');
  return {
    compiler: exe,
    stdout: out,
    stderr: run.stderr || '',
    status: run.status,
    timedOut: run.error && run.error.code === 'ETIMEDOUT'
  };
}

/* ------------------------------------------------------------------ *
 * 3. 模拟器跑一遍
 * ------------------------------------------------------------------ */
function runSim(sb, code) {
  const res = sb.MC.run(code, { timeLimit: 4000 });
  return {
    ok: res.ok,
    output: res.output || '',
    err: res.error ? res.error.message : null,
    line: res.error ? res.error.line : null,
    phase: res.error ? res.error.phase : null
  };
}

/* ------------------------------------------------------------------ *
 * 4. 归一化后比对（选项是人写的展示文本）
 * ------------------------------------------------------------------ */
function norm(s) {
  return String(s == null ? '' : s)
    .replace(/\r/g, '')
    .replace(/和|与|、/g, ' ')
    .replace(/[，,]/g, ' ')
    .replace(/[\/｜|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return norm(s).split(' ').filter(Boolean);
}

/** 真实输出与某个选项文字是否一致（允许选项多了「输出是」之类的引导词） */
function optionMatches(out, optionText) {
  const a = tokens(out);
  const b = tokens(optionText);
  if (!a.length) return false;
  const as = a.join(' ');
  const bs = b.join(' ');
  if (as === bs) return true;
  // 选项里包含完整输出（例如 "输出 3 5 5"）
  if (b.length >= a.length && bs.includes(as)) return true;
  // 输出里包含选项（例如输出是 "用 swap 之后 a=1 b=2"，选项只写了 "a=1 b=2"）
  if (a.length >= b.length && as.includes(bs)) return true;
  return false;
}

function bestOption(out, options) {
  let best = -1;
  for (let i = 0; i < options.length; i++) {
    if (optionMatches(out, options[i])) { best = i; break; }
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * 5. 主流程
 * ------------------------------------------------------------------ */
const sb = loadSandbox();
let bank = sb.CPP_QUIZBANK;
if (opt.only) bank = bank.filter(q => String(q.id).includes(opt.only));

const stats = {
  total: bank.length,
  noCode: 0,
  ok: 0,
  behavioral: 0,
  notRunnable: 0,
  simUnsupported: 0,
  simDiffKnown: 0,
  simDiffExpected: 0,
  answerWrong: [],
  answerUnsure: [],
  simMismatch: [],
  compileError: [],
  simError: []
};

const rows = [];

for (let i = 0; i < bank.length; i++) {
  const q = bank[i];
  const id = String(q.id || ('#' + i));
  if (q.runnable === false) { stats.notRunnable = (stats.notRunnable || 0) + 1; continue; }
  if (!q.code) { stats.noCode++; continue; }

  const real = runReal(q.code, id);
  const sim = runSim(sb, q.code);

  const row = { id, q, real, sim };

  if (real.compileError) {
    row.verdict = 'COMPILE_ERROR';
    row.note = real.compileError;
    stats.compileError.push(row);
    rows.push(row);
    continue;
  }

  const realOut = real.stdout;
  const simOut = sim.ok ? sim.output : (sim.output || '');

  // 模拟器和真机是否一致
  let simSame = sim.ok && realOut === simOut;
  if (!sim.ok) {
    row.simErr = sim.err;
    simSame = false;
  }

  // 模拟器的差异要分清楚是「已知且已声明」还是「真的不对」：
  //   simUnsupported —— 模拟器还没实现这个特性（题目只保证真机正确）
  //   simDiffers     —— 已知差异，数据里写清楚原因（例如模拟器是 32 位指针模型）
  //   answerKind behavior —— 行为题，模拟器把越界/死循环拦住是好事，不算错
  const simDiffKnown = typeof q.simDiffers === 'string' && q.simDiffers.length > 0;
  row.simSame = simSame;
  if (q.simUnsupported) {
    stats.simUnsupported++;
    row.simState = 'unsupported';
  } else if (simSame) {
    row.simState = 'same';
  } else if (simDiffKnown) {
    stats.simDiffKnown++;
    row.simState = 'known';
    row.simNote = q.simDiffers;
  } else if (q.answerKind === 'behavior') {
    stats.simDiffExpected++;
    row.simState = 'expected';
  } else {
    row.simState = 'diff';
    stats.simMismatch.push(row);
    if (!sim.ok) stats.simError.push(row);
  }

  // 有些题的正确答案是「行为判断」而不是字面输出（例如“越界，结果不可预期”），
  // 这类题用 answerKind: 'behavior' 标注，跳过字面比对，只由人工确认语义。
  if (q.answerKind === 'behavior') {
    row.verdict = 'BEHAVIORAL';
    stats.behavioral++;
    rows.push(row);
    continue;
  }

  // answer 指向的选项是否等于真实输出
  const ansIdx = q.answer;
  const ansText = q.options && q.options[ansIdx];
  const hit = ansText != null && optionMatches(realOut, ansText);
  const best = bestOption(realOut, q.options || []);

  if (hit) {
    row.verdict = 'OK';
    stats.ok++;
  } else if (best >= 0) {
    row.verdict = 'ANSWER_WRONG';
    row.suggested = best;
    stats.answerWrong.push(row);
  } else {
    row.verdict = 'ANSWER_UNSURE';
    row.best = best;
    stats.answerUnsure.push(row);
  }

  rows.push(row);
}

/* ------------------------------------------------------------------ *
 * 6. 输出
 * ------------------------------------------------------------------ */
/** 打印用：太长的输出截断，避免刷屏 */
function brief(s, n) {
  n = n || 240;
  s = String(s == null ? '' : s).replace(/\r\n/g, '\n');
  if (s.length <= n) return s;
  return s.slice(0, n) + '…（共 ' + s.length + ' 字符）';
}

const show = r => {
  if (opt.quiet && (r.verdict === 'OK' && !stats.simMismatch.includes(r))) return;
  const color = r.verdict === 'OK' ? C.green : (r.verdict === 'ANSWER_WRONG' ? C.red : C.yellow);
  console.log('');
  console.log(color('── ' + r.verdict + '  ' + r.id + '  [' + r.q.topic + '/' + r.q.level + ']'));
  console.log('   Q  : ' + r.q.q);
  console.log('   真实输出: ' + JSON.stringify(brief(r.real.stdout)));
  console.log('   模拟器  : ' + JSON.stringify(brief(r.sim.ok ? r.sim.output : ('错误: ' + r.sim.err))));
  (r.q.options || []).forEach((o, i) => {
    const isAns = i === r.q.answer;
    const mark = isAns ? ' ←当前答案' : '';
    const sug = r.suggested === i ? ' ←应该选这个' : '';
    console.log('   ' + (isAns ? C.bold('[x]') : '[ ]') + ' ' + i + ': ' + JSON.stringify(o) + mark + sug);
  });
  if (r.verdict === 'ANSWER_UNSURE') console.log(C.yellow('   ⚠ 没有一个选项能对上真实输出，需要人工判断（可能是「崩溃/编译错误」这类题）'));
  if (r.note) console.log(C.dim('   ' + r.note));
};

console.log(C.bold('\n🔎 题库答案审计（金标准 = 真实 gcc/g++）\n'));
console.log(`   题库文件：${path.join(DATA_DIR, 'quizbank.js')}`);
console.log(`   编译器  ：gcc ${HAS_GCC ? '✓' : '✗'}   g++ ${HAS_GXX ? '✓' : '✗'}`);
console.log(`   题目总数：${stats.total}　其中带代码 ${stats.total - stats.noCode} 道，纯概念题 ${stats.noCode} 道`);

rows.forEach(show);

console.log('\n' + C.bold('汇总'));
console.log(`   ✓ answer 与真实输出一致        ${stats.ok}`);
console.log(`   ✓ 行为题（答案不是字面输出）    ${stats.behavioral}`);
console.log(`   ${stats.answerWrong.length ? C.red('✗') : '·'} answer 指错选项              ${stats.answerWrong.length}`);
console.log(`   ${stats.answerUnsure.length ? C.yellow('?') : '·'} 无法自动判定（需人工）        ${stats.answerUnsure.length}`);
console.log(`   ${stats.compileError.length ? C.red('✗') : '·'} 真编译器编译失败              ${stats.compileError.length}`);
console.log(`   ${stats.simMismatch.length ? C.red('✗') : '·'} 模拟器输出与真机不一致        ${stats.simMismatch.length}`);
console.log('');
console.log(C.dim(`   另有（都不是问题）：模拟器尚未支持 ${stats.simUnsupported} 题，`
  + `已知差异已声明 ${stats.simDiffKnown} 题，行为题由模拟器拦截 ${stats.simDiffExpected} 题`));

if (stats.answerWrong.length) {
  console.log('\n' + C.red(C.bold('需要改 answer 的题：')));
  for (const r of stats.answerWrong) {
    console.log(`   ${r.id}: answer ${r.q.answer} → ${r.suggested}   （真实输出 ${JSON.stringify(brief(r.real.stdout, 120))}，正确选项 ${JSON.stringify(r.q.options[r.suggested])}）`);
  }
}
if (stats.answerUnsure.length) {
  console.log('\n' + C.yellow(C.bold('需要人工确认的题（没有选项能对上真实输出）：')));
  for (const r of stats.answerUnsure) {
    console.log(`   ${r.id}: 真实输出 ${JSON.stringify(brief(r.real.stdout, 120))}   当前答案 ${JSON.stringify(r.q.options[r.q.answer])}`);
  }
}
if (stats.simMismatch.length) {
  console.log('\n' + C.red(C.bold('模拟器与真机输出不一致：')));
  for (const r of stats.simMismatch) {
    console.log(`   ${r.id}: 真机 ${JSON.stringify(brief(r.real.stdout, 120))}  模拟器 ${JSON.stringify(brief(r.sim.ok ? r.sim.output : ('错误: ' + r.sim.err), 120))}`);
  }
}
if (stats.compileError.length) {
  console.log('\n' + C.red(C.bold('真编译器编译失败：')));
  for (const r of stats.compileError) console.log(`   ${r.id}: ${r.note}`);
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { }

const badCount = stats.answerWrong.length + stats.compileError.length + stats.simMismatch.length;
process.exit(badCount ? 1 : 0);
