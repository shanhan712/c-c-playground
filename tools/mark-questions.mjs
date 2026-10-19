/**
 * 给题库里的题目打标记（幂等）
 *
 * 作者：山寒
 *
 *   answerKind: 'behavior'  —— 这题的正确答案是「行为判断」（未定义行为、回绕、切片…），
 *                              不是字面输出，tools/quiz-audit.mjs 不做字面比对。
 *   simUnsupported: true    —— 这段代码是真的 C/C++（有 gcc/g++ 把关），
 *                              但页面内的模拟器还没完全支持这些特性；
 *                              题库只展示它、不保证在实验室里能原样跑通。
 *
 * 用法：node tools/mark-questions.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BANK = path.resolve(HERE, '..', 'js', 'data', 'quizbank.js');
const DRY = process.argv.includes('--dry');

const BEHAVIOR = [
  'q-array-005', 'q-array-006', 'q-str-007', 'q-cpp-003', 'q-cpp-006', 'q-cpp-009',
  'q-algo-004', 'q-algo-006', 'q-algo-012', 'q-pit-004', 'q-pit-006',
  'q-struct-003', 'q-mem-001', 'q-mem-002', 'q-mem-004', 'q-mem-005'
];

const SIM_UNSUPPORTED = [
  'q-ptr-104',   // int (*q)[3] 数组指针声明
  'q-cpp-103',   // 重载决议里的 float → double 提升
  'q-cpp-105',   // 成员初始化列表按声明顺序求值
  'q-cpp-106',   // 值传参 / 拷贝初始化触发拷贝构造
  'q-cpp-107',   // 类外定义静态成员 Counter::count
  'q-cpp-111',   // new[] / delete[] 的构造析构次序
  'q-cpp-112'    // const 成员函数重载
];

/* 已知且已声明的模拟器差异：值写清楚原因，审计工具会归类为「已知差异」而不是错误 */
const SIM_DIFFERS = {
  'q-array-003': '模拟器是 32 位指针模型（指针 4 字节），真机 64 位是 8 字节——题干已注明「在 64 位平台上」'
};

/* 先确认 id 都存在，避免拼错导致静默失效 */
const sb = { window: {}, console };
sb.window = sb;
vm.createContext(sb);
let text = fs.readFileSync(BANK, 'utf8');
vm.runInContext(text, sb, { filename: BANK });
const byId = new Map((sb.CPP_QUIZBANK || []).map(q => [q.id, q]));

const missing = [...BEHAVIOR, ...SIM_UNSUPPORTED, ...Object.keys(SIM_DIFFERS)].filter(id => !byId.has(id));
if (missing.length) {
  console.log('✗ 这些 id 在题库里不存在：' + missing.join(', '));
  process.exit(1);
}

/** 在 `id: 'xxx',` 这一行后面插入一个字段（已存在就跳过） */
function insertAfterId(src, id, field, value) {
  const re = new RegExp("(\\n    id: '" + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "',\\n)");
  const m = src.match(re);
  if (!m) throw new Error('找不到 id 行：' + id);
  const after = src.slice(m.index + m[0].length);
  const guard = after.slice(0, 260);
  if (guard.includes(field + ':')) return { src, changed: false };
  const ins = '    ' + field + ': ' + value + ',\n';
  return {
    src: src.slice(0, m.index + m[0].length) + ins + after,
    changed: true
  };
}

let changedCount = 0;
for (const id of BEHAVIOR) {
  const r = insertAfterId(text, id, 'answerKind', "'behavior'");
  text = r.src;
  if (r.changed) { changedCount++; console.log('  answerKind:behavior  ' + id); }
}
for (const id of SIM_UNSUPPORTED) {
  const r = insertAfterId(text, id, 'simUnsupported', 'true');
  text = r.src;
  if (r.changed) { changedCount++; console.log('  simUnsupported:true  ' + id); }
}
for (const id of Object.keys(SIM_DIFFERS)) {
  const r = insertAfterId(text, id, 'simDiffers', JSON.stringify(SIM_DIFFERS[id]).replace(/^"|"$/g, "'"));
  text = r.src;
  if (r.changed) { changedCount++; console.log('  simDiffers           ' + id); }
}

if (!changedCount) { console.log('没有需要改的（已经是这个状态）'); process.exit(0); }

if (DRY) { console.log('--dry：未写文件，将要改 ' + changedCount + ' 处'); process.exit(0); }

fs.writeFileSync(BANK, text, 'utf8');

/* 复查：改完还能不能正常加载，字段有没有生效 */
const sb2 = { window: {}, console };
sb2.window = sb2;
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(BANK, 'utf8'), sb2, { filename: BANK });
const after = new Map((sb2.CPP_QUIZBANK || []).map(q => [q.id, q]));
const badB = BEHAVIOR.filter(id => (after.get(id) || {}).answerKind !== 'behavior');
const badS = SIM_UNSUPPORTED.filter(id => (after.get(id) || {}).simUnsupported !== true);
const badD = Object.keys(SIM_DIFFERS).filter(id => (after.get(id) || {}).simDiffers !== SIM_DIFFERS[id]);
console.log('✓ 已写入 ' + changedCount + ' 处；题库 ' + after.size + ' 题');
if (badB.length || badS.length || badD.length) {
  console.log('✗ 复查失败：' + [...badB, ...badS, ...badD].join(', '));
  process.exit(1);
}
console.log('✓ 复查通过：' + BEHAVIOR.length + ' 题标为 behavior，'
  + SIM_UNSUPPORTED.length + ' 题标为 simUnsupported，'
  + Object.keys(SIM_DIFFERS).length + ' 题写了 simDiffers');
