/* =========================================================================
 * 作者：山寒
 * MiniC 引擎 · 语法分析器
 * -------------------------------------------------------------------------
 * 递归下降，产出 AST。
 * 支持的子集：C89/C99 常用语法 + 一部分 C++（class/引用/vector/string/new）。
 * ========================================================================= */
(function (global) {
  'use strict';

  var MC = global.MC = global.MC || {};
  var CError = MC.CError;

  var QUALIFIERS = {
    const: 1, volatile: 1, static: 1, extern: 1, register: 1, inline: 1,
    constexpr: 1, mutable: 1, friend: 1, explicit: 1, typename: 1
  };
  var BASE_KW = { void: 1, char: 1, int: 1, float: 1, double: 1, bool: 1, wchar_t: 1 };

  // ILP32 数据模型：int/long/指针 = 4 字节，long long/double = 8 字节
  var PREDEFINED_TYPES = {
    size_t: { k: 'prim', name: 'unsigned int', size: 4 },
    ssize_t: { k: 'prim', name: 'int', size: 4 },
    ptrdiff_t: { k: 'prim', name: 'int', size: 4 },
    time_t: { k: 'prim', name: 'long', size: 4 },
    int8_t: { k: 'prim', name: 'char', size: 1 },
    uint8_t: { k: 'prim', name: 'unsigned char', size: 1 },
    int16_t: { k: 'prim', name: 'short', size: 2 },
    uint16_t: { k: 'prim', name: 'unsigned short', size: 2 },
    int32_t: { k: 'prim', name: 'int', size: 4 },
    uint32_t: { k: 'prim', name: 'unsigned int', size: 4 },
    int64_t: { k: 'prim', name: 'long long', size: 8 },
    uint64_t: { k: 'prim', name: 'unsigned long long', size: 8 },
    intptr_t: { k: 'prim', name: 'int', size: 4 },
    uintptr_t: { k: 'prim', name: 'unsigned int', size: 4 }
  };

  var ASSIGN_OPS = {
    '=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1, '%=': 1,
    '&=': 1, '|=': 1, '^=': 1, '<<=': 1, '>>=': 1
  };

  var BIN_PREC = {
    '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5,
    '==': 6, '!=': 6,
    '<': 7, '>': 7, '<=': 7, '>=': 7,
    '<<': 8, '>>': 8,
    '+': 9, '-': 9,
    '*': 10, '/': 10, '%': 10
  };

  function typeSize(t) {
    if (!t) return 4;
    switch (t.k) {
      case 'prim': return t.size;
      case 'ptr': case 'ref': case 'string': return 4;
      case 'arr': return (typeof t.len === 'number' ? t.len : 0) * typeSize(t.of);
      case 'vector': case 'pair': return 16;
      case 'struct': return t.def ? t.def.size : 4;
      default: return 4;
    }
  }
  function alignOf(t) {
    var s = typeSize(t);
    return Math.max(1, Math.min(s, 4));
  }
  MC.typeSize = typeSize;
  MC.alignOf = alignOf;

  function typeEq(a, b) {
    if (!a || !b) return false;
    if (a.k !== b.k) return false;
    if (a.k === 'prim') return a.name === b.name;
    if (a.k === 'ptr' || a.k === 'ref') return typeEq(a.to, b.to);
    if (a.k === 'arr') return (a.len === b.len) && typeEq(a.of, b.of);
    if (a.k === 'struct') return a.name === b.name;
    if (a.k === 'vector') return typeEq(a.of, b.of);
    if (a.k === 'pair') return typeEq(a.first, b.first) && typeEq(a.second, b.second);
    return a.k === b.k;
  }
  MC.typeEq = typeEq;

  function typeName(t) {
    if (!t) return '?';
    switch (t.k) {
      case 'prim': return t.name;
      case 'ptr': return typeName(t.to) + '*';
      case 'ref': return typeName(t.to) + '&';
      case 'arr': return typeName(t.of) + '[' + (t.len === null || t.len === undefined ? '' : t.len) + ']';
      case 'struct': return t.name;
      case 'string': return 'std::string';
      case 'vector': return 'std::vector<' + typeName(t.of) + '>';
      case 'pair': return 'std::pair<' + typeName(t.first) + ',' + typeName(t.second) + '>';
      case 'auto': return 'auto';
      default: return t.k;
    }
  }
  MC.typeName = typeName;

  /* =====================================================================
   * Parser
   * =================================================================== */
  function Parser(tokens) {
    this.toks = tokens;
    this.pos = 0;
    this.knownTypes = Object.create(null);   // 已知的类型名（struct/class/typedef）
    this.typedefs = Object.create(null);
    this.structs = Object.create(null);      // name -> StructDef
    this.constInts = Object.create(null);    // 全局整型常量：名字 -> 值（数组长度会用到）
    this.usingStd = false;
    this.anonCount = 0;
    this.prescan();
  }

  /* --- 基础工具 ------------------------------------------------------ */
  Parser.prototype.peek = function (o) { return this.toks[this.pos + (o || 0)] || this.toks[this.toks.length - 1]; };
  Parser.prototype.next = function () { var t = this.toks[this.pos]; if (t.type !== 'eof') this.pos++; return t; };
  Parser.prototype.is = function (type, value, o) {
    var t = this.peek(o);
    return t.type === type && (value === undefined || t.value === value);
  };
  Parser.prototype.at = function (value, o) { return this.is('punc', value, o) || this.is('kw', value, o); };
  Parser.prototype.accept = function (value) { if (this.at(value)) { this.next(); return true; } return false; };
  Parser.prototype.expect = function (value, what) {
    if (this.at(value)) return this.next();
    var t = this.peek();
    throw new CError('这里应该是 ' + value + (what ? '（' + what + '）' : '') + '，但读到的是 “' + t.value + '”', t.line, t.col, 'parse');
  };
  Parser.prototype.err = function (msg, tok) {
    var t = tok || this.peek();
    throw new CError(msg, t.line, t.col, 'parse');
  };
  Parser.prototype.eat = function (value) { if (this.at(value)) { this.next(); return true; } return false; };

  /* --- 预扫描：先找出所有类型名，后续才能正确解析声明 ------------------ */
  Parser.prototype.prescan = function () {
    for (var i = 0; i < this.toks.length; i++) {
      var t = this.toks[i];
      if (t.type === 'kw' && (t.value === 'struct' || t.value === 'class' || t.value === 'union' || t.value === 'enum')) {
        if (this.toks[i + 1] && this.toks[i + 1].type === 'id') this.knownTypes[this.toks[i + 1].value] = true;
        if (t.value === 'enum') this.enumSeen = true;
      }
      if (t.type === 'kw' && t.value === 'typedef') {
        // typedef ... NAME ;  —— 取分号前最后一个标识符
        var j = i + 1, last = null, depth = 0;
        for (; j < this.toks.length; j++) {
          var u = this.toks[j];
          if (u.type === 'eof') break;
          if (u.type === 'punc' && (u.value === '(' || u.value === '[')) depth++;
          if (u.type === 'punc' && (u.value === ')' || u.value === ']')) depth--;
          if (depth === 0 && u.type === 'punc' && u.value === ';') break;
          if (depth === 0 && u.type === 'id') last = u.value;
        }
        if (last) this.knownTypes[last] = true;
      }
      if (t.type === 'kw' && t.value === 'using' && this.toks[i + 1] && this.toks[i + 1].value === 'namespace') {
        this.usingStd = true;
      }
    }
    var self = this;
    Object.keys(PREDEFINED_TYPES).forEach(function (k) { self.knownTypes[k] = true; });
    // 常见 C++ 名字
    ['string', 'vector', 'pair', 'cout', 'cin', 'endl', 'sort', 'std'].forEach(function (k) {
      self.knownTypes[k] = self.knownTypes[k] || false;
    });
  };

  Parser.prototype.isKnownTypeName = function (name) {
    if (PREDEFINED_TYPES[name]) return true;
    if (this.knownTypes[name]) return true;
    // 这三个名字在本引擎里永远当作类型看待（写不写 using namespace std 都行）
    if (name === 'string' || name === 'vector' || name === 'pair') return true;
    return false;
  };

  // 模板的右尖括号：vector<vector<int>> 会被词法切成 '>>'，需要拆开
  Parser.prototype.expectAngle = function () {
    var t = this.peek();
    if (t.type === 'punc' && t.value === '>') { this.next(); return; }
    if (t.type === 'punc' && t.value === '>>') { t.value = '>'; t.col = t.col + 1; return; }
    this.err('模板参数没有闭合，这里应该是 >');
  };

  /* --- 类型解析 ------------------------------------------------------ */
  Parser.prototype.parseBaseType = function () {
    var mods = { unsigned: false, longCount: 0, short: false };
    var base = null;
    var guard = 0;

    for (;;) {
      if (guard++ > 32) this.err('类型说明符长得太离谱了');
      var t = this.peek();

      if (t.type === 'kw' && QUALIFIERS[t.value]) { this.next(); continue; }
      if (t.type === 'kw' && t.value === 'auto') { this.next(); return { k: 'auto' }; }
      if (t.type === 'kw' && (t.value === 'unsigned' || t.value === 'signed')) {
        if (t.value === 'unsigned') mods.unsigned = true;
        this.next(); continue;
      }
      if (t.type === 'kw' && t.value === 'long') { mods.longCount++; this.next(); continue; }
      if (t.type === 'kw' && t.value === 'short') { mods.short = true; this.next(); continue; }

      if (t.type === 'kw' && (t.value === 'struct' || t.value === 'class' || t.value === 'union' || t.value === 'enum')) {
        var kind = t.value;
        this.next();
        var name = null;
        if (this.is('id')) name = this.next().value;
        if (this.at('{')) {
          // 内联定义
          if (kind === 'enum') return this.parseEnum(name);
          return this.parseStructBody(name, kind === 'class' || kind === 'union');
        }
        if (this.at(':')) { // class X : public Y
          // 注意：这里必须把基类列表留下来交给 parseStructBody，
          // 否则 ':' 已经被吃掉，定义体里再也看不到继承关系了。
          var baseList = this.parseBaseClause();
          if (this.at('{')) return this.parseStructBody(name, true, baseList);
          if (!name) this.err('struct/class 后面缺少名字');
          if (!this.structs[name]) {
            this.structs[name] = { name: name, isClass: kind === 'class', fields: [], methods: Object.create(null), bases: [], size: 0, defined: false, line: t.line };
          }
          this.structs[name].bases = baseList;
          this.knownTypes[name] = true;
          return { k: 'struct', name: name, def: this.structs[name] };
        }
        if (!name) this.err('struct/class 后面缺少名字');
        if (!this.structs[name]) {
          this.structs[name] = { name: name, isClass: kind === 'class', fields: [], methods: Object.create(null), bases: [], size: 0, defined: false, line: t.line };
        }
        this.knownTypes[name] = true;
        return { k: 'struct', name: name, def: this.structs[name] };
      }

      if (t.type === 'kw' && t.value === 'bool') { this.next(); base = 'bool'; break; }
      if (t.type === 'kw' && BASE_KW[t.value]) { this.next(); base = t.value; break; }

      if (t.type === 'id') {
        // std::string / std::vector<T> / std::pair<A,B>
        if (t.value === 'std' && this.is('punc', '::', 1)) {
          var n2 = this.peek(2);
          if (n2 && n2.type === 'id' && (n2.value === 'string' || n2.value === 'vector' || n2.value === 'pair')) {
            this.next(); this.next(); this.next();
            return this.maybeNestedType(this.parseTemplateType(n2.value));
          }
          this.err('暂不支持 std::' + (n2 ? n2.value : '?') + '（本引擎只支持 std::string / std::vector / std::pair）', n2 || t);
        }
        if (this.usingStd && (t.value === 'string' || t.value === 'vector' || t.value === 'pair')) {
          this.next();
          return this.maybeNestedType(this.parseTemplateType(t.value));
        }
        if (PREDEFINED_TYPES[t.value]) { this.next(); return PREDEFINED_TYPES[t.value]; }
        if (this.typedefs[t.value]) { this.next(); return this.typedefs[t.value]; }
        if (this.structs[t.value]) {
          this.next();
          return { k: 'struct', name: t.value, def: this.structs[t.value] };
        }
      }
      break;
    }

    if (base === null) {
      if (mods.longCount >= 2) base = 'longlong';
      else if (mods.longCount === 1) base = 'long';
      else if (mods.short) base = 'short';
      else base = 'int';
    }
    if (mods.longCount >= 2 && base === 'double') base = 'double';
    else if (mods.longCount >= 1 && base === 'double') base = 'double';

    return makePrim(mods, base);
  };

  function makePrim(mods, base) {
    var u = mods.unsigned;
    switch (base) {
      case 'void': return { k: 'prim', name: 'void', size: 0 };
      case 'bool': return { k: 'prim', name: 'bool', size: 1 };
      case 'char': return { k: 'prim', name: u ? 'unsigned char' : 'char', size: 1 };
      case 'float': return { k: 'prim', name: 'float', size: 4 };
      case 'double': return { k: 'prim', name: 'double', size: 8 };
      case 'short': return { k: 'prim', name: u ? 'unsigned short' : 'short', size: 2 };
      case 'longlong': return { k: 'prim', name: u ? 'unsigned long long' : 'long long', size: 8 };
      case 'long': return { k: 'prim', name: u ? 'unsigned long' : 'long', size: 4 };
      case 'wchar_t': return { k: 'prim', name: 'int', size: 4 };
      default: return { k: 'prim', name: u ? 'unsigned int' : 'int', size: 4 };
    }
  }

  Parser.prototype.parseTemplateType = function (which) {
    if (which === 'string') return { k: 'string' };
    this.expect('<');
    var a = this.parseTypeName();
    if (which === 'vector') {
      this.expectAngle();
      return { k: 'vector', of: a };
    }
    this.expect(',');
    var b = this.parseTypeName();
    this.expectAngle();
    return { k: 'pair', first: a, second: b };
  };

  // 解析 "指针/引用/数组" 部分（不含名字）
  Parser.prototype.parseDeclarator = function (base) {
    var type = base;
    var guard = 0;
    for (;;) {
      if (guard++ > 16) this.err('声明符太复杂了');
      if (this.at('*')) {
        this.next();
        while (this.at('const') || this.at('volatile')) this.next();
        type = { k: 'ptr', to: type };
        continue;
      }
      if (this.at('&')) {
        this.next();
        type = { k: 'ref', to: type };
        continue;
      }
      if (this.at('&&')) { this.err('暂不支持右值引用 &&'); }
      break;
    }
    // 函数指针不支持，给个友好提示（此时名字还没读到，现在在 '(' 上）
    if (this.at('(')) this.err('暂不支持函数指针声明');
    var name = null;
    if (this.is('id')) name = this.next().value;
    // 数组后缀：先把各维长度收集起来，再从内到外包装。
    // 这样 int a[3][4] 得到的是「3 个（4 个 int）」—— 和 C 一致，
    // a[0] 的 sizeof 是 16 而不是 12。
    var dims = null;
    while (this.at('[')) {
      this.next();
      var len = null;
      if (!this.at(']')) {
        var e = this.parseAssign();
        if (e.k === 'num') len = e.value | 0;
        else if (e.k === 'id') len = { constName: e.name };
        else len = null;
      }
      this.expect(']');
      if (!dims) dims = [];
      dims.push(len);
    }
    if (dims) {
      for (var di = dims.length - 1; di >= 0; di--) {
        type = { k: 'arr', of: type, len: dims[di] };
      }
    }
    // 名字后面出现的 '(' 交给调用方（函数定义 / C++ 直接初始化）
    return { type: type, name: name };
  };

  // std::vector<int>::iterator / std::string::const_iterator
  Parser.prototype.maybeNestedType = function (tt) {
    if (this.is('punc', '::') && this.is('id', undefined, 1)) {
      var nm = this.peek(1).value;
      if (nm === 'iterator' || nm === 'const_iterator' || nm === 'value_type' ||
          nm === 'size_type' || nm === 'difference_type') {
        this.next(); this.next();
        return { k: 'iter', of: tt };
      }
    }
    return tt;
  };

  Parser.prototype.parseTypeName = function () {
    var base = this.parseBaseType();
    return this.parseDeclarator(base).type;
  };

  /* --- 判断当前位置是否是一个声明 ------------------------------------ */
  Parser.prototype.looksLikeDeclaration = function () {
    var i = this.pos;
    var t = this.toks[i];
    if (!t) return false;
    var guard = 0;
    // 跳过限定符
    for (;;) {
      if (guard++ > 16) return false;
      var u = this.toks[i];
      if (!u || u.type !== 'kw') break;
      if (QUALIFIERS[u.value]) { i++; continue; }
      break;
    }
    var s = this.toks[i];
    if (!s) return false;
    if (s.type === 'kw') {
      if (BASE_KW[s.value]) return true;
      if (s.value === 'unsigned' || s.value === 'signed' || s.value === 'long' || s.value === 'short') return true;
      if (s.value === 'auto') return true;
      if (s.value === 'struct' || s.value === 'class' || s.value === 'enum' || s.value === 'union') return true;
      if (s.value === 'const' || s.value === 'static') return true;
      return false;
    }
    if (s.type === 'id') {
      if (s.value === 'std' && this.toks[i + 1] && this.toks[i + 1].value === '::') {
        var n2 = this.toks[i + 2];
        if (n2 && (n2.value === 'string' || n2.value === 'vector' || n2.value === 'pair')) return true;
        return false;
      }
      if (this.isKnownTypeName(s.value)) {
        var nx = this.toks[i + 1];
        if (!nx) return false;
        if (nx.type === 'id') return true;
        if (nx.type === 'punc' && (nx.value === '*' || nx.value === '&' || nx.value === '<')) return true;
        return false;
      }
    }
    return false;
  };

  /* --- struct / class 体 --------------------------------------------- */
  Parser.prototype.parseBaseClause = function () {
    var bases = [];
    if (!this.accept(':')) return bases;
    for (;;) {
      this.eat('public'); this.eat('private'); this.eat('protected'); this.eat('virtual');
      var bt = this.parseTypeName();
      bases.push(bt);
      if (!this.accept(',')) break;
    }
    return bases;
  };

  Parser.prototype.parseStructBody = function (name, isClass, bases) {
    if (!name) name = '__anon' + (++this.anonCount);
    var def = this.structs[name];
    if (!def) {
      def = { name: name, isClass: !!isClass, fields: [], methods: Object.create(null), bases: [], size: 0, defined: false };
      this.structs[name] = def;
    }
    def.isClass = !!isClass;
    this.knownTypes[name] = true;

    // 继承列表在 '{' 之前（解析 'class X : public Y' 时 ':' 已经被上层吃掉了）
    if (bases && bases.length) def.bases = bases;
    else if (this.at(':')) def.bases = this.parseBaseClause();
    var openTok = this.expect('{', '类/结构体定义的开始');
    def.line = openTok.line;

    var access = isClass ? 'private' : 'public';
    var pendingVirtual = false;

    while (!this.at('}')) {
      if (this.is('eof')) this.err('类/结构体定义没有闭合，缺少 }');
      // 分号
      if (this.accept(';')) continue;
      // 访问说明符
      if ((this.at('public') || this.at('private') || this.at('protected')) && this.at(':', 1)) {
        access = this.next().value; this.next(); continue;
      }
      if (this.at('virtual')) { this.next(); pendingVirtual = true; continue; }
      if (this.at('static')) { this.next(); continue; }
      if (this.at('inline') || this.at('explicit') || this.at('constexpr')) { this.next(); continue; }
      if (this.at('friend')) { this.err('暂不支持 friend'); }
      if (this.at('template')) { this.err('暂不支持自定义模板（template）'); }

      // 析构函数 ~Name()
      if (this.at('~')) {
        this.next();
        var dn = this.next().value;
        this.expect('('); this.expect(')');
        var dbody = this.parseBlock();
        def.dtor = { name: '~' + dn, body: dbody, access: access, structName: name };
        continue;
      }
      // 构造函数 Name(...) 或 Name(...) : init(...) { }
      if (this.is('id', name) && this.at('(', 1)) {
        var ct = this.next();
        var cparams = this.parseParams();
        var inits = [];
        if (this.accept(':')) {
          for (;;) {
            var mname = this.next().value;
            this.expect('(');
            var iargs = [];
            if (!this.at(')')) {
              for (;;) {
                iargs.push(this.parseAssign());
                if (!this.accept(',')) break;
              }
            }
            this.expect(')');
            inits.push({ name: mname, args: iargs });
            if (!this.accept(',')) break;
          }
        }
        var cbody = null;
        if (this.at('{')) cbody = this.parseBlock(); else this.expect(';');
        def.ctor = def.ctor || [];
        def.ctor.push({ name: name, params: cparams, inits: inits, body: cbody, access: access, line: ct.line });
        continue;
      }

      // 一般成员：类型 + 声明符
      var base = this.parseBaseType();
      // 可能是 `Name operator+(...)` —— 明确拒绝
      if (this.at('operator')) this.err('暂不支持运算符重载（operator）');
      var d = this.parseDeclarator(base);
      if (!d.name) this.err('成员声明缺少名字');

      if (this.at('(')) {
        var params = this.parseParams();
        while (this.at('const') || this.at('override') || this.at('final') || this.at('noexcept')) this.next();
        if (this.at('=')) { // = 0 纯虚函数 或 = default/delete
          this.next();
          if (this.at('0')) this.next();
          else { this.next(); }
          this.expect(';');
          def.methods[d.name] = {
            name: d.name, retType: d.type, params: params, body: null,
            access: access, isVirtual: true, isPure: true, structName: name
          };
          continue;
        }
        var mbody = null;
        if (this.at('{')) mbody = this.parseBlock(); else this.expect(';');
        def.methods[d.name] = {
          name: d.name, retType: d.type, params: params, body: mbody,
          access: access, isVirtual: pendingVirtual, structName: name
        };
        pendingVirtual = false;
        continue;
      }

      // 成员变量
      for (;;) {
        def.fields.push({ name: d.name, type: d.type, access: access, line: this.peek().line });
        if (this.at('[')) {
          // 数组成员：把 [n] 应用到类型上（parseDeclarator 已处理，这里兜底）
        }
        if (this.accept(',')) { d = this.parseDeclarator(base); continue; }
        this.expect(';');
        break;
      }
    }
    this.expect('}');
    def.defined = true;
    this.layoutStruct(def);
    return { k: 'struct', name: name, def: def };
  };

  // 数组长度写成常量名时（enum 成员、已知的 const 整型），解析成具体数字。
  // 拿不准就返回 null —— 调用方负责兜底，绝不能让它变成 NaN。
  Parser.prototype.constLenValue = function (len) {
    if (typeof len === 'number') return len;
    if (!len || !len.constName) return null;
    var nm = len.constName;
    var i, e;
    for (e in this.enums) {
      var ms = this.enums[e];
      for (i = 0; i < ms.length; i++) if (ms[i].name === nm) return ms[i].value;
    }
    if (this.constInts && typeof this.constInts[nm] === 'number') return this.constInts[nm];
    return null;
  };

  Parser.prototype.fieldSize = function (type) {
    if (type.k === 'arr') {
      var n = this.constLenValue(type.len);
      if (n === null) return 0;
      var inner = this.fieldSize(type.of);
      return inner === 0 ? 0 : n * inner;
    }
    if (type.k === 'struct' && type.def) {
      // 结构体的 size 在它自己被 layout 时算好；自引用（非法代码）当作 0，别去递归
      return typeof type.def.size === 'number' ? type.def.size : 0;
    }
    var s = typeSize(type);
    return typeof s === 'number' && isFinite(s) ? s : 0;
  };

  Parser.prototype.fieldAlign = function (type, seen) {
    if (type.k === 'arr') return this.fieldAlign(type.of, seen);
    if (type.k === 'struct' && type.def && type.def.fields) {
      seen = seen || [];
      if (seen.indexOf(type.def) >= 0) return 1;   // 防自引用死循环
      seen.push(type.def);
      var m = 1;
      for (var i = 0; i < type.def.fields.length; i++) m = Math.max(m, this.fieldAlign(type.def.fields[i].type, seen));
      seen.pop();
      return m;
    }
    var s = this.fieldSize(type);
    return Math.max(1, Math.min(s || 1, 4));
  };

  Parser.prototype.layoutStruct = function (def) {
    var offset = 0;
    var maxAlign = 1;

    // 1) 基类子对象排在最前面（多继承按声明顺序依次摆放）
    var inherited = [];
    var baseOffsets = {};
    for (var b = 0; b < (def.bases || []).length; b++) {
      var bt = def.bases[b];
      var bd = bt.def || this.structs[bt.name];
      if (!bd) continue;
      if (!bd.allFields) this.layoutStruct(bd);
      baseOffsets[bd.name] = offset;
      for (var bn in (bd.baseOffsets || {})) baseOffsets[bn] = offset + bd.baseOffsets[bn];
      for (var k = 0; k < bd.allFields.length; k++) {
        var bf = bd.allFields[k];
        inherited.push({ name: bf.name, type: bf.type, offset: bf.offset + offset, owner: bf.owner, access: bf.access });
      }
      offset += bd.size;
      if ((bd.align || 1) > maxAlign) maxAlign = bd.align;
      bt.def = bd;
    }

    // 2) 自己的字段接在后面
    var own = [];
    for (var i = 0; i < def.fields.length; i++) {
      var f = def.fields[i];
      var sz = this.fieldSize(f.type);
      var al = this.fieldAlign(f.type);
      if (al > maxAlign) maxAlign = al;
      offset = Math.ceil(offset / al) * al;
      f.offset = offset;
      f.owner = def.name;
      offset += sz;
      own.push(f);
    }

    def.align = maxAlign;
    def.size = Math.ceil(offset / maxAlign) * maxAlign;
    if (def.size === 0) def.size = 1;
    def.baseOffsets = baseOffsets;
    // 带继承的字段查找表：基类字段在前，偏移已经换算成"相对本类起始"
    def.allFields = inherited.concat(own);
  };

  Parser.prototype.parseEnum = function (name) {
    var val = 0;
    var members = [];
    this.expect('{');
    while (!this.at('}')) {
      var n = this.next().value;
      if (this.accept('=')) {
        var e = this.parseAssign();
        val = e.k === 'num' ? e.value : val;
      }
      members.push({ name: n, value: val });
      val++;
      if (!this.accept(',')) break;
    }
    this.expect('}');
    if (!name) name = '__enum' + (++this.anonCount);
    this.enums = this.enums || {};
    this.enums[name] = members;
    this.knownTypes[name] = true;
    return { k: 'prim', name: 'int', size: 4, enumName: name };
  };

  /* --- 函数参数 ------------------------------------------------------ */
  Parser.prototype.parseParams = function () {
    this.expect('(');
    var params = [];
    if (this.at(')')) { this.next(); return params; }
    if (this.at('void') && this.at(')', 1)) { this.next(); this.next(); return params; }
    for (;;) {
      if (this.at('...')) { this.next(); break; }
      var base = this.parseBaseType();
      var d = this.parseDeclarator(base);
      var t = d.type;
      // 数组参数退化为指针
      if (t.k === 'arr') t = { k: 'ptr', to: t.of };
      var def = null;
      if (this.accept('=')) def = this.parseAssign();
      params.push({ name: d.name, type: t, def: def });
      if (!this.accept(',')) break;
    }
    this.expect(')');
    return params;
  };

  /* =====================================================================
   * 表达式
   * =================================================================== */
  Parser.prototype.parseExpression = function () {
    var e = this.parseAssign();
    while (this.at(',')) {
      var t = this.next();
      var r = this.parseAssign();
      e = { k: 'comma', left: e, right: r, line: t.line };
    }
    return e;
  };

  Parser.prototype.parseAssign = function () {
    var left = this.parseConditional();
    var t = this.peek();
    if (t.type === 'punc' && ASSIGN_OPS[t.value]) {
      this.next();
      var right = this.parseAssign();
      return { k: 'assign', op: t.value, target: left, value: right, line: t.line };
    }
    return left;
  };

  Parser.prototype.parseConditional = function () {
    var cond = this.parseBinary(1);
    if (this.at('?')) {
      var t = this.next();
      var cons = this.parseExpression();
      this.expect(':', '三目运算符的冒号');
      var alt = this.parseAssign();
      return { k: 'cond', test: cond, cons: cons, alt: alt, line: t.line };
    }
    return cond;
  };

  Parser.prototype.parseBinary = function (minPrec) {
    var left = this.parseUnary();
    for (;;) {
      var t = this.peek();
      if (t.type !== 'punc') break;
      var p = BIN_PREC[t.value];
      if (p === undefined || p < minPrec) break;
      this.next();
      var right = this.parseBinary(p + 1);
      left = { k: 'bin', op: t.value, left: left, right: right, line: t.line };
    }
    return left;
  };

  Parser.prototype.parseUnary = function () {
    var t = this.peek();
    if (t.type === 'punc' && (t.value === '+' || t.value === '-' || t.value === '!' || t.value === '~' || t.value === '*' || t.value === '&')) {
      this.next();
      // & 后面如果跟的是一个类型，那就是引用声明，不该走到这里
      var e = this.parseUnary();
      return { k: 'un', op: t.value, expr: e, line: t.line };
    }
    if (t.type === 'punc' && (t.value === '++' || t.value === '--')) {
      this.next();
      var e2 = this.parseUnary();
      return { k: 'un', op: t.value, expr: e2, line: t.line };
    }
    if (this.at('sizeof')) {
      this.next();
      if (this.at('(') && this.looksLikeTypeAt(this.pos + 1)) {
        this.next();
        var ty = this.parseTypeName();
        this.expect(')');
        return { k: 'sizeof', type: ty, line: t.line };
      }
      var ex = this.parseUnary();
      return { k: 'sizeof', expr: ex, line: t.line };
    }
    if (this.at('new')) {
      this.next();
      var nt = this.parseBaseType();
      if (this.at('(') && this.looksLikeTypeAt(this.pos + 1)) { this.next(); var ct = this.parseTypeName(); this.expect(')'); nt = ct; }
      var arrLen = null;
      if (this.at('[')) { this.next(); arrLen = this.parseAssign(); this.expect(']'); }
      else {
        while (this.at('*')) { this.next(); nt = { k: 'ptr', to: nt }; }
      }
      if (this.at('(') && arrLen === null) {
        this.next();
        var args = [];
        if (!this.at(')')) { for (;;) { args.push(this.parseAssign()); if (!this.accept(',')) break; } }
        this.expect(')');
        return { k: 'new', type: nt, args: args, isArray: false, line: t.line };
      }
      if (this.at('{') && arrLen === null) {
        var il = this.parseInitList();
        return { k: 'new', type: nt, args: [il], isArray: false, line: t.line };
      }
      return { k: 'new', type: nt, args: null, isArray: arrLen !== null, len: arrLen, line: t.line };
    }
    if (this.at('delete')) {
      this.next();
      var isArr = false;
      if (this.at('[')) { this.next(); this.expect(']'); isArr = true; }
      var de = this.parseUnary();
      return { k: 'delete', expr: de, isArray: isArr, line: t.line };
    }
    // 强制类型转换 (type)expr
    if (this.at('(') && this.looksLikeTypeAt(this.pos + 1)) {
      this.next();
      var cty = this.parseTypeName();
      this.expect(')');
      var ce = this.parseUnary();
      return { k: 'cast', type: cty, expr: ce, line: t.line };
    }
    return this.parsePostfix();
  };

  // 从下标 i 开始看，是不是一个类型名（用于区分 (int)x 和 (a+b)）
  Parser.prototype.looksLikeTypeAt = function (i) {
    var save = this.pos;
    this.pos = i;
    var ok = false;
    try { ok = this.looksLikeDeclaration(); } finally { this.pos = save; }
    // 进一步确认：type 后面必须紧跟 ')' 或者 '*'/'&'
    if (!ok) return false;
    this.pos = i;
    var r = false;
    try {
      this.parseTypeName();
      r = this.at(')');
    } catch (e) { r = false; }
    this.pos = save;
    return r;
  };

  Parser.prototype.parsePostfix = function () {
    var e = this.parsePrimary();
    // greater<int>() / less<int>()：把模板实参整个吃掉，当成一个比较器对象
    if (e.k === 'id' && (e.name === 'greater' || e.name === 'less') && this.at('<')) {
      var q = this.pos + 1;
      var depth = 1;
      var endQ = -1;
      while (q < this.toks.length && this.toks[q].type !== 'eof') {
        var qt = this.toks[q];
        if (qt.type === 'punc' && qt.value === '<') depth++;
        else if (qt.type === 'punc' && qt.value === '>') { depth--; if (depth === 0) { endQ = q; break; } }
        else if (qt.type === 'punc' && (qt.value === ';' || qt.value === '{' || qt.value === ')')) break;
        q++;
      }
      if (endQ >= 0 && this.toks[endQ + 1] && this.toks[endQ + 1].type === 'punc'
          && this.toks[endQ + 1].value === '(' && this.toks[endQ + 2]
          && this.toks[endQ + 2].type === 'punc' && this.toks[endQ + 2].value === ')') {
        var cmpName = e.name;
        this.pos = endQ + 3;
        e = { k: 'cmpobj', name: cmpName, line: e.line };
      }
    }
    for (;;) {
      if (this.at('(')) {
        var t = this.next();
        var args = [];
        if (!this.at(')')) {
          for (;;) {
            args.push(this.parseAssign());
            if (!this.accept(',')) break;
          }
        }
        this.expect(')');
        e = { k: 'call', callee: e, args: args, line: t.line };
        continue;
      }
      if (this.at('[')) {
        var t2 = this.next();
        var idx = this.parseExpression();
        this.expect(']');
        e = { k: 'index', base: e, index: idx, line: t2.line };
        continue;
      }
      if (this.at('.')) {
        var t3 = this.next();
        var f = this.next();
        if (f.type !== 'id' && f.type !== 'kw') this.err('“.” 后面应该是成员名', f);
        e = { k: 'member', obj: e, name: f.value, arrow: false, line: t3.line };
        continue;
      }
      if (this.at('->')) {
        var t4 = this.next();
        var f2 = this.next();
        if (f2.type !== 'id' && f2.type !== 'kw') this.err('“->” 后面应该是成员名', f2);
        e = { k: 'member', obj: e, name: f2.value, arrow: true, line: t4.line };
        continue;
      }
      if (this.at('++') || this.at('--')) {
        var t5 = this.next();
        e = { k: 'post', op: t5.value, expr: e, line: t5.line };
        continue;
      }
      break;
    }
    return e;
  };

  Parser.prototype.parsePrimary = function () {
    var t = this.peek();
    if (t.type === 'num') { this.next(); return { k: 'num', value: t.value, isFloat: t.isFloat, line: t.line }; }
    if (t.type === 'char') { this.next(); return { k: 'char', value: t.value, line: t.line }; }
    if (t.type === 'str') {
      this.next();
      var s = t.value;
      // 相邻字符串自动拼接
      while (this.is('str')) s += this.next().value;
      return { k: 'str', value: s, line: t.line };
    }
    if (t.type === 'kw' && (t.value === 'true' || t.value === 'false')) {
      this.next();
      return { k: 'num', value: t.value === 'true' ? 1 : 0, isFloat: false, isBool: true, line: t.line };
    }
    if (t.type === 'kw' && t.value === 'nullptr') { this.next(); return { k: 'num', value: 0, isFloat: false, isNull: true, line: t.line }; }
    if (t.type === 'kw' && t.value === 'this') { this.next(); return { k: 'this', line: t.line }; }
    if (t.type === 'kw' && t.value === 'new') return this.parseUnary();
    if (this.at('(')) {
      this.next();
      var e = this.parseExpression();
      this.expect(')');
      return e;
    }
    if (this.at('{')) return this.parseInitList();

    if (t.type === 'id') {
      // std::cout / std::endl / std::string 等
      if (t.value === 'std' && this.is('punc', '::', 1)) {
        this.next(); this.next();
        var n2 = this.next();
        return { k: 'id', name: 'std::' + n2.value, line: t.line };
      }
      this.next();
      return { k: 'id', name: t.value, line: t.line };
    }
    if (t.type === 'kw' && (t.value === 'string' || t.value === 'vector' || t.value === 'pair')) {
      this.next();
      return { k: 'id', name: t.value, line: t.line };
    }
    this.err('这里缺少一个表达式，却读到了 “' + t.value + '”', t);
  };

  Parser.prototype.parseInitList = function () {
    var t = this.expect('{');
    var items = [];
    if (!this.at('}')) {
      for (;;) {
        if (this.at('{')) items.push(this.parseInitList());
        else items.push(this.parseAssign());
        if (!this.accept(',')) break;
        if (this.at('}')) break;
      }
    }
    this.expect('}');
    return { k: 'initlist', items: items, line: t.line };
  };

  /* =====================================================================
   * 语句
   * =================================================================== */
  Parser.prototype.parseBlock = function () {
    var t = this.expect('{');
    var body = [];
    while (!this.at('}')) {
      if (this.is('eof')) this.err('代码块没有闭合，缺少 }');
      body.push(this.parseStatement());
    }
    this.expect('}');
    return { k: 'block', body: body, line: t.line };
  };

  Parser.prototype.parseStatement = function () {
    var t = this.peek();

    if (this.at(';')) { this.next(); return { k: 'empty', line: t.line }; }
    if (this.at('{')) return this.parseBlock();

    if (t.type === 'kw') {
      switch (t.value) {
        case 'if': {
          this.next();
          this.expect('(');
          var cond = this.parseExpression();
          this.expect(')');
          var then = this.parseStatement();
          var alt = null;
          if (this.at('else')) { this.next(); alt = this.parseStatement(); }
          return { k: 'if', cond: cond, then: then, alt: alt, line: t.line };
        }
        case 'while': {
          this.next();
          this.expect('(');
          var c = this.parseExpression();
          this.expect(')');
          var b = this.parseStatement();
          return { k: 'while', cond: c, body: b, line: t.line };
        }
        case 'do': {
          this.next();
          var bd = this.parseStatement();
          this.expect('while');
          this.expect('(');
          var cd = this.parseExpression();
          this.expect(')');
          this.expect(';');
          return { k: 'dowhile', cond: cd, body: bd, line: t.line };
        }
        case 'for': return this.parseFor();
        case 'switch': {
          this.next();
          this.expect('(');
          var se = this.parseExpression();
          this.expect(')');
          return this.parseSwitchBody(se, t.line);
        }
        case 'return': {
          this.next();
          var rv = null;
          if (!this.at(';')) rv = this.parseExpression();
          this.expect(';');
          return { k: 'return', expr: rv, line: t.line };
        }
        case 'break': this.next(); this.expect(';'); return { k: 'break', line: t.line };
        case 'continue': this.next(); this.expect(';'); return { k: 'continue', line: t.line };
        case 'goto': this.err('暂不支持 goto');
        case 'typedef': {
          this.next();
          var tb = this.parseBaseType();
          var td = this.parseDeclarator(tb);
          if (!td.name) this.err('typedef 缺少名字');
          this.typedefs[td.name] = td.type;
          this.knownTypes[td.name] = true;
          this.expect(';');
          return { k: 'empty', line: t.line };
        }
        case 'using': {
          this.next();
          if (this.at('namespace')) {
            this.next();
            var ns = this.next().value;
            this.expect(';');
            if (ns === 'std') this.usingStd = true;
            return { k: 'empty', line: t.line };
          }
          var un = this.next().value;
          this.expect('=');
          var ut = this.parseTypeName();
          this.expect(';');
          this.typedefs[un] = ut;
          this.knownTypes[un] = true;
          return { k: 'empty', line: t.line };
        }
        case 'struct': case 'class': case 'enum': case 'union': {
          if (this.looksLikeDeclaration()) {
            var st = this.parseBaseType();
            if (this.at(';')) { this.next(); return { k: 'empty', line: t.line }; }
            return this.parseVarDeclStatement(st, t.line);
          }
          break;
        }
        case 'template': this.err('暂不支持自定义模板（template）');
        case 'namespace': {
          this.next();
          this.next();
          this.expect('{');
          var nsBody = [];
          while (!this.at('}')) nsBody.push(this.parseStatement());
          this.expect('}');
          return { k: 'block', body: nsBody, line: t.line };
        }
        default: break;
      }
    }

    if (this.looksLikeDeclaration()) {
      var ty = this.parseBaseType();
      return this.parseVarDeclStatement(ty, t.line);
    }

    var e = this.parseExpression();
    this.expect(';');
    return { k: 'expr', expr: e, line: t.line };
  };

  Parser.prototype.parseFor = function () {
    var t = this.expect('for');
    this.expect('(');

    // range-based for: for (int x : v)
    var save = this.pos;
    var isRange = false;
    var rangeDecl = null;
    if (this.looksLikeDeclaration()) {
      var ty = this.parseBaseType();
      var d = this.parseDeclarator(ty);
      if (this.at(':')) {
        isRange = true;
        rangeDecl = { name: d.name, type: d.type };
      } else {
        this.pos = save;
      }
    } else if (this.is('id') && this.at(':', 1)) {
      isRange = true;
      rangeDecl = { name: this.next().value, type: { k: 'auto' } };
    }
    if (isRange) {
      this.expect(':');
      var rexpr = this.parseExpression();
      this.expect(')');
      var rbody = this.parseStatement();
      return { k: 'forin', decl: rangeDecl, expr: rexpr, body: rbody, line: t.line };
    }

    var init = null;
    if (!this.at(';')) {
      if (this.looksLikeDeclaration()) {
        var ity = this.parseBaseType();
        init = this.parseVarDecl(ity, true);
      } else {
        init = { k: 'expr', expr: this.parseExpression(), line: t.line };
      }
    }
    this.expect(';');
    var cond = null;
    if (!this.at(';')) cond = this.parseExpression();
    this.expect(';');
    var step = null;
    if (!this.at(')')) step = this.parseExpression();
    this.expect(')');
    var body = this.parseStatement();
    return { k: 'for', init: init, cond: cond, step: step, body: body, line: t.line };
  };

  Parser.prototype.parseSwitchBody = function (disc, line) {
    this.expect('{');
    var cases = [];
    var cur = null;
    while (!this.at('}')) {
      if (this.is('eof')) this.err('switch 没有闭合');
      if (this.at('case')) {
        var ct = this.next();
        var v = this.parseConditional();
        this.expect(':');
        cur = { value: v, stmts: [], line: ct.line };
        cases.push(cur);
        continue;
      }
      if (this.at('default')) {
        var dt = this.next();
        this.expect(':');
        cur = { value: null, stmts: [], line: dt.line };
        cases.push(cur);
        continue;
      }
      if (!cur) { cur = { value: null, stmts: [], line: this.peek().line, implicit: true }; cases.push(cur); }
      cur.stmts.push(this.parseStatement());
    }
    this.expect('}');
    return { k: 'switch', expr: disc, cases: cases, line: line };
  };

  // 解析一条或多条同类型变量声明，末尾吃掉 ';'
  Parser.prototype.parseVarDeclStatement = function (base, line) {
    var d = this.parseVarDecl(base, true);
    this.expect(';');
    d.line = line;
    return d;
  };

  // 解析变量声明（不吃分号），返回 {k:'decl', decls:[...]}
  Parser.prototype.parseVarDecl = function (base, allowList) {
    var line = this.peek().line;
    var decls = [];
    var guard = 0;
    for (;;) {
      if (guard++ > 64) this.err('声明列表太长了');
      var d = this.parseDeclarator(base);
      if (!d.name) this.err('变量声明缺少名字');
      var init = null;
      if (this.accept('=')) {
        if (this.at('{')) init = this.parseInitList();
        else init = this.parseAssign();
      } else if (this.at('(')) {
        // C++ 直接初始化：int x(5);  Counter c(10);  Rect r(2, 5);
        this.next();
        var cargs = [];
        if (!this.at(')')) {
          for (;;) {
            cargs.push(this.parseAssign());
            if (!this.accept(',')) break;
          }
        }
        this.expect(')');
        init = { k: 'ctorargs', args: cargs, line: line };
      }
      // 不写长度的数组：长度由初始化式决定（C 的规则）
      if (d.type && d.type.k === 'arr' && d.type.len === null && init) {
        if (init.k === 'str') d.type.len = init.value.length + 1;
        else if (init.k === 'initlist') d.type.len = init.items.length;
      }
      decls.push({ name: d.name, type: d.type, init: init, line: line });
      if (allowList && this.accept(',')) continue;
      break;
    }
    return { k: 'decl', decls: decls, line: line };
  };

  /* =====================================================================
   * 顶层
   * =================================================================== */
  Parser.prototype.parseProgram = function () {
    var globals = [];
    var functions = [];
    var order = [];
    var defs = [];      // typedef 记录

    while (!this.is('eof')) {
      if (this.accept(';')) continue;
      var t = this.peek();

      if (this.at('template')) this.err('暂不支持自定义模板（template）');
      if (this.at('namespace')) {
        this.next(); this.next(); this.expect('{');
        while (!this.at('}')) {
          if (this.is('eof')) this.err('namespace 没有闭合');
          this.parseTopItem(globals, functions, order, defs);
        }
        this.expect('}');
        continue;
      }
      if (this.at('using')) {
        this.next();
        if (this.at('namespace')) { this.next(); var ns = this.next().value; this.expect(';'); if (ns === 'std') this.usingStd = true; continue; }
        var un = this.next().value; this.expect('='); var ut = this.parseTypeName(); this.expect(';');
        this.typedefs[un] = ut; this.knownTypes[un] = true; continue;
      }
      if (this.at('typedef')) {
        this.next();
        var tb = this.parseBaseType();
        var td = this.parseDeclarator(tb);
        if (td.name) { this.typedefs[td.name] = td.type; this.knownTypes[td.name] = true; }
        this.expect(';');
        continue;
      }
      if (this.at('extern') && this.is('str', undefined, 1)) { this.next(); this.next(); this.accept(';'); continue; }
      this.parseTopItem(globals, functions, order, defs);
    }

    return {
      globals: globals,
      functions: functions,
      structs: this.structs,
      enums: this.enums || {},
      order: order,
      usingStd: this.usingStd
    };
  };

  Parser.prototype.parseTopItem = function (globals, functions, order, defs) {
    var t = this.peek();
    var base = this.parseBaseType();

    // 只有 struct Point {...}; 这种纯定义
    if (this.at(';')) { this.next(); return; }

    var d = this.parseDeclarator(base);
    if (!d.name) {
      if (this.at(';')) { this.next(); return; }
      this.err('顶层声明缺少名字');
    }

    if (this.at('(')) {
      var params = this.parseParams();
      while (this.at('const') || this.at('override') || this.at('final')) this.next();
      if (this.at(';')) {
        this.next();
        functions.push({ name: d.name, retType: d.type, params: params, body: null, line: t.line, isProto: true });
        return;
      }
      // 构造函数初始化列表（全局函数不会有，容错一下）
      if (this.at(':')) { this.err('这里不该出现初始化列表'); }
      var body = this.parseBlock();
      var fn = { name: d.name, retType: d.type, params: params, body: body, line: t.line, isProto: false };
      functions.push(fn);
      order.push({ k: 'func', fn: fn, line: t.line });
      return;
    }

    // 全局变量
    for (;;) {
      var init = null;
      if (this.accept('=')) {
        if (this.at('{')) init = this.parseInitList();
        else init = this.parseAssign();
      } else if (this.at('(')) {
        this.next();
        var cargs2 = [];
        if (!this.at(')')) {
          for (;;) {
            cargs2.push(this.parseAssign());
            if (!this.accept(',')) break;
          }
        }
        this.expect(')');
        init = { k: 'ctorargs', args: cargs2, line: t.line };
      }
      var g = { name: d.name, type: d.type, init: init, line: t.line };
      if (init && init.k === 'num' && typeof init.value === 'number' && !init.isFloat) {
        this.constInts[g.name] = init.value | 0;
      }
      globals.push(g);
      order.push({ k: 'global', g: g, line: t.line });
      if (this.accept(',')) { d = this.parseDeclarator(base); continue; }
      this.expect(';');
      break;
    }
  };

  /* =====================================================================
   * 对外接口
   * =================================================================== */
  MC.parse = function (source) {
    var lexed = MC.lex(source);
    var p = new Parser(lexed.tokens);
    var program = p.parseProgram();
    return { program: program, tokens: lexed.tokens, parser: p };
  };

  MC.Parser = Parser;

})(typeof window !== 'undefined' ? window : globalThis);
