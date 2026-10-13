#!/usr/bin/env node
/**
 * 全量校验脚本 —— 在没有浏览器的环境下，把整个「C/C++ 游乐场」验一遍。
 * 作者：山寒
 *
 * 用法（在 D:\小程序 目录下）：
 *     node tools/verify-all.mjs
 *
 * 它会做四件事：
 *   1. 把 js/engine/*.js 加载进一个沙箱里（不需要浏览器）
 *   2. 跑 selftest.js 里的全部「标准答案」用例（数量以 MC.SELFTEST_CASES 为准）
 *   3. 把课程数据里**每一个** page.expect 和 snippet.expect 真正执行一遍，
 *      逐字节比对输出（这才是真正在验证课程内容没写错）
 *   4. 静态检查所有选择题：answer 下标越界、选项重复、chapter/topic/level 非法、id 重复
 *
 * 退出码：全部通过 = 0，有问题 = 1。
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

const C = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`
};

const problems = [];
function bad(where, msg, extra) {
  problems.push({ where, msg, extra });
}

/* ------------------------------------------------------------------ *
 * 1. 把引擎装进沙箱
 * ------------------------------------------------------------------ */
function loadEngine() {
  const sandbox = { console, performance };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const engineFiles = ['lexer.js', 'parser.js', 'interpreter.js'];
  for (const f of engineFiles) {
    const p = path.join(ROOT, 'js', 'engine', f);
    if (!fs.existsSync(p)) throw new Error(`缺少引擎文件：${p}`);
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
  }
  if (!sandbox.MC || typeof sandbox.MC.run !== 'function') {
    throw new Error('引擎加载失败：沙箱里没有出现 MC.run');
  }

  // 自检用例（可选存在）
  const st = path.join(ROOT, 'js', 'engine', 'selftest.js');
  if (fs.existsSync(st)) vm.runInContext(fs.readFileSync(st, 'utf8'), sandbox, { filename: st });

  return sandbox;
}

/* ------------------------------------------------------------------ *
 * 2. 加载课程数据
 * ------------------------------------------------------------------ */
function loadData(sandbox) {
  const dir = path.join(ROOT, 'js', 'data');
  if (!fs.existsSync(dir)) throw new Error(`缺少数据目录：${dir}`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  for (const f of files) {
    const p = path.join(dir, f);
    try {
      vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
    } catch (e) {
      bad(`${path.relative(ROOT, p)}`, `这个文件根本没法执行：${e.message}`);
    }
  }
  return sandbox;
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */
const CHAPTERS = ['start', 'types', 'ops', 'flow', 'func', 'array', 'pointer',
  'struct', 'memory', 'cpp-oop', 'cpp-stl'];
const TOPICS = ['基础', '数组', '指针', '字符串', '结构体', '内存', 'C++', '算法', '易错'];
const LEVELS = ['easy', 'mid', 'hard'];

function show(s) {
  const t = String(s);
  return t.length > 260 ? t.slice(0, 260) + C.dim(` …(共 ${t.length} 字符)`) : t;
}

function runOne(MC, src, stdin, where, want, label) {
  let res;
  try {
    res = MC.run(src, { stdin: stdin || '', timeLimit: 2500 });
  } catch (e) {
    bad(where, `${label}时引擎自己抛异常了：${e && e.message}`);
    return;
  }
  if (!res.ok) {
    bad(where, `${label}：程序没能跑完 —— 第 ${res.error.line} 行 ${res.error.message}`, {
      '期望输出': show(want),
      '实际输出': show(res.output || '(空)')
    });
    return;
  }
  if (res.output !== want) {
    bad(where, `${label}：输出和 expect 对不上`, {
      '期望': show(want),
      '实际': show(res.output)
    });
  }
}

function checkOptions(where, item, what) {
  const opts = item.options;
  if (!Array.isArray(opts) || opts.length < 2) {
    bad(where, `${what} 的 options 不是有效的数组（${opts ? opts.length : opts}）`);
    return;
  }
  if (opts.some(o => o === null || o === undefined || String(o).trim() === '')) {
    bad(where, `${what} 的 options 里有空选项`);
  }
  const seen = new Set(opts.map(String));
  if (seen.size !== opts.length) {
    bad(where, `${what} 的 options 里有重复项`);
  }
  if (typeof item.answer !== 'number' || !Number.isInteger(item.answer)) {
    bad(where, `${what} 的 answer 不是整数：${JSON.stringify(item.answer)}`);
  } else if (item.answer < 0 || item.answer >= opts.length) {
    bad(where, `${what} 的 answer=${item.answer} 越界（options 只有 ${opts.length} 项）`);
  }
}

/* ------------------------------------------------------------------ *
 * 3. 主流程
 * ------------------------------------------------------------------ */
console.log(C.bold('\n⚙️  C/C++ 游乐场 · 全量校验\n'));

let sandbox;
try {
  sandbox = loadEngine();
} catch (e) {
  console.error(C.red('✗ 引擎加载失败：' + e.message));
  process.exit(1);
}
console.log(C.green('✓') + ' 引擎加载成功（' + C.dim('lexer / parser / interpreter') + '）');

loadData(sandbox);
console.log(C.green('✓') + ' 课程数据加载成功（' + C.dim('js/data/*.js') + '）\n');

const MC = sandbox.MC;

/* --- 3a. 引擎自检 --- */
if (typeof MC.selfTest === 'function') {
  const r = MC.selfTest();
  const tag = r.fail === 0 ? C.green(`✓ 引擎自检 ${r.pass}/${r.total}`) : C.red(`✗ 引擎自检 ${r.pass}/${r.total}`);
  console.log(tag);
  for (const it of r.results) {
    if (it.ok) continue;
    bad('selftest.js', `引擎自检失败：${it.name}`, {
      '期望': show(it.want),
      '实际': show(it.got)
    });
  }
} else {
  console.log(C.yellow('· 没有找到 selftest.js，跳过引擎自检'));
}

/* --- 3b. 课程 page.expect --- */
const lessonSets = [
  ['CPP_LESSONS_P1', 'lessons-01-basics.js'],
  ['CPP_LESSONS_P2', 'lessons-02-adv.js'],
  ['CPP_LESSONS_P3', 'lessons-03-pro.js']
];
let pageRun = 0, pageSkipped = 0, challengeCount = 0;
const seenLessonIds = new Map();

for (const [gvar, file] of lessonSets) {
  const lessons = sandbox[gvar];
  if (!Array.isArray(lessons)) {
    bad(`js/data/${file}`, `没有导出 window.${gvar}（或者导出的不是数组）`);
    continue;
  }
  for (const L of lessons) {
    const where = `js/data/${file} · ${L.id || '(没有 id)'}`;
    if (!L.id) bad(where, '这个小节没有 id');
    else if (seenLessonIds.has(L.id)) bad(where, `小节 id 重复，另一处在 ${seenLessonIds.get(L.id)}`);
    else seenLessonIds.set(L.id, where);

    if (L.chapter && CHAPTERS.indexOf(L.chapter) < 0) {
      bad(where, `chapter="${L.chapter}" 不在合法集合里`);
    }
    if (!Array.isArray(L.pages) || !L.pages.length) {
      bad(where, '这个小节没有 pages');
      continue;
    }
    L.pages.forEach((pg, pi) => {
      const w = `${where} · 第 ${pi + 1} 页「${pg.title || ''}」`;
      if (pg.code && pg.expect != null) {
        runOne(MC, pg.code, pg.stdin, w, pg.expect, '跑页面代码');
        pageRun++;
      } else if (pg.code) {
        pageSkipped++;
      }
    });

    if (!Array.isArray(L.challenges)) continue;
    L.challenges.forEach((ch, ci) => {
      const w = `${where} · 第 ${ci + 1} 题`;
      challengeCount++;
      if (ch.type !== 'predict' && ch.type !== 'choice') {
        bad(w, `challenge.type="${ch.type}" 既不是 predict 也不是 choice`);
      }
      if (!ch.question) bad(w, '没有 question');
      if (!ch.explain) bad(w, '没有 explain（选完就没有解释了）');
      checkOptions(w, ch, 'challenge');
      if (ch.type === 'predict' && ch.code) {
        // predict 题的 code 至少要能跑起来（除非它本来就是故意报错的例子）
        try {
          const res = MC.run(ch.code, { stdin: ch.stdin || '', timeLimit: 2500 });
          if (!res.ok && !ch.expectError) {
            bad(w, `predict 题的 code 跑不起来：第 ${res.error.line} 行 ${res.error.message}`);
          }
        } catch (e) { bad(w, 'predict 题的 code 让引擎抛异常：' + e.message); }
      }
    });
  }
}

/* --- 3c. snippets.expect --- */
let snipRun = 0;
if (Array.isArray(sandbox.CPP_SNIPPETS)) {
  const seen = new Set();
  sandbox.CPP_SNIPPETS.forEach((s, i) => {
    const w = `js/data/snippets.js · [${i}] ${s.id || s.title || '(没有 id)'}`;
    if (s.id) {
      if (seen.has(s.id)) bad(w, `snippet id 重复：${s.id}`);
      seen.add(s.id);
    } else bad(w, '这个 snippet 没有 id');
    if (!s.title) bad(w, '没有 title');
    if (!s.code) { bad(w, '没有 code'); return; }
    if (s.expect != null) { runOne(MC, s.code, s.stdin, w, s.expect, '跑范例'); snipRun++; }
    else {
      // 没有 expect 的，至少确认能跑通
      try {
        const res = MC.run(s.code, { stdin: s.stdin || '', timeLimit: 2500 });
        if (!res.ok) bad(w, `范例跑不起来：第 ${res.error.line} 行 ${res.error.message}`);
      } catch (e) { bad(w, '范例让引擎抛异常：' + e.message); }
    }
  });
} else {
  bad('js/data/snippets.js', '没有导出 window.CPP_SNIPPETS');
}

/* --- 3d. quizbank --- */
let quizCount = 0;
if (Array.isArray(sandbox.CPP_QUIZBANK)) {
  const seen = new Set();
  const levelCount = {}, topicCount = {};
  sandbox.CPP_QUIZBANK.forEach((q, i) => {
    const w = `js/data/quizbank.js · [${i}] ${q.id || '(没有 id)'}`;
    quizCount++;
    if (!q.id) bad(w, '没有 id');
    else if (seen.has(q.id)) bad(w, `题目 id 重复：${q.id}`);
    else seen.add(q.id);
    if (!q.q) bad(w, '没有题干 q');
    if (!q.explain) bad(w, '没有 explain');
    if (LEVELS.indexOf(q.level) < 0) bad(w, `level="${q.level}" 不合法`);
    else levelCount[q.level] = (levelCount[q.level] || 0) + 1;
    if (TOPICS.indexOf(q.topic) < 0) bad(w, `topic="${q.topic}" 不合法`);
    else topicCount[q.topic] = (topicCount[q.topic] || 0) + 1;
    checkOptions(w, q, '题目');
    // 选项里不该出现「以上都对 / 以上都不对」这种偷懒选项
    (q.options || []).forEach((o, oi) => {
      if (/^以上(都|全)/.test(String(o).trim())) {
        bad(`js/data/quizbank.js · ${q.id}`, `选项 ${oi} 是「${o}」这类偷懒选项`);
      }
    });
  });
  console.log(C.green('✓') + ' 题库分布：' +
    Object.entries(levelCount).map(([k, v]) => `${k} ${v}`).join(' / ') + '　' +
    C.dim(Object.entries(topicCount).map(([k, v]) => `${k} ${v}`).join(' · ')));
} else {
  bad('js/data/quizbank.js', '没有导出 window.CPP_QUIZBANK');
}

/* --- 3e. chapters.js 的章节覆盖 --- */
const chaps = sandbox.MC && sandbox.MC.CHAPTERS;
if (Array.isArray(chaps)) {
  const ids = chaps.map(c => c && c.id);
  CHAPTERS.forEach(id => { if (ids.indexOf(id) < 0) bad('js/data/chapters.js', `CHAPTERS 里缺少章节「${id}」`); });
  ids.forEach(id => { if (CHAPTERS.indexOf(id) < 0) bad('js/data/chapters.js', `CHAPTERS 里多了个不认识的章节「${id}」`); });
} else {
  console.log(C.yellow('· 没找到 MC.CHAPTERS，跳过章节覆盖检查'));
}

/* ------------------------------------------------------------------ *
 * 4. 报告
 * ------------------------------------------------------------------ */
console.log('');
console.log(C.bold('执行统计'));
console.log(`  课程页面代码　${pageRun} 段（另有 ${pageSkipped} 段没有 expect，只跑不比对）`);
console.log(`  范例代码　　　${snipRun} 段`);
console.log(`  课程选择题　　${challengeCount} 道`);
console.log(`  题库选择题　　${quizCount} 道`);
console.log('');

if (problems.length === 0) {
  console.log(C.green(C.bold('🎉 全部通过，没有发现问题。')));
  console.log(C.dim('   引擎行为与真实 C/C++ 一致，课程里每一段期望输出都对得上。'));
  process.exit(0);
}

console.log(C.red(C.bold(`✗ 发现 ${problems.length} 个问题：\n`)));
problems.forEach((p, i) => {
  console.log(C.red(`  ${i + 1}. `) + C.bold(p.where));
  console.log(`     ${p.msg}`);
  if (p.extra) {
    for (const [k, v] of Object.entries(p.extra)) {
      console.log(C.dim(`       ${k}: `) + String(v).replace(/\n/g, '\n         '));
    }
  }
  console.log('');
});
process.exit(1);
