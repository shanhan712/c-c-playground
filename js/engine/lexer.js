/* =========================================================================
 * 作者：山寒
 * MiniC 引擎 · 词法分析器
 * -------------------------------------------------------------------------
 * 负责：
 *   1. 预处理：处理 #include / #define / #undef / #ifdef 等行指令
 *   2. 词法扫描：把源码切成 token
 *   3. 宏展开：对 token 流做对象宏 / 函数宏展开
 * 全部挂在全局 MC 命名空间下，不使用 ES module。
 * ========================================================================= */
(function (global) {
  'use strict';

  var MC = global.MC = global.MC || {};

  /* ---------------------------------------------------------------------
   * 错误对象：带行号列号，UI 用来在编辑器里画小箭头
   * ------------------------------------------------------------------- */
  function CError(message, line, col, phase) {
    this.name = 'CError';
    this.message = message;
    this.line = line || 1;
    this.col = col || 1;
    this.phase = phase || 'compile';
    this.isCError = true;
  }
  CError.prototype = Object.create(Error.prototype);
  CError.prototype.constructor = CError;
  MC.CError = CError;

  /* ---------------------------------------------------------------------
   * 关键字表
   * ------------------------------------------------------------------- */
  var KEYWORDS = {};
  ('auto break case char const continue default do double else enum extern float for goto if inline '
    + 'int long register return short signed sizeof static struct switch typedef union unsigned void '
    + 'volatile while bool true false class public private protected virtual new delete nullptr '
    + 'namespace using template this operator friend explicit mutable constexpr override final '
    + 'try catch throw static_cast dynamic_cast const_cast reinterpret_cast wchar_t')
    .split(' ').forEach(function (k) { KEYWORDS[k] = true; });

  /* ---------------------------------------------------------------------
   * 运算符 / 分隔符（长的排在前面，保证最长匹配）
   * ------------------------------------------------------------------- */
  var PUNCS = [
    '<<=', '>>=', '...', '->*',
    '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
    '&=', '|=', '^=', '<<', '>>', '->', '::', '.*',
    '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?',
    ':', ';', ',', '.', '(', ')', '[', ']', '{', '}', '#'
  ];
  PUNCS.sort(function (a, b) { return b.length - a.length; });

  function isDigit(c) { return c >= '0' && c <= '9'; }
  function isHex(c) { return isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'); }
  function isIdStart(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$'; }
  function isIdPart(c) { return isIdStart(c) || isDigit(c); }

  /* ---------------------------------------------------------------------
   * 转义序列
   * ------------------------------------------------------------------- */
  function readEscape(src, i) {
    // src[i] 是反斜杠
    var c = src[i + 1];
    switch (c) {
      case 'n': return { ch: '\n', len: 2 };
      case 't': return { ch: '\t', len: 2 };
      case 'r': return { ch: '\r', len: 2 };
      case '0': case '1': case '2': case '3':
      case '4': case '5': case '6': case '7': {
        var oct = '';
        var k = i + 1;
        while (k < src.length && oct.length < 3 && src[k] >= '0' && src[k] <= '7') { oct += src[k]; k++; }
        return { ch: String.fromCharCode(parseInt(oct, 8) & 0xff), len: k - i };
      }
      case 'x': case 'X': {
        var hex = '';
        var j = i + 2;
        while (j < src.length && isHex(src[j])) { hex += src[j]; j++; }
        if (!hex) return { ch: 'x', len: 2, warn: '无效的 \\x 转义' };
        return { ch: String.fromCharCode(parseInt(hex, 16) & 0xffff), len: j - i };
      }
      case 'a': return { ch: '\x07', len: 2 };
      case 'b': return { ch: '\b', len: 2 };
      case 'f': return { ch: '\f', len: 2 };
      case 'v': return { ch: '\v', len: 2 };
      case '\\': return { ch: '\\', len: 2 };
      case "'": return { ch: "'", len: 2 };
      case '"': return { ch: '"', len: 2 };
      case '?': return { ch: '?', len: 2 };
      case '\n': return { ch: '', len: 2 };
      default: return { ch: c === undefined ? '\\' : c, len: c === undefined ? 1 : 2 };
    }
  }

  /* =====================================================================
   * 1. 预处理指令
   * =================================================================== */

  // 把源码按逻辑行切开，处理续行符 '\'
  function logicalLines(src) {
    var raw = src.replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var text = raw[i];
      var startLine = i + 1;
      while (/\\\s*$/.test(text) && i + 1 < raw.length) {
        text = text.replace(/\\\s*$/, '');
        i++;
        text += ' ' + raw[i];
      }
      out.push({ text: text, line: startLine, count: i + 1 - (startLine - 1) });
    }
    return out;
  }

  // 在字符串 / 字符字面量内部不做宏替换，扫描时要知道"现在是否在字面量里"
  function findCommentStart(s) {
    var inStr = false, inChr = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (c === '"') inStr = false;
        continue;
      }
      if (inChr) {
        if (c === '\\') { i++; continue; }
        if (c === "'") inChr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === "'") { inChr = true; continue; }
      if (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*')) return i;
    }
    return -1;
  }

  function preprocess(src) {
    var lines = logicalLines(src);
    var macros = {};
    var defined = {};       // 用于 #ifdef
    var outLines = [];
    var stack = [];         // 条件编译栈

    function active() {
      for (var i = 0; i < stack.length; i++) if (!stack[i].active) return false;
      return true;
    }

    for (var li = 0; li < lines.length; li++) {
      var raw = lines[li].text;
      var line = lines[li].line;
      // 指令行的 # 必须是该行第一个非空白字符
      var m = /^\s*#\s*([A-Za-z_]+)\s*(.*)$/.exec(raw);
      if (!m) {
        outLines.push(raw);
        continue;
      }
      var cmd = m[1];
      var rest = m[2].trim();

      // 条件编译需要"逐级"判断
      if (cmd === 'ifdef' || cmd === 'ifndef') {
        var name = rest.split(/[\s(]/)[0];
        var cond = !!defined[name];
        if (cmd === 'ifndef') cond = !cond;
        stack.push({ active: cond && active(), seenElse: false, parentActive: active() });
        outLines.push('');
        continue;
      }
      if (cmd === 'if') {
        var expr = rest;
        var val;
        if (/^0+$/.test(expr)) val = false;
        else if (/^[0-9]+$/.test(expr)) val = parseInt(expr, 10) !== 0;
        else val = !!defined[expr.split(/[\s(]/)[0]];
        stack.push({ active: val && active(), seenElse: false, parentActive: active() });
        outLines.push('');
        continue;
      }
      if (cmd === 'else') {
        if (!stack.length) throw new CError('#else 没有对应的 #if', line, 1, 'preprocess');
        var top = stack[stack.length - 1];
        stack.pop();
        stack.push({ active: !top.active && top.parentActive, seenElse: true, parentActive: top.parentActive });
        outLines.push('');
        continue;
      }
      if (cmd === 'elif') {
        if (!stack.length) throw new CError('#elif 没有对应的 #if', line, 1, 'preprocess');
        var t2 = stack[stack.length - 1];
        stack.pop();
        stack.push({ active: false, seenElse: t2.seenElse, parentActive: t2.parentActive });
        outLines.push('');
        continue;
      }
      if (cmd === 'endif') {
        if (!stack.length) throw new CError('#endif 没有对应的 #if', line, 1, 'preprocess');
        stack.pop();
        outLines.push('');
        continue;
      }

      if (!active()) { outLines.push(''); continue; }

      if (cmd === 'define') {
        var dm = /^([A-Za-z_$][\w$]*)(\((.*?)\))?\s*([\s\S]*)$/.exec(rest);
        if (!dm) { outLines.push(''); continue; }
        var mname = dm[1];
        var params = null;
        // 函数宏：名字和 '(' 之间不能有空格
        var head = rest.slice(0, rest.indexOf(mname) + mname.length);
        var after = rest.slice(head.length);
        if (after.charAt(0) === '(') {
          var close = after.indexOf(')');
          var plist = after.slice(1, close).split(',').map(function (p) { return p.trim(); })
            .filter(function (p) { return p.length > 0; });
          params = plist;
          macros[mname] = { name: mname, params: params, body: after.slice(close + 1).trim() };
        } else if (/^\s*\(/.test(after)) {
          // 名字后带空格再接 '(' —— C 语言里这仍然是对象宏
          macros[mname] = { name: mname, params: null, body: after.replace(/^\s*/, '') };
        } else {
          macros[mname] = { name: mname, params: null, body: after.trim() };
        }
        defined[mname] = true;
        outLines.push('');
        continue;
      }
      if (cmd === 'undef') {
        delete macros[rest.split(/\s/)[0]];
        delete defined[rest.split(/\s/)[0]];
        outLines.push('');
        continue;
      }
      // include / pragma / line 等一律忽略，但要保留行号
      outLines.push('');
    }

    if (stack.length) throw new CError('有 #if/#ifdef 没有对应的 #endif', 1, 1, 'preprocess');
    return { text: outLines.join('\n'), macros: macros };
  }

  /* =====================================================================
   * 2. 词法扫描
   * =================================================================== */

  function pushNum(tokens, value, isFloat, raw, line, col) {
    tokens.push({ type: 'num', value: value, isFloat: isFloat, raw: raw, line: line, col: col });
  }

  function tokenize(src) {
    var tokens = [];
    var i = 0, n = src.length, line = 1, col = 1;

    while (i < n) {
      var ch = src[i];

      if (ch === '\n') { i++; line++; col = 1; continue; }
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\f' || ch === '\v') { i++; col++; continue; }

      // 注释
      if (ch === '/' && src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') { i++; col++; }
        continue;
      }
      if (ch === '/' && src[i + 1] === '*') {
        i += 2; col += 2;
        var closed = false;
        while (i < n) {
          if (src[i] === '*' && src[i + 1] === '/') { i += 2; col += 2; closed = true; break; }
          if (src[i] === '\n') { line++; col = 1; } else { col++; }
          i++;
        }
        if (!closed) throw new CError('块注释没有闭合，缺少 */', line, col, 'lex');
        continue;
      }

      var startLine = line, startCol = col;

      // 字符串 / 字符字面量（允许 L"" / u8"" / u'' / U'' 前缀）
      var litCh = ch;
      var litSkip = 0;
      if (ch === 'L' || ch === 'u' || ch === 'U') {
        if (src[i + 1] === '"' || src[i + 1] === "'") { litSkip = 1; litCh = src[i + 1]; }
        else if (ch === 'u' && src[i + 1] === '8' && src[i + 2] === '"') { litSkip = 2; litCh = '"'; }
      }
      if (litCh === '"' || litCh === "'") {
        var isChar = litCh === "'";
        var quote = litCh;
        i += 1 + litSkip; col += 1 + litSkip;
        var buf = '';
        var terminated = false;
        while (i < n) {
          var c2 = src[i];
          if (c2 === '\\') {
            var esc = readEscape(src, i);
            buf += esc.ch; i += esc.len; col += esc.len;
            continue;
          }
          if (c2 === quote) { i++; col++; terminated = true; break; }
          if (c2 === '\n') break;
          buf += c2; i++; col++;
        }
        if (!terminated) throw new CError(isChar ? '字符字面量没有闭合' : '字符串字面量没有闭合', startLine, startCol, 'lex');
        if (isChar) tokens.push({ type: 'char', value: buf.length ? buf.charCodeAt(0) : 0, line: startLine, col: startCol });
        else tokens.push({ type: 'str', value: buf, line: startLine, col: startCol });
        continue;
      }

      // 标识符 / 关键字
      if (isIdStart(ch)) {
        var id = '';
        while (i < n && isIdPart(src[i])) { id += src[i]; i++; col++; }
        tokens.push({
          type: KEYWORDS[id] ? 'kw' : 'id',
          value: id, line: startLine, col: startCol
        });
        continue;
      }

      // 数字
      if (isDigit(ch) || (ch === '.' && isDigit(src[i + 1]))) {
        var numRaw = '';
        var isFloat = false;
        if (ch === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
          numRaw += src[i]; numRaw += src[i + 1]; i += 2; col += 2;
          while (i < n && (isHex(src[i]) || src[i] === "'")) { if (src[i] !== "'") numRaw += src[i]; i++; col++; }
        } else if (ch === '0' && (src[i + 1] === 'b' || src[i + 1] === 'B')) {
          numRaw += src[i]; numRaw += src[i + 1]; i += 2; col += 2;
          while (i < n && (src[i] === '0' || src[i] === '1')) { numRaw += src[i]; i++; col++; }
        } else {
          while (i < n && (isDigit(src[i]) || src[i] === '.' || src[i] === "'")) {
            if (src[i] === '.') { if (isFloat) break; isFloat = true; }
            if (src[i] !== "'") numRaw += src[i];
            i++; col++;
          }
          // 指数部分
          if (i < n && (src[i] === 'e' || src[i] === 'E')) {
            var save = i, saveCol = col;
            var expPart = src[i]; i++; col++;
            if (i < n && (src[i] === '+' || src[i] === '-')) { expPart += src[i]; i++; col++; }
            if (i < n && isDigit(src[i])) {
              isFloat = true;
              while (i < n && isDigit(src[i])) { expPart += src[i]; i++; col++; }
              numRaw += expPart;
            } else { i = save; col = saveCol; }
          }
        }
        // 后缀
        var suffix = '';
        while (i < n && /[uUlLfF]/.test(src[i])) {
          if (/[fF]/.test(src[i])) isFloat = true;
          suffix += src[i]; i++; col++;
        }
        var v;
        if (isFloat) v = parseFloat(numRaw);
        else if (/^0[xX]/.test(numRaw)) v = parseInt(numRaw.slice(2), 16);
        else if (/^0[bB]/.test(numRaw)) v = parseInt(numRaw.slice(2), 2);
        else if (/^0[0-7]+$/.test(numRaw)) v = parseInt(numRaw.slice(1), 8);
        else v = parseInt(numRaw, 10);
        if (isNaN(v)) v = 0;
        pushNum(tokens, v, isFloat, numRaw + suffix, startLine, startCol);
        continue;
      }

      // 运算符
      var matched = null;
      for (var p = 0; p < PUNCS.length; p++) {
        var cand = PUNCS[p];
        if (src.substr(i, cand.length) === cand) { matched = cand; break; }
      }
      if (matched) {
        tokens.push({ type: 'punc', value: matched, line: startLine, col: startCol });
        i += matched.length; col += matched.length;
        continue;
      }

      throw new CError('无法识别的字符 “' + ch + '”', startLine, startCol, 'lex');
    }

    tokens.push({ type: 'eof', value: '<结束>', line: line, col: col });
    return tokens;
  }

  /* =====================================================================
   * 3. 宏展开（在 token 流上做，避免破坏字符串）
   * =================================================================== */

  function tokensFromString(s, line) {
    var toks = tokenize(s.replace(/\n/g, ' '));
    var out = [];
    for (var i = 0; i < toks.length; i++) {
      if (toks[i].type === 'eof') break;
      var t = {};
      for (var k in toks[i]) if (Object.prototype.hasOwnProperty.call(toks[i], k)) t[k] = toks[i][k];
      t.line = line;
      out.push(t);
    }
    return out;
  }

  function expandMacros(tokens, macros, guard) {
    var MAX_DEPTH = 40;
    guard = guard || 0;
    if (guard > MAX_DEPTH) throw new CError('宏展开嵌套太深，可能是宏定义里引用了自己', 1, 1, 'preprocess');
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (tok.type !== 'id' || !macros[tok.value]) { out.push(tok); continue; }
      var macro = macros[tok.value];

      if (macro.params === null) {
        var body = tokensFromString(macro.body, tok.line);
        var expanded = expandMacros(body, macros, guard + 1);
        for (var a = 0; a < expanded.length; a++) out.push(expanded[a]);
        continue;
      }

      // 函数宏：必须紧跟 '('
      var j = i + 1;
      if (!(tokens[j] && tokens[j].type === 'punc' && tokens[j].value === '(')) { out.push(tok); continue; }
      var depth = 0;
      var args = [];
      var cur = [];
      j++;
      var ok = false;
      for (; j < tokens.length; j++) {
        var t = tokens[j];
        if (t.type === 'punc' && t.value === '(') { depth++; cur.push(t); continue; }
        if (t.type === 'punc' && t.value === ')') {
          if (depth === 0) { args.push(cur); ok = true; j++; break; }
          depth--; cur.push(t); continue;
        }
        if (t.type === 'punc' && t.value === ',' && depth === 0) { args.push(cur); cur = []; continue; }
        cur.push(t);
      }
      if (!ok) throw new CError('宏 ' + macro.name + ' 的参数列表没有闭合', tok.line, tok.col, 'preprocess');
      // 零参数宏 f() 会被切成一个空参数
      if (args.length === 1 && args[0].length === 0 && macro.params.length === 0) args = [];

      var subst = [];
      var bodyToks = tokensFromString(macro.body, tok.line);
      for (var b = 0; b < bodyToks.length; b++) {
        var bt = bodyToks[b];
        // # 参数 → 字符串化
        if (bt.type === 'punc' && bt.value === '#' && bodyToks[b + 1] && bodyToks[b + 1].type === 'id') {
          var pi = macro.params.indexOf(bodyToks[b + 1].value);
          if (pi >= 0) {
            var str = (args[pi] || []).map(function (x) { return tokenText(x); }).join(' ');
            subst.push({ type: 'str', value: str, line: tok.line, col: tok.col });
            b++;
            continue;
          }
        }
        // ## 拼接：把左右两个 token 的文本连起来重新扫描
        if (bt.type === 'punc' && bt.value === '##') {
          var left = subst.pop();
          var right = bodyToks[b + 1];
          var rtext = right ? tokenText(right) : '';
          if (right && right.type === 'id') {
            var pi2 = macro.params.indexOf(right.value);
            if (pi2 >= 0) rtext = (args[pi2] || []).map(function (x) { return tokenText(x); }).join('');
          }
          var merged = tokenText(left || { type: 'id', value: '' }) + rtext;
          var mtoks = tokensFromString(merged, tok.line);
          for (var q = 0; q < mtoks.length; q++) subst.push(mtoks[q]);
          b++;
          continue;
        }
        if (bt.type === 'id') {
          var idx = macro.params.indexOf(bt.value);
          if (idx >= 0) {
            var argToks = args[idx] || [];
            for (var c = 0; c < argToks.length; c++) subst.push(argToks[c]);
            continue;
          }
        }
        subst.push(bt);
      }
      var exp2 = expandMacros(subst, macros, guard + 1);
      for (var d = 0; d < exp2.length; d++) out.push(exp2[d]);
      i = j - 1;
    }
    return out;
  }

  function tokenText(t) {
    if (!t) return '';
    if (t.type === 'str') return '"' + t.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    if (t.type === 'char') return "'" + String.fromCharCode(t.value) + "'";
    if (t.type === 'num') return t.raw !== undefined ? t.raw : String(t.value);
    return String(t.value);
  }
  MC.tokenText = tokenText;

  /* =====================================================================
   * 对外接口
   * =================================================================== */

  MC.preprocess = preprocess;
  MC.tokenize = tokenize;
  MC.expandMacros = expandMacros;

  /**
   * 编译第一步：源码 → token 数组
   * @returns {{tokens: Array, macros: Object, source: string}}
   */
  MC.lex = function (source) {
    var pre = preprocess(source);
    var raw = tokenize(pre.text);
    var expanded = expandMacros(raw, pre.macros);
    return { tokens: expanded, macros: pre.macros, source: pre.text };
  };

})(typeof window !== 'undefined' ? window : globalThis);
