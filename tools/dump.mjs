// 打印指定课程页 / 范例 / 选择题的源代码，方便定位问题
// 用法：node tools/dump.mjs <lessonId>[:<pageNo>] [<lessonId>[:<pageNo>] ...]
//       node tools/dump.mjs sn:<snippetId>
//       node tools/dump.mjs q:<quizId>
//       node tools/dump.mjs --all
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const sandbox = { console, window: null };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

for (const f of ['js/engine/lexer.js', 'js/engine/parser.js', 'js/engine/interpreter.js', 'js/engine/selftest.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
for (const f of ['js/data/lessons-01-basics.js', 'js/data/lessons-02-adv.js', 'js/data/lessons-03-pro.js',
                 'js/data/snippets.js', 'js/data/quizbank.js', 'js/data/chapters.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}

const CUR = sandbox.MC.curriculum();
const args = process.argv.slice(2);

function showLesson(id, pageNo) {
  const L = CUR.byId[id];
  if (!L) { console.log('!! 找不到小节 ' + id); return; }
  const pages = L.pages || [];
  const list = pageNo ? [pageNo - 1] : pages.map((_, i) => i);
  for (const pi of list) {
    const p = pages[pi];
    if (!p) continue;
    console.log('\n========== ' + id + ' 第 ' + (pi + 1) + ' 页 · ' + p.title + ' ==========');
    console.log('--- code ---');
    console.log(p.code);
    console.log('--- expect ---');
    console.log(JSON.stringify(p.expect));
  }
  if (!pageNo && L.challenges && L.challenges.length) {
    L.challenges.forEach((c, ci) => {
      console.log('\n========== ' + id + ' 第 ' + (ci + 1) + ' 题 [' + c.type + '] ==========');
      if (c.code) { console.log('--- code ---'); console.log(c.code); }
      console.log('--- question ---'); console.log(c.question);
      (c.options || []).forEach((o, oi) => console.log('   [' + oi + '] ' + o + (oi === c.answer ? '   <== answer' : '')));
      console.log('--- explain ---'); console.log(c.explain);
    });
  }
}

if (args[0] === '--all') {
  for (const L of CUR.lessons) showLesson(L.id);
} else {
  for (const a of args) {
    if (a.startsWith('sn:')) {
      const s = (sandbox.CPP_SNIPPETS || []).find(x => x.id === a.slice(3));
      if (!s) { console.log('!! 找不到范例 ' + a); continue; }
      console.log('\n========== snippet ' + s.id + ' · ' + s.title + ' ==========');
      console.log(s.code);
      console.log('--- expect ---'); console.log(JSON.stringify(s.expect));
    } else if (a.startsWith('q:')) {
      const q = (sandbox.CPP_QUIZBANK || []).find(x => x.id === a.slice(2));
      if (!q) { console.log('!! 找不到题 ' + a); continue; }
      console.log('\n========== quiz ' + q.id + ' ==========');
      if (q.code) { console.log(q.code); }
      console.log(q.q);
      q.options.forEach((o, oi) => console.log('   [' + oi + '] ' + o + (oi === q.answer ? '   <== answer' : '')));
    } else {
      const m = a.match(/^(.+?)(?::(\d+))?$/);
      showLesson(m[1], m[2] ? parseInt(m[2], 10) : 0);
    }
  }
}
