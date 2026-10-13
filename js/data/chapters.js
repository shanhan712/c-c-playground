/* =========================================================================
 * 作者：山寒
 * chapters.js —— 课程总纲 + 速查表
 * -------------------------------------------------------------------------
 * 把 lessons-01/02/03 三个数据文件拼成一棵完整的课程树，并做一次归一化
 * （补齐缺省字段、过滤坏数据），让 app.js 可以无脑渲染。
 * ========================================================================= */
(function (global) {
  'use strict';
  var MC = global.MC = global.MC || {};

  /* ------------------------------------------------------------------ *
   * 章节元信息（顺序即学习顺序）
   * ------------------------------------------------------------------ */
  MC.CHAPTERS = [
    {
      id: 'start', title: '起步', icon: '🚀', color: '#38bdf8',
      desc: '写出第一个程序，看懂它的骨架，学会让电脑开口说话。'
    },
    {
      id: 'types', title: '变量与数据类型', icon: '📦', color: '#34d399',
      desc: '给数据找合适的盒子：整数、小数、字符，以及它们各自的脾气。'
    },
    {
      id: 'ops', title: '运算符', icon: '➕', color: '#fbbf24',
      desc: '算术、比较、逻辑、位运算——把数据算成你要的结果。'
    },
    {
      id: 'flow', title: '流程控制', icon: '🔀', color: '#f472b6',
      desc: '让程序会拐弯、会重复：if、switch、while、for。'
    },
    {
      id: 'func', title: '函数', icon: '🧩', color: '#a78bfa',
      desc: '把一段活儿打包成积木，反复使用，还能自己调用自己。'
    },
    {
      id: 'array', title: '数组', icon: '🧱', color: '#22d3ee',
      desc: '一次性存放一排数据，并用下标精准取用。'
    },
    {
      id: 'pointer', title: '指针', icon: '🎯', color: '#fb7185',
      desc: 'C 语言最锋利也最容易割伤手的刀：地址、解引用、步长。'
    },
    {
      id: 'struct', title: '结构体', icon: '🏗️', color: '#facc15',
      desc: '把不同类型的数据捆成一个整体，用名字描述真实世界。'
    },
    {
      id: 'memory', title: '内存管理', icon: '🧠', color: '#4ade80',
      desc: '栈与堆、malloc 与 free、泄漏与悬垂——程序为什么会崩。'
    },
    {
      id: 'cpp-oop', title: 'C++ 面向对象', icon: '🏛️', color: '#60a5fa',
      desc: '类、对象、构造与析构、继承与多态，把代码组织成体系。'
    },
    {
      id: 'cpp-stl', title: 'C++ 标准库', icon: '🧰', color: '#c084fc',
      desc: 'string、vector、sort、引用——现代 C++ 真正好用的部分。'
    }
  ];

  /* ------------------------------------------------------------------ *
   * 归一化：把三个分片拼成完整课程树
   * ------------------------------------------------------------------ */
  function rawLessons() {
    var out = [];
    var parts = [global.CPP_LESSONS_P1, global.CPP_LESSONS_P2, global.CPP_LESSONS_P3];
    for (var i = 0; i < parts.length; i++) {
      if (Array.isArray(parts[i])) out = out.concat(parts[i]);
    }
    return out;
  }

  function normalizeLesson(raw, chapterId) {
    var pages = [];
    var rawPages = Array.isArray(raw.pages) ? raw.pages : [];
    for (var i = 0; i < rawPages.length; i++) {
      var p = rawPages[i];
      if (!p) continue;
      pages.push({
        title: p.title || ('第 ' + (i + 1) + " 页"),
        body: typeof p.body === 'string' ? p.body : '',
        code: typeof p.code === 'string' && p.code.trim() ? p.code : null,
        stdin: typeof p.stdin === 'string' ? p.stdin : '',
        expect: typeof p.expect === 'string' ? p.expect : null,
        tip: p.tip || null
      });
    }
    if (!pages.length) return null;

    var challenges = [];
    var rawCh = Array.isArray(raw.challenges) ? raw.challenges : [];
    for (var j = 0; j < rawCh.length; j++) {
      var c = rawCh[j];
      if (!c || !Array.isArray(c.options) || c.options.length < 2) continue;
      var ans = typeof c.answer === 'number' ? c.answer : parseInt(c.answer, 10);
      if (!(ans >= 0 && ans < c.options.length)) ans = 0;
      challenges.push({
        type: c.type === 'predict' ? 'predict' : 'choice',
        question: c.question || c.q || '选出正确答案',
        code: typeof c.code === 'string' && c.code.trim() ? c.code : null,
        options: c.options.slice(),
        answer: ans,
        explain: c.explain || ''
      });
    }

    return {
      id: raw.id || (chapterId + '-' + Math.random().toString(36).slice(2, 7)),
      chapter: chapterId,
      title: raw.title || '未命名小节',
      icon: raw.icon || '📘',
      xp: typeof raw.xp === 'number' && raw.xp > 0 ? raw.xp : 10,
      pages: pages,
      challenges: challenges
    };
  }

  /**
   * 构建完整课程树。
   * @returns {{lessons:Array, chapters:Array, byId:Object, totalPages:number, totalChallenges:number}}
   */
  MC.curriculum = function () {
    var chapters = [];
    var byId = {};
    var flat = [];
    var map = {};

    var i;
    for (i = 0; i < MC.CHAPTERS.length; i++) {
      var meta = MC.CHAPTERS[i];
      var entry = {
        id: meta.id, title: meta.title, icon: meta.icon,
        color: meta.color, desc: meta.desc, lessons: []
      };
      chapters.push(entry);
      map[meta.id] = entry;
    }

    var raw = rawLessons();
    for (i = 0; i < raw.length; i++) {
      var r = raw[i];
      if (!r || !r.id) continue;
      var chId = r.chapter;
      if (!map[chId]) {
        // 未知章节：临时挂到一个"番外"章节，避免整条课程链断掉
        map[chId] = { id: chId, title: chId, icon: '❓', color: '#94a3b8', desc: '', lessons: [] };
        chapters.push(map[chId]);
      }
      var lesson = normalizeLesson(r, chId);
      if (!lesson) continue;
      if (byId[lesson.id]) continue;
      lesson.chapterMeta = map[chId];
      map[chId].lessons.push(lesson);
      byId[lesson.id] = lesson;
      flat.push(lesson);
    }

    var totalPages = 0, totalChallenges = 0;
    for (i = 0; i < flat.length; i++) {
      totalPages += flat[i].pages.length;
      totalChallenges += flat[i].challenges.length;
    }

    return {
      lessons: flat,
      chapters: chapters.filter(function (c) { return c.lessons.length > 0; }),
      byId: byId,
      totalPages: totalPages,
      totalChallenges: totalChallenges
    };
  };

  /* ------------------------------------------------------------------ *
   * 速查表
   * ------------------------------------------------------------------ */
  MC.CHEATSHEET = [
    {
      title: '最小可运行骨架',
      icon: '🚀',
      items: [
        { t: 'C 语言', c: '#include <stdio.h>\n\nint main() {\n    printf("你好\\n");\n    return 0;\n}' },
        { t: 'C++', c: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "你好" << endl;\n    return 0;\n}' }
      ]
    },
    {
      title: '数据类型与大小',
      icon: '📦',
      items: [
        { t: '常用类型', c: 'char     1 字节   \'A\' 或 -128~127\nint      4 字节   -21 亿 ~ 21 亿\nunsigned 4 字节   0 ~ 42 亿\nlong long 8 字节  很大\ndouble   8 字节   小数（推荐用这个）\nbool     1 字节   true / false（C++）' },
        { t: '格式说明符', c: '%d  int      %u  unsigned\n%ld long     %lld long long\n%f  double   %.2f 保留两位小数\n%c  char     %s  字符串\n%x  十六进制  %o  八进制\n%%  输出一个 % 号' }
      ]
    },
    {
      title: '运算符优先级（从高到低）',
      icon: '➕',
      items: [
        { t: '记忆口诀', c: '()  []  ->  .            // 最高\n!  ~  ++  --  (类型)  *  &  sizeof\na * b   a / b   a % b\na + b   a - b\na << b  a >> b\na < b   a <= b  a > b  a >= b\na == b  a != b\na & b\na ^ b\na | b\na && b\na || b\na ? b : c\na = b   a += b  ...        // 最低' },
        { t: '最容易踩的坑', c: 'x > y == 0   实际是 (x > y) == 0\ni++ + ++i     未定义行为，别写\nif (a = 5)    赋值不是比较，应为 ==\n1 + 2 * 3     先乘除后加减 = 7' }
      ]
    },
    {
      title: '流程控制',
      icon: '🔀',
      items: [
        { t: '分支', c: 'if (条件) { ... }\nelse if (条件) { ... }\nelse { ... }\n\nswitch (x) {\n    case 1:  ...; break;\n    case 2:  ...; break;\n    default: ...;\n}' },
        { t: '循环', c: 'for (int i = 0; i < n; i++) { ... }\n\nwhile (条件) { ... }\n\ndo { ... } while (条件);   // 至少执行一次\n\nbreak;     // 跳出整个循环\ncontinue;  // 跳过本轮剩下的语句' }
      ]
    },
    {
      title: '数组与字符串',
      icon: '🧱',
      items: [
        { t: '数组', c: 'int a[5] = {1, 2, 3, 4, 5};\nint a[5] = {0};          // 全部清零\na[0] = 10;               // 下标从 0 开始\n\nint n = sizeof(a) / sizeof(a[0]);  // 元素个数\n\nint g[2][3] = {{1,2,3}, {4,5,6}};\ng[1][2] = 99;            // 第 2 行第 3 列' },
        { t: '字符串', c: 'char s[] = "hello";     // 占 6 字节，末尾有 \'\\0\'\nstrlen(s)                // 长度 5\na == b                   // 比较的是地址，不是内容！\nstrcmp(a, b) == 0        // 内容相同\nstrcpy(dst, src);\nstrcat(dst, src);\n\nstd::string t = "abc";   // C++ 里推荐用这个\nt += "def";\nt.size();  t.substr(0, 2);' }
      ]
    },
    {
      title: '指针',
      icon: '🎯',
      items: [
        { t: '三个符号', c: 'int a = 10;\nint *p = &a;    // & 取地址\n*p = 20;        // * 解引用（读写那块内存）\n\nprintf("%d\\n", *p);' },
        { t: '指针与数组', c: 'int a[5] = {1,2,3,4,5};\nint *p = a;        // 数组名就是首元素地址\na[i]  ==  *(a + i)\np + 1  // 地址前进 sizeof(int) = 4 字节\nwhile (p < a + 5) { sum += *p; p++; }' },
        { t: '常见错误', c: 'int *p;      // 野指针：没初始化\n*p = 5;      // 危险！\n\nint *p = NULL;\n*p;          // 空指针解引用 → 崩溃\n\nfree(p);\nfree(p);     // 重复释放 → 崩溃\n\nchar *s = "abc";\ns[0] = \'A\';  // 改字面量 → 未定义行为（多数平台会崩溃）' }
      ]
    },
    {
      title: '结构体',
      icon: '🏗️',
      items: [
        { t: '定义与使用', c: 'struct Point {\n    int x;\n    int y;\n};\n\nstruct Point p = {3, 4};\np.x = 5;\n\nstruct Point *q = &p;\nq->x = 7;        // 指针用 ->，等价于 (*q).x' },
        { t: 'typedef 简化', c: 'typedef struct {\n    char name[20];\n    int score;\n} Student;\n\nStudent s = {"小明", 90};\nprintf("%s %d\\n", s.name, s.score);' },
        { t: '重要区别', c: '结构体赋值 = 整体拷贝\nvoid f(struct Point p) { p.x = 99; }  // 改了不影响外面\nvoid f(struct Point *p) { p->x = 99; } // 这才改到外面' }
      ]
    },
    {
      title: '内存管理',
      icon: '🧠',
      items: [
        { t: '四个区', c: '全局区   全局变量、字符串常量（程序全程都在）\n栈       局部变量、函数参数（自动分配/释放，很小）\n堆       malloc / new 申请（手动申请，手动释放；malloc 失败返回 NULL，new 失败抛 bad_alloc）\n代码区   程序指令（只读）' },
        { t: 'C 的写法', c: 'int *a = (int*)malloc(n * sizeof(int));\nif (a == NULL) return -1;   // 一定要判空\n// ... 使用 a[i] ...\nfree(a);\na = NULL;                   // 置空防悬垂' },
        { t: 'C++ 的写法', c: 'int *p = new int(42);\nint *arr = new int[n];\ndelete p;        // 单个\ndelete[] arr;    // 数组，必须配对！\n\n// 更省心：用 vector，自动管理' }
      ]
    },
    {
      title: 'C++ 面向对象',
      icon: '🏛️',
      items: [
        { t: '类的基本形态', c: 'class Counter {\nprivate:\n    int n;              // 私有：只能内部访问\npublic:\n    Counter() { n = 0; }            // 默认构造\n    Counter(int s) { n = s; }       // 带参构造\n    ~Counter() { }                  // 析构\n    void inc() { n++; }             // 成员函数\n    int get() const { return n; }\n};\n\nCounter c(10);\nc.inc();' },
        { t: '继承与多态', c: 'class Shape {\npublic:\n    virtual double area() { return 0; }  // 虚函数\n};\n\nclass Rect : public Shape {\n    double w, h;\npublic:\n    Rect(double a, double b) : w(a), h(b) {}  // 初始化列表\n    double area() override { return w * h; }\n};\n\nShape *p = new Rect(2, 5);\np->area();   // 有 virtual 才动态绑定 → 10\ndelete p;    // new 出来的要 delete（基类析构应声明 virtual）' }
      ]
    },
    {
      title: 'C++ 标准库',
      icon: '🧰',
      items: [
        { t: 'vector', c: 'vector<int> v;\nv.push_back(10);      // 追加\nv.size();             // 元素个数（返回无符号数！）\nv[0];                 // 下标访问\nv.pop_back();         // 删除末尾\nvector<int> w = {1, 2, 3};\nfor (int x : w) cout << x;        // 范围 for\nfor (int &x : w) x *= 2;          // 引用才能改' },
        { t: 'string 与 sort', c: '// 需 #include <string> <vector> <algorithm> <functional> + using namespace std;\nstring s = "hello";\ns += " world";\ns.size();  s.substr(0, 5);  s.find("wor");\n\nsort(v.begin(), v.end());               // 升序\nsort(v.begin(), v.end(), greater<int>()); // 降序（greater 在 <functional> 里）\nsort(v.begin(), v.end(), [](int a, int b){ return a > b; });' },
        { t: '引用', c: 'int a = 5;\nint &r = a;      // r 是 a 的别名，不是拷贝\nr = 8;           // a 也变成 8\n\nvoid addOne(int &x) { x++; }  // 传引用才能改调用方的变量' }
      ]
    }
  ];

})(typeof window !== 'undefined' ? window : globalThis);
