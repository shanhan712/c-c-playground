// 给项目里的源文件加上作者署名（幂等：已经有的会跳过）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILES = [
  'index.html',
  'README.md',
  'css/styles.css',
  'js/app.js',
  'js/engine/lexer.js',
  'js/engine/parser.js',
  'js/engine/interpreter.js',
  'js/engine/selftest.js',
  'js/data/chapters.js',
  'js/data/lessons-01-basics.js',
  'js/data/lessons-02-adv.js',
  'js/data/lessons-03-pro.js',
  'js/data/snippets.js',
  'js/data/quizbank.js',
  'tools/verify-all.mjs',
];

const AUTHOR = '作者：山寒';
let touched = 0, skipped = 0;

for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log('  [缺失] ' + rel); continue; }
  const text = fs.readFileSync(p, 'utf8');
  if (text.includes(AUTHOR)) { skipped++; console.log('  [已有] ' + rel); continue; }

  const nl = text.indexOf('\n');
  const first = (nl === -1 ? text : text.slice(0, nl));
  let stamp = null;
  if (first.startsWith('/*')) stamp = ' * ' + AUTHOR;
  else if (first.startsWith('//')) stamp = '// ' + AUTHOR;
  else if (first.startsWith('<!--')) stamp = '  ' + AUTHOR;
  else if (first.startsWith('#')) stamp = '\n> ' + AUTHOR;

  if (stamp === null || nl === -1) { console.log('  [跳过：认不出注释风格] ' + rel + '  首行=' + JSON.stringify(first.slice(0, 40))); continue; }

  // <!-- 这种要把署名塞进注释块里面（第一行是 <!-- 开头的块）
  let out;
  if (first.startsWith('<!--')) {
    out = first + '\n  ' + AUTHOR + text.slice(nl);
  } else {
    out = first + '\n' + stamp + text.slice(nl);
  }
  fs.writeFileSync(p, out, 'utf8');
  touched++;
  console.log('  [已加] ' + rel + '  ← ' + stamp.trim());
}

console.log('\n加署名 ' + touched + ' 个，跳过 ' + skipped + ' 个。');
