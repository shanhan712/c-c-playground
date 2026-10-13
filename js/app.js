/* =========================================================================
 * 作者：山寒
 * app.js —— 学习页的全部交互
 * -------------------------------------------------------------------------
 * 依赖（都在 window 上）：
 *   MC.run / MC.selfTest / MC.curriculum / MC.CHEATSHEET / MC.CHAPTERS
 *   window.CPP_SNIPPETS / window.CPP_QUIZBANK
 * ========================================================================= */
(function (global) {
  'use strict';

  var MC = global.MC;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* =====================================================================
   * 0. 进度存档
   * =================================================================== */
  var STORE_KEY = 'mcpp.state.v1';

  var DEFAULT_STATE = {
    xp: 0,
    done: {},              // lessonId -> true
    perfect: {},           // lessonId -> true（习题全对）
    quizRight: 0,
    quizWrong: 0,
    answered: {},          // challengeKey -> {ok:bool, n:int}
    poolRight: {},         // quizbank id -> true
    runs: 0,
    labRuns: 0,
    streak: { last: null, days: 0, best: 0 },
    achievements: {},
    selftestRun: false,
    last: null             // 上次学到哪
  };

  var state = loadState();

  function loadState() {
    var s = JSON.parse(JSON.stringify(DEFAULT_STATE));
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      if (raw) {
        var got = JSON.parse(raw);
        for (var k in s) if (Object.prototype.hasOwnProperty.call(got, k) && got[k] !== null) s[k] = got[k];
        if (!s.streak || typeof s.streak !== 'object') s.streak = { last: null, days: 0, best: 0 };
      }
    } catch (e) { /* 存档坏了就重来，不打扰用户 */ }
    return s;
  }

  var saveTimer = null;
  function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { global.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { }
    }, 200);
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function touchStreak() {
    var t = todayStr();
    if (state.streak.last === t) return;
    var y = new Date(Date.now() - 86400000);
    var yStr = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    state.streak.days = (state.streak.last === yStr) ? (state.streak.days + 1) : 1;
    state.streak.last = t;
    if (state.streak.days > state.streak.best) state.streak.best = state.streak.days;
    save();
  }

  /* =====================================================================
   * 1. 等级 & 成就
   * =================================================================== */
  var LEVEL_TITLES = [
    '新手上路', '语法学徒', '循环掌握者', '数组旅人', '指针入门',
    '结构体工匠', '内存法师', 'C++ 学徒', '代码匠人', '架构思考者', '传说级程序员'
  ];

  function xpForLevel(L) { return 25 * L * (L - 1); }   // L=1→0, 2→50, 3→150, 4→300 …

  function levelInfo(xp) {
    var L = 1;
    while (xpForLevel(L + 1) <= xp && L < 99) L++;
    var base = xpForLevel(L), next = xpForLevel(L + 1);
    return {
      level: L,
      title: LEVEL_TITLES[Math.min(L - 1, LEVEL_TITLES.length - 1)],
      cur: xp - base,
      need: next - base,
      pct: Math.max(0, Math.min(100, Math.round((xp - base) / (next - base) * 100)))
    };
  }

  function doneCount() { return Object.keys(state.done).length; }

  function chapterDone(chId) {
    var c = null;
    for (var i = 0; i < CUR.chapters.length; i++) if (CUR.chapters[i].id === chId) c = CUR.chapters[i];
    if (!c || !c.lessons.length) return false;
    for (var j = 0; j < c.lessons.length; j++) if (!state.done[c.lessons[j].id]) return false;
    return true;
  }

  var ACHIEVEMENTS = [
    { id: 'first-run', icon: '🎬', title: 'Hello, World!', desc: '第一次运行程序', test: function () { return state.runs >= 1; } },
    { id: 'run-10', icon: '⚡', title: '手速渐长', desc: '累计运行 10 次代码', test: function () { return state.runs >= 10; } },
    { id: 'run-50', icon: '🔥', title: '火力全开', desc: '累计运行 50 次代码', test: function () { return state.runs >= 50; } },
    { id: 'ch-start', icon: '🚀', title: '起步完成', desc: '通关「起步」整章', test: function () { return chapterDone('start'); } },
    { id: 'ch-flow', icon: '🔀', title: '能拐弯了', desc: '通关「流程控制」整章', test: function () { return chapterDone('flow'); } },
    { id: 'ch-ptr', icon: '🎯', title: '敢碰指针', desc: '通关「指针」整章', test: function () { return chapterDone('pointer'); } },
    { id: 'ch-oop', icon: '🏛️', title: '面向对象', desc: '通关「C++ 面向对象」整章', test: function () { return chapterDone('cpp-oop'); } },
    { id: 'lesson-10', icon: '📚', title: '十课达成', desc: '完成 10 个小节', test: function () { return doneCount() >= 10; } },
    { id: 'lesson-22', icon: '🎓', title: '过半', desc: '完成 22 个小节', test: function () { return doneCount() >= 22; } },
    { id: 'all', icon: '👑', title: '全通关', desc: '完成全部小节', test: function () { return CUR.lessons.length > 0 && doneCount() >= CUR.lessons.length; } },
    { id: 'streak-3', icon: '📅', title: '三日不辍', desc: '连续 3 天来学习', test: function () { return state.streak.best >= 3; } },
    { id: 'quiz-10', icon: '🎯', title: '答题达人', desc: '累计答对 10 题', test: function () { return state.quizRight >= 10; } },
    { id: 'quiz-50', icon: '🧠', title: '题海无涯', desc: '累计答对 50 题', test: function () { return state.quizRight >= 50; } },
    { id: 'perfect', icon: '💎', title: '一气呵成', desc: '某节小节的习题全部一次答对', test: function () { return Object.keys(state.perfect).length >= 1; } },
    { id: 'lab-10', icon: '🧪', title: '实验室常客', desc: '在代码实验室运行 10 段代码', test: function () { return state.labRuns >= 10; } },
    { id: 'selftest', icon: '🔬', title: '内核自检', desc: '跑过一次引擎自检', test: function () { return !!state.selftestRun; } }
  ];

  function checkAchievements() {
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (state.achievements[a.id]) continue;
      var ok = false;
      try { ok = a.test(); } catch (e) { ok = false; }
      if (ok) {
        state.achievements[a.id] = true;
        save();
        toast(a.icon + '  解锁成就：' + a.title, 'achv');
      }
    }
  }

  function addXp(n, why) {
    if (!n) return;
    state.xp += n;
    save();
    var el = $('#xp-num');
    if (el) {
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
    renderStatusBar();
    toast('+' + n + ' XP' + (why ? ' · ' + why : ''), 'xp');
    checkAchievements();
  }

  /* =====================================================================
   * 2. 小工具
   * =================================================================== */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var toastBox = null;
  function toast(msg, kind) {
    if (!toastBox) return;
    var d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.textContent = msg;
    toastBox.appendChild(d);
    setTimeout(function () { d.classList.add('out'); }, 1900);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2400);
  }

  /* ---- markdown-lite：[[行内代码]] / **粗体** / 列表 / 引用 ---- */
  function richHtml(text) {
    var esc = escapeHtml(text);
    function inline(s) {
      s = s.replace(/\[\[(.+?)\]\]/g, function (_, c) { return '<code>' + c + '</code>'; });
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return s;
    }
    var lines = esc.split('\n');
    var out = [], para = [], list = null;
    function flushPara() { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } }
    function flushList() { if (list) { out.push('</' + list + '>'); list = null; } }
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], t = raw.trim();
      if (!t) { flushPara(); flushList(); continue; }
      if (t.indexOf('&gt;') === 0) {
        flushPara(); flushList();
        out.push('<blockquote>' + inline(t.replace(/^&gt;\s?/, '')) + '</blockquote>');
        continue;
      }
      var m = /^(\d+)\.\s+(.*)$/.exec(t);
      if (m) {
        flushPara();
        if (list !== 'ol') { flushList(); out.push('<ol>'); list = 'ol'; }
        out.push('<li>' + inline(m[2]) + '</li>');
        continue;
      }
      m = /^[-*]\s+(.*)$/.exec(t);
      if (m) {
        flushPara();
        if (list !== 'ul') { flushList(); out.push('<ul>'); list = 'ul'; }
        out.push('<li>' + inline(m[1]) + '</li>');
        continue;
      }
      para.push(inline(t));
    }
    flushPara(); flushList();
    return out.join('\n');
  }

  /* =====================================================================
   * 3. C/C++ 语法高亮
   * =================================================================== */
  var KW = ('if else for while do switch case default break continue return goto sizeof typedef struct union enum ' +
    'static const extern inline volatile register signed unsigned void class public private protected virtual ' +
    'override new delete this namespace using template typename try catch throw operator friend constexpr ' +
    'nullptr true false bool auto').split(' ').reduce(function (o, k) { o[k] = 1; return o; }, {});

  var TY = ('int char short long float double void bool string vector size_t FILE').split(' ')
    .reduce(function (o, k) { o[k] = 1; return o; }, {});

  var STD = {};
  ('std cout cin endl string vector sort printf scanf malloc free strlen strcmp strcpy strcat sprintf atoi atof ' +
    'toupper tolower abs fabs sqrt pow sizeof main push_back pop_back size substr begin end empty insert erase clear ' +
    'max min swap reverse find length c_str at resize front back').split(' ')
    .forEach(function (k) { STD[k] = 1; });

  function span(cls, s) { return '<span class="t-' + cls + '">' + escapeHtml(s) + '</span>'; }

  function lineStartOnly(src, i) {
    for (var j = i - 1; j >= 0; j--) {
      if (src[j] === '\n') return true;
      if (src[j] !== ' ' && src[j] !== '\t') return false;
    }
    return true;
  }

  function highlightC(src) {
    var out = '', i = 0, n = src.length;
    while (i < n) {
      var c = src[i];

      if (c === '/' && src[i + 1] === '/') {
        var e1 = src.indexOf('\n', i); if (e1 < 0) e1 = n;
        out += span('com', src.slice(i, e1)); i = e1; continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        var e2 = src.indexOf('*/', i + 2); e2 = (e2 < 0) ? n : e2 + 2;
        out += span('com', src.slice(i, e2)); i = e2; continue;
      }
      if (c === '#' && lineStartOnly(src, i)) {
        var e3 = src.indexOf('\n', i); if (e3 < 0) e3 = n;
        out += span('pre', src.slice(i, e3)); i = e3; continue;
      }
      if (c === '"' || c === "'") {
        var q = c, j = i + 1;
        while (j < n) {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === q) { j++; break; }
          if (src[j] === '\n') break;
          j++;
        }
        out += span('str', src.slice(i, Math.min(j, n))); i = Math.min(j, n); continue;
      }
      if (c >= '0' && c <= '9' || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
        var j2 = i;
        while (j2 < n && /[0-9a-fA-FxX._]/.test(src[j2])) j2++;
        out += span('num', src.slice(i, j2)); i = j2; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var j3 = i;
        while (j3 < n && /[A-Za-z0-9_]/.test(src[j3])) j3++;
        var w = src.slice(i, j3);
        if (KW[w]) out += span('kw', w);
        else if (TY[w]) out += span('ty', w);
        else if (STD[w]) out += span('std', w);
        else if (src[j3] === '(') out += span('fn', w);
        else out += escapeHtml(w);
        i = j3; continue;
      }
      if ('+-*/%=<>!&|^~?:'.indexOf(c) >= 0) { out += span('op', c); i++; continue; }
      out += escapeHtml(c); i++;
    }
    return out;
  }

  /* =====================================================================
   * 4. 代码编辑器组件
   * =================================================================== */
  function Editor(host, options) {
    options = options || {};
    this.host = host;
    this.onRun = options.onRun || function () { };
    this.readonly = !!options.readonly;
    this.minHeight = options.minHeight || 96;
    this.maxHeight = options.maxHeight || 440;
    host.classList.add('editor');
    host.innerHTML =
      '<div class="ed-gutter"></div>' +
      '<div class="ed-body">' +
      '<pre class="ed-pre" aria-hidden="true"><code></code></pre>' +
      '<textarea class="ed-ta" spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off"></textarea>' +
      '</div>';
    this.gutter = $('.ed-gutter', host);
    this.body = $('.ed-body', host);
    this.pre = $('.ed-pre code', host);
    this.ta = $('.ed-ta', host);
    this.errLine = 0;

    var self = this;
    this.ta.addEventListener('input', function () { self.refresh(); });
    this.ta.addEventListener('scroll', function () { self.sync(); });
    this.ta.addEventListener('keydown', function (ev) { self.onKey(ev); });
    this.pre.parentNode.style.minHeight = '';
    this.refresh();
  }

  Editor.prototype.setValue = function (v, silent) {
    this.ta.value = v == null ? '' : String(v);
    this.errLine = 0;
    this.refresh();
    if (!silent) this.ta.scrollTop = 0;
  };
  Editor.prototype.getValue = function () { return this.ta.value; };
  Editor.prototype.setErrorLine = function (ln) { this.errLine = ln || 0; this.refresh(); };

  Editor.prototype.onKey = function (ev) {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      this.onRun();
      return;
    }
    if (ev.key === 'Tab') {
      ev.preventDefault();
      var ta = this.ta, s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
      if (s === e) {
        ta.value = v.slice(0, s) + '    ' + v.slice(e);
        ta.selectionStart = ta.selectionEnd = s + 4;
      } else {
        var lines = v.slice(0, s).split('\n').length - 1;
        var parts = v.split('\n');
        var lastLine = v.slice(0, e).split('\n').length - 1;
        for (var i = lines; i <= lastLine; i++) parts[i] = '    ' + parts[i];
        ta.value = parts.join('\n');
        ta.selectionStart = s; ta.selectionEnd = e + 4 * (lastLine - lines + 1);
      }
      this.refresh();
      return;
    }
    if (ev.key === 'Enter') {
      var ta2 = this.ta, p = ta2.selectionStart, val = ta2.value;
      var ls = val.lastIndexOf('\n', p - 1) + 1;
      var line = val.slice(ls, p);
      var indent = (/^[ \t]*/.exec(line) || [''])[0];
      var extra = /[{(]\s*$/.test(line) ? '    ' : '';
      if (extra && val[p] === '}') {
        ev.preventDefault();
        var nl = '\n' + indent + extra + '\n' + indent;
        ta2.value = val.slice(0, p) + nl + val.slice(p);
        ta2.selectionStart = ta2.selectionEnd = p + 1 + indent.length + extra.length;
        this.refresh();
        return;
      }
      if (indent || extra) {
        ev.preventDefault();
        var ins = '\n' + indent + extra;
        ta2.value = val.slice(0, p) + ins + val.slice(p);
        ta2.selectionStart = ta2.selectionEnd = p + ins.length;
        this.refresh();
        return;
      }
    }
  };

  Editor.prototype.sync = function () {
    this.pre.parentNode.scrollTop = this.ta.scrollTop;
    this.pre.parentNode.scrollLeft = this.ta.scrollLeft;
    this.gutter.scrollTop = this.ta.scrollTop;
  };

  Editor.prototype.refresh = function () {
    var v = this.ta.value;
    this.pre.innerHTML = highlightC(v) + '\n';
    var lines = v.split('\n').length;
    var g = [];
    for (var i = 1; i <= lines; i++) {
      g.push('<div class="ln' + (i === this.errLine ? ' err' : '') + '">' + i + '</div>');
    }
    this.gutter.innerHTML = g.join('');
    // 自适应高度（不超过上限）
    var h = Math.min(Math.max(lines * 22 + 24, this.minHeight), this.maxHeight);
    this.body.style.height = h + 'px';
    this.sync();
  };

  /* =====================================================================
   * 5. 运行结果渲染
   * =================================================================== */
  function runProgram(src, opts) {
    opts = opts || {};
    try {
      return MC.run(src, { stdin: opts.stdin || '', timeLimit: opts.timeLimit || 3000 });
    } catch (e) {
      return {
        ok: false, output: '', steps: 0, elapsed: 0, snapshot: null,
        error: { message: '引擎内部错误：' + (e && e.message ? e.message : String(e)), line: 0, col: 0, phase: 'internal' }
      };
    }
  }

  /**
   * 渲染运行结果到容器。
   * @param {HTMLElement} box
   * @param {object} res  MC.run 的返回
   * @param {object} opt  {expect, onErrorLine, showMeta}
   */
  function renderResult(box, res, opt) {
    opt = opt || {};
    var html = '';
    if (res.error) {
      var ln = res.error.line || 0;
      var phaseName = (res.error.phase === 'lex' || res.error.phase === 'parse' || res.error.phase === 'compile') ? '编译错误'
        : res.error.phase === 'runtime' ? '运行时崩溃'
          : res.error.phase === 'exit' ? '程序退出' : '出错了';
      html += '<div class="res-err">'
        + '<div class="res-err-head">✗ ' + phaseName + (ln ? '　第 ' + ln + ' 行' + (res.error.col ? ' 第 ' + res.error.col + ' 列' : '') : '')
        + '</div>'
        + '<div class="res-err-msg">' + escapeHtml(res.error.message) + '</div>'
        + '</div>';
      if (opt.onErrorLine) opt.onErrorLine(ln);
    } else {
      if (opt.onErrorLine) opt.onErrorLine(0);
    }

    if (res.output) {
      html += '<pre class="res-out">' + escapeHtml(res.output) + '</pre>';
    } else if (!res.error) {
      html += '<pre class="res-out empty">(程序正常结束，但什么都没输出)</pre>';
    }

    if (opt.expect != null) {
      var same = res.ok && res.output === opt.expect;
      if (res.ok) {
        if (same) {
          html += '<div class="res-check ok">✓ 输出和参考答案完全一致</div>';
        } else {
          html += '<div class="res-check no">△ 输出和参考答案不一样，往下看看差在哪</div>'
            + '<div class="res-diff"><div class="res-diff-col"><h5>你的输出</h5><pre>'
            + escapeHtml(res.output || '(空)') + '</pre></div>'
            + '<div class="res-diff-col"><h5>参考答案</h5><pre>'
            + escapeHtml(opt.expect) + '</pre></div></div>';
        }
      }
    }

    if (opt.showMeta !== false) {
      var meta = [];
      if (res.ok || res.output) {
        meta.push('跑了 ' + res.steps.toLocaleString() + ' 步');
        meta.push(res.elapsed.toFixed(1) + ' ms');
      }
      if (meta.length) html += '<div class="res-meta">' + meta.join(' · ') + '</div>';
    }

    box.innerHTML = html;
    box.classList.add('shown');
  }

  /* =====================================================================
   * 6. 内存可视化（64 KiB → 256×256 像素热力图）
   * =================================================================== */
  var MEM_W = 256, MEM_H = 256;

  var REGIONS = [
    { name: '全局区 / 常量', from: 0x0000, to: 0x1FFF, base: [28, 51, 84], used: [56, 189, 248], key: 'globals' },
    { name: '堆（malloc / new）', from: 0x2000, to: 0x6FFF, base: [74, 46, 16], used: [251, 191, 36], key: 'heap' },
    { name: '临时对象区', from: 0x7000, to: 0x7FFF, base: [61, 32, 77], used: [192, 132, 252], key: 'temp' },
    { name: '栈（局部变量）', from: 0x8000, to: 0xFFFF, base: [18, 58, 44], used: [52, 211, 153], key: 'stack' }
  ];

  function regionOf(addr) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (addr >= REGIONS[i].from && addr <= REGIONS[i].to) return REGIONS[i];
    }
    return REGIONS[0];
  }

  function hex(a) { return '0x' + a.toString(16).toUpperCase().padStart(4, '0'); }

  function drawMemory(canvas, snap, hoverInfo) {
    canvas.width = MEM_W; canvas.height = MEM_H;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(MEM_W, MEM_H);
    var d = img.data;
    var a, p, i;

    for (a = 0; a < 65536; a++) {
      var rg = regionOf(a);
      p = a * 4;
      d[p] = rg.base[0]; d[p + 1] = rg.base[1]; d[p + 2] = rg.base[2]; d[p + 3] = 255;
    }

    function mark(addr, size, rgb) {
      if (typeof addr !== 'number' || !isFinite(addr)) return;
      for (var k = 0; k < size; k++) {
        var x = addr + k;
        if (x < 0 || x >= 65536) continue;
        var q = x * 4;
        d[q] = rgb[0]; d[q + 1] = rgb[1]; d[q + 2] = rgb[2];
      }
    }

    var owners = [];
    if (snap) {
      for (i = 0; i < (snap.globals || []).length; i++) {
        var g = snap.globals[i];
        var rgbG = regionOf(g.addr).used;
        mark(g.addr, g.size, rgbG);
        owners.push({ addr: g.addr, size: g.size, label: g.name + ' : ' + g.type, where: '全局' });
      }
      for (i = 0; i < (snap.heap || []).length; i++) {
        var hb = snap.heap[i];
        mark(hb.addr, hb.size, hb.freed ? [107, 114, 128] : [251, 191, 36]);
        owners.push({ addr: hb.addr, size: hb.size, label: (hb.label || '堆块') + (hb.freed ? '（已 free）' : ''), where: '堆' });
      }
      for (i = 0; i < (snap.stack || []).length; i++) {
        var fr = snap.stack[i];
        for (var v = 0; v < fr.vars.length; v++) {
          var vv = fr.vars[v];
          mark(vv.addr, vv.size, [52, 211, 153]);
          owners.push({ addr: vv.addr, size: vv.size, label: vv.name + ' : ' + vv.type, where: '栈 · ' + fr.name + '()' });
        }
        if (fr.sp) {
          owners.push({ addr: fr.sp, size: 1, label: fr.name + '() 的栈帧底', where: '栈' });
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    // 区域分割线
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    [0x2000, 0x7000, 0x8000].forEach(function (b) {
      var y = Math.floor(b / MEM_W) + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MEM_W, y); ctx.stroke();
    });

    canvas._owners = owners;

    if (!canvas._boundHover) {
      canvas._boundHover = true;
      canvas.addEventListener('mousemove', function (ev) {
        var r = canvas.getBoundingClientRect();
        var x = Math.floor((ev.clientX - r.left) / r.width * MEM_W);
        var y = Math.floor((ev.clientY - r.top) / r.height * MEM_H);
        if (x < 0 || x >= MEM_W || y < 0 || y >= MEM_H) return;
        var addr = y * MEM_W + x;
        var rg = regionOf(addr);
        var found = null;
        var list = canvas._owners || [];
        for (var n = 0; n < list.length; n++) {
          if (addr >= list[n].addr && addr < list[n].addr + list[n].size) { found = list[n]; break; }
        }
        if (hoverInfo) hoverInfo(addr, rg, found);
      });
      canvas.addEventListener('mouseleave', function () { if (hoverInfo) hoverInfo(null); });
    }
  }

  /* =====================================================================
   * 7. 视图容器
   * =================================================================== */
  var CUR = { lessons: [], chapters: [], byId: {}, totalPages: 0, totalChallenges: 0 };

  var app = {
    view: 'learn',
    lesson: null,
    page: 0
  };

  function setView(v, opts) {
    app.view = v;
    $$('.tab').forEach(function (t) {
      t.classList.toggle('on', t.dataset.view === v);
    });
    $$('.view').forEach(function (s) { s.classList.toggle('on', s.id === 'view-' + v); });
    if (v === 'lab') Lab.ensure();
    if (v === 'ref') Ref.render();
    if (v === 'quiz') Quiz.render();
    if (v === 'me') Me.render();
    if (opts && opts.scrollTop !== false) global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* =====================================================================
   * 8. 学习视图
   * =================================================================== */
  var Learn = {};

  Learn.renderSidebar = function () {
    var box = $('#sidebar-tree');
    var html = '';
    var lastChapter = null;
    for (var i = 0; i < CUR.chapters.length; i++) {
      var ch = CUR.chapters[i];
      var cdone = 0;
      for (var j = 0; j < ch.lessons.length; j++) if (state.done[ch.lessons[j].id]) cdone++;
      var allDone = cdone === ch.lessons.length;
      html += '<div class="ch-group" data-ch="' + ch.id + '">';
      html += '<div class="ch-head" style="--c:' + ch.color + '">'
        + '<span class="ch-icon">' + ch.icon + '</span>'
        + '<span class="ch-name">' + escapeHtml(ch.title) + '</span>'
        + '<span class="ch-prog' + (allDone ? ' done' : '') + '">' + (allDone ? '✓' : cdone + '/' + ch.lessons.length) + '</span>'
        + '</div>';
      html += '<div class="ch-lessons">';
      for (j = 0; j < ch.lessons.length; j++) {
        var L = ch.lessons[j];
        var on = app.lesson && app.lesson.id === L.id;
        html += '<a class="ls-item' + (on ? ' on' : '') + (state.done[L.id] ? ' done' : '') + '"'
          + ' data-lesson="' + L.id + '" href="#/learn/' + L.id + '">'
          + '<span class="ls-ico">' + (state.done[L.id] ? '✅' : L.icon) + '</span>'
          + '<span class="ls-t">' + escapeHtml(L.title) + '</span>'
          + '<span class="ls-xp">+' + L.xp + '</span>'
          + '</a>';
      }
      html += '</div></div>';
    }
    box.innerHTML = html;

    var first = true;
    $$('.ch-group', box).forEach(function (g) {
      var hasActive = !!$('.ls-item.on', g);
      if (hasActive) { g.classList.add('open'); first = false; }
      else if (first) { /* 保持折叠，突出当前 */ }
    });
    $('.ch-head', box) && null;
    $$('.ch-head', box).forEach(function (h) {
      h.addEventListener('click', function () { h.parentNode.classList.toggle('open'); });
    });
    $$('.ls-item', box).forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        openLesson(a.dataset.lesson, 0);
      });
    });
    var act = $('.ls-item.on', box);
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
  };

  function openLesson(id, page) {
    var L = CUR.byId[id];
    if (!L) return;
    app.lesson = L;
    app.page = Math.max(0, Math.min(page | 0, L.pages.length - 1));
    state.last = { id: id, page: app.page };
    save();
    Learn.render();
    setView('learn');
    if (global.location.hash !== '#/learn/' + id) {
      try { history.replaceState(null, '', '#/learn/' + id); } catch (e) { }
    }
  }

  Learn.render = function () {
    Learn.renderSidebar();
    var host = $('#lesson-host');
    if (!app.lesson) {
      host.innerHTML = Learn.welcomeHtml();
      Learn.bindWelcome();
      return;
    }
    var L = app.lesson, p = L.pages[app.page];
    var ch = L.chapterMeta;
    var html = '';

    html += '<div class="crumb"><span style="color:' + ch.color + '">' + ch.icon + ' ' + escapeHtml(ch.title) + '</span>'
      + ' <i>›</i> <b>' + escapeHtml(L.title) + '</b></div>';

    html += '<article class="page-card">';
    html += '<h2 class="page-title">' + escapeHtml(p.title) + '</h2>';
    html += '<div class="prose">' + richHtml(p.body) + '</div>';

    if (p.tip) html += '<div class="tip-box">💡 ' + richHtml(p.tip) + '</div>';

    if (p.code) {
      html += '<div class="play-block">';
      html += '<div class="play-head"><span class="play-label">✍️ 亲手试试（可以直接改）</span>'
        + '<button class="btn ghost" data-act="reset">↺ 还原</button></div>';
      html += '<div class="editor-host" id="page-editor"></div>';
      html += '<div class="run-bar">'
        + '<button class="btn primary" data-act="run">▶ 运行 <kbd>Ctrl</kbd>+<kbd>Enter</kbd></button>'
        + '<label class="stdin-wrap">输入(stdin) <input class="stdin" type="text" placeholder="scanf / cin 从这里读" value="'
        + escapeHtml(p.stdin || '') + '"></label>'
        + '<label class="expect-toggle"><input type="checkbox" data-act="expect"> 显示参考答案</label>'
        + '</div>';
      html += '<div class="expect-box" hidden><h5>参考答案输出</h5><pre>' + escapeHtml(p.expect || '(无)') + '</pre></div>';
      html += '<div class="result-box" id="page-result"></div>';
      html += '</div>';
    }

    html += '</article>';

    // 分页
    html += '<div class="pager">';
    html += '<button class="btn" data-act="prev"' + (app.page === 0 ? ' disabled' : '') + '>← 上一页</button>';
    html += '<div class="dots">';
    for (var i = 0; i < L.pages.length; i++) {
      html += '<span class="dot' + (i === app.page ? ' on' : '') + '" data-page="' + i + '" title="'
        + escapeHtml(L.pages[i].title) + '"></span>';
    }
    html += '</div>';
    html += '<button class="btn" data-act="next"' + (app.page === L.pages.length - 1 ? ' disabled' : '') + '>下一页 →</button>';
    html += '</div>';

    // 习题
    if (app.page === L.pages.length - 1 && L.challenges.length) {
      html += '<section class="quiz-zone"><h3>🧠 过关小测 <small>答对才记得牢</small></h3>';
      for (var q = 0; q < L.challenges.length; q++) {
        html += Challenge.html(L, L.challenges[q], q);
      }
      html += '<div class="finish-bar" id="finish-bar"></div>';
      html += '</section>';
    }

    host.innerHTML = html;
    Learn.bind(L, p);
    Learn.renderFinishBar();
  };

  Learn.renderFinishBar = function () {
    var bar = $('#finish-bar');
    if (!bar) return;
    var L = app.lesson;
    var done = !!state.done[L.id];
    var answered = 0, right = 0;
    for (var i = 0; i < L.challenges.length; i++) {
      var rec = state.answered[L.id + '#' + i];
      if (rec) { answered++; if (rec.ok) right++; }
    }
    var html = '';
    if (L.challenges.length) {
      html += '<div class="quiz-score">本课习题：已答 ' + answered + '/' + L.challenges.length
        + '，答对 ' + right + '</div>';
    }
    html += '<button class="btn ' + (done ? 'done' : 'primary lg') + '" data-act="finish">'
      + (done ? '✓ 已完成本课' : '完成本课，领取 +' + L.xp + ' XP') + '</button>';
    bar.innerHTML = html;
    var btn = $('[data-act="finish"]', bar);
    btn.addEventListener('click', function () {
      if (state.done[L.id]) { toast('这一课已经完成啦，去看看下一课吧'); return; }
      // 习题全对给额外奖励
      var allRight = L.challenges.length > 0 && right === L.challenges.length;
      state.done[L.id] = true;
      if (allRight) state.perfect[L.id] = true;
      save();
      addXp(L.xp + (allRight ? 10 : 0), allRight ? '本课习题全对！' : '完成《' + L.title + '》');
      Learn.renderSidebar();
      Learn.renderFinishBar();
      var next = nextLessonId(L.id);
      if (next) toast('下一课：' + CUR.byId[next].title, 'info');
    });
  };

  function nextLessonId(id) {
    for (var i = 0; i < CUR.lessons.length; i++) {
      if (CUR.lessons[i].id === id) {
        return i + 1 < CUR.lessons.length ? CUR.lessons[i + 1].id : null;
      }
    }
    return null;
  }

  Learn.bind = function (L, p) {
    var host = $('#lesson-host');

    // 分页
    var bp = $('[data-act="prev"]', host), bn = $('[data-act="next"]', host);
    if (bp) bp.addEventListener('click', function () { openLesson(L.id, app.page - 1); });
    if (bn) bn.addEventListener('click', function () { openLesson(L.id, app.page + 1); });
    $$('.dot', host).forEach(function (d) {
      d.addEventListener('click', function () { openLesson(L.id, +d.dataset.page); });
    });

    // 编辑器
    if (p.code) {
      var resultBox = $('#page-result', host);
      var stdinEl = $('.stdin', host);
      var editor = new Editor($('#page-editor', host), {
        onRun: function () { doRun(); }
      });
      editor.setValue(p.code, true);

      function doRun() {
        var res = runProgram(editor.getValue(), { stdin: stdinEl ? stdinEl.value : '' });
        state.runs++;
        state.lastRunLesson = L.id;
        save();
        if (state.runs === 1) toast('🎬 第一段程序跑起来了！');
        renderResult(resultBox, res, {
          expect: $('[data-act="expect"]', host).checked ? p.expect : null,
          onErrorLine: function (ln) { editor.setErrorLine(ln); }
        });
        if (res.ok && p.expect != null && res.output === p.expect) {
          addXp(2, '输出正确');
        }
        checkAchievements();
      }

      $('[data-act="run"]', host).addEventListener('click', doRun);
      $('[data-act="reset"]', host).addEventListener('click', function () {
        editor.setValue(p.code, true);
        resultBox.innerHTML = '';
        resultBox.classList.remove('shown');
        toast('已还原成原始代码');
      });
      $('[data-act="expect"]', host).addEventListener('change', function (ev) {
        $('.expect-box', host).hidden = !ev.target.checked;
        if (resultBox.classList.contains('shown')) doRun();
      });
    }

    // 习题
    $$('.challenge', host).forEach(function (node) { Challenge.bind(node, L); });
  };

  Learn.welcomeHtml = function () {
    var info = levelInfo(state.xp);
    return '<div class="welcome">'
      + '<div class="welcome-hero">'
      + '<div class="wh-emoji">⚙️</div>'
      + '<h1>C / C++ 游乐场</h1>'
      + '<p>这个网页里装着一个小型的 C/C++ 解释器——不用装编译器，不用配环境，' +
      '左边写完代码右边就能看到结果，还能亲眼看内存里发生了什么。</p>'
      + '<div class="welcome-stats">'
      + '<div class="ws"><b>' + CUR.lessons.length + '</b><span>个小节</span></div>'
      + '<div class="ws"><b>' + CUR.totalChallenges + '</b><span>道随课习题</span></div>'
      + '<div class="ws"><b>' + (global.CPP_SNIPPETS ? global.CPP_SNIPPETS.length : 0) + '</b><span>个可运行例子</span></div>'
      + '<div class="ws"><b>' + (global.CPP_QUIZBANK ? global.CPP_QUIZBANK.length : 0) + '</b><span>道题库</span></div>'
      + '</div>'
      + '<div class="welcome-cta">'
      + '<button class="btn primary lg" data-go="first">🚀 从第一课开始</button>'
      + '<button class="btn lg" data-go="lab">🧪 直接去实验室乱写</button>'
      + '</div>'
      + '<div class="welcome-lv">当前等级 <b>Lv.' + info.level + ' ' + info.title + '</b>　'
      + '<span class="muted">已完成 ' + doneCount() + ' / ' + CUR.lessons.length + ' 小节</span></div>'
      + '</div>'
      + '<div class="welcome-grid">'
      + '<div class="wg-card"><h4>🎮 边玩边学</h4><p>每一页都有可以立刻运行的小程序，改一个数字就能看到不同的结果。看懂一句话，胜过背十行笔记。</p></div>'
      + '<div class="wg-card"><h4>🧠 看得见的内存</h4><p>实验室右侧是真实的 64 KB 内存热力图。指针指到哪、malloc 拿到哪一块，全都画出来。</p></div>'
      + '<div class="wg-card"><h4>📝 错了才学会</h4><p>' + CUR.totalChallenges + ' 道随课习题全部围绕「这句话实际会输出什么」，答错会告诉你为什么。</p></div>'
      + '<div class="wg-card"><h4>🏆 攒 XP 升级</h4><p>完成小节、答对题目都会涨经验，从「新手上路」一路升到「传说级程序员」。</p></div>'
      + '</div></div>';
  };

  Learn.bindWelcome = function () {
    var f = $('[data-go="first"]');
    if (f) f.addEventListener('click', function () {
      var first = null;
      for (var i = 0; i < CUR.lessons.length; i++) if (!state.done[CUR.lessons[i].id]) { first = CUR.lessons[i]; break; }
      openLesson((first || CUR.lessons[0]).id, 0);
    });
    var l = $('[data-go="lab"]');
    if (l) l.addEventListener('click', function () { setView('lab'); });
  };

  /* =====================================================================
   * 9. 习题组件
   * =================================================================== */
  var Challenge = {};

  Challenge.html = function (L, c, idx) {
    var key = L.id + '#' + idx;
    var rec = state.answered[key];
    var h = '<div class="challenge" data-key="' + key + '" data-answer="' + c.answer + '">';
    h += '<div class="ch-head-row">'
      + '<span class="ch-tag ' + (c.type === 'predict' ? 'predict' : 'choice') + '">'
      + (c.type === 'predict' ? '🔮 预测输出' : '❓ 选择题') + '</span>'
      + '<span class="ch-no">第 ' + (idx + 1) + ' 题</span>'
      + (rec ? '<span class="ch-state">' + (rec.ok ? '✅ 已答对' : '❌ 答错过') + '</span>' : '')
      + '</div>';
    h += '<div class="ch-q">' + richHtml(c.question) + '</div>';
    if (c.code) {
      h += '<pre class="ch-code"><code>' + highlightC(c.code) + '</code></pre>';
      h += '<button class="btn tiny" data-act="peek">▶ 直接跑一下看看（会剧透）</button>';
      h += '<div class="ch-peek" hidden></div>';
    }
    h += '<div class="ch-options">';
    for (var i = 0; i < c.options.length; i++) {
      h += '<button class="opt" data-i="' + i + '"><span class="opt-k">' + 'ABCD'[i] + '</span>'
        + '<span class="opt-t">' + richHtml(c.options[i]) + '</span></button>';
    }
    h += '</div>';
    h += '<div class="ch-explain" hidden>' + richHtml(c.explain) + '</div>';
    h += '</div>';
    return h;
  };

  Challenge.bind = function (node, L) {
    var key = node.dataset.key;
    var answer = +node.dataset.answer;
    var key2 = key.split('#');
    var idx = +key2[1];
    var challenge = L.challenges[idx];
    var explain = $('.ch-explain', node);

    $$('.opt', node).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (node.classList.contains('locked-correct')) return;
        var pick = +btn.dataset.i;
        var ok = pick === answer;
        var rec = state.answered[key] || { ok: false, n: 0 };
        rec.n++;
        if (ok) {
          rec.ok = true;
          state.answered[key] = rec;
          state.quizRight++;
          save();
          btn.classList.add('right');
          node.classList.add('locked-correct');
          explain.hidden = false;
          $$('.opt', node).forEach(function (o) { o.disabled = true; });
          var st = $('.ch-state', node);
          if (st) st.textContent = '✅ 已答对'; else {
            var s = document.createElement('span'); s.className = 'ch-state'; s.textContent = '✅ 已答对';
            $('.ch-head-row', node).appendChild(s);
          }
          addXp(rec.n === 1 ? 5 : 2, rec.n === 1 ? '一次答对' : '答对了');
          Learn.renderFinishBar();
        } else {
          state.answered[key] = rec;
          state.quizWrong++;
          save();
          btn.classList.add('wrong');
          btn.disabled = true;
          explain.hidden = false;
          toast('再想想～解释已经展开在下面了', 'warn');
        }
      });
    });

    var peek = $('[data-act="peek"]', node);
    if (peek) {
      peek.addEventListener('click', function () {
        var box = $('.ch-peek', node);
        if (!box.hidden) { box.hidden = true; peek.textContent = '▶ 直接跑一下看看（会剧透）'; return; }
        var res = runProgram(challenge.code, { stdin: challenge.stdin || '' });
        state.runs++; save();
        renderResult(box, res, { showMeta: true });
        box.hidden = false;
        peek.textContent = '▲ 收起运行结果';
        checkAchievements();
      });
    }
  };

  /* =====================================================================
   * 10. 代码实验室
   * =================================================================== */
  var Lab = {
    editor: null,
    ready: false,
    cat: '全部',
    q: '',
    selftestDone: false
  };

  var LAB_TEMPLATE = '#include <stdio.h>\n\nint main() {\n    printf("Hello, C!\\n");\n    return 0;\n}\n';

  Lab.ensure = function () {
    if (Lab.ready) return;
    Lab.ready = true;

    var host = $('#view-lab');
    host.innerHTML =
      '<div class="lab-grid">'
      + '  <aside class="lab-side">'
      + '    <div class="lab-side-head">'
      + '      <input id="lab-search" class="lab-search" type="text" placeholder="🔍 搜例子：冒泡 / 指针 / vector…">'
      + '      <div id="lab-cats" class="chips"></div>'
      + '    </div>'
      + '    <div id="lab-list" class="lab-list"></div>'
      + '  </aside>'
      + '  <section class="lab-main">'
      + '    <div class="lab-toolbar">'
      + '      <button class="btn primary" id="lab-run">▶ 运行 <kbd>Ctrl</kbd>+<kbd>Enter</kbd></button>'
      + '      <button class="btn" id="lab-clear">🗑 清空输出</button>'
      + '      <button class="btn" id="lab-empty">📄 空白模板</button>'
      + '      <button class="btn" id="lab-save">💾 保存到浏览器</button>'
      + '      <button class="btn" id="lab-load">📂 读取上次</button>'
      + '      <label class="stdin-wrap">stdin <input id="lab-stdin" class="stdin" type="text" placeholder="输入数据"></label>'
      + '    </div>'
      + '    <div class="editor-host big" id="lab-editor"></div>'
      + '    <div class="result-box" id="lab-result"></div>'
      + '    <div class="mem-panel">'
      + '      <div class="mem-head">'
      + '        <h3>🧠 内存视图</h3>'
      + '        <span class="mem-hint" id="mem-tip">把鼠标放到图上，看看每个字节是谁在用</span>'
      + '      </div>'
      + '      <div class="mem-body">'
      + '        <canvas id="mem-canvas" class="mem-canvas" width="256" height="256"></canvas>'
      + '        <div class="mem-legend">'
      + '          <div class="lg"><i style="background:#38bdf8"></i>全局变量 / 字符串常量</div>'
      + '          <div class="lg"><i style="background:#fbbf24"></i>堆（malloc / new）</div>'
      + '          <div class="lg"><i style="background:#6b7280"></i>已 free 的堆块</div>'
      + '          <div class="lg"><i style="background:#c084fc"></i>临时对象</div>'
      + '          <div class="lg"><i style="background:#34d399"></i>栈（局部变量）</div>'
      + '          <div class="lg"><i style="background:#0b1220;border:1px solid #334155"></i>尚未使用</div>'
      + '          <div class="mem-scale">1 像素 = 1 字节　·　整张图 = 64 KB</div>'
      + '        </div>'
      + '      </div>'
      + '      <div id="mem-tables" class="mem-tables"></div>'
      + '    </div>'
      + '    <div class="selftest-panel">'
      + '      <div class="st-head">'
      + '        <h3>🔬 引擎内核自检</h3>'
      + '        <button class="btn" id="st-run">跑一遍全部 ' + MC.SELFTEST_CASES.length + ' 项</button>'
      + '      </div>'
      + '      <p class="muted">这些是引擎的「标准答案」测试：整数除法、指针步长、结构体拷贝、printf 格式、' +
      'C++ 的类与容器…… 全部通过说明这个模拟器和真实 C/C++ 的行为一致。</p>'
      + '      <div id="st-out" class="st-out"></div>'
      + '    </div>'
      + '  </section>'
      + '</div>';

    Lab.editor = new Editor($('#lab-editor'), {
      onRun: function () { Lab.run(); }, minHeight: 360, maxHeight: 560
    });
    var saved = null;
    try { saved = global.localStorage.getItem('mcpp.lab.code'); } catch (e) { }
    Lab.editor.setValue(saved || LAB_TEMPLATE, true);
    requestAnimationFrame(function () { Lab.editor.refresh(); });

    $('#lab-run').addEventListener('click', function () { Lab.run(); });
    $('#lab-clear').addEventListener('click', function () {
      var b = $('#lab-result'); b.innerHTML = ''; b.classList.remove('shown');
      drawMemory($('#mem-canvas'), null, Lab.memTip);
      $('#mem-tables').innerHTML = '';
    });
    $('#lab-empty').addEventListener('click', function () { Lab.editor.setValue(LAB_TEMPLATE, true); });
    $('#lab-save').addEventListener('click', function () {
      try {
        global.localStorage.setItem('mcpp.lab.code', Lab.editor.getValue());
        toast('已保存到浏览器本地');
      } catch (e) { toast('保存失败：浏览器不允许写本地存储', 'warn'); }
    });
    $('#lab-load').addEventListener('click', function () {
      try {
        var c = global.localStorage.getItem('mcpp.lab.code');
        if (c) { Lab.editor.setValue(c, true); toast('读回来了'); }
        else toast('还没有保存过代码', 'warn');
      } catch (e) { toast('读取失败', 'warn'); }
    });
    $('#lab-search').addEventListener('input', function (ev) { Lab.q = ev.target.value.trim(); Lab.renderList(); });
    $('#st-run').addEventListener('click', Lab.runSelfTest);

    Lab.renderCats();
    Lab.renderList();
    drawMemory($('#mem-canvas'), null, Lab.memTip);
  };

  Lab.memTip = function (addr, region, owner) {
    var el = $('#mem-tip');
    if (!el) return;
    if (addr == null) { el.textContent = '把鼠标放到图上，看看每个字节是谁在用'; return; }
    var s = hex(addr) + '　' + region.name;
    if (owner) s += '　▸ ' + owner.where + ' 的 ' + owner.label;
    el.textContent = s;
  };

  Lab.renderCats = function () {
    var cats = ['全部'];
    var seen = {};
    (global.CPP_SNIPPETS || []).forEach(function (s) {
      if (s.cat && !seen[s.cat]) { seen[s.cat] = 1; cats.push(s.cat); }
    });
    $('#lab-cats').innerHTML = cats.map(function (c) {
      return '<button class="chip' + (c === Lab.cat ? ' on' : '') + '" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
    }).join('');
    $$('#lab-cats .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        Lab.cat = b.dataset.cat;
        Lab.renderCats(); Lab.renderList();
      });
    });
  };

  Lab.renderList = function () {
    var list = global.CPP_SNIPPETS || [];
    var q = Lab.q.toLowerCase();
    var out = list.filter(function (s) {
      if (Lab.cat !== '全部' && s.cat !== Lab.cat) return false;
      if (!q) return true;
      return (s.title + ' ' + s.desc + ' ' + (s.tags || []).join(' ') + ' ' + s.code).toLowerCase().indexOf(q) >= 0;
    });
    if (!out.length) {
      $('#lab-list').innerHTML = '<div class="lab-empty">没有匹配的例子</div>';
      return;
    }
    var html = '';
    var cur = null;
    out.forEach(function (s) {
      if (s.cat !== cur) { cur = s.cat; html += '<div class="lab-cat-title">' + escapeHtml(cur) + '</div>'; }
      html += '<button class="lab-item" data-id="' + s.id + '">'
        + '<span class="li-t">' + escapeHtml(s.title) + '</span>'
        + '<span class="li-d">' + escapeHtml(s.desc || '') + '</span>'
        + (s.tags && s.tags.length ? '<span class="li-tags">' + s.tags.slice(0, 3).map(function (t) {
          return '<i>' + escapeHtml(t) + '</i>';
        }).join('') + '</span>' : '')
        + '</button>';
    });
    $('#lab-list').innerHTML = html;
    $$('#lab-list .lab-item').forEach(function (b) {
      b.addEventListener('click', function () { Lab.open(b.dataset.id); });
    });
  };

  Lab.open = function (id) {
    var s = (global.CPP_SNIPPETS || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    Lab.editor.setValue(s.code, true);
    $('#lab-stdin').value = s.stdin || '';
    $$('#lab-list .lab-item').forEach(function (b) {
      b.classList.toggle('on', b.dataset.id === id);
    });
    Lab.run();
  };

  Lab.run = function () {
    var box = $('#lab-result');
    var res = runProgram(Lab.editor.getValue(), { stdin: $('#lab-stdin').value });
    state.runs++;
    state.labRuns++;
    save();
    renderResult(box, res, { onErrorLine: function (ln) { Lab.editor.setErrorLine(ln); } });
    $('#mem-canvas') && drawMemory($('#mem-canvas'), res.snapshot, Lab.memTip);
    Lab.renderMemTables(res.snapshot);
    checkAchievements();
  };

  Lab.renderMemTables = function (snap) {
    var box = $('#mem-tables');
    if (!box) return;
    if (!snap) { box.innerHTML = ''; return; }
    var h = '';

    if (snap.globals.length) {
      h += '<div class="mem-block"><h4>全局变量</h4><table><tr><th>名字</th><th>类型</th><th>地址</th><th>大小</th><th>当前值</th></tr>';
      snap.globals.forEach(function (g) {
        h += '<tr><td><code>' + escapeHtml(g.name) + '</code></td><td>' + escapeHtml(g.type) + '</td><td>' + hex(g.addr)
          + '</td><td>' + g.size + ' B</td><td>' + escapeHtml(g.value) + '</td></tr>';
      });
      h += '</table></div>';
    }

    if (snap.stack.length) {
      h += '<div class="mem-block"><h4>调用栈（由外到内）</h4>';
      snap.stack.forEach(function (fr) {
        h += '<div class="frame"><div class="frame-name">' + escapeHtml(fr.name) + '()　<span class="muted">栈帧底 '
          + hex(fr.sp) + '</span></div>';
        if (fr.vars.length) {
          h += '<table><tr><th>局部变量</th><th>类型</th><th>地址</th><th>大小</th></tr>';
          fr.vars.forEach(function (v) {
            h += '<tr><td><code>' + escapeHtml(v.name) + '</code></td><td>' + escapeHtml(v.type)
              + '</td><td>' + hex(v.addr) + '</td><td>' + v.size + ' B</td></tr>';
          });
          h += '</table>';
        } else {
          h += '<div class="muted small">（这个函数没有局部变量）</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }

    if (snap.heap.length) {
      h += '<div class="mem-block"><h4>堆内存块</h4><table><tr><th>来源</th><th>地址</th><th>大小</th><th>状态</th></tr>';
      snap.heap.forEach(function (b) {
        h += '<tr><td>' + escapeHtml(b.label || '堆块') + '</td><td>' + hex(b.addr) + '</td><td>' + b.size
          + ' B</td><td>' + (b.freed ? '⚠️ 已释放（再用就是悬垂指针）' : '✅ 使用中') + '</td></tr>';
      });
      h += '</table></div>';
    }

    if (!h) h = '<div class="muted small">程序结束时没有任何变量存活。</div>';
    box.innerHTML = h;
  };

  Lab.runSelfTest = function () {
    var btn = $('#st-run');
    var out = $('#st-out');
    btn.disabled = true;
    btn.textContent = '正在跑…';
    out.innerHTML = '';
    var t0 = Date.now();
    setTimeout(function () {
      var r = MC.selfTest();
      state.selftestRun = true;
      save();
      var elapsed = Date.now() - t0;
      var head = r.fail === 0
        ? '<div class="st-sum ok">✅ 全部通过　' + r.pass + ' / ' + r.total + '　（' + elapsed + ' ms）</div>'
        : '<div class="st-sum no">❌ ' + r.fail + ' 项没通过　' + r.pass + ' / ' + r.total + '</div>';
      var rows = r.results.map(function (x) {
        if (x.ok) return '<div class="st-row ok"><b>✓</b> ' + escapeHtml(x.name) + '</div>';
        return '<div class="st-row no"><b>✗</b> ' + escapeHtml(x.name)
          + '<div class="st-detail"><span>实际：</span><pre>' + escapeHtml(x.got || '(空)') + '</pre>'
          + '<span>期望：</span><pre>' + escapeHtml(x.want || '') + '</pre></div></div>';
      }).join('');
      out.innerHTML = head + rows;
      btn.disabled = false;
      btn.textContent = '再跑一遍';
      checkAchievements();
    }, 30);
  };

  /* =====================================================================
   * 11. 速查表
   * =================================================================== */
  var Ref = {};
  Ref.rendered = false;
  Ref.render = function () {
    if (Ref.rendered) return;
    Ref.rendered = true;
    var host = $('#view-ref');
    var h = '<div class="ref-intro"><h1>📖 C / C++ 速查表</h1>'
      + '<p>写代码时最常见的东西都在这儿了。忘了就回来扫一眼，别硬背。</p></div>';
    h += '<div class="ref-search"><input id="ref-q" type="text" placeholder="🔍 搜索：malloc / vector / 优先级…"></div>';
    h += '<div id="ref-body" class="ref-body"></div>';
    host.innerHTML = h;

    function paint(q) {
      q = (q || '').trim().toLowerCase();
      var out = '';
      MC.CHEATSHEET.forEach(function (sec) {
        var items = sec.items.filter(function (it) {
          if (!q) return true;
          return (it.t + ' ' + it.c).toLowerCase().indexOf(q) >= 0;
        });
        if (!items.length) return;
        out += '<section class="ref-sec"><h2>' + sec.icon + ' ' + escapeHtml(sec.title) + '</h2>';
        items.forEach(function (it) {
          out += '<div class="ref-item"><h4>' + escapeHtml(it.t) + '</h4>'
            + '<pre class="ref-code"><code>' + highlightC(it.c) + '</code></pre></div>';
        });
        out += '</section>';
      });
      if (!out) out = '<div class="lab-empty">没找到，换个关键词试试</div>';
      $('#ref-body').innerHTML = out;
    }
    paint('');
    $('#ref-q').addEventListener('input', function (ev) { paint(ev.target.value); });
  };

  /* =====================================================================
   * 12. 题库
   * =================================================================== */
  var Quiz = {
    idx: 0,
    queue: [],
    topic: '全部',
    level: '全部',
    built: false
  };

  Quiz.render = function () {
    if (!Quiz.built) {
      Quiz.built = true;
      var host = $('#view-quiz');
      host.innerHTML =
        '<div class="quiz-top">'
        + '  <h1>🎯 刷题模式</h1>'
        + '  <p class="muted">' + (global.CPP_QUIZBANK || []).length + ' 道题，全部围绕「这段代码到底输出什么」和「这里为什么会炸」。答错不要紧，看解释才是重点。</p>'
        + '  <div class="quiz-filters">'
        + '    <div class="fgroup"><span>主题</span><div id="q-topics" class="chips"></div></div>'
        + '    <div class="fgroup"><span>难度</span><div id="q-levels" class="chips"></div></div>'
        + '  </div>'
        + '  <div class="quiz-actions">'
        + '    <button class="btn primary" id="q-start">开始刷题</button>'
        + '    <button class="btn" id="q-shuffle">🔀 随机 10 题</button>'
        + '    <span class="muted" id="q-stat"></span>'
        + '  </div>'
        + '</div>'
        + '<div id="q-stage" class="q-stage"></div>';
      Quiz.renderChips();
      $('#q-start').addEventListener('click', function () { Quiz.start(false); });
      $('#q-shuffle').addEventListener('click', function () { Quiz.start(true); });
    }
    Quiz.updateStat();
  };

  Quiz.renderChips = function () {
    var topics = ['全部'], levels = ['全部', 'easy', 'mid', 'hard'];
    var seen = {};
    (global.CPP_QUIZBANK || []).forEach(function (q) { if (q.topic && !seen[q.topic]) { seen[q.topic] = 1; topics.push(q.topic); } });
    var lvName = { '全部': '全部', easy: '简单', mid: '中等', hard: '困难' };
    $('#q-topics').innerHTML = topics.map(function (t) {
      return '<button class="chip' + (t === Quiz.topic ? ' on' : '') + '" data-t="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
    }).join('');
    $('#q-levels').innerHTML = levels.map(function (t) {
      return '<button class="chip' + (t === Quiz.level ? ' on' : '') + '" data-l="' + t + '">' + lvName[t] + '</button>';
    }).join('');
    $$('#q-topics .chip').forEach(function (b) {
      b.addEventListener('click', function () { Quiz.topic = b.dataset.t; Quiz.renderChips(); });
    });
    $$('#q-levels .chip').forEach(function (b) {
      b.addEventListener('click', function () { Quiz.level = b.dataset.l; Quiz.renderChips(); });
    });
  };

  Quiz.pool = function () {
    return (global.CPP_QUIZBANK || []).filter(function (q) {
      if (Quiz.topic !== '全部' && q.topic !== Quiz.topic) return false;
      if (Quiz.level !== '全部' && q.level !== Quiz.level) return false;
      return true;
    });
  };

  Quiz.start = function (shuffle) {
    var pool = Quiz.pool();
    if (!pool.length) { toast('这个筛选下没有题目', 'warn'); return; }
    if (shuffle) {
      pool = pool.slice();
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      pool = pool.slice(0, 10);
    }
    Quiz.queue = pool;
    Quiz.idx = 0;
    Quiz.show();
  };

  Quiz.updateStat = function () {
    var el = $('#q-stat');
    if (!el) return;
    var total = (global.CPP_QUIZBANK || []).length;
    var right = Object.keys(state.poolRight || {}).length;
    el.textContent = '已攻克 ' + right + ' / ' + total + ' 题　·　答对 ' + state.quizRight + ' 次';
  };

  Quiz.show = function () {
    var stage = $('#q-stage');
    if (!Quiz.queue.length) { stage.innerHTML = ''; return; }
    var q = Quiz.queue[Quiz.idx];
    if (!q) {
      stage.innerHTML = '<div class="q-done">🎉 这一轮刷完了！'
        + '<div class="q-done-actions"><button class="btn primary" id="q-again">再来一轮</button></div></div>';
      $('#q-again').addEventListener('click', function () { Quiz.start(true); });
      Quiz.updateStat();
      return;
    }
    var solved = !!state.poolRight[q.id];
    var h = '<div class="q-card" data-id="' + q.id + '">';
    h += '<div class="q-meta"><span class="q-topic">' + escapeHtml(q.topic) + '</span>'
      + '<span class="q-level ' + q.level + '">' + ({ easy: '简单', mid: '中等', hard: '困难' }[q.level] || q.level) + '</span>'
      + '<span class="q-pos">' + (Quiz.idx + 1) + ' / ' + Quiz.queue.length + '</span>'
      + (solved ? '<span class="q-solved">✅ 做过</span>' : '') + '</div>';
    h += '<div class="q-text">' + richHtml(q.q) + '</div>';
    if (q.code) h += '<pre class="ch-code"><code>' + highlightC(q.code) + '</code></pre>';
    h += '<div class="ch-options">';
    q.options.forEach(function (o, i) {
      h += '<button class="opt" data-i="' + i + '"><span class="opt-k">' + 'ABCD'[i] + '</span>'
        + '<span class="opt-t">' + richHtml(o) + '</span></button>';
    });
    h += '</div>';
    h += '<div class="ch-explain" hidden>' + richHtml(q.explain) + '</div>';
    h += '<div class="q-nav"><button class="btn" id="q-prev"' + (Quiz.idx === 0 ? ' disabled' : '') + '>← 上一题</button>'
      + '<button class="btn primary" id="q-next">下一题 →</button></div>';
    h += '</div>';
    stage.innerHTML = h;

    var node = $('.q-card', stage);
    var locked = false;
    $$('.opt', node).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (locked) return;
        var pick = +btn.dataset.i;
        if (pick === q.answer) {
          locked = true;
          btn.classList.add('right');
          $('.ch-explain', node).hidden = false;
          $$('.opt', node).forEach(function (o) { o.disabled = true; });
          var first = !state.poolRight[q.id];
          state.poolRight[q.id] = true;
          state.quizRight++;
          save();
          addXp(first ? 6 : 2, first ? '新题攻克' : '又答对了');
          Quiz.updateStat();
        } else {
          btn.classList.add('wrong');
          btn.disabled = true;
          state.quizWrong++;
          save();
          $('.ch-explain', node).hidden = false;
        }
      });
    });
    $('#q-prev').addEventListener('click', function () { Quiz.idx--; Quiz.show(); });
    $('#q-next').addEventListener('click', function () { Quiz.idx++; Quiz.show(); });
  };

  /* =====================================================================
   * 13. 我的（成就 / 进度）
   * =================================================================== */
  var Me = {};
  Me.render = function () {
    var host = $('#view-me');
    var info = levelInfo(state.xp);
    var h = '';
    h += '<div class="me-top">'
      + '<div class="me-ring" style="--p:' + info.pct + '">'
      + '<div class="me-ring-in"><b>Lv.' + info.level + '</b><span>' + escapeHtml(info.title) + '</span></div>'
      + '</div>'
      + '<div class="me-xp">'
      + '<div class="me-xp-num">' + state.xp + ' <small>XP</small></div>'
      + '<div class="me-bar"><i style="width:' + info.pct + '%"></i></div>'
      + '<div class="muted">距离 Lv.' + (info.level + 1) + ' 还差 ' + (info.need - info.cur) + ' XP</div>'
      + '</div></div>';

    h += '<div class="me-stats">'
      + statCard('📚', doneCount() + ' / ' + CUR.lessons.length, '完成小节')
      + statCard('🔁', String(state.streak.days), '连续学习天数')
      + statCard('🏅', String(state.streak.best), '最长连续记录')
      + statCard('▶️', String(state.runs), '累计运行代码')
      + statCard('🎯', String(state.quizRight), '答对题目')
      + statCard('📈', Math.round(state.quizRight / Math.max(1, state.quizRight + state.quizWrong) * 100) + '%', '正确率')
      + '</div>';

    // 章节进度
    h += '<h2 class="me-h2">章节进度</h2><div class="me-chapters">';
    CUR.chapters.forEach(function (ch) {
      var d = 0;
      ch.lessons.forEach(function (L) { if (state.done[L.id]) d++; });
      var pct = Math.round(d / ch.lessons.length * 100);
      h += '<div class="mc-row"><span class="mc-i">' + ch.icon + '</span>'
        + '<span class="mc-n">' + escapeHtml(ch.title) + '</span>'
        + '<span class="mc-bar"><i style="width:' + pct + '%;background:' + ch.color + '"></i></span>'
        + '<span class="mc-p">' + d + '/' + ch.lessons.length + '</span></div>';
    });
    h += '</div>';

    h += '<h2 class="me-h2">成就 <small class="muted">（' + Object.keys(state.achievements).length + ' / ' + ACHIEVEMENTS.length + '）</small></h2>';
    h += '<div class="achv-grid">';
    ACHIEVEMENTS.forEach(function (a) {
      var got = !!state.achievements[a.id];
      h += '<div class="achv' + (got ? ' got' : '') + '"><div class="achv-i">' + (got ? a.icon : '🔒') + '</div>'
        + '<div class="achv-t">' + escapeHtml(a.title) + '</div>'
        + '<div class="achv-d">' + escapeHtml(a.desc) + '</div></div>';
    });
    h += '</div>';

    h += '<div class="me-danger"><h3>危险操作</h3>'
      + '<p class="muted">会把 XP、成就、完成记录全部清空，代码实验室里保存的代码不受影响。</p>'
      + '<button class="btn danger" id="me-reset">重置全部进度</button></div>';

    host.innerHTML = h;
    $('#me-reset').addEventListener('click', function () {
      if (!global.confirm('确定要清空全部学习进度吗？这个操作没法撤销。')) return;
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      try { global.localStorage.removeItem(STORE_KEY); } catch (e) { }
      save();
      renderStatusBar();
      Learn.renderSidebar();
      Me.render();
      toast('进度已重置，一切从头开始');
    });
  };

  function statCard(icon, num, label) {
    return '<div class="stat-card"><div class="sc-i">' + icon + '</div>'
      + '<div class="sc-n">' + escapeHtml(num) + '</div>'
      + '<div class="sc-l">' + escapeHtml(label) + '</div></div>';
  }

  /* =====================================================================
   * 14. 顶栏状态
   * =================================================================== */
  function renderStatusBar() {
    var info = levelInfo(state.xp);
    var lv = $('#lv-badge');
    if (!lv) return;
    lv.innerHTML = '<b>Lv.' + info.level + '</b><span>' + escapeHtml(info.title) + '</span>';
    var num = $('#xp-num');
    if (num) num.textContent = state.xp;
    var bar = $('#xp-bar i');
    if (bar) bar.style.width = info.pct + '%';
    var st = $('#streak-num');
    if (st) st.textContent = state.streak.days;
    var dn = $('#done-num');
    if (dn) dn.textContent = doneCount() + '/' + CUR.lessons.length;
  }

  /* =====================================================================
   * 15. 启动
   * =================================================================== */
  function boot() {
    toastBox = $('#toasts');
    CUR = MC.curriculum();

    // 顶部 tab
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () { setView(t.dataset.view); });
    });
    $('#brand').addEventListener('click', function () {
      setView('learn');
      if (app.lesson) openLesson(app.lesson.id, 0);
    });
    $('#btn-random').addEventListener('click', function () {
      var L = CUR.lessons[Math.floor(Math.random() * CUR.lessons.length)];
      openLesson(L.id, Math.floor(Math.random() * L.pages.length));
      toast('随机翻到了《' + L.title + '》');
    });
    $('#btn-continue').addEventListener('click', function () {
      var target = null;
      if (state.last && CUR.byId[state.last.id]) target = CUR.byId[state.last.id];
      else {
        for (var i = 0; i < CUR.lessons.length; i++) if (!state.done[CUR.lessons[i].id]) { target = CUR.lessons[i]; break; }
      }
      if (!target) { toast('全部学完了，去刷题或实验室玩吧'); return; }
      openLesson(target.id, state.last && state.last.id === target.id ? state.last.page : 0);
    });

    touchStreak();
    renderStatusBar();
    checkAchievements();

    // 路由
    var hash = global.location.hash || '';
    var m = /^#\/learn\/([\w-]+)(?:\/(\d+))?/.exec(hash);
    if (m && CUR.byId[m[1]]) {
      app.lesson = CUR.byId[m[1]];
      app.page = Math.min(+(m[2] || 0), app.lesson.pages.length - 1);
    } else if (state.last && CUR.byId[state.last.id]) {
      app.lesson = CUR.byId[state.last.id];
      app.page = Math.min(state.last.page || 0, app.lesson.pages.length - 1);
    } else {
      app.lesson = null;
    }

    var v = (hash.indexOf('#/lab') === 0) ? 'lab'
      : (hash.indexOf('#/ref') === 0) ? 'ref'
        : (hash.indexOf('#/quiz') === 0) ? 'quiz'
          : (hash.indexOf('#/me') === 0) ? 'me' : 'learn';

    Learn.render();
    setView(v, { scrollTop: false });

    global.addEventListener('hashchange', function () {
      var h = global.location.hash;
      if (h.indexOf('#/lab') === 0) setView('lab');
      else if (h.indexOf('#/ref') === 0) setView('ref');
      else if (h.indexOf('#/quiz') === 0) setView('quiz');
      else if (h.indexOf('#/me') === 0) setView('me');
      else {
        // 回到课程页（浏览器后退 / 手输地址都要能正确还原）
        var lm = /^#\/learn\/([\w-]+)(?:\/(\d+))?/.exec(h);
        if (lm && CUR.byId[lm[1]]) {
          app.lesson = CUR.byId[lm[1]];
          app.page = Math.max(0, Math.min(+(lm[2] || 0), app.lesson.pages.length - 1));
          Learn.render();
        }
        setView('learn');
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
      if (ev.key === 'ArrowLeft' && app.view === 'learn' && app.lesson && app.page > 0) openLesson(app.lesson.id, app.page - 1);
      if (ev.key === 'ArrowRight' && app.view === 'learn' && app.lesson) openLesson(app.lesson.id, app.page + 1);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
