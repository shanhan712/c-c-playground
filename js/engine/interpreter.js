/* =========================================================================
 * 作者：山寒
 * MiniC 引擎 · 解释器
 * -------------------------------------------------------------------------
 * 特点：
 *   - 真实的平坦内存（64 KiB）+ 真实地址，指针能真的指来指去
 *   - ILP32 数据模型：int / long / 指针 = 4 字节，long long / double = 8 字节
 *   - 栈从高地址向下生长，堆从低地址向上生长，布局和真实机器一致
 *   - 支持 printf / scanf / cin / cout，以及一部分 C++（class / vector / string）
 * ========================================================================= */
(function (global) {
  'use strict';

  var MC = global.MC = global.MC || {};
  var CError = MC.CError;
  var typeSize = MC.typeSize, typeName = MC.typeName, typeEq = MC.typeEq, alignOf = MC.alignOf;

  /* =====================================================================
   * 内存
   * =================================================================== */
  var MEM_SIZE = 0x10000;     // 64 KiB
  var DATA_BASE = 0x0100;     // 全局变量 / 字符串常量
  var DATA_END = 0x1fff;
  var HEAP_BASE = 0x2000;     // 堆（向上生长）
  var HEAP_END = 0x6fff;
  var TEMP_BASE = 0x7000;     // 临时对象（函数返回的结构体等）
  var TEMP_END = 0x7fff;
  var STACK_END = 0x8000;     // 栈底：栈从 0x10000 向下生长到这里

  /* --- UTF-8 编解码 -------------------------------------------------- *
   * 模拟器的内存是字节数组，C 里的 char* 指向的是字节。
   * 所以字符串写进内存时要编成 UTF-8，读出来时再解码 ——
   * 否则中文会在进内存那一刻被截成一个字节，printf 出来就是乱码。
   * ------------------------------------------------------------------ */
  function utf8Bytes(s) {
    s = String(s);
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var c2 = s.charCodeAt(i + 1);
        if (c2 >= 0xdc00 && c2 <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function utf8Length(s) { return utf8Bytes(s).length; }
  function utf8Decode(bytes) {
    var out = '';
    var i = 0;
    while (i < bytes.length) {
      var b = bytes[i];
      if (b < 0x80) { out += String.fromCharCode(b); i++; continue; }
      var n = 0, cp = 0;
      if ((b & 0xe0) === 0xc0) { n = 1; cp = b & 0x1f; }
      else if ((b & 0xf0) === 0xe0) { n = 2; cp = b & 0x0f; }
      else if ((b & 0xf8) === 0xf0) { n = 3; cp = b & 0x07; }
      else { out += String.fromCharCode(b); i++; continue; }
      var ok = true;
      for (var k = 1; k <= n; k++) {
        var cb = bytes[i + k];
        if (cb === undefined || (cb & 0xc0) !== 0x80) { ok = false; break; }
        cp = (cp << 6) | (cb & 0x3f);
      }
      if (!ok) { out += String.fromCharCode(b); i++; continue; }
      i += n + 1;
      if (cp > 0xffff) {
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      } else out += String.fromCharCode(cp);
    }
    return out;
  }

  function Mem() {
    this.size = MEM_SIZE;
    this.buf = new ArrayBuffer(MEM_SIZE);
    this.u8 = new Uint8Array(this.buf);
    this.dv = new DataView(this.buf);
    this.dataTop = DATA_BASE;
    this.heapTop = HEAP_BASE;
    this.tempTop = TEMP_BASE;
    this.sp = MEM_SIZE;
    this.blocks = [];
  }

  Mem.prototype.oob = function (addr, size) {
    if (!(addr >= 0) || addr + size > this.size) {
      throw new CError('访问了非法内存：地址 0x' + (addr >>> 0).toString(16).toUpperCase()
        + '（可能越界或指针没初始化）', 0, 0, 'runtime');
    }
  };
  Mem.prototype.r8 = function (a) { this.oob(a, 1); return this.dv.getUint8(a); };
  Mem.prototype.w8 = function (a, v) { this.oob(a, 1); this.dv.setUint8(a, v & 0xff); };
  Mem.prototype.r16 = function (a) { this.oob(a, 2); return this.dv.getInt16(a, true); };
  Mem.prototype.w16 = function (a, v) { this.oob(a, 2); this.dv.setInt16(a, v & 0xffff, true); };
  Mem.prototype.r32 = function (a) { this.oob(a, 4); return this.dv.getInt32(a, true); };
  Mem.prototype.ru32 = function (a) { this.oob(a, 4); return this.dv.getUint32(a, true); };
  Mem.prototype.w32 = function (a, v) { this.oob(a, 4); this.dv.setInt32(a, v | 0, true); };
  Mem.prototype.wu32 = function (a, v) { this.oob(a, 4); this.dv.setUint32(a, v >>> 0, true); };
  Mem.prototype.r64 = function (a) { this.oob(a, 8); return Number(this.dv.getBigInt64(a, true)); };
  Mem.prototype.w64 = function (a, v) {
    this.oob(a, 8);
    var b;
    try { b = BigInt(Math.trunc(v)); } catch (e) { b = 0n; }
    this.dv.setBigInt64(a, b, true);
  };
  Mem.prototype.rf32 = function (a) { this.oob(a, 4); return this.dv.getFloat32(a, true); };
  Mem.prototype.wf32 = function (a, v) { this.oob(a, 4); this.dv.setFloat32(a, v, true); };
  Mem.prototype.rf64 = function (a) { this.oob(a, 8); return this.dv.getFloat64(a, true); };
  Mem.prototype.wf64 = function (a, v) { this.oob(a, 8); this.dv.setFloat64(a, v, true); };

  Mem.prototype.zero = function (addr, n) {
    this.oob(addr, n);
    for (var i = 0; i < n; i++) this.u8[addr + i] = 0;
  };
  Mem.prototype.copy = function (dst, src, n) {
    if (n <= 0) return;
    this.oob(dst, n); this.oob(src, n);
    this.u8.copyWithin(dst, src, src + n);
  };
  Mem.prototype.readCString = function (addr, limit) {
    var lim = (typeof limit === 'number' && limit > 0) ? limit : 8192;
    var bytes = [];
    for (var i = 0; i < lim; i++) {
      var b = this.r8(addr + i);
      if (b === 0) break;
      bytes.push(b);
    }
    return utf8Decode(bytes);
  };
  // C 字符串的「字节」长度（strlen 用它，中文一个字算 3 字节，和真机一致）
  Mem.prototype.cStrLen = function (addr, limit) {
    var lim = (typeof limit === 'number' && limit > 0) ? limit : 8192;
    for (var i = 0; i < lim; i++) if (this.r8(addr + i) === 0) return i;
    return lim;
  };
  Mem.prototype.writeCString = function (addr, s) {
    var bytes = utf8Bytes(s);
    for (var i = 0; i < bytes.length; i++) this.w8(addr + i, bytes[i]);
    this.w8(addr + bytes.length, 0);
  };
  Mem.prototype.allocGlobal = function (n, align) {
    align = align || 4;
    this.dataTop = Math.ceil(this.dataTop / align) * align;
    var a = this.dataTop;
    this.dataTop += n;
    if (this.dataTop > DATA_END) throw new CError('全局变量区放不下了（这是模拟器的一个限制）', 0, 0, 'runtime');
    this.zero(a, n);
    return a;
  };
  Mem.prototype.allocHeap = function (n, label) {
    var align = 8;
    this.heapTop = Math.ceil(this.heapTop / align) * align;
    if (this.heapTop + n > HEAP_END) throw new CError('堆内存用完了（模拟器只有 20 KB 堆空间）', 0, 0, 'runtime');
    var a = this.heapTop;
    this.heapTop += Math.max(n, 1);
    this.zero(a, Math.max(n, 1));
    this.blocks.push({ addr: a, size: Math.max(n, 1), label: label || '' });
    return a;
  };
  Mem.prototype.allocTemp = function (n) {
    n = Math.max(n, 1);
    if (this.tempTop + n > TEMP_END) this.tempTop = TEMP_BASE;
    var a = this.tempTop;
    this.tempTop += n;
    this.zero(a, n);
    return a;
  };
  Mem.prototype.allocStack = function (n, align) {
    align = align || 4;
    n = Math.max(n, 1);
    this.sp = Math.floor((this.sp - n) / align) * align;
    if (this.sp < STACK_END) throw new CError('栈溢出：递归太深或局部变量太多', 0, 0, 'runtime');
    this.zero(this.sp, n);
    return this.sp;
  };

  /* =====================================================================
   * 运行时值
   * =================================================================== */
  function ptrVal(addr, type, arrType) { return { v: 'ptr', addr: addr >>> 0, type: type, arrType: arrType || null }; }
  function structVal(addr, type) { return { v: 'struct', addr: addr >>> 0, type: type }; }
  function stringVal(s) { return { v: 'string', data: String(s) }; }
  function vectorVal(items, type) { return { v: 'vector', items: items, type: type }; }
  function pairVal(a, b, type) { return { v: 'pair', first: a, second: b, type: type }; }
  function isObj(x) { return x !== null && typeof x === 'object'; }
  function isPtr(x) { return isObj(x) && x.v === 'ptr'; }
  function isStruct(x) { return isObj(x) && x.v === 'struct'; }

  function ReturnSignal(v) { this.value = v; }
  function BreakSignal() { }
  function ContinueSignal() { }
  var BREAK = new BreakSignal(), CONTINUE = new ContinueSignal();

  /* =====================================================================
   * 作用域
   * =================================================================== */
  function Scope(parent) {
    this.vars = Object.create(null);
    this.parent = parent || null;
    this.dtors = null;          // 本作用域里声明过的、需要析构的对象
  }
  Scope.prototype.lookup = function (name) {
    var s = this;
    while (s) {
      if (s.vars[name] !== undefined) return s.vars[name];
      s = s.parent;
    }
    return null;
  };
  Scope.prototype.define = function (name, cell) { this.vars[name] = cell; };

  function Cell(addr, type, obj) {
    this.addr = addr;
    this.type = type;
    this.obj = obj || null;     // std::string / vector / pair 这类对象直接挂在 Cell 上
  }

  /* =====================================================================
   * 数字格式化（printf / cout 共用）
   * =================================================================== */
  function pad(s, width, leftAlign, zeroFill) {
    if (!width || s.length >= width) return s;
    var fill = zeroFill ? '0' : ' ';
    var n = width - s.length;
    var padding = new Array(n + 1).join(fill);
    return leftAlign ? s + padding : padding + s;
  }

  // %05d 这种「补零」的格式化，C 要求符号位在最前面：-42 → "-0042"，而不是 "00-42"
  function padNum(s, width, left, zeroFill) {
    if (!width || s.length >= width) return s;
    if (!zeroFill || left) return pad(s, width, left, zeroFill);
    var sign = '';
    var c0 = s.charAt(0);
    if (c0 === '-' || c0 === '+' || c0 === ' ') { sign = c0; s = s.slice(1); }
    return sign + pad(s, width - sign.length, false, true);
  }

  function toExpString(v, prec, upper) {
    if (!isFinite(v)) return v > 0 ? (upper ? 'INF' : 'inf') : (isNaN(v) ? 'nan' : (upper ? '-INF' : '-inf'));
    var s = v.toExponential(prec);
    var m = /^(-?)(\d)(?:\.(\d+))?e([+-])(\d+)$/.exec(s);
    if (!m) return s;
    var frac = m[3] || '';
    var digits = prec > 0 ? frac.slice(0, prec) : '';
    while (digits.length < prec) digits += '0';
    var expNum = parseInt(m[5], 10);
    var eStr = (m[4] === '-' ? '-' : '+') + (expNum < 10 ? '0' + expNum : String(expNum));
    return m[1] + m[2] + (prec > 0 ? '.' + digits : '') + (upper ? 'E' : 'e') + eStr;
  }

  function toGeneralString(v, prec, upper) {
    if (v === 0) return '0';
    if (!isFinite(v)) return String(v);
    if (prec <= 0) prec = 1;
    var exp = Math.floor(Math.log10(Math.abs(v)));
    if (exp < -4 || exp >= prec) {
      var es = toExpString(v, prec - 1, upper).replace(/0+(?=[eE])/, '').replace(/\.(?=[eE])/, '');
      return es;
    }
    var s = v.toPrecision(prec);
    if (s.indexOf('.') >= 0) {
      s = s.replace(/0+$/, '').replace(/\.$/, '');
    }
    if (s.indexOf('e') >= 0 || s.indexOf('E') >= 0) s = toExpString(v, prec - 1, upper);
    return s;
  }

  function formatOne(conv, flags, width, prec, value) {
    var left = flags.indexOf('-') >= 0;
    var plus = flags.indexOf('+') >= 0;
    var space = flags.indexOf(' ') >= 0;
    var hash = flags.indexOf('#') >= 0;
    var zero = flags.indexOf('0') >= 0 && !left;
    var s = '';
    var num;

    switch (conv) {
      case 'd': case 'i': {
        num = Math.trunc(toNumber(value));
        var sign = '';
        if (num < 0) { sign = '-'; num = -num; }
        else if (plus) sign = '+';
        else if (space) sign = ' ';
        s = sign + String(num);
        if (prec !== undefined && s.length < prec) s = sign + pad(String(num), prec, false, true);
        return padNum(s, width, left, zero && prec === undefined);
      }
      case 'u': {
        num = toNumber(value);
        s = String(num >>> 0);
        return padNum(s, width, left, zero);
      }
      case 'o': {
        num = toNumber(value) >>> 0;
        s = num.toString(8);
        if (hash && s.charAt(0) !== '0') s = '0' + s;
        return padNum(s, width, left, zero);
      }
      case 'x': case 'X': {
        num = toNumber(value) >>> 0;
        s = num.toString(16);
        if (conv === 'X') s = s.toUpperCase();
        var pfx = (hash && num !== 0) ? (conv === 'X' ? '0X' : '0x') : '';
        if (zero && !left && width > s.length + pfx.length) {
          return pfx + pad(s, width - pfx.length, false, true);
        }
        return pad(pfx + s, width, left, false);
      }
      case 'f': case 'F': {
        num = toNumber(value);
        var p = prec === undefined ? 6 : prec;
        if (!isFinite(num)) { s = num > 0 ? 'inf' : (isNaN(num) ? 'nan' : '-inf'); return pad(s, width, left, false); }
        var sgn = '';
        if (num < 0) { sgn = '-'; num = -num; } else if (plus) sgn = '+'; else if (space) sgn = ' ';
        s = sgn + num.toFixed(p);
        return padNum(s, width, left, zero);
      }
      case 'e': case 'E': {
        num = toNumber(value);
        var p2 = prec === undefined ? 6 : prec;
        var sgn2 = '';
        if (num < 0) { sgn2 = '-'; num = -num; } else if (plus) sgn2 = '+'; else if (space) sgn2 = ' ';
        s = sgn2 + toExpString(num, p2, conv === 'E');
        return padNum(s, width, left, zero);
      }
      case 'g': case 'G': {
        num = toNumber(value);
        var p3 = prec === undefined ? 6 : prec;
        if (p3 === 0) p3 = 1;
        var sgn3 = '';
        if (num < 0) { sgn3 = '-'; num = -num; } else if (plus) sgn3 = '+'; else if (space) sgn3 = ' ';
        s = sgn3 + toGeneralString(num, p3, conv === 'G');
        return padNum(s, width, left, zero);
      }
      case 'c': {
        var cv = Math.trunc(toNumber(value));
        s = String.fromCharCode(cv & 0xff);
        return pad(s, width, left, false);
      }
      case 's': {
        s = toDisplayString(value);
        if (prec !== undefined && prec >= 0) s = s.slice(0, prec);
        return pad(s, width, left, false);
      }
      case 'p': {
        var a = isPtr(value) ? value.addr : Math.trunc(toNumber(value)) >>> 0;
        s = '0x' + pad(a.toString(16), 8, false, true);
        return pad(s, width, left, false);
      }
      case '%': return '%';
      default: return '%' + conv;
    }
  }

  // 浮点数装箱：用 {v:'double', n:…} 记住"这是个浮点数"，
  // 这样 5.0/2 才会得到 2.5，而不是像整数那样得到 2。
  function isDouble(v) { return isObj(v) && v.v === 'double'; }
  function dbl(n) { return { v: 'double', n: n }; }

  function toNumber(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (isObj(v) && v.v === 'double') return v.n;
    if (isPtr(v)) return v.addr;
    if (isStruct(v)) return 0;
    if (isObj(v) && v.v === 'string') return parseFloat(v.data) || 0;
    if (isObj(v) && v.v === 'char') return v.code;
    return 0;
  }

  function toDisplayString(v) {
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return toGeneralString(v, 6, false);
    }
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return '(null)';
    if (isObj(v) && v.v === 'double') return toGeneralString(v.n, 6, false);
    if (isPtr(v)) return '0x' + pad((v.addr >>> 0).toString(16), 8, false, true);
    if (isStruct(v)) return '{' + (v.type && v.type.def ? v.type.def.name : 'struct') + '}';
    if (v.v === 'string') return v.data;
    if (v.v === 'char') return String.fromCharCode(v.code);
    if (v.v === 'vector') return '[vector size=' + v.items.length + ']';
    if (v.v === 'ostream' || v.v === 'istream') return '';
    if (v.v === 'endl') return '\n';
    return String(v);
  }

  /* =====================================================================
   * 解释器
   * =================================================================== */
  function Interp(program, options) {
    this.prog = program;
    this.opt = options || {};
    this.mem = new Mem();
    this.out = [];
    this.outLen = 0;
    this.steps = 0;
    this.maxSteps = this.opt.maxSteps || 8000000;
    this.timeLimit = this.opt.timeLimit || 4000;
    this.deadline = Date.now() + this.timeLimit;
    this.funcs = Object.create(null);
    this.globals = new Scope(null);
    this.globalOrder = [];
    this.structs = program.structs || {};
    this.enums = program.enums || {};
    this.objTypes = Object.create(null);      // 地址 → StructDef（虚函数派发用）
    this.objVals = Object.create(null);       // 地址 → string/vector/pair 对象（成员变量用）
    this.litPool = Object.create(null);
    this.frames = [];                          // 调用栈（内存视图用）
    this.stdin = String(this.opt.stdin === undefined ? '' : this.opt.stdin);
    this.stdinPos = 0;
    this.randState = 20240607;
    this.exitCode = null;
    this.builtins = this.makeBuiltins();
    this.usingStd = program.usingStd;
  }

  /* --- 输出 ---------------------------------------------------------- */
  Interp.prototype.print = function (s) {
    this.outLen += s.length;
    if (this.outLen > 400000) {
      if (!this.truncated) {
        this.truncated = true;
        this.out.push('\n…（输出太多，后面的内容被省略了）\n');
      }
      return;
    }
    this.out.push(s);
  };
  Interp.prototype.tick = function () {
    this.steps++;
    if ((this.steps & 2047) === 0) {
      if (Date.now() > this.deadline) {
        throw new CError('程序跑了太久，疑似死循环（超过 ' + Math.round(this.timeLimit / 1000) + ' 秒被强制停止）', 0, 0, 'runtime');
      }
      if (this.steps > this.maxSteps) {
        throw new CError('执行的语句太多了，疑似死循环', 0, 0, 'runtime');
      }
    }
  };

  /* --- 类型工具 ------------------------------------------------------ */
  Interp.prototype.resolveLen = function (lenNode, scope) {
    if (typeof lenNode === 'number') return lenNode;
    if (lenNode === null || lenNode === undefined) return null;
    if (typeof lenNode === 'object' && lenNode.constName) {
      var name = lenNode.constName;
      var cell = scope ? scope.lookup(name) : null;
      if (cell) return Math.trunc(this.readCell(cell, scope));
      if (this.enums) {
        for (var e in this.enums) {
          var ms = this.enums[e];
          for (var i = 0; i < ms.length; i++) if (ms[i].name === name) return ms[i].value;
        }
      }
      return null;
    }
    if (typeof lenNode === 'object' && lenNode.k) {
      return Math.trunc(toNumber(this.eval(lenNode, scope)));
    }
    return null;
  };

  Interp.prototype.concreteSize = function (type, scope) {
    if (type.k === 'arr') {
      var n = this.resolveLen(type.len, scope);
      if (n === null || n === undefined) return 0;
      return n * this.concreteSize(type.of, scope);
    }
    if (type.k === 'ref' || type.k === 'iter') return 4;
    var szX = typeSize(type);
    if (typeof szX !== 'number' || !isFinite(szX) || szX <= 0) return 4;
    return szX;
  };

  Interp.prototype.alignFor = function (type, scope) {
    if (type.k === 'arr') return this.alignFor(type.of, scope);
    if (type.k === 'struct' && type.def) {
      var m = 1;
      for (var i = 0; i < type.def.fields.length; i++) m = Math.max(m, alignOf(type.def.fields[i].type));
      return m;
    }
    return alignOf(type);
  };

  Interp.prototype.defaultFill = function (addr, type, scope) {
    var size = this.concreteSize(type, scope);
    this.mem.zero(addr, size);
    if (type.k === 'arr') {
      var el = type.of;
      var n = this.resolveLen(type.len, scope) || 0;
      var els = this.concreteSize(el, scope);
      if (el.k === 'struct' || el.k === 'arr') {
        for (var i = 0; i < n; i++) this.defaultFill(addr + i * els, el, scope);
      }
    }
  };

  /* --- 读写变量 ------------------------------------------------------ */
  Interp.prototype.readCell = function (cell, scope) {
    if (cell.obj !== null) return cell.obj;
    return this.loadValue(cell.addr, cell.type, scope);
  };

  // 成员函数体里直接写字段名，等价于 this->字段名
  Interp.prototype.implicitMember = function (name, scope) {
    var th = scope.lookup('this');
    if (!th) return null;
    var def = null, addr = null;
    // 方法调用时 Cell 上直接挂着对象本身（最可靠）
    if (th.obj && th.obj.v === 'struct') { def = th.obj.type.def; addr = th.obj.addr; }
    else if (th.type && th.type.k === 'struct') { def = th.type.def; addr = th.addr; }
    else if (th.type && th.type.k === 'ptr' && th.type.to && th.type.to.k === 'struct') {
      def = th.type.to.def;
      var raw = this.mem.ru32(th.addr);
      addr = raw === 0 ? null : raw;
    }
    if (!def || addr === null || addr === undefined) return null;
    var f = this.findField(def, name);
    if (!f) return null;
    return new Cell(addr + f.offset, f.type, null);
  };

  // 成员函数体里直接写 area() 等价于 this->area()（含虚函数派发）
  Interp.prototype.implicitThisTarget = function (name, scope) {
    var th = scope.lookup('this');
    if (!th) return null;
    var def = null, addr = null;
    if (th.obj && th.obj.v === 'struct') { def = th.obj.type.def; addr = th.obj.addr; }
    else if (th.type && th.type.k === 'struct') { def = th.type.def; addr = th.addr; }
    else if (th.type && th.type.k === 'ptr' && th.type.to && th.type.to.k === 'struct') {
      def = th.type.to.def;
      var raw = this.mem.ru32(th.addr);
      addr = raw === 0 ? null : raw;
    }
    if (!def || addr === null || addr === undefined) return null;
    var m = this.findMethod(def, name);
    if (!m) return null;
    return { v: 'boundmethod', addr: addr, def: def, fn: m.fn, name: name };
  };

  Interp.prototype.writeCell = function (cell, val, scope) {
    if (cell.type.k === 'string' || cell.type.k === 'vector' || cell.type.k === 'pair' || cell.type.k === 'iter') {
      this.storeObject(cell, val, cell.type, scope);
      return;
    }
    this.storeValue(cell.addr, cell.type, val, scope);
  };

  // 让 string / vector / pair 这类"对象型"变量一出生就有一个空对象
  Interp.prototype.prepareObjCell = function (cell) {
    if (cell.type.k === 'string') cell.obj = stringVal('');
    else if (cell.type.k === 'vector') cell.obj = vectorVal([], cell.type);
    else if (cell.type.k === 'pair') cell.obj = pairVal(0, 0, cell.type);
    else if (cell.type.k === 'iter') cell.obj = { v: 'iter', target: null, idx: 0 };
  };

  // 把数组长度里的符号常量固化成数字，脱离声明作用域后仍能算出大小
  Interp.prototype.materializeType = function (type, scope) {
    if (!type) return type;
    if (type.k === 'arr') {
      var of = this.materializeType(type.of, scope);
      var n = type.len;
      if (n === null || n === undefined) return { k: 'arr', of: of, len: null };
      if (typeof n !== 'number') {
        var r = this.resolveLen(n, scope);
        n = (r === null || r === undefined) ? null : r;
      }
      return { k: 'arr', of: of, len: n };
    }
    if (type.k === 'ptr') return { k: 'ptr', to: this.materializeType(type.to, scope) };
    if (type.k === 'ref') return { k: 'ref', to: this.materializeType(type.to, scope) };
    if (type.k === 'vector') return { k: 'vector', of: this.materializeType(type.of, scope) };
    return type;
  };

  Interp.prototype.storeObject = function (target, val, type, scope) {
    if (type.k === 'string') {
      if (isObj(val) && val.v === 'string') { target.obj = stringVal(val.data); }
      else if (isPtr(val)) { target.obj = stringVal(this.mem.readCString(val.addr)); }
      else if (typeof val === 'number') { target.obj = stringVal(String.fromCharCode(val & 0xff)); }
      else { target.obj = stringVal(toDisplayString(val)); }
    } else if (type.k === 'vector') {
      if (isObj(val) && val.v === 'vector') {
        var items = [];
        for (var i = 0; i < val.items.length; i++) items.push(this.cloneValue(val.items[i], type.of, scope));
        target.obj = vectorVal(items, type);
      } else {
        target.obj = vectorVal([], type);
      }
    } else if (type.k === 'pair') {
      if (isObj(val) && val.v === 'pair') { target.obj = pairVal(val.first, val.second, type); }
      else { target.obj = pairVal(0, 0, type); }
    } else {
      target.obj = val;
    }
    // 成员变量没有自己的 Cell，只认地址：这一份必须按地址存起来
    if (target.addr !== undefined && target.addr !== null) this.objVals[target.addr] = target.obj;
  };

  // 对象型成员（string / vector / pair）不占内存，而是按地址挂在 objVals 上。
  // 结构体做字节拷贝之后，这些成员必须按新地址重新挂一份（深层复制）。
  Interp.prototype.copyObjFields = function (src, dst, type, scope) {
    if (!type) return;
    if (type.k === 'ref') { this.copyObjFields(src, dst, type.to, scope); return; }
    if (type.k === 'struct' && type.def) {
      var fs = type.def.allFields || type.def.fields || [];
      for (var i = 0; i < fs.length; i++) {
        this.copyObjFields(src + fs[i].offset, dst + fs[i].offset, fs[i].type, scope);
      }
      return;
    }
    if (type.k === 'arr') {
      var es = this.concreteSize(type.of, scope) || 1;
      var n = this.resolveLen(type.len, scope) || 0;
      for (var k = 0; k < n; k++) this.copyObjFields(src + k * es, dst + k * es, type.of, scope);
      return;
    }
    if (type.k === 'string' || type.k === 'vector' || type.k === 'pair' || type.k === 'iter') {
      var o = this.objVals[src];
      if (o === undefined || o === null) return;
      this.objVals[dst] = this.cloneValue(o, type, scope);
    }
  };

  Interp.prototype.cloneValue = function (v, type, scope) {
    if (!isObj(v)) return v;
    if (v.v === 'struct') {
      var sz0 = this.concreteSize(v.type, scope);
      var a = this.mem.allocTemp(sz0);
      this.mem.copy(a, v.addr, sz0);
      this.objTypes[a] = v.type.def;
      this.copyObjFields(v.addr, a, v.type, scope);
      return structVal(a, v.type);
    }
    if (v.v === 'string') return stringVal(v.data);
    if (v.v === 'vector') {
      var items = [];
      for (var i = 0; i < v.items.length; i++) items.push(this.cloneValue(v.items[i], v.type ? v.type.of : null, scope));
      return vectorVal(items, v.type);
    }
    if (v.v === 'pair') return pairVal(v.first, v.second, v.type);
    return v;
  };

  Interp.prototype.loadValue = function (addr, type, scope) {
    switch (type.k) {
      case 'prim': {
        switch (type.name) {
          case 'char': return signExtend(this.mem.r8(addr), 8);
          case 'unsigned char': return this.mem.r8(addr);
          case 'short': return this.mem.r16(addr);
          case 'unsigned short': return this.mem.r16(addr) & 0xffff;
          case 'unsigned int': case 'unsigned long': return this.mem.ru32(addr);
          case 'float': return dbl(this.mem.rf32(addr));
          case 'double': return dbl(this.mem.rf64(addr));
          case 'long long': case 'unsigned long long': return this.mem.r64(addr);
          case 'bool': return this.mem.r8(addr) ? 1 : 0;
          case 'void': return 0;
          default: return this.mem.r32(addr);
        }
      }
      case 'ptr': {
        var raw = this.mem.ru32(addr);
        return raw === 0 ? ptrVal(0, type) : ptrVal(raw, type);
      }
      case 'ref': return this.loadValue(addr, type.to, scope);
      case 'arr': {
        var p = ptrVal(addr, { k: 'ptr', to: type.of }, type);
        return p;
      }
      case 'struct': {
        this.objTypes[addr] = type.def;
        return structVal(addr, type);
      }
      case 'string': {
        if (this.objVals[addr]) return this.objVals[addr];
        return stringVal(this.mem.readCString(addr));
      }
      case 'vector': {
        if (this.objVals[addr]) return this.objVals[addr];
        return vectorVal([], type);
      }
      case 'pair': {
        if (this.objVals[addr]) return this.objVals[addr];
        return pairVal(0, 0, type);
      }
      case 'iter': {
        if (this.objVals[addr]) return this.objVals[addr];
        return { v: 'iter', target: null, idx: 0 };
      }
      default: return 0;
    }
  };

  Interp.prototype.storeValue = function (addr, type, val, scope) {
    switch (type.k) {
      case 'prim': {
        var n = toNumber(val);
        switch (type.name) {
          case 'char': case 'unsigned char': case 'bool': this.mem.w8(addr, n & 0xff); return;
          case 'short': case 'unsigned short': this.mem.w16(addr, n); return;
          case 'unsigned int': case 'unsigned long': this.mem.wu32(addr, n); return;
          case 'float': this.mem.wf32(addr, n); return;
          case 'double': this.mem.wf64(addr, n); return;
          case 'long long': case 'unsigned long long': this.mem.w64(addr, n); return;
          default: this.mem.w32(addr, n | 0); return;
        }
      }
      case 'ptr': {
        var a = isPtr(val) ? val.addr : (isObj(val) && val.v === 'string' ? 0 : Math.trunc(toNumber(val)));
        this.mem.wu32(addr, a >>> 0);
        return;
      }
      case 'ref': this.storeValue(addr, type.to, val, scope); return;
      case 'struct': {
        if (isObj(val) && val.v === 'initlist') {
          var sv0 = this.initlistToStruct(val, type, scope);
          this.mem.copy(addr, sv0.addr, this.concreteSize(type, scope));
          this.objTypes[addr] = type.def;
          this.copyObjFields(sv0.addr, addr, type, scope);
          return;
        }
        if (isStruct(val)) {
          var sz = this.concreteSize(type, scope);
          this.mem.copy(addr, val.addr, Math.min(sz, this.concreteSize(val.type, scope)));
          this.objTypes[addr] = type.def;
          this.copyObjFields(val.addr, addr, type, scope);
          return;
        }
        throw new CError('不能把 ' + typeName(val && val.type) + ' 赋给结构体 ' + typeName(type), 0, 0, 'runtime');
      }
      case 'arr': {
        // 嵌套初始化式：int a[2][3] = {{1,2,3},{4,5,6}};
        if (isObj(val) && val.v === 'initlist') {
          var els2 = this.concreteSize(type.of, scope) || 1;
          var cnt = this.resolveLen(type.len, scope) || val.items.length;
          for (var ii = 0; ii < val.items.length && ii < cnt; ii++) {
            this.storeValue(addr + ii * els2, type.of, this.evalInitItem(val.items[ii], type.of, scope), scope);
          }
          return;
        }
        if (isPtr(val) || isStruct(val)) {
          var n2 = this.concreteSize(type, scope);
          var src = isPtr(val) ? val.addr : val.addr;
          this.mem.copy(addr, src, n2);
          if (isStruct(val)) {
            var cnt2 = this.resolveLen(type.len, scope) || 1;
            var es2 = this.concreteSize(type.of, scope) || 1;
            if (cnt2 === 1) this.copyObjFields(src, addr, type.of, scope);
            else for (var q = 0; q < cnt2; q++) this.copyObjFields(src + q * es2, addr + q * es2, type.of, scope);
          }
          return;
        }
        if (typeof val === 'string') { this.mem.writeCString(addr, val); return; }
        this.mem.zero(addr, this.concreteSize(type, scope));
        return;
      }
      case 'string': case 'vector': case 'pair': case 'iter': {
        // 这三种类型的值放在 Cell 上，成员变量没有 Cell，只能按地址存
        this.storeObject(new Cell(addr, type, null), val, type, scope);
        return;
      }
      default: this.mem.w32(addr, toNumber(val) | 0); return;
    }
  };

  function signExtend(v, bits) {
    var m = 1 << (bits - 1);
    return (v ^ m) - m;
  }

  /* --- 类型转换 ------------------------------------------------------ */
  Interp.prototype.convert = function (val, type, scope) {
    if (!type) return val;
    switch (type.k) {
      case 'prim': {
        if (type.name === 'void') return val;
        if (type.name === 'float' || type.name === 'double') {
          if (isPtr(val)) return val.addr;
          if (isObj(val) && val.v === 'string') return dbl(parseFloat(val.data) || 0);
          return dbl(toNumber(val));
        }
        var n = toNumber(val);
        var tn = Math.trunc(n);
        switch (type.name) {
          case 'bool': return tn !== 0 ? 1 : 0;
          case 'char': return signExtend(tn & 0xff, 8);
          case 'unsigned char': return tn & 0xff;
          case 'short': return signExtend(tn & 0xffff, 16);
          case 'unsigned short': return tn & 0xffff;
          case 'unsigned int': case 'unsigned long': case 'unsigned long long': return tn >>> 0;
          default: return tn | 0;
        }
      }
      case 'iter': return val;
      case 'ptr': {
        if (isPtr(val)) return ptrVal(val.addr, type, val.arrType);
        if (isObj(val) && val.v === 'struct') return ptrVal(val.addr, type);
        var a = Math.trunc(toNumber(val));
        return ptrVal(a >>> 0, type);
      }
      case 'ref': return this.convert(val, type.to, scope);
      case 'struct': {
        if (isStruct(val)) return val;
        if (isObj(val) && val.v === 'initlist') return this.initlistToStruct(val, type, scope);
        throw new CError('类型不匹配：需要 ' + typeName(type), 0, 0, 'runtime');
      }
      case 'string': {
        if (isObj(val) && val.v === 'string') return stringVal(val.data);
        if (isPtr(val)) return stringVal(this.mem.readCString(val.addr));
        if (typeof val === 'string') return stringVal(val);
        if (typeof val === 'number') return stringVal(String.fromCharCode(val & 0xff));
        return stringVal(toDisplayString(val));
      }
      case 'vector': {
        if (isObj(val) && val.v === 'vector') return val;
        // vector<int> v = {1, 2, 3}; 或 push_back({...})
        if (isObj(val) && val.v === 'initlist') {
          var vv = vectorVal([], type);
          var vet = type.of || { k: 'prim', name: 'int', size: 4 };
          var vsc = val.scope || scope || null;
          for (var vq = 0; vq < val.items.length; vq++) {
            var vraw = this.evalInitItem(val.items[vq], vet, vsc);
            vv.items.push(this.cloneValue(this.convert(this.materializeInitlist(vraw, vet, vsc), vet, vsc), vet, vsc));
          }
          return vv;
        }
        return vectorVal([], type);
      }
      case 'pair': {
        if (isObj(val) && val.v === 'pair') return val;
        return pairVal(0, 0, type);
      }
      case 'auto': return val;
      default: return val;
    }
  };

  /* --- 字面量池 ------------------------------------------------------ */
  Interp.prototype.literal = function (s) {
    if (this.litPool[s] !== undefined) return this.litPool[s];
    var bytes = utf8Length(s) + 1;
    var addr = this.mem.allocGlobal(bytes, 1);
    this.mem.writeCString(addr, s);
    this.litPool[s] = addr;
    return addr;
  };

  /* --- 声明 ---------------------------------------------------------- */
  Interp.prototype.allocFor = function (type, scope, name, where) {
    var size = this.concreteSize(type, scope);
    if (size <= 0) size = 4;
    var addr;
    if (where === 'global') addr = this.mem.allocGlobal(size, this.alignFor(type, scope));
    else if (where === 'heap') addr = this.mem.allocHeap(size, name);
    else addr = this.mem.allocStack(size, this.alignFor(type, scope));
    if (type.k === 'struct' && type.def) this.objTypes[addr] = type.def;
    return addr;
  };

  Interp.prototype.declare = function (scope, name, type, init, line, where) {
    type = this.materializeType(type, scope);

    // 引用声明 int& r = a; —— 直接和 a 共用同一块内存（别名）
    if (type.k === 'ref' && init) {
      var lv = this.resolve(init, scope);
      var refCell = lv.cell || new Cell(lv.addr, lv.type);
      scope.define(name, refCell);
      return refCell;
    }

    // auto 推导
    if (type.k === 'auto' && init && init.k !== 'ctorargs') {
      var pre = this.eval(init, scope);
      type = this.materializeType(this.inferType(pre, init), scope);
      var addrA = this.allocFor(type, scope, name, where);
      var cellA = new Cell(addrA, type, null);
      this.prepareObjCell(cellA);
      scope.define(name, cellA);
      this.noteDestructible(scope, cellA, type);
      this.assignTo(cellA, pre, scope, init);
      return cellA;
    }

    var addr = this.allocFor(type, scope, name, where);
    var cell = new Cell(addr, type, null);
    this.prepareObjCell(cell);
    scope.define(name, cell);
    this.noteDestructible(scope, cell, type);

    if (init !== null && init !== undefined) {
      if (init.k === 'ctorargs') {
        if (type.k === 'struct') this.constructStruct(structVal(addr, type), init.args, scope, type.def, line);
        else if (type.k === 'pair') {
          var pargs = [];
          for (var pi = 0; pi < init.args.length; pi++) pargs.push(this.eval(init.args[pi], scope));
          var pv1 = type.first ? this.convert(pargs[0], type.first, scope) : pargs[0];
          var pv2 = type.second ? this.convert(pargs[1], type.second, scope) : pargs[1];
          this.storeObject(cell, pairVal(pv1, pv2, type), type, scope);
        } else if (type.k === 'vector' && init.args.length >= 2) {
          var vn = Math.trunc(toNumber(this.eval(init.args[0], scope)));
          var vfill = this.eval(init.args[1], scope);
          var vitems = [];
          for (var vii = 0; vii < vn && vii < 4096; vii++) vitems.push(this.convert(vfill, type.of, scope));
          this.storeObject(cell, vectorVal(vitems, type), type, scope);
        } else if (init.args.length) this.assignTo(cell, this.eval(init.args[0], scope), scope, init);
      } else {
        this.initCell(cell, init, scope, line);
      }
    } else if (type.k === 'struct' && type.def) {
      var ctors = type.def.ctor || [];
      for (var ci = 0; ci < ctors.length; ci++) {
        if (ctors[ci].params.length === 0) { this.constructStruct(structVal(addr, type), [], scope, type.def, line); break; }
      }
    }
    return cell;
  };

  Interp.prototype.initCell = function (cell, init, scope, line) {
    var type = cell.type;
    try {
      if (init.k === 'initlist') {
        if (type.k === 'arr') {
          // char buf[] = "..." 之外的情况
          var el = type.of;
          var els = this.concreteSize(el, scope);
          var n = this.resolveLen(type.len, scope) || init.items.length;
          for (var i = 0; i < init.items.length && i < n; i++) {
            this.storeValue(cell.addr + i * els, el, this.evalInitItem(init.items[i], el, scope), scope);
          }
          return;
        }
        if (type.k === 'struct' && type.def) {
          var def = type.def;
          for (var f = 0; f < def.fields.length && f < init.items.length; f++) {
            var fd = def.fields[f];
            this.storeValue(cell.addr + fd.offset, fd.type, this.evalInitItem(init.items[f], fd.type, scope), scope);
          }
          return;
        }
        if (type.k === 'vector') {
          // vector<int> v = {1, 2, 3, 4};
          var vet = type.of || { k: 'prim', name: 'int', size: 4 };
          var vitems = [];
          for (var vq2 = 0; vq2 < init.items.length; vq2++) {
            var vraw2 = this.evalInitItem(init.items[vq2], vet, scope);
            vitems.push(this.convert(this.materializeInitlist(vraw2, vet, scope), vet, scope));
          }
          this.writeCell(cell, vectorVal(vitems, type), scope);
          return;
        }
        if (type.k === 'pair') {
          var pt1 = type.first || { k: 'prim', name: 'int', size: 4 };
          var pt2 = type.second || { k: 'prim', name: 'int', size: 4 };
          var pf = this.evalInitItem(init.items[0], pt1, scope);
          var ps = init.items.length > 1 ? this.evalInitItem(init.items[1], pt2, scope) : 0;
          this.writeCell(cell, pairVal(pf, ps, type), scope);
          return;
        }
        var v0 = init.items.length ? this.evalInitItem(init.items[0], type, scope) : this.eval(init.items[0] || { k: 'num', value: 0 }, scope);
        this.writeCell(cell, this.convert(v0, type, scope), scope);
        return;
      }
      if (init.k === 'str' && type.k === 'arr' && type.of.k === 'prim' && type.of.name.indexOf('char') >= 0) {
        var bytes = utf8Bytes(init.value);
        bytes.push(0);
        for (var b = 0; b < bytes.length; b++) this.mem.w8(cell.addr + b, bytes[b]);
        return;
      }
      // 拷贝构造：Widget b = a; —— 类若定义了 Widget(const Widget&)，
      // 必须调它，不能只做字节复制（否则拷贝构造函数里的逻辑被跳过）
      if (type.k === 'struct' && type.def) {
        var cc = this.findCopyCtor(type.def, scope);
        if (cc) {
          var candV = this.eval(init, scope);
          if (isObj(candV) && candV.v === 'struct' && candV.type && candV.type.def &&
              candV.type.def.name === type.def.name && candV.addr !== cell.addr) {
            this.mem.zero(cell.addr, this.concreteSize(type, scope) || 4);
            this.objTypes[cell.addr] = type.def;
            this.constructStruct(structVal(cell.addr, type), [], scope, type.def, line, [candV]);
            return;
          }
        }
      }
      var val = this.eval(init, scope);
      this.assignTo(cell, val, scope, init);
    } catch (e) {
      if (e && e.isCError && !e.line) { e.line = init.line || line; }
      throw e;
    }
  };

  Interp.prototype.evalInitItem = function (node, type, scope) {
    if (node.k === 'initlist') return this.eval(node, scope);
    return this.convert(this.eval(node, scope), type, scope);
  };

  // `S s = {1, 90};` / `S a[2] = {{...},{...}}`：把初始化列表落成一块结构体内存
  Interp.prototype.initlistToStruct = function (il, type, scope) {
    var sz = this.concreteSize(type, scope) || 1;
    var tmp = new Cell(this.mem.allocTemp(sz), type, null);
    this.initCell(tmp, { k: 'initlist', items: il.items, line: il.line || 0 }, il.scope || scope, il.line || 0);
    this.objTypes[tmp.addr] = type.def;
    return structVal(tmp.addr, type);
  };

  Interp.prototype.assignTo = function (cell, val, scope, node) {
    if (cell.type.k === 'auto' || !cell.type || cell.type.k === 'auto') {
      // auto 推导
      cell.type = this.inferType(val, node);
      this.writeCell(cell, this.convert(val, cell.type, scope), scope);
      return;
    }
    if (cell.obj !== null || cell.type.k === 'string' || cell.type.k === 'vector' || cell.type.k === 'pair' || cell.type.k === 'iter') {
      this.storeObject(cell, this.convert(val, cell.type, scope), cell.type, scope);
      return;
    }
    this.writeCell(cell, this.convert(val, cell.type, scope), scope);
  };

  Interp.prototype.inferType = function (val, node) {
    if (isDouble(val)) return { k: 'prim', name: 'double', size: 8 };
    if (typeof val === 'number') {
      if (node && node.k === 'num' && node.isFloat) return { k: 'prim', name: 'double', size: 8 };
      return { k: 'prim', name: 'int', size: 4 };
    }
    if (isObj(val)) {
      if (val.v === 'ptr') return val.type;
      if (val.v === 'struct') return val.type;
      if (val.v === 'string') return { k: 'string' };
      if (val.v === 'vector') return val.type || { k: 'vector', of: { k: 'prim', name: 'int', size: 4 } };
      if (val.v === 'pair') return val.type || { k: 'pair', first: { k: 'prim', name: 'int', size: 4 }, second: { k: 'prim', name: 'int', size: 4 } };
      if (val.v === 'iter') return { k: 'iter' };
    }
    return { k: 'prim', name: 'int', size: 4 };
  };

  /* =====================================================================
   * 左值解析
   * =================================================================== */
  Interp.prototype.resolve = function (node, scope) {
    var self = this;
    switch (node.k) {
      case 'id': {
        var name = node.name;
        var cell = scope.lookup(name);
        if (!cell) cell = this.implicitMember(name, scope);
        if (!cell) {
          if (this.enums) {
            for (var e in this.enums) {
              var ms = this.enums[e];
              for (var i = 0; i < ms.length; i++) {
                if (ms[i].name === name) return { const: ms[i].value, get: function () { return ms[i].value; }, set: function () { throw new CError('不能给枚举常量赋值', node.line, 1, 'runtime'); } };
              }
            }
          }
          throw new CError('变量 “' + name + '” 没有定义（是不是拼错了，或者忘了声明？）', node.line, 1, 'runtime');
        }
        return {
          type: cell.type, addr: cell.addr, cell: cell,
          get: function () { return self.readCell(cell, scope); },
          set: function (v) { self.assignTo(cell, v, scope, node); }
        };
      }
      case 'un': {
        if (node.op === '*') {
          var p = this.eval(node.expr, scope);
          if (isObj(p) && p.v === 'iter') return this.iterLValue(p, node.line);
          if (!isPtr(p)) throw new CError('对非指针用了 * 运算符（需要先取地址 &）', node.line, 1, 'runtime');
          if (!p.type || !p.type.to) throw new CError('这个指针的类型不完整，无法解引用', node.line, 1, 'runtime');
          if (p.addr === 0) throw new CError('对空指针（NULL / nullptr）做了解引用', node.line, 1, 'runtime');
          var t = p.type.to;
          return {
            type: t, addr: p.addr,
            get: function () { return self.loadValue(p.addr, t, scope); },
            set: function (v) { self.storeValue(p.addr, t, v, scope); }
          };
        }
        break;
      }
      case 'index': {
        // 2[a] 这种写法：base 不是左值形态（a[2] 其实是 *(2+a)，反过来也成立）
        var base;
        var swappedIdx = null;
        try {
          base = this.resolve(node.base, scope);
        } catch (e) {
          var bv = this.eval(node.base, scope);
          if (isPtr(bv)) {
            base = {
              type: bv.type, addr: bv.addr,
              get: function () { return bv; },
              set: function () { throw new CError('不能给常量下标赋值', node.line, 1, 'runtime'); }
            };
          } else {
            // 2[a]：把"下标"那一边当成指针，把 base 当成偏移量
            var iv0 = this.eval(node.index, scope);
            if (!isPtr(iv0)) throw e;
            swappedIdx = Math.trunc(toNumber(bv));
            base = {
              type: iv0.type, addr: iv0.addr,
              get: function () { return iv0; },
              set: function () { throw new CError('不能给常量下标赋值', node.line, 1, 'runtime'); }
            };
          }
        }
        var baseType = base.type;
        var bt0 = baseType.k === 'ref' ? baseType.to : baseType;
        var isPtrBase = bt0.k === 'ptr';
        var bt = isPtrBase ? bt0.to : bt0;
        var idx = swappedIdx !== null ? swappedIdx : Math.trunc(toNumber(this.eval(node.index, scope)));
        if (baseType.k === 'vector') {
          var vec = base.get();
          if (!isObj(vec) || vec.v !== 'vector') throw new CError('这个对象不是 vector', node.line, 1, 'runtime');
          var vi = idx;
          if (vi < 0 || vi >= vec.items.length) throw new CError('vector 下标越界：v[' + vi + ']，但 size() 只有 ' + vec.items.length, node.line, 1, 'runtime');
          var elType = vec.type ? vec.type.of : { k: 'prim', name: 'int', size: 4 };
          return {
            type: elType,
            get: function () { return vec.items[vi]; },
            set: function (v) { vec.items[vi] = self.convert(v, elType, scope); }
          };
        }
        if (baseType.k === 'string') {
          var sv = base.get();
          return {
            type: { k: 'prim', name: 'char', size: 1 },
            get: function () { return sv.data.charCodeAt(idx); },
            set: function (v) {
              var ch = String.fromCharCode(toNumber(v) & 0xff);
              sv.data = sv.data.slice(0, idx) + ch + sv.data.slice(idx + 1);
            }
          };
        }
        // 数组 / 指针
        var arrElem = null;
        if (baseType.k === 'arr') arrElem = baseType.of;
        else if (isPtrBase) arrElem = bt0.to;            // 指针也能用 []，等价于 *(p + i)
        else if (bt0.k === 'prim' || bt0.k === 'auto') throw new CError('对普通变量用了下标 []，它既不是数组也不是指针', node.line, 1, 'runtime');
        else if (bt0.k === 'struct' || bt0.k === 'string' || bt0.k === 'vector') throw new CError('这个类型不支持 [] 下标', node.line, 1, 'runtime');
        var et = arrElem || (bt && bt.k ? bt : null);
        if (!et) throw new CError('下标运算用在了不支持的类型上', node.line, 1, 'runtime');
        var esz = this.concreteSize(et, scope);
        // 指针变量用 [] 时，基地址是它保存的地址，而不是这个变量自己的存储地址
        var baseAddr = base.addr;
        if (isPtrBase) {
          var pv0 = base.get();
          if (!isPtr(pv0)) throw new CError('这个表达式不能做下标运算（既不是数组也不是指针）', node.line, 1, 'runtime');
          baseAddr = pv0.addr;
        }
        if (baseAddr === 0) throw new CError('对空指针（NULL / nullptr）做了解引用', node.line, 1, 'runtime');
        var addr = baseAddr + idx * esz;
        if (addr < 0 || addr + esz > this.mem.size) {
          throw new CError('数组下标越界：访问了地址 0x' + (addr >>> 0).toString(16).toUpperCase()
            + '（起始地址 0x' + (baseAddr >>> 0).toString(16).toUpperCase()
            + '，元素 ' + typeName(et) + ' 占 ' + esz + " 字节，下标 " + idx + '）', node.line, 1, 'runtime');
        }
        return {
          type: et, addr: addr,
          get: function () { return self.loadValue(addr, et, scope); },
          set: function (v) { self.storeValue(addr, et, v, scope); }
        };
      }
      case 'member': {
        var objNode = node.obj;
        var objVal;
        var def = null;
        var baseAddr = 0;
        var thisPtr = null;

        if (objNode.k === 'id') {
          var c = scope.lookup(objNode.name);
          if (c && (c.type.k === 'struct' || (c.obj && c.obj.v === 'struct'))) {
            def = c.type.def;
            baseAddr = c.addr;
          }
        }
        if (!def) {
          objVal = this.eval(node.arrow ? objNode : objNode, scope);
          if (isStruct(objVal)) { def = objVal.type.def; baseAddr = objVal.addr; }
          else if (isPtr(objVal) && objVal.type.to && objVal.type.to.k === 'struct') {
            def = objVal.type.to.def;
            baseAddr = objVal.addr;
          }
        }
        if (!def) {
          var ov = objVal !== undefined ? objVal : this.eval(objNode, scope);
          if (isObj(ov) && ov.v === 'pair' && (node.name === 'first' || node.name === 'second')) {
            var that = this;
            var pkey = node.name;
            var pft = (ov.type && ov.type[pkey]) || { k: 'prim', name: 'int', size: 4 };
            return {
              type: pft, addr: baseAddr,
              get: function () { return ov[pkey]; },
              set: function (v) { ov[pkey] = that.convert(v, pft, scope); }
            };
          }
          if (isObj(ov) && (ov.v === 'vector' || ov.v === 'string' || ov.v === 'pair' || ov.v === 'iter')) {
            throw new CError('“' + node.name + '” 不是这个对象的成员', node.line, 1, 'runtime');
          }
          throw new CError('“' + node.name + '” 左边的表达式不是结构体或类', node.line, 1, 'runtime');
        }
        // 沿继承链找字段
        var chain = [def];
        var found = null;
        for (var ci = 0; ci < chain.length; ci++) {
          var d = chain[ci];
          for (var fi = 0; fi < d.fields.length; fi++) {
            if (d.fields[fi].name === node.name) { found = d.fields[fi]; break; }
          }
          if (found) break;
          for (var bi = 0; bi < (d.bases || []).length; bi++) {
            var bd = d.bases[bi].def || this.structs[d.bases[bi].name];
            if (bd) chain.push(bd);
          }
        }
        if (!found) {
          // 可能是无参方法
          if (this.findMethod(def, node.name)) {
            return { method: true, get: function () { throw new CError('“' + node.name + '” 是成员函数，要用 ' + node.name + '() 调用', node.line, 1, 'runtime'); }, set: function () { throw new CError('不能给成员函数赋值', node.line, 1, 'runtime'); } };
          }
          throw new CError('结构体/类 ' + def.name + ' 里没有成员 “' + node.name + '”', node.line, 1, 'runtime');
        }
        var faddr = baseAddr + found.offset;
        var ftype = found.type;
        return {
          type: ftype, addr: faddr, ownerAddr: baseAddr, ownerDef: def,
          get: function () {
            if (ftype.k === 'struct') { self.objTypes[faddr] = ftype.def; return structVal(faddr, ftype); }
            return self.loadValue(faddr, ftype, scope);
          },
          set: function (v) { self.storeValue(faddr, ftype, v, scope); }
        };
      }
      default: break;
    }
    throw new CError('这个表达式不能放在等号左边（不是左值）', node.line, 1, 'runtime');
  };

  Interp.prototype.findMethod = function (def, name) {
    var seen = {};
    var stack = [def];
    while (stack.length) {
      var d = stack.shift();
      if (!d || seen[d.name]) continue;
      seen[d.name] = true;
      if (d.methods && d.methods[name]) return { def: d, fn: d.methods[name] };
      for (var i = 0; i < (d.bases || []).length; i++) {
        var bd = d.bases[i].def || this.structs[d.bases[i].name];
        if (bd) stack.push(bd);
      }
    }
    return null;
  };

  /* =====================================================================
   * 表达式求值
   * =================================================================== */
  Interp.prototype.eval = function (node, scope) {
    this.tick();
    switch (node.k) {
      case 'num': return node.isFloat ? dbl(node.value) : (node.value | 0);
      case 'char': return signExtend(node.value & 0xff, 8);
      case 'str': {
        var addr = this.literal(node.value);
        // 字符串字面量的类型是 char[N+1]（含结尾的 '\0'），
        // 这样 sizeof("hello") 才会是 6 而不是 4
        var arrT = { k: 'arr', of: { k: 'prim', name: 'char', size: 1 }, len: utf8Length(node.value) + 1 };
        var pv = ptrVal(addr, { k: 'ptr', to: { k: 'prim', name: 'char', size: 1 } }, arrT);
        pv.litArr = true;   // 只有字面量本身保留"我是数组"，赋值给指针后就不保留了
        return pv;
      }
      case 'id': return this.evalId(node, scope);
      case 'cmpobj': return { v: 'cmpobj', name: node.name };
      case 'this': {
        var t = scope.lookup('this');
        if (!t) throw new CError('this 只能在成员函数里使用', node.line, 1, 'runtime');
        return t.obj !== null ? t.obj : structVal(t.addr, t.type);
      }
      case 'bin': return this.evalBinary(node, scope);
      case 'un': return this.evalUnary(node, scope);
      case 'post': {
        var lv = this.resolve(node.expr, scope);
        var old = lv.get();
        if (isObj(old) && old.v === 'iter') {
          lv.set({ v: 'iter', target: old.target, idx: old.idx + (node.op === '++' ? 1 : -1) });
        } else if (isPtr(old)) {
          var step = this.concreteSize(old.type.to, scope) || 1;
          lv.set(ptrVal(old.addr + (node.op === '++' ? step : -step), old.type, old.arrType));
        } else {
          lv.set(toNumber(old) + (node.op === '++' ? 1 : -1));
        }
        return old;
      }
      case 'assign': return this.evalAssign(node, scope);
      case 'cond': return toNumber(this.eval(node.test, scope)) !== 0 ? this.eval(node.cons, scope) : this.eval(node.alt, scope);
      case 'comma': this.eval(node.left, scope); return this.eval(node.right, scope);
      case 'index': return this.resolve(node, scope).get();
      case 'member': return this.evalMember(node, scope);
      case 'cast': return this.convert(this.eval(node.expr, scope), node.type, scope);
      case 'sizeof': {
        if (node.type) return this.concreteSize(node.type, scope);
        // sizeof(数组变量) 必须在"数组退化成指针"之前拦住 —— 这是 C 里最容易错的点
        if (node.expr && node.expr.k === 'id') {
          var sc0 = scope.lookup(node.expr.name);
          if (sc0 && sc0.type && sc0.type.k === 'arr') return this.concreteSize(sc0.type, scope);
        }
        var v = this.eval(node.expr, scope);
        // 字符串字面量的类型是 char[N+1]，sizeof 数的是整个数组，不是指针
        if (isPtr(v) && v.litArr && v.arrType) return this.concreteSize(v.arrType, scope);
        if (isStruct(v)) return this.concreteSize(v.type, scope);
        if (isObj(v) && v.v === 'string') return 4;
        if (isObj(v) && v.v === 'vector') return 16;
        var t = this.inferType(v, node.expr);
        return this.concreteSize(t, scope);
      }
      case 'call': return this.evalCall(node, scope);
      case 'initlist': {
        return this.evalInitListAsStruct(node, scope);
      }
      case 'new': return this.evalNew(node, scope);
      case 'delete': return this.evalDelete(node, scope);
      default:
        throw new CError('还不支持这种表达式（' + node.k + '）', node.line, 1, 'runtime');
    }
  };

  Interp.prototype.evalId = function (node, scope) {
    var name = node.name;
    if (name === 'std::cout' || name === 'cout') return { v: 'ostream' };
    if (name === 'std::cin' || name === 'cin') return { v: 'istream' };
    if (name === 'std::endl' || name === 'endl') return { v: 'endl' };
    if (name === 'std::string' || name === 'string') return { v: 'typename', name: 'string' };
    if (name === 'NULL') return ptrVal(0, { k: 'ptr', to: { k: 'prim', name: 'void', size: 0 } });
    if (name === 'EOF') return -1;
    if (name === 'M_PI') return Math.PI;

    var cell = scope.lookup(name);
    if (!cell) cell = this.implicitMember(name, scope);
    if (cell) return this.readCell(cell, scope);

    // 枚举常量
    if (this.enums) {
      for (var e in this.enums) {
        var ms = this.enums[e];
        for (var i = 0; i < ms.length; i++) if (ms[i].name === name) return ms[i].value;
      }
    }
    // 函数名（作为值出现，通常是在调用里）
    if (this.funcs[name] || this.builtins[name]) return { v: 'func', name: name };

    throw new CError('标识符 “' + name + '” 没有定义（是不是拼错了，或者忘了 [[#include]]？）', node.line, 1, 'runtime');
  };

  // 读取 x.y / p->y：可能是"字段"，也可能是"成员函数"（返回一个绑定好的方法给 evalCall 用）
  Interp.prototype.evalMember = function (node, scope) {
    var objNode = node.obj;
    var ov;
    try { ov = this.eval(objNode, scope); }
    catch (e) {
      if (e && e.isCError) throw e;
      ov = null;
    }

    // vector / string / pair / 迭代器：库函数成员
    if (isObj(ov) && ov.v === 'pair' && (node.name === 'first' || node.name === 'second')) {
      return ov[node.name];
    }
    if (isObj(ov) && (ov.v === 'vector' || ov.v === 'string' || ov.v === 'pair' || ov.v === 'iter')) {
      return { v: 'libmethod', obj: ov, name: node.name };
    }

    var def = null, baseAddr = 0;
    if (isStruct(ov)) { def = ov.type.def; baseAddr = ov.addr; }
    else if (isPtr(ov) && ov.type && ov.type.to && ov.type.to.k === 'struct') { def = ov.type.to.def; baseAddr = ov.addr; }

    if (def) {
      var fld = this.findField(def, node.name);
      if (fld) {
        var faddr = baseAddr + fld.offset;
        this.objTypes[baseAddr] = def;
        return this.loadValue(faddr, fld.type, scope);
      }
      var m = this.findMethod(def, node.name);
      if (m) return { v: 'boundmethod', addr: baseAddr, def: def, fn: m.fn, name: node.name };
      throw new CError('结构体/类 ' + def.name + ' 里没有成员 “' + node.name + '”', node.line, 1, 'runtime');
    }
    throw new CError('“' + node.name + '” 左边的表达式不是结构体或类，没有成员', node.line, 1, 'runtime');
  };

  Interp.prototype.evalInitListAsStruct = function (node, scope) {
    return { v: 'initlist', items: node.items, scope: scope, node: node };
  };

  // 把 {a, b} 这种初始化式物化成一个真正的值（struct 要先分配内存再按字段写）
  Interp.prototype.materializeInitlist = function (val, type, scope) {
    if (!isObj(val) || val.v !== 'initlist') return val;
    if (type && type.k === 'struct') {
      var sz = this.concreteSize(type, scope) || 4;
      var addr = this.mem.allocTemp(sz);
      if (type.def) this.objTypes[addr] = type.def;
      var tmpCell = new Cell(addr, type, null);
      this.initCell(tmpCell, val.node || { k: 'initlist', items: val.items }, val.scope || scope, 0);
      return structVal(addr, type);
    }
    return val;
  };

  Interp.prototype.evalNew = function (node, scope) {
    var type = node.type;
    if (type.k === 'struct') {
      var def = type.def;
      var sz = this.concreteSize(type, scope);
      var a = this.mem.allocHeap(sz, def ? def.name : 'struct');
      this.objTypes[a] = def;
      var sv = structVal(a, type);
      if (node.args && node.args.length) {
        this.constructStruct(sv, node.args, scope, def, node.line);
      } else if (def) {
        this.callCtorNoArgs(sv, def, scope, node.line);
      }
      return sv;
    }
    if (node.isArray) {
      var n = Math.trunc(toNumber(this.eval(node.len, scope)));
      var elSize = this.concreteSize(type, scope);
      var base = this.mem.allocHeap(n * elSize, (typeName(type) + '[' + n + ']'));
      return ptrVal(base, { k: 'ptr', to: type }, { k: 'arr', of: type, len: n });
    }
    var size = this.concreteSize(type, scope);
    var addr = this.mem.allocHeap(size, typeName(type));
    if (node.args && node.args.length && type.k === 'prim') {
      this.storeValue(addr, type, this.eval(node.args[0], scope), scope);
    } else if (node.args && node.args.length && type.k === 'struct') {
      var sv2 = structVal(addr, type);
      this.constructStruct(sv2, node.args, scope, type.def, node.line);
    }
    return ptrVal(addr, { k: 'ptr', to: type });
  };

  Interp.prototype.evalDelete = function (node, scope) {
    var p = this.eval(node.expr, scope);
    if (!isPtr(p)) throw new CError('delete 后面必须是 new 出来的指针', node.line, 1, 'runtime');
    // 标记为已释放（教具性质：把内存填成 0xDD，模拟"野指针"看到的样子）
    var size = 4;
    if (p.type && p.type.to) {
      size = this.concreteSize(p.type.to, scope) || 4;
      // delete[] 要整块涂掉：元素个数记在 new 时留下的 arrType 上
      if (node.isArray && p.arrType && p.arrType.len != null) {
        size *= (this.resolveLen(p.arrType.len, scope) || 1);
      }
    }
    try { for (var i = 0; i < Math.max(size, 4); i++) this.mem.w8(p.addr + i, 0xDD); } catch (e) { /* 忽略 */ }
    for (var b = 0; b < this.mem.blocks.length; b++) {
      if (this.mem.blocks[b].addr === p.addr) this.mem.blocks[b].freed = true;
    }
    return 0;
  };

  Interp.prototype.evalAssign = function (node, scope) {
    var lv = this.resolve(node.target, scope);
    if (node.op === '=') {
      var v = this.eval(node.value, scope);
      if (lv.set) lv.set(v);
      return lv.get();
    }
    var cur = lv.get();
    var rhs = this.eval(node.value, scope);
    var op = node.op.slice(0, -1);
    var res = this.applyBinary(op, cur, rhs, node, scope);
    lv.set(res);
    return lv.get();
  };

  // 把迭代器变成一个可读可写的"左值"（*it）
  Interp.prototype.iterLValue = function (it, line) {
    var c = this;
    var t = it.target;
    if (!t) throw new CError('这个迭代器还没有指向任何容器', line, 1, 'runtime');
    if (t.v === 'vector') {
      var el = (t.type && t.type.of) || { k: 'prim', name: 'int', size: 4 };
      if (it.idx < 0 || it.idx >= t.items.length) throw new CError('迭代器越界了（已经跑到容器外面）', line, 1, 'runtime');
      return {
        type: el,
        get: function () { return t.items[it.idx]; },
        set: function (v) { t.items[it.idx] = c.convert(v, el, null); }
      };
    }
    if (t.v === 'string') {
      if (it.idx < 0 || it.idx >= t.data.length) throw new CError('迭代器越界了（已经跑到容器外面）', line, 1, 'runtime');
      return {
        type: { k: 'prim', name: 'char', size: 1 },
        get: function () { return t.data.charCodeAt(it.idx); },
        set: function (v) {
          var ch = String.fromCharCode(toNumber(v) & 0xff);
          t.data = t.data.slice(0, it.idx) + ch + t.data.slice(it.idx + 1);
        }
      };
    }
    throw new CError('这个迭代器不支持解引用', line, 1, 'runtime');
  };

  Interp.prototype.evalUnary = function (node, scope) {
    switch (node.op) {
      case '+': {
        var vp = this.eval(node.expr, scope);
        return isDouble(vp) ? vp : toNumber(vp);
      }
      case '-': {
        var v = this.eval(node.expr, scope);
        if (isPtr(v)) throw new CError('指针不能取负', node.line, 1, 'runtime');
        if (isDouble(v)) return dbl(-v.n);
        return -toNumber(v);
      }
      case '!': return toNumber(this.eval(node.expr, scope)) === 0 ? 1 : 0;
      case '~': return ~Math.trunc(toNumber(this.eval(node.expr, scope)));
      case '&': {
        var lv = this.resolve(node.expr, scope);
        if (lv.cell && lv.cell.obj !== null) throw new CError('暂不支持对 std::string / vector 取地址（&）', node.line, 1, 'runtime');
        if (lv.addr === undefined) throw new CError('取地址（&）的对象不支持', node.line, 1, 'runtime');
        return ptrVal(lv.addr, { k: 'ptr', to: lv.type });
      }
      case '*': return this.resolve(node, scope).get();
      case '++': case '--': {
        var l = this.resolve(node.expr, scope);
        var old = l.get();
        if (isObj(old) && old.v === 'iter') {
          var nit = { v: 'iter', target: old.target, idx: old.idx + (node.op === '++' ? 1 : -1) };
          l.set(nit);
          return l.get();
        }
        if (isPtr(old)) {
          var step = this.concreteSize(old.type.to, scope) || 1;
          l.set(ptrVal(old.addr + (node.op === '++' ? step : -step), old.type, old.arrType));
          return l.get();
        }
        l.set(toNumber(old) + (node.op === '++' ? 1 : -1));
        return l.get();
      }
      default: throw new CError('不认识的一元运算符 ' + node.op, node.line, 1, 'runtime');
    }
  };

  Interp.prototype.evalBinary = function (node, scope) {
    var op = node.op;
    if (op === '&&') {
      if (toNumber(this.eval(node.left, scope)) === 0) return 0;
      return toNumber(this.eval(node.right, scope)) !== 0 ? 1 : 0;
    }
    if (op === '||') {
      if (toNumber(this.eval(node.left, scope)) !== 0) return 1;
      return toNumber(this.eval(node.right, scope)) !== 0 ? 1 : 0;
    }
    var L = this.eval(node.left, scope);
    if (op === '<<' && isObj(L) && L.v === 'ostream') {
      var R = this.eval(node.right, scope);
      this.coutWrite(R, this.staticTypeOf(node.right, scope));
      return L;
    }
    if (op === '>>' && isObj(L) && L.v === 'istream') {
      this.cinRead(node.right, scope);
      return L;
    }
    if (op === '<<' && isObj(L) && L.v === 'string' && node.right && node.right.k === 'str') {
      // 容错：string 与字符串字面量的 << 没有意义
    }
    var Rr = this.eval(node.right, scope);
    // 有符号 / 无符号混合比较：C 会把有符号操作数隐式转成无符号再比，
    // 所以 `unsigned a = 3; int b = -5; a > b` 是假（-5 变成 4294967291）。
    if ((op === '<' || op === '>' || op === '<=' || op === '>=' || op === '==' || op === '!=') &&
        typeof L === 'number' && typeof Rr === 'number') {
      var lu = this.isUnsignedExpr(node.left, scope);
      var ru = this.isUnsignedExpr(node.right, scope);
      if (lu && !ru) Rr = Rr >>> 0;
      else if (ru && !lu) L = L >>> 0;
    }
    return this.applyBinary(op, L, Rr, node, scope);
  };

  Interp.prototype.applyBinary = function (op, L, R, node, scope) {
    var line = node ? node.line : 0;
    // 迭代器：算术与比较
    if (isObj(L) && L.v === 'iter') {
      if (op === '+' || op === '-') {
        var istep = Math.trunc(toNumber(R));
        return { v: 'iter', target: L.target, idx: L.idx + (op === '+' ? istep : -istep) };
      }
      if (isObj(R) && R.v === 'iter') {
        if (op === '==') return (L.target === R.target && L.idx === R.idx) ? 1 : 0;
        if (op === '!=') return (L.target === R.target && L.idx === R.idx) ? 0 : 1;
        if (op === '-') return L.idx - R.idx;
        if (op === '<') return L.idx < R.idx ? 1 : 0;
        if (op === '>') return L.idx > R.idx ? 1 : 0;
        if (op === '<=') return L.idx <= R.idx ? 1 : 0;
        if (op === '>=') return L.idx >= R.idx ? 1 : 0;
      }
    }
    if (isObj(R) && R.v === 'iter' && op === '+' && !(isObj(L) && L.v === 'iter')) {
      var istep2 = Math.trunc(toNumber(L));
      return { v: 'iter', target: R.target, idx: R.idx + istep2 };
    }
    // std::string 拼接与比较
    if (isObj(L) && L.v === 'string') {
      if (op === '+') {
        if (isObj(R) && R.v === 'string') return stringVal(L.data + R.data);
        if (isPtr(R)) return stringVal(L.data + this.mem.readCString(R.addr));
        if (typeof R === 'number') return stringVal(L.data + String.fromCharCode(R & 0xff));
        return stringVal(L.data + toDisplayString(R));
      }
      if (op === '==' || op === '!=' || op === '<' || op === '>' || op === '<=' || op === '>=') {
        var rs = isObj(R) && R.v === 'string' ? R.data : (isPtr(R) ? this.mem.readCString(R.addr) : toDisplayString(R));
        switch (op) {
          case '==': return L.data === rs ? 1 : 0;
          case '!=': return L.data !== rs ? 1 : 0;
          case '<': return L.data < rs ? 1 : 0;
          case '>': return L.data > rs ? 1 : 0;
          case '<=': return L.data <= rs ? 1 : 0;
          case '>=': return L.data >= rs ? 1 : 0;
        }
      }
    }
    if (op === '+' && isPtr(R) && isObj(L) && L.v === 'string') return stringVal(L.data + this.mem.readCString(R.addr));

    // 指针运算
    if (isPtr(L) || isPtr(R)) {
      var p = isPtr(L) ? L : R;
      var other = isPtr(L) ? R : L;
      var isLeftPtr = isPtr(L);
      var elemSize = 1;
      if (p.type && p.type.to) elemSize = this.concreteSize(p.type.to, scope || null) || 1;

      if (op === '+' && isLeftPtr) return ptrVal(p.addr + Math.trunc(toNumber(other)) * elemSize, p.type, p.arrType);
      if (op === '+' && !isLeftPtr) return ptrVal(p.addr + Math.trunc(toNumber(other)) * elemSize, p.type, p.arrType);
      if (op === '-' && isLeftPtr && !isPtr(R)) return ptrVal(p.addr - Math.trunc(toNumber(other)) * elemSize, p.type, p.arrType);
      if (op === '-' && isLeftPtr && isPtr(R)) {
        if (elemSize === 0) elemSize = 1;
        return Math.trunc((L.addr - R.addr) / elemSize);
      }
      if (isPtr(L) && isPtr(R)) {
        switch (op) {
          case '==': return L.addr === R.addr ? 1 : 0;
          case '!=': return L.addr !== R.addr ? 1 : 0;
          case '<': return L.addr < R.addr ? 1 : 0;
          case '>': return L.addr > R.addr ? 1 : 0;
          case '<=': return L.addr <= R.addr ? 1 : 0;
          case '>=': return L.addr >= R.addr ? 1 : 0;
        }
      }
      if (op === '&&' || op === '||') return 0;
      throw new CError('指针不支持运算符 “' + op + '”', line, 1, 'runtime');
    }

    if (isStruct(L) || isStruct(R)) {
      throw new CError('结构体不支持运算符 “' + op + '”（要逐个成员比较）', line, 1, 'runtime');
    }

    var a = toNumber(L), b = toNumber(R);
    var leftFloat = isDouble(L) || isDouble(R);

    switch (op) {
      case '+': return leftFloat ? dbl(a + b) : (a + b);
      case '-': return leftFloat ? dbl(a - b) : (a - b);
      case '*': return leftFloat ? dbl(a * b) : (a * b);
      case '/':
        if (b === 0) {
          if (leftFloat) return dbl(a / 0);
          throw new CError('整数除以 0（真实程序会在这里崩溃，模拟器帮你拦住了）', line, 1, 'runtime');
        }
        if (leftFloat) return dbl(a / b);
        return Math.trunc(a / b);
      case '%':
        if (b === 0) throw new CError('整数取余除以 0', line, 1, 'runtime');
        return Math.trunc(a) % Math.trunc(b);
      case '==': return a === b ? 1 : 0;
      case '!=': return a !== b ? 1 : 0;
      case '<': return a < b ? 1 : 0;
      case '>': return a > b ? 1 : 0;
      case '<=': return a <= b ? 1 : 0;
      case '>=': return a >= b ? 1 : 0;
      case '&': return (Math.trunc(a) & Math.trunc(b)) | 0;
      case '|': return (Math.trunc(a) | Math.trunc(b)) | 0;
      case '^': return (Math.trunc(a) ^ Math.trunc(b)) | 0;
      case '<<': return (Math.trunc(a) << (Math.trunc(b) & 31)) | 0;
      case '>>': return (Math.trunc(a) >> (Math.trunc(b) & 31)) | 0;
      default: throw new CError('不支持的运算符 “' + op + '”', line, 1, 'runtime');
    }
  };

  /* --- cout / cin ----------------------------------------------------- */
  // 判断一个表达式的静态类型是不是无符号整型（混合比较要用）
  Interp.prototype.isUnsignedExpr = function (node, scope) {
    var t = this.staticTypeOf(node, scope);
    if (!t) return false;
    if (t.k === 'ref') t = t.to;
    if (!t || t.k !== 'prim') return false;
    return String(t.name).indexOf('unsigned') === 0;
  };

  // 尽力推断表达式的静态类型。只服务于 cout 判断"要不要按字符打印"，推不出来就返回 null。
  Interp.prototype.staticTypeOf = function (node, scope) {
    try {
      if (!node) return null;
      if (node.k === 'id') {
        var c = scope.lookup(node.name) || this.implicitMember(node.name, scope);
        return c && c.type ? c.type : null;
      }
      if (node.k === 'cast') return node.type;
      if (node.k === 'index') {
        var bt = this.staticTypeOf(node.base, scope);
        if (!bt) return null;
        if (bt.k === 'ref') bt = bt.to;
        if (bt.k === 'arr') return bt.of || null;
        if (bt.k === 'ptr') return bt.to || null;
        if (bt.k === 'string') return { k: 'prim', name: 'char', size: 1 };
        if (bt.k === 'vector') return bt.of || null;
        return null;
      }
      if (node.k === 'un' && node.op === '*') {
        var t = this.staticTypeOf(node.expr, scope);
        if (!t) return null;
        if (t.k === 'ref') t = t.to;
        if (t.k === 'ptr') return t.to || null;
        return null;
      }
      if (node.k === 'member') {
        var ot = this.staticTypeOf(node.obj, scope);
        if (ot && ot.k === 'ref') ot = ot.to;
        var def = null;
        if (ot && ot.k === 'struct') def = ot.def;
        else if (ot && ot.k === 'ptr' && ot.to && ot.to.k === 'struct') def = ot.to.def;
        if (!def) {
          if (ot && (ot.k === 'string' || ot.k === 'pair' || ot.k === 'vector')) return null;
          return null;
        }
        var f = this.findField(def, node.name);
        return f ? f.type : null;
      }
    } catch (e) { return null; }
    return null;
  };

  Interp.prototype.coutWrite = function (v, t) {
    if (isObj(v) && v.v === 'endl') { this.print('\n'); return; }
    if (t && t.k === 'prim' && (t.name === 'char' || t.name === 'unsigned char') && typeof v === 'number') {
      this.print(String.fromCharCode(v & 0xff));
      return;
    }
    if (isPtr(v) && v.type && v.type.to && v.type.to.k === 'prim' && v.type.to.name === 'char') {
      this.print(this.mem.readCString(v.addr));
      return;
    }
    if (isPtr(v) && v.type && v.type.to && v.type.to.name === 'void') { this.print(toDisplayString(v)); return; }
    if (isPtr(v)) { this.print(toDisplayString(v)); return; }
    if (isStruct(v)) { this.print('{' + (v.type.def ? v.type.def.name : 'struct') + '}'); return; }
    if (isObj(v) && v.v === 'string') { this.print(v.data); return; }
    if (isObj(v) && v.v === 'double') { this.print(toGeneralString(v.n, 6, false)); return; }
    if (typeof v === 'number') {
      if (v === Math.trunc(v)) this.print(String(v));
      else this.print(toGeneralString(v, 6, false));
      return;
    }
    this.print(toDisplayString(v));
  };

  Interp.prototype.cinRead = function (node, scope) {
    var lv = this.resolve(node, scope);
    var t = lv.type;
    if (t.k === 'string') {
      var w = this.readToken();
      lv.set(stringVal(w));
      return;
    }
    if (t.k === 'prim' && (t.name === 'double' || t.name === 'float')) {
      lv.set(parseFloat(this.readToken()) || 0);
      return;
    }
    if (t.k === 'prim' && t.name === 'char') {
      if (this.stdinPos < this.stdin.length) {
        lv.set(this.stdin.charCodeAt(this.stdinPos));
        this.stdinPos++;
      }
      return;
    }
    lv.set(parseInt(this.readToken(), 10) || 0);
  };

  Interp.prototype.readToken = function () {
    while (this.stdinPos < this.stdin.length && /\s/.test(this.stdin[this.stdinPos])) this.stdinPos++;
    var s = this.stdinPos;
    while (this.stdinPos < this.stdin.length && !/\s/.test(this.stdin[this.stdinPos])) this.stdinPos++;
    return this.stdin.slice(s, this.stdinPos);
  };

  /* --- 函数调用 ------------------------------------------------------ */
  Interp.prototype.evalCall = function (node, scope) {
    var callee = node.callee;

    // 方法调用
    if (callee.k === 'member') {
      var target = this.evalMember(callee, scope);
      if (target && target.v === 'boundmethod') {
        var args0 = [];
        for (var i0 = 0; i0 < node.args.length; i0++) args0.push(this.eval(node.args[i0], scope));
        return this.invokeStructMethod(target, args0, scope, node.line, node.args);
      }
      if (target && target.v === 'libmethod') {
        var args1 = [];
        for (var i1 = 0; i1 < node.args.length; i1++) args1.push(this.eval(node.args[i1], scope));
        return this.callLibMethod(target.obj, target.name, args1, node, scope);
      }
      throw new CError('“' + callee.name + '” 不能被调用', node.line, 1, 'runtime');
    }

    // 构造：Point p(1,2) 由声明处理；这里处理临时对象 Point(1,2)
    if (callee.k === 'id' && this.structs[callee.name] && this.structs[callee.name].defined) {
      var def2 = this.structs[callee.name];
      var type2 = { k: 'struct', name: def2.name, def: def2 };
      var sz2 = this.concreteSize(type2, scope);
      var addr2 = this.mem.allocTemp(sz2);
      this.objTypes[addr2] = def2;
      var sv = structVal(addr2, type2);
      var args2 = [];
      for (var i2 = 0; i2 < node.args.length; i2++) args2.push(this.eval(node.args[i2], scope));
      this.constructStruct(sv, node.args, scope, def2, node.line, args2);
      return sv;
    }

    // 普通函数
    var name = null;
    if (callee.k === 'id') name = callee.name;
    else if (callee.k === 'member') name = callee.name;
    if (name && name.indexOf('std::') === 0) name = name.slice(5);

    var args = [];
    for (var i = 0; i < node.args.length; i++) args.push(this.eval(node.args[i], scope));

    // 用户自己写的函数优先于同名内置函数（否则 void swap(int*,int*) 会被内置的 swap 顶掉）
    if (name && this.funcs[name]) {
      return this.invokeUser(name, args, scope, node.line, node, node.args);
    }
    if (callee.k === 'id' && !(name && this.builtins[name])) {
      var thm = this.implicitThisTarget(name, scope);
      if (thm) return this.invokeStructMethod(thm, args, scope, node.line, node.args);
    }
    if (name && this.builtins[name]) {
      return this.builtins[name].call(this, args, node, scope);
    }
    throw new CError('函数 “' + (name || '?') + '” 没有定义', node.line, 1, 'runtime');
  };

  Interp.prototype.invokeStructMethod = function (target, args, scope, line, argNodes) {
    var boundAddr = target.addr !== undefined ? target.addr : 0;
    // 虚函数派发：只有当「按静态类型找到的这个函数」是 virtual 时，
    // 才去对象实际类型里找同名覆盖版本（非 virtual 函数是静态绑定的）
    var dynDef = this.objTypes[boundAddr];
    var fn = target.fn;
    var def = target.def;
    if (dynDef && dynDef !== def && fn && fn.isVirtual) {
      var m = this.findMethod(dynDef, target.name);
      if (m && m.fn) { fn = m.fn; def = m.def; }
    }
    var callScope = new Scope(this.globalScope || scope);
    callScope.define('this', new Cell(boundAddr, { k: 'ptr', to: { k: 'struct', name: def.name, def: def } }, structVal(boundAddr, { k: 'struct', name: def.name, def: def })));
    var argCells = this.buildArgCells(fn, argNodes, scope);
    var self = this;
    var wrapped = {
      name: fn.name, retType: fn.retType, params: fn.params, body: fn.body, line: fn.line,
      isProto: false
    };
    return this.executeFunction(wrapped, args, callScope, line, def.name + '::' + fn.name, argCells);
  };

  Interp.prototype.constructStruct = function (sv, argNodes, scope, def, line, preArgs) {
    var args = preArgs;
    var haveNodes = false;
    if (!args) {
      args = [];
      haveNodes = true;
      for (var i = 0; i < argNodes.length; i++) args.push(this.eval(argNodes[i], scope));
    }
    // 真实 C++ 的次序：基类子对象先构造 → 成员初始化列表 → 构造函数体。
    // 派生类的构造函数若在初始化列表里显式点了基类名（: Base(args)），
    // 就交给下面 inits 分支处理，这里跳过，避免构造两次。
    var baseList = def.bases || [];
    if (baseList.length) {
      var ctorPre = (def.ctor && def.ctor.length) ? this.pickCtor(def, args) : null;
      var mentionedInits = {};
      var preInits = (ctorPre && ctorPre.inits) || [];
      for (var mi = 0; mi < preInits.length; mi++) mentionedInits[preInits[mi].name] = true;
      for (var bi = 0; bi < baseList.length; bi++) {
        var bd0 = baseList[bi].def || this.structs[baseList[bi].name];
        if (!bd0 || mentionedInits[bd0.name]) continue;
        if (!bd0.ctor || !bd0.ctor.length) continue;
        // 只用无参构造函数；基类若没有默认构造、派生类又没点名，真实编译器会报错
        var hasDefCtor = false;
        for (var z = 0; z < bd0.ctor.length; z++) {
          if (!((bd0.ctor[z].params || []).length)) { hasDefCtor = true; break; }
        }
        if (!hasDefCtor) continue;
        var boff0 = (def.baseOffsets && def.baseOffsets[bd0.name]) || 0;
        var bt0 = { k: 'struct', name: bd0.name, def: bd0 };
        this.constructStruct(structVal(sv.addr + boff0, bt0), [], scope, bd0, line, []);
      }
    }
    if (def.ctor && def.ctor.length) {
      var c = this.pickCtor(def, args);
      if (c) {
        var cs = new Scope(this.globalScope || scope);
        var st = { k: 'struct', name: def.name, def: def };
        cs.define('this', new Cell(sv.addr, { k: 'ptr', to: st }, sv));
        var savedSpC = this.mem.sp;
        var frameC = { name: def.name + '()', vars: [], sp: savedSpC };
        this.frames.push(frameC);
        try {
          var wfn = { name: def.name, retType: null, params: c.params || [], body: c.body, line: line, isProto: false };
          var acells = haveNodes ? this.buildArgCells(wfn, argNodes, scope) : null;
          // 先绑形参，成员初始化列表和函数体里才能用到它们
          this.bindParams(wfn, args, cs, frameC, acells);
          // 成员初始化列表
          if (c.inits && c.inits.length) {
            for (var k = 0; k < c.inits.length; k++) {
              var ini = c.inits[k];
              var fld = this.findField(def, ini.name);
              if (fld) {
                var faddr = sv.addr + fld.offset;
                var iv0 = ini.args.length ? this.eval(ini.args[0], cs) : 0;
                this.storeValue(faddr, fld.type, this.convert(iv0, fld.type, cs), cs);
              } else {
                // 也可能是基类子对象：Square(double a) : Rect(a, a) {}
                var baseDef = null;
                var bl = def.bases || [];
                for (var bi = 0; bi < bl.length; bi++) {
                  var cand = bl[bi].def || this.structs[bl[bi].name];
                  if (cand && cand.name === ini.name) { baseDef = cand; break; }
                }
                if (baseDef) {
                  var bt2 = { k: 'struct', name: baseDef.name, def: baseDef };
                  this.constructStruct(structVal(sv.addr, bt2), ini.args, cs, baseDef, line);
                }
              }
            }
          }
          if (c.body) {
            try { this.execBlock(c.body, cs, def.name + '::' + def.name); }
            catch (e) { if (!(e instanceof ReturnSignal)) throw e; }
          }
        } finally {
          this.frames.pop();
          this.mem.sp = savedSpC;
        }
      }
    }
    return sv;
  };

  // 找拷贝构造函数：Widget(const Widget&)
  Interp.prototype.findCopyCtor = function (def, scope) {
    var cs = def.ctor || [];
    for (var i = 0; i < cs.length; i++) {
      var ps = cs[i].params || [];
      if (ps.length !== 1) continue;
      var pt = this.materializeType(ps[0].type, scope);
      if (pt && pt.k === 'ref') pt = pt.to;
      if (pt && pt.k === 'struct' && pt.name === def.name) return cs[i];
    }
    return null;
  };

  Interp.prototype.callCtorNoArgs = function (sv, def, scope, line) {
    return this.constructStruct(sv, [], scope, def, line, []);
  };

  Interp.prototype.pickCtor = function (def, args) {
    var cs = def.ctor || [];
    for (var i = 0; i < cs.length; i++) if (cs[i].params.length === args.length) return cs[i];
    return cs[0];
  };

  Interp.prototype.findField = function (def, name) {
    var seen = {};
    var stack = [def];
    while (stack.length) {
      var d = stack.shift();
      if (!d || seen[d.name]) continue;
      seen[d.name] = true;
      var fs = d.allFields || d.fields;
      for (var i = 0; i < fs.length; i++) if (fs[i].name === name) return fs[i];
      for (var b = 0; b < (d.bases || []).length; b++) {
        var bd = d.bases[b].def || this.structs[d.bases[b].name];
        if (bd) stack.push(bd);
      }
    }
    return null;
  };

  Interp.prototype.invokeUser = function (name, args, scope, line, node, argNodes) {
    var list = this.funcs[name];
    var fn = null;
    // 优先选有函数体的重载：C 里允许「先写原型、后写定义」
    for (var i = 0; i < list.length; i++) {
      if (list[i].body && list[i].params.length === args.length) { fn = list[i]; break; }
    }
    if (!fn) { for (var j = 0; j < list.length; j++) if (list[j].params.length === args.length) { fn = list[j]; break; } }
    if (!fn) fn = list[0];
    if (!fn.body) throw new CError('函数 “' + name + '” 只有声明，没有函数体', line, 1, 'runtime');
    var argCells = this.buildArgCells(fn, argNodes, scope);
    var callScope = new Scope(this.globalScope || scope);
    return this.executeFunction(fn, args, callScope, line, name, argCells);
  };

  // 引用参数需要拿到实参本身的内存（而不是它的副本）
  Interp.prototype.buildArgCells = function (fn, argNodes, scope) {
    if (!argNodes) return null;
    var out = null;
    for (var i = 0; i < fn.params.length && i < argNodes.length; i++) {
      var pt = fn.params[i].type;
      if (pt && pt.k === 'ref') {
        try {
          var lv = this.resolve(argNodes[i], scope);
          out = out || [];
          out[i] = lv.cell || new Cell(lv.addr, lv.type);
          // 记下引用绑定的实参名字，内存面板里好显示
          if (argNodes[i] && argNodes[i].k === 'id') out[i].refName = argNodes[i].name;
        } catch (e) { /* 不是左值，退化成值传递 */ }
      }
    }
    return out;
  };

  // 把形参绑定进作用域（构造函数和普通函数共用）
  Interp.prototype.bindParams = function (fn, args, scope, frame, argCells) {
    for (var i = 0; i < fn.params.length; i++) {
      var p = fn.params[i];
      var ptype = p.type || { k: 'prim', name: 'int', size: 4 };
      var argVal = i < args.length ? args[i] : (p.def ? this.eval(p.def, scope) : this.convert(0, ptype, scope));
      if (ptype.k === 'ref') {
        // 引用参数：直接绑定到实参的单元格，函数里改它外面也跟着变
        var srcCell = argCells && argCells[i];
        if (srcCell) {
          scope.define(p.name, srcCell);
          if (frame) frame.vars.push({ name: p.name + (srcCell.refName ? '(引用→' + srcCell.refName + ')' : '(引用)'), type: ptype.to, addr: srcCell.addr });
        } else {
          ptype = ptype.to;
          var c0 = this.declareFrameVar(scope, p.name, ptype);
          this.assignTo(c0, argVal, scope, null);
          if (frame) frame.vars.push({ name: p.name, type: ptype, addr: c0.addr });
        }
        continue;
      }
      if (ptype.k === 'arr') ptype = { k: 'ptr', to: ptype.of };
      var cell = this.declareFrameVar(scope, p.name, ptype);
      if (cell.type.k === 'auto') cell.type = ptype;
      this.assignTo(cell, argVal, scope, null);
      if (frame) frame.vars.push({ name: p.name, type: cell.type, addr: cell.addr });
    }
  };

  Interp.prototype.executeFunction = function (fn, args, callScope, line, label, argCells) {
    var savedSp = this.mem.sp;
    var frame = { name: label || fn.name, vars: [], sp: savedSp };
    this.frames.push(frame);
    try {
      this.bindParams(fn, args, callScope, frame, argCells);
      if (!fn.body) return 0;
      try {
        this.execBlock(fn.body, callScope, label);
      } catch (e) {
        if (e instanceof ReturnSignal) {
          var rt = fn.retType || { k: 'prim', name: 'int', size: 4 };
          if (rt.k === 'arr') rt = { k: 'ptr', to: rt.of };
          return this.convert(e.value, rt, callScope);
        }
        throw e;
      }
      return 0;
    } finally {
      this.frames.pop();
      this.mem.sp = savedSp;
    }
  };

  Interp.prototype.declareFrameVar = function (scope, name, type) {
    var size = this.concreteSize(type, scope);
    if (size === 0) size = 4;
    var addr = this.mem.allocStack(size, this.alignFor(type, scope));
    if (type.k === 'struct' && type.def) this.objTypes[addr] = type.def;
    var cell = new Cell(addr, type, null);
    this.prepareObjCell(cell);
    scope.define(name, cell);
    return cell;
  };

  // 把 for (int& x : v) 循环变量上的改动写回容器
  Interp.prototype.writeBackLoopVar = function (container, cell, idx, elType, scope) {
    try {
      var nv = this.loadValue(cell.addr, cell.type, scope);
      if (isObj(container) && container.v === 'vector') {
        var vt = (container.type && container.type.of) || elType || { k: 'prim', name: 'int', size: 4 };
        container.items[idx] = this.cloneValue(this.convert(nv, vt, scope), vt, scope);
      } else if (isPtr(container)) {
        var et = (container.type && container.type.to) || elType || { k: 'prim', name: 'int', size: 4 };
        var esz = this.concreteSize(et, scope) || 4;
        this.storeValue(container.addr + idx * esz, et, this.convert(nv, et, scope), scope);
      }
    } catch (e) { /* 回写失败不影响主流程 */ }
  };

  /* --- 库函数成员（vector / string） --------------------------------- */
  Interp.prototype.callLibMethod = function (obj, name, args, node, scope) {
    if (obj.v === 'vector') return this.vectorMethod(obj, name, args, node, scope);
    if (obj.v === 'string') return this.stringMethod(obj, name, args, node, scope);
    if (obj.v === 'iter') return this.iterMethod(obj, name, args, node, scope);
    if (obj.v === 'pair') {
      if (name === 'first') return obj.first;
      if (name === 'second') return obj.second;
    }
    throw new CError('这个对象没有成员函数 “' + name + '”', node.line, 1, 'runtime');
  };

  Interp.prototype.vectorMethod = function (vec, name, args, node, scope) {
    var elType = vec.type ? vec.type.of : { k: 'prim', name: 'int', size: 4 };
    switch (name) {
      case 'push_back': {
        var v = this.convert(this.materializeInitlist(args[0], elType, scope), elType, scope);
        vec.items.push(this.cloneValue(v, elType, scope));
        return 0;
      }
      case 'pop_back': vec.items.pop(); return 0;
      case 'size': return vec.items.length;
      case 'length': return vec.items.length;
      case 'empty': return vec.items.length === 0 ? 1 : 0;
      case 'clear': vec.items.length = 0; return 0;
      case 'at': {
        var i = Math.trunc(toNumber(args[0]));
        if (i < 0 || i >= vec.items.length) throw new CError('vector::at 越界：' + i + '（size 是 ' + vec.items.length + '）', node.line, 1, 'runtime');
        return vec.items[i];
      }
      case 'back': return vec.items[vec.items.length - 1];
      case 'front': return vec.items[0];
      case 'begin': return { v: 'iter', target: vec, idx: 0, end: false };
      case 'end': return { v: 'iter', target: vec, idx: vec.items.length, end: true };
      case 'resize': {
        var n = Math.trunc(toNumber(args[0]));
        while (vec.items.length < n) vec.items.push(this.convert(0, elType, scope));
        while (vec.items.length > n) vec.items.pop();
        return 0;
      }
      case 'insert':
      case 'erase':
        throw new CError('vector::' + name + ' 暂不支持（本引擎只实现了常用的一部分）', node.line, 1, 'runtime');
      default:
        throw new CError('vector 没有成员函数 “' + name + '”', node.line, 1, 'runtime');
    }
  };

  // string 字面量在这个解释器里是"指向只读区"的指针，取它的内容要读内存
  Interp.prototype.toStdString = function (v) {
    if (isObj(v) && v.v === 'string') return v.data;
    if (isPtr(v)) return this.mem.readCString(v.addr);
    if (typeof v === 'string') return v;
    return toDisplayString(v);
  };

  Interp.prototype.stringMethod = function (str, name, args, node, scope) {
    switch (name) {
      case 'size': case 'length': return str.data.length;
      case 'empty': return str.data.length === 0 ? 1 : 0;
      case 'c_str': {
        var a = this.mem.allocTemp(str.data.length + 1);
        this.mem.writeCString(a, str.data);
        return ptrVal(a, { k: 'ptr', to: { k: 'prim', name: 'char', size: 1 } });
      }
      case 'data': case 'c_str_': return str.data;
      case 'substr': {
        var start = Math.trunc(toNumber(args[0]));
        if (args.length > 1) return stringVal(str.data.substr(start, Math.trunc(toNumber(args[1]))));
        return stringVal(str.data.substr(start));
      }
      case 'find': {
        var needle = this.toStdString(args[0]);
        return str.data.indexOf(needle);
      }
      case 'at': {
        var i = Math.trunc(toNumber(args[0]));
        if (i < 0 || i >= str.data.length) throw new CError('string::at 越界：' + i, node.line, 1, 'runtime');
        return str.data.charCodeAt(i);
      }
      case 'append': {
        str.data += this.toStdString(args[0]);
        return str;
      }
      case 'clear': str.data = ''; return 0;
      case 'begin': return { v: 'iter', target: str, idx: 0, end: false };
      case 'end': return { v: 'iter', target: str, idx: str.data.length, end: true };
      default:
        throw new CError('string 没有成员函数 “' + name + '”', node.line, 1, 'runtime');
    }
  };

  Interp.prototype.iterMethod = function (it, name, args, node) {
    if (name === 'begin') return { v: 'iter', target: it.target, idx: 0 };
    if (name === 'end') return { v: 'iter', target: it.target, idx: it.target.items ? it.target.items.length : it.target.data.length, end: true };
    throw new CError('迭代器没有成员函数 “' + name + '”', node.line, 1, 'runtime');
  };

  /* =====================================================================
   * 语句执行
   * =================================================================== */
  Interp.prototype.execBlock = function (block, scope, label) {
    var inner = new Scope(scope);
    var savedSp = this.mem.sp;
    try {
      for (var i = 0; i < block.body.length; i++) {
        this.execStatement(block.body[i], inner, label);
      }
    } finally {
      // 出块时先按「后声明先销毁」的顺序跑析构函数，再回收栈空间
      this.runDtors(inner);
      // 出块就回收局部变量占的栈空间（和真实机器上的行为一致）
      this.mem.sp = savedSp;
    }
  };

  // 登记「离开作用域要析构」的对象（只有自定义了 ~ClassName() 的类才需要）
  Interp.prototype.noteDestructible = function (scope, cell, type) {
    if (!scope || !type) return;
    if (type.k !== 'struct' || !type.def || !type.def.dtor) return;
    if (!scope.dtors) scope.dtors = [];
    scope.dtors.push({ cell: cell, type: type });
  };

  // 倒序执行本作用域登记的析构函数
  Interp.prototype.runDtors = function (scope) {
    if (!scope || !scope.dtors || !scope.dtors.length) return;
    var list = scope.dtors;
    scope.dtors = [];
    for (var i = list.length - 1; i >= 0; i--) {
      this.callDestructor(list[i].cell, list[i].type);
    }
  };

  Interp.prototype.callDestructor = function (cell, type) {
    if (!type || type.k !== 'struct' || !type.def) return;
    var d = type.def.dtor;
    if (!d || !d.body) return;
    var addr = cell.addr;
    var callScope = new Scope(this.globals || null);
    callScope.define('this', new Cell(addr, { k: 'ptr', to: type }, structVal(addr, type)));
    var savedSp = this.mem.sp;
    var frame = { name: '~' + type.def.name, vars: [], sp: savedSp };
    this.frames.push(frame);
    try {
      this.execBlock(d.body, callScope, '~' + type.def.name);
    } catch (e) {
      if (!(e instanceof ReturnSignal)) {
        this.frames.pop();
        this.mem.sp = savedSp;
        throw e;
      }
    }
    this.frames.pop();
    this.mem.sp = savedSp;
    // 真实 C++ 的次序：先跑自己的析构，再依次跑基类的析构
    var dtorBases = type.def.bases || [];
    var seenBD = {};
    for (var bdi = 0; bdi < dtorBases.length; bdi++) {
      var bdD = dtorBases[bdi].def || this.structs[dtorBases[bdi].name];
      if (!bdD || seenBD[bdD.name]) continue;
      seenBD[bdD.name] = true;
      if (!bdD.dtor || !bdD.dtor.body) continue;
      var bdOff = (type.def.baseOffsets && type.def.baseOffsets[bdD.name]) || 0;
      this.callDestructor({ addr: addr + bdOff }, { k: 'struct', name: bdD.name, def: bdD });
    }
  };

  Interp.prototype.execStatement = function (st, scope, label) {
    this.tick();
    switch (st.k) {
      case 'empty': return;
      case 'block': return this.execBlock(st, scope, label);
      case 'expr': this.eval(st.expr, scope); return;
      case 'decl': {
        for (var i = 0; i < st.decls.length; i++) {
          var d = st.decls[i];
          this.declare(scope, d.name, d.type, d.init, st.line || d.line, 'stack');
        }
        return;
      }
      case 'if': {
        if (toNumber(this.eval(st.cond, scope)) !== 0) this.execStatement(st.then, scope, label);
        else if (st.alt) this.execStatement(st.alt, scope, label);
        return;
      }
      case 'while': {
        while (toNumber(this.eval(st.cond, scope)) !== 0) {
          this.tick();
          try { this.execStatement(st.body, scope, label); }
          catch (e) { if (e === BREAK) break; if (e === CONTINUE) continue; throw e; }
        }
        return;
      }
      case 'dowhile': {
        do {
          this.tick();
          try { this.execStatement(st.body, scope, label); }
          catch (e) { if (e === BREAK) break; if (e === CONTINUE) { /* 继续判断条件 */ } else throw e; }
        } while (toNumber(this.eval(st.cond, scope)) !== 0);
        return;
      }
      case 'for': {
        var forScope = new Scope(scope);
        if (st.init) {
          if (st.init.k === 'decl') {
            for (var j = 0; j < st.init.decls.length; j++) {
              var dd = st.init.decls[j];
              this.declare(forScope, dd.name, dd.type, dd.init, st.init.line || dd.line, 'stack');
            }
          } else this.eval(st.init.expr, forScope);
        }
        while (!st.cond || toNumber(this.eval(st.cond, forScope)) !== 0) {
          this.tick();
          var broke = false;
          try { this.execStatement(st.body, forScope, label); }
          catch (e2) {
            if (e2 === BREAK) broke = true;
            else if (e2 !== CONTINUE) throw e2;
          }
          if (broke) break;
          if (st.step) this.eval(st.step, forScope);
        }
        return;
      }
      case 'forin': {
        var it = this.eval(st.expr, scope);
        var items = [];
        if (isObj(it) && it.v === 'vector') items = it.items;
        else if (isObj(it) && it.v === 'string') items = it.data.split('').map(function (c) { return c.charCodeAt(0); });
        else if (isPtr(it)) {
          var elT = it.type.to;
          var esz = this.concreteSize(elT, scope);
          var n = it.arrType && it.arrType.len ? this.resolveLen(it.arrType.len, scope) : 0;
          for (var k = 0; k < n; k++) items.push(this.loadValue(it.addr + k * esz, elT, scope));
        } else throw new CError('范围 for 只能用于数组、vector 或 string', st.line, 1, 'runtime');

        var rScope = new Scope(scope);
        var declType = st.decl.type;
        if (declType.k === 'auto') declType = null;
        // for (int& x : v) —— 循环变量是引用，改它要写回容器
        var isRefLoop = !!(declType && declType.k === 'ref');
        var elRefType = isRefLoop ? declType.to : declType;
        var rcell = null;
        if (elRefType) rcell = this.declareFrameVar(rScope, st.decl.name, elRefType);
        else rcell = new Cell(this.mem.allocStack(4), { k: 'prim', name: 'int', size: 4 });
        rScope.define(st.decl.name, rcell);
        for (var m = 0; m < items.length; m++) {
          if (rcell.type.k === 'auto') rcell.type = this.inferType(items[m], null);
          if (isObj(items[m]) && items[m].v === 'string') rcell.obj = items[m];
          else this.storeValue(rcell.addr, rcell.type, this.convert(items[m], rcell.type, rScope), rScope);
          var stop = false;
          try { this.execStatement(st.body, rScope, label); }
          catch (e3) { if (e3 === BREAK) stop = true; else if (e3 !== CONTINUE) throw e3; }
          if (isRefLoop) this.writeBackLoopVar(it, rcell, m, elRefType, rScope);
          if (stop) break;
        }
        return;
      }
      case 'switch': {
        var disc = toNumber(this.eval(st.expr, scope));
        var matched = -1;
        for (var c = 0; c < st.cases.length; c++) {
          var cs = st.cases[c];
          if (cs.value === null) continue;
          var cv = toNumber(this.eval(cs.value, scope));
          if (cv === disc) { matched = c; break; }
        }
        if (matched < 0) {
          for (var c2 = 0; c2 < st.cases.length; c2++) if (st.cases[c2].value === null) { matched = c2; break; }
        }
        if (matched < 0) return;
        var swScope = new Scope(scope);
        try {
          for (var c3 = matched; c3 < st.cases.length; c3++) {
            for (var s2 = 0; s2 < st.cases[c3].stmts.length; s2++) {
              this.execStatement(st.cases[c3].stmts[s2], swScope, label);
            }
          }
        } catch (e4) { if (e4 === BREAK) return; throw e4; }
        return;
      }
      case 'return': {
        var v = st.expr ? this.eval(st.expr, scope) : 0;
        throw new ReturnSignal(v);
      }
      case 'break': throw BREAK;
      case 'continue': throw CONTINUE;
      default:
        throw new CError('还不支持的语句类型（' + st.k + '）', st.line, 1, 'runtime');
    }
  };

  /* =====================================================================
   * 内置函数
   * =================================================================== */
  Interp.prototype.makeBuiltins = function () {
    var self = this;

    function argStr(v) {
      if (isObj(v) && v.v === 'string') return v.data;
      if (isPtr(v)) return self.mem.readCString(v.addr);
      if (typeof v === 'number') return String.fromCharCode(v & 0xff);
      return toDisplayString(v);
    }

    var b = {};

    b.printf = function (args) {
      var fmt = argStr(args[0]);
      self.print(self.formatPrintf(fmt, args.slice(1)));
      return fmt.length;
    };
    b.sprintf = function (args) {
      var buf = args[0];
      var fmt = argStr(args[1]);
      var s = self.formatPrintf(fmt, args.slice(2));
      self.mem.writeCString(buf.addr, s);
      return s.length;
    };
    b.puts = function (args) {
      self.print(argStr(args[0]) + '\n');
      return 0;
    };
    b.putchar = function (args) {
      self.print(String.fromCharCode(toNumber(args[0]) & 0xff));
      return toNumber(args[0]);
    };
    b.getchar = function () {
      if (self.stdinPos < self.stdin.length) return self.stdin.charCodeAt(self.stdinPos++);
      return -1;
    };
    b.scanf = function (args, node, scope) { return self.doScanf(args, node, scope, 1); };
    b.sscanf = function () { throw new CError('sscanf 暂不支持', 0, 0, 'runtime'); };

    b.strlen = function (args) {
      var p = args[0];
      if (isObj(p) && p.v === 'string') return utf8Length(p.data);
      return self.mem.cStrLen(p.addr);
    };
    b.strcpy = function (args, node) {
      var dst = args[0].addr, src = argStr(args[1]);
      self.mem.writeCString(dst, src);
      return args[0];
    };
    b.strncpy = function (args) {
      var dst = args[0].addr, src = argStr(args[1]), n = Math.trunc(toNumber(args[2]));
      var sbytes = utf8Bytes(src);
      for (var i = 0; i < n; i++) self.mem.w8(dst + i, i < sbytes.length ? sbytes[i] : 0);
      return args[0];
    };
    b.strcmp = function (args) {
      var a = argStr(args[0]), c = argStr(args[1]);
      return a < c ? -1 : (a > c ? 1 : 0);
    };
    b.strncmp = function (args) {
      var n = Math.trunc(toNumber(args[2]));
      var a = argStr(args[0]).slice(0, n), c = argStr(args[1]).slice(0, n);
      return a < c ? -1 : (a > c ? 1 : 0);
    };
    b.strcat = function (args) {
      var dstAddr = args[0].addr;
      var base = self.mem.readCString(dstAddr);
      self.mem.writeCString(dstAddr, base + argStr(args[1]));
      return args[0];
    };
    b.strchr = function (args) {
      var s = argStr(args[0]);
      var ch = String.fromCharCode(toNumber(args[1]) & 0xff);
      var idx = s.indexOf(ch);
      var CPT = { k: 'ptr', to: { k: 'prim', name: 'char', size: 1 } };
      if (idx < 0) return ptrVal(0, CPT);
      return ptrVal(args[0].addr + utf8Length(s.slice(0, idx)), CPT);
    };
    b.strstr = function (args) {
      var s = argStr(args[0]), n = argStr(args[1]);
      var idx = s.indexOf(n);
      var SPT = { k: 'ptr', to: { k: 'prim', name: 'char', size: 1 } };
      if (idx < 0) return ptrVal(0, SPT);
      return ptrVal(args[0].addr + utf8Length(s.slice(0, idx)), SPT);
    };
    b.memset = function (args) {
      var p = args[0], v = Math.trunc(toNumber(args[1])) & 0xff, n = Math.trunc(toNumber(args[2]));
      for (var i = 0; i < n; i++) self.mem.w8(p.addr + i, v);
      return p;
    };
    b.memcpy = function (args) {
      var dst = args[0], src = args[1], n = Math.trunc(toNumber(args[2]));
      self.mem.copy(dst.addr, src.addr, n);
      return dst;
    };

    b.malloc = function (args, node) {
      var n = Math.trunc(toNumber(args[0]));
      if (n <= 0) return ptrVal(0, { k: 'ptr', to: { k: 'prim', name: 'void', size: 0 } });
      var a = self.mem.allocHeap(n, 'malloc(' + n + ')');
      return ptrVal(a, { k: 'ptr', to: { k: 'prim', name: 'void', size: 0 } });
    };
    b.calloc = function (args) {
      var n = Math.trunc(toNumber(args[0])) * Math.trunc(toNumber(args[1]));
      if (n <= 0) return ptrVal(0, { k: 'ptr', to: { k: 'prim', name: 'void', size: 0 } });
      var a = self.mem.allocHeap(n, 'calloc');
      return ptrVal(a, { k: 'ptr', to: { k: 'prim', name: 'void', size: 0 } });
    };
    b.free = function (args) {
      var p = args[0];
      if (isPtr(p) && p.addr) {
        for (var i = 0; i < self.mem.blocks.length; i++) {
          if (self.mem.blocks[i].addr === p.addr) {
            self.mem.blocks[i].freed = true;
            var sz = self.mem.blocks[i].size;
            try { for (var k = 0; k < Math.min(sz, 64); k++) self.mem.w8(p.addr + k, 0xDD); } catch (e) { }
          }
        }
      }
      return 0;
    };

    function mathFn(name, fn) {
      b[name] = function (args) { return fn(toNumber(args[0])); };
    }
    mathFn('fabs', Math.abs); mathFn('abs', function (x) { return Math.abs(Math.trunc(x)); });
    mathFn('labs', function (x) { return Math.abs(Math.trunc(x)); });
    mathFn('sqrt', Math.sqrt); mathFn('floor', Math.floor); mathFn('ceil', Math.ceil);
    mathFn('round', Math.round); mathFn('sin', Math.sin); mathFn('cos', Math.cos);
    mathFn('tan', Math.tan); mathFn('exp', Math.exp);
    b.pow = function (args) { return Math.pow(toNumber(args[0]), toNumber(args[1])); };
    b.fmod = function (args) { return toNumber(args[0]) % toNumber(args[1]); };
    b.log = function (args) { return Math.log(toNumber(args[0])); };
    b.log10 = function (args) { return Math.log10(toNumber(args[0])); };
    b.max = function (args) { return Math.max(toNumber(args[0]), toNumber(args[1])); };
    b.min = function (args) { return Math.min(toNumber(args[0]), toNumber(args[1])); };

    b.atoi = function (args) { return parseInt(argStr(args[0]), 10) || 0; };
    b.atof = function (args) { return parseFloat(argStr(args[0])) || 0; };
    b.toupper = function (args) { return argStr(args[0]).toUpperCase().charCodeAt(0); };
    b.tolower = function (args) { return argStr(args[0]).toLowerCase().charCodeAt(0); };
    b.isdigit = function (args) { return /[0-9]/.test(argStr(args[0])) ? 1 : 0; };
    b.isalpha = function (args) { return /[a-zA-Z]/.test(argStr(args[0])) ? 1 : 0; };
    b.isspace = function (args) { return /\s/.test(argStr(args[0])) ? 1 : 0; };
    b.isupper = function (args) { return /[A-Z]/.test(argStr(args[0])) ? 1 : 0; };
    b.islower = function (args) { return /[a-z]/.test(argStr(args[0])) ? 1 : 0; };

    b.srand = function (args) { self.randState = (Math.trunc(toNumber(args[0])) >>> 0) || 1; return 0; };
    b.rand = function () {
      self.randState = (self.randState * 1103515245 + 12345) >>> 0;
      return (self.randState >>> 16) & 0x7fff;
    };
    b.time = function () { return Math.floor(Date.now() / 1000); };

    b.exit = function (args) {
      self.exitCode = Math.trunc(toNumber(args[0]));
      throw new CError('__EXIT__', 0, 0, 'exit');
    };
    b.abort = b.exit;
    b.assert = function (args) {
      if (toNumber(args[0]) === 0) throw new CError('assert 失败：断言不成立', 0, 0, 'runtime');
      return 0;
    };

    b.swap = function (args, node, scope) {
      // std::swap(a, b) 要真的交换，必须拿到实参本身的内存
      if (!node || !node.args || node.args.length !== 2) {
        throw new CError('swap 需要两个参数', node ? node.line : 0, 1, 'runtime');
      }
      var l1 = null, l2 = null;
      try { l1 = self.resolve(node.args[0], scope); } catch (e) { l1 = null; }
      try { l2 = self.resolve(node.args[1], scope); } catch (e) { l2 = null; }
      if (!l1 || !l2 || !l1.set || !l2.set) {
        throw new CError('swap 的两个参数都必须是变量', node.line, 1, 'runtime');
      }
      var tmp = l1.get();
      l1.set(l2.get());
      l2.set(tmp);
      return 0;
    };

    // std::sort(v.begin(), v.end())
    b.sort = function (args, node, scope) {
      if (args.length < 2) throw new CError('sort 需要两个迭代器参数，例如 sort(v.begin(), v.end())', node ? node.line : 0, 1, 'runtime');
      var a = args[0], c = args[1];
      if (!isObj(a) || a.v !== 'iter') throw new CError('sort 的第一个参数应该是 v.begin()', node ? node.line : 0, 1, 'runtime');
      var target = a.target;
      var items = isObj(target) && target.v === 'vector' ? target.items : null;
      if (!items) throw new CError('sort 目前只支持 vector', node ? node.line : 0, 1, 'runtime');
      var slice = items.slice(a.idx, c.idx);
      var cmpv = args.length >= 3 ? args[2] : null;
      var self2 = this;
      slice.sort(function (x, y) {
        if (cmpv) {
          var r = null;
          if (isObj(cmpv) && cmpv.v === 'func') {
            r = self2.invokeUser(cmpv.name, [x, y], scope, node ? node.line : 0, null, null);
          } else if (isObj(cmpv) && cmpv.v === 'cmpobj') {
            var xn = isObj(x) && x.v === 'string' ? x.data : toNumber(x);
            var yn = isObj(y) && y.v === 'string' ? y.data : toNumber(y);
            r = cmpv.name === 'greater' ? (xn > yn) : (xn < yn);
          }
          if (r !== null && r !== undefined) return toNumber(r) !== 0 ? -1 : 1;
        }
        var xs = isObj(x) && x.v === 'string' ? x.data : toNumber(x);
        var ys = isObj(y) && y.v === 'string' ? y.data : toNumber(y);
        if (typeof xs === 'number' && typeof ys === 'number') return xs - ys;
        return String(xs) < String(ys) ? -1 : (String(xs) > String(ys) ? 1 : 0);
      });
      for (var i = 0; i < slice.length; i++) items[a.idx + i] = slice[i];
      return 0;
    };
    b.reverse = function (args) {
      var a = args[0], c = args[1];
      if (isObj(a) && a.v === 'iter' && isObj(c) && c.v === 'iter' && a.target === c.target) {
        var t = a.target;
        var slice = t.items.slice(a.idx, c.idx).reverse();
        for (var i = 0; i < slice.length; i++) t.items[a.idx + i] = slice[i];
        return 0;
      }
      throw new CError('reverse 需要 v.begin(), v.end()', 0, 0, 'runtime');
    };

    b.to_string = function (args) { return stringVal(toDisplayString(args[0])); };
    b.stoi = function (args) { return parseInt(argStr(args[0]), 10) || 0; };
    b.stod = function (args) { return parseFloat(argStr(args[0])) || 0; };

    return b;
  };

  /* --- printf 格式化 -------------------------------------------------- */
  Interp.prototype.formatPrintf = function (fmt, args) {
    var out = '';
    var ai = 0;
    var i = 0;
    while (i < fmt.length) {
      var c = fmt[i];
      if (c !== '%') { out += c; i++; continue; }
      if (fmt[i + 1] === '%') { out += '%'; i += 2; continue; }
      var j = i + 1;
      var flags = '';
      while (j < fmt.length && '-+ 0#'.indexOf(fmt[j]) >= 0) { flags += fmt[j]; j++; }
      var width = '';
      while (j < fmt.length && /[0-9]/.test(fmt[j])) { width += fmt[j]; j++; }
      if (fmt[j] === '*') { width = String(Math.trunc(toNumber(args[ai++]))); j++; }
      var prec = undefined;   // 必须显式重置：var 不会把上一轮的精度清掉
      if (fmt[j] === '.') {
        j++;
        var ps = '';
        while (j < fmt.length && /[0-9]/.test(fmt[j])) { ps += fmt[j]; j++; }
        if (fmt[j] === '*') { ps = String(Math.trunc(toNumber(args[ai++]))); j++; }
        prec = ps === '' ? 0 : parseInt(ps, 10);
      }
      // 长度修饰符
      while (j < fmt.length && /[hlLqjzt]/.test(fmt[j])) j++;
      var conv = fmt[j];
      if (!conv) break;
      j++;
      var val;
      if (conv === '%') { out += '%'; i = j; continue; }
      var arg = args[ai++];
      if (conv === 's' && (isPtr(arg) || (isObj(arg) && arg.v === 'string'))) {
        val = isObj(arg) && arg.v === 'string' ? arg.data : this.mem.readCString(arg.addr);
      } else if (conv === 'c') {
        val = Math.trunc(toNumber(arg));
      } else {
        val = arg;
      }
      out += formatOne(conv, flags, width === '' ? 0 : parseInt(width, 10), prec, val);
      i = j;
    }
    return out;
  };

  /* --- scanf ---------------------------------------------------------- */
  Interp.prototype.doScanf = function (args, node, scope, startIdx) {
    var fmt = isObj(args[0]) && args[0].v === 'string' ? args[0].data : this.mem.readCString(args[0].addr);
    var ai = startIdx;
    var count = 0;
    var i = 0;
    while (i < fmt.length) {
      var c = fmt[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c !== '%') { i++; continue; }
      var j = i + 1;
      var suppress = false;
      if (fmt[j] === '*') { suppress = true; j++; }
      var w = '';
      while (j < fmt.length && /[0-9]/.test(fmt[j])) { w += fmt[j]; j++; }
      while (j < fmt.length && /[hlLqjzt]/.test(fmt[j])) j++;
      var conv = fmt[j]; j++;
      var ptr = args[ai++];
      if (!isPtr(ptr)) throw new CError('scanf 的参数必须是地址，例如 scanf("%d", &x)', node ? node.line : 0, 1, 'runtime');
      var target = ptr.type && ptr.type.to ? ptr.type.to : { k: 'prim', name: 'int', size: 4 };

      if (conv === 'c') {
        if (this.stdinPos < this.stdin.length) {
          this.mem.w8(ptr.addr, this.stdin.charCodeAt(this.stdinPos++));
          count++;
        }
        i = j; continue;
      }
      if (conv === 's') {
        var word = this.readToken();
        this.mem.writeCString(ptr.addr, word);
        count++;
        i = j; continue;
      }
      var tok = this.readToken();
      if (tok === '') break;
      if (conv === 'd' || conv === 'i' || conv === 'u') {
        this.storeValue(ptr.addr, target, parseInt(tok, 10) || 0, scope);
      } else if (conv === 'f' || conv === 'e' || conv === 'g') {
        this.storeValue(ptr.addr, target, parseFloat(tok) || 0, scope);
      } else if (conv === 'x') {
        this.storeValue(ptr.addr, target, parseInt(tok, 16) || 0, scope);
      }
      count++;
      i = j;
    }
    return count;
  };

  /* =====================================================================
   * 运行
   * =================================================================== */
  Interp.prototype.registerFunctions = function () {
    var list = this.prog.functions || [];
    for (var i = 0; i < list.length; i++) {
      var fn = list[i];
      if (!this.funcs[fn.name]) this.funcs[fn.name] = [];
      this.funcs[fn.name].push(fn);
    }
    // main 兜底
    if (!this.funcs['main']) {
      throw new CError('找不到 main 函数。每个 C/C++ 程序都要有一个 [[int main()]] 作为入口', 1, 1, 'runtime');
    }
    var mains = this.funcs['main'];
    var realMain = null;
    for (var m = 0; m < mains.length; m++) if (mains[m].body) realMain = mains[m];
    if (!realMain) throw new CError('main 函数没有函数体', mains[0].line || 1, 1, 'runtime');
    this.mainFn = realMain;
  };

  Interp.prototype.run = function () {
    this.globalScope = this.globals;
    // 1) 注册函数
    this.registerFunctions();

    // 2) 初始化全局变量（按源码顺序）
    var order = this.prog.order || [];
    for (var i = 0; i < order.length; i++) {
      var it = order[i];
      if (it.k === 'global') {
        var g = it.g;
        this.declare(this.globals, g.name, g.type, null, g.line, 'global');
        this.globalOrder.push(g.name);
      }
    }
    for (var i2 = 0; i2 < order.length; i2++) {
      var it2 = order[i2];
      if (it2.k === 'global' && it2.g.init) {
        var cell = this.globals.lookup(it2.g.name);
        this.initCell(cell, it2.g.init, this.globals, it2.g.line);
      }
    }

    // 3) 调用 main
    var mainScope = new Scope(this.globals);
    try {
      this.executeFunction(this.mainFn, [], mainScope, this.mainFn.line, 'main');
    } catch (e) {
      if (e && e.isCError && e.phase === 'exit') {
        // exit() 正常退出
      } else throw e;
    }
    return this.out.join('');
  };

  /* =====================================================================
   * 内存快照（给"内存视图"用的）
   * =================================================================== */
  Interp.prototype.snapshot = function () {
    var res = { globals: [], stack: [], heap: [], memorySize: this.mem.size };
    var self = this;
    function describe(cell) {
      try {
        if (cell.obj !== null) {
          if (cell.obj.v === 'string') return '"' + cell.obj.data + '"';
          if (cell.obj.v === 'vector') return 'vector size=' + cell.obj.items.length;
          if (cell.obj.v === 'pair') return 'pair(' + toDisplayString(cell.obj.first) + ', ' + toDisplayString(cell.obj.second) + ')';
          return String(cell.obj);
        }
        var v = self.loadValue(cell.addr, cell.type, null);
        if (cell.type.k === 'arr') return '[' + typeName(cell.type) + '] ' + self.arrayPreview(cell.addr, cell.type);
        if (isStruct(v)) return self.structPreview(v);
        return toDisplayString(v);
      } catch (e) { return '(无法读取)'; }
    }
    var gnames = Object.keys(this.globals.vars);
    for (var i = 0; i < gnames.length; i++) {
      var gc = this.globals.vars[gnames[i]];
      res.globals.push({ name: gnames[i], type: typeName(gc.type), addr: gc.addr, size: this.concreteSize(gc.type, null), value: describe(gc) });
    }
    for (var f = 0; f < this.frames.length; f++) {
      var fr = this.frames[f];
      var vars = [];
      var scope = null;
      for (var v = 0; v < fr.vars.length; v++) {
        vars.push({ name: fr.vars[v].name, type: typeName(fr.vars[v].type), addr: fr.vars[v].addr, size: this.concreteSize(fr.vars[v].type, null) });
      }
      res.stack.push({ name: fr.name, sp: fr.sp, vars: vars });
    }
    for (var b = 0; b < this.mem.blocks.length; b++) {
      res.heap.push({ addr: this.mem.blocks[b].addr, size: this.mem.blocks[b].size, label: this.mem.blocks[b].label, freed: !!this.mem.blocks[b].freed });
    }
    return res;
  };

  Interp.prototype.arrayPreview = function (addr, type) {
    var el = type.of;
    var n = this.resolveLen(type.len, null) || 0;
    var sz = this.concreteSize(el, null);
    var parts = [];
    var lim = Math.min(n, 12);
    for (var i = 0; i < lim; i++) {
      var v = this.loadValue(addr + i * sz, el, null);
      if (el.k === 'prim' && el.name.indexOf('char') >= 0) parts.push("'" + String.fromCharCode(toNumber(v) || 32) + "'");
      else parts.push(toDisplayString(v));
    }
    if (n > lim) parts.push('…');
    return '{' + parts.join(', ') + '}';
  };

  Interp.prototype.structPreview = function (sv) {
    var def = sv.type.def;
    if (!def) return '{struct}';
    var parts = [];
    for (var i = 0; i < def.fields.length && i < 8; i++) {
      var f = def.fields[i];
      try {
        var v = this.loadValue(sv.addr + f.offset, f.type, null);
        parts.push(f.name + '=' + (isStruct(v) ? '{…}' : toDisplayString(v)));
      } catch (e) { parts.push(f.name + '=?'); }
    }
    return def.name + '{' + parts.join(', ') + '}';
  };

  /* =====================================================================
   * 对外入口
   * =================================================================== */
  MC.Interp = Interp;

  /**
   * 编译并运行一段 C/C++ 代码
   * @param {string} source
   * @param {{stdin?: string, timeLimit?: number}} options
   */
  MC.run = function (source, options) {
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var result = {
      ok: false, output: '', error: null, steps: 0,
      elapsed: 0, snapshot: null, phase: 'compile'
    };
    var interp = null;
    try {
      var parsed = MC.parse(source);
      result.phase = 'run';
      interp = new Interp(parsed.program, options || {});
      result.output = interp.run();
      result.ok = true;
    } catch (e) {
      result.error = normalizeError(e);
    }
    if (interp) {
      result.steps = interp.steps;
      // 崩在半路时，把崩溃前已经打印的内容保留下来（真实终端里也是看得到的）
      if (!result.output && interp.out && interp.out.length) {
        try { result.output = interp.out.join(''); } catch (e3) { }
      }
      try { result.snapshot = interp.snapshot(); } catch (e2) { result.snapshot = null; }
    }
    result.elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    result.interp = interp;
    return result;
  };

  function normalizeError(e) {
    if (e && e.isCError) {
      return { message: e.message, line: e.line, col: e.col, phase: e.phase };
    }
    if (e instanceof RangeError && /call stack/i.test(String(e.message))) {
      return { message: '递归太深，把 JavaScript 的调用栈撑爆了（真实 C 程序会在这里栈溢出）', line: 0, col: 0, phase: 'runtime' };
    }
    return { message: '内部错误：' + (e && e.message ? e.message : String(e)), line: 0, col: 0, phase: 'internal' };
  }

})(typeof window !== 'undefined' ? window : globalThis);
