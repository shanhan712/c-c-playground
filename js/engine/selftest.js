/* =========================================================================
 * 作者：山寒
 * MiniC 引擎 · 自检
 * -------------------------------------------------------------------------
 * 一整套小程序的"标准答案"，用来验证引擎的核心语义（尤其是最容易写错的
 * 整数除法、指针步长、struct 值传递、printf 格式化、C++ 的类与容器）。
 * 在页面的"实验室内核自检"里一键全跑。
 * ========================================================================= */
(function (global) {
  'use strict';
  var MC = global.MC = global.MC || {};

  function L() { return Array.prototype.slice.call(arguments).join('\n'); }

  var CASES = [
    /* ---------------- 基础输出 ---------------- */
    {
      name: 'Hello, World',
      src: L('int main() {', '    printf("Hello, World!\\n");', '    return 0;', '}'),
      expect: 'Hello, World!\n'
    },
    {
      name: 'printf 格式化全家桶',
      src: L(
        'int main() {',
        '    printf("%d|%i|%u\\n", 42, -7, 42);',
        '    printf("%5d|%-5d|%05d|\\n", 42, 42, 42);',
        '    printf("%x|%X|%o|\\n", 255, 255, 8);',
        '    printf("%c%c%c\\n", 72, 105, 33);',
        '    printf("%.2f|%f\\n", 3.14159, 2.5);',
        '    printf("%s|%10s|%-10s|\\n", "ab", "ab", "ab");',
        '    printf("%%|%e|%g\\n", 1234.5, 0.0001);',
        '    printf("%+d|% d|\\n", 5, 5);',
        '    return 0;',
        '}'),
      expect: '42|-7|42\n'
        + '   42|42   |00042|\n'
        + 'ff|FF|10|\n'
        + 'Hi!\n'
        + '3.14|2.500000\n'
        + 'ab|        ab|ab        |\n'
        + '%|1.234500e+03|0.0001\n'
        + '+5| 5|\n'
    },

    /* ---------------- 算术 ---------------- */
    {
      name: '整数除法 vs 浮点除法',
      src: L('int main() {', '    printf("%d\\n", 7 / 2);', '    printf("%.1f\\n", 7.0 / 2);', '    printf("%d\\n", 7 % 2);', '    return 0;', '}'),
      expect: '3\n3.5\n1\n'
    },
    {
      name: '自增自减与复合赋值',
      src: L('int main() {', '    int i = 5;', '    printf("%d ", i++);', '    printf("%d ", i);', '    printf("%d ", ++i);', '    printf("%d ", i--);', '    printf("%d\\n", i);', '    i += 10; i *= 2; i -= 4;', '    printf("%d\\n", i);', '    return 0;', '}'),
      expect: '5 6 7 7 6\n28\n'
    },
    {
      name: '位运算与三目',
      src: L('int main() {', '    printf("%d %d %d %d\\n", 12 & 10, 12 | 10, 12 ^ 10, ~0);', '    printf("%d %d\\n", 1 << 4, 256 >> 2);', '    printf("%d\\n", 5 > 3 ? 100 : 200);', '    return 0;', '}'),
      expect: '8 14 6 -1\n16 64\n100\n'
    },
    {
      name: '类型转换',
      src: L('int main() {', '    printf("%d %d\\n", (int)3.99, (int)-3.99);', '    printf("%c\\n", (char)65);', '    printf("%d\\n", (int)1.5 + (int)1.5);', '    return 0;', '}'),
      expect: '3 -3\nA\n2\n'
    },

    /* ---------------- 流程控制 ---------------- */
    {
      name: 'if / else 分支',
      src: L('int main() {', '    int s = 78;', '    if (s >= 90) printf("A\\n");', '    else if (s >= 80) printf("B\\n");', '    else if (s >= 70) printf("C\\n");', '    else printf("D\\n");', '    return 0;', '}'),
      expect: 'C\n'
    },
    {
      name: 'while / do-while',
      src: L('int main() {', '    int n = 1234, c = 0;', '    while (n > 0) { n /= 10; c++; }', '    printf("%d\\n", c);', '    int k = 0;', '    do { k++; } while (k < 5);', '    printf("%d\\n", k);', '    return 0;', '}'),
      expect: '4\n5\n'
    },
    {
      name: 'for 循环 + break/continue',
      src: L('int main() {', '    int sum = 0;', '    for (int i = 1; i <= 10; i++) {', '        if (i % 2 == 0) continue;', '        if (i > 8) break;', '        sum += i;', '    }', '    printf("%d\\n", sum);', '    return 0;', '}'),
      expect: '16\n'
    },
    {
      name: '九九乘法表（片段）',
      src: L('int main() {', '    for (int i = 1; i <= 3; i++) {', '        for (int j = 1; j <= i; j++) printf("%d*%d=%d ", i, j, i * j);', '        printf("\\n");', '    }', '    return 0;', '}'),
      expect: '1*1=1 \n2*1=2 2*2=4 \n3*1=3 3*2=6 3*3=9 \n'
    },
    {
      name: 'switch 贯穿',
      src: L('int main() {', '    for (int d = 1; d <= 4; d++) {', '        switch (d) {', '            case 1: printf("一");', '            case 2: printf("二"); break;', '            case 3: printf("三"); break;', '            default: printf("其他");', '        }', '    }', '    printf("\\n");', '    return 0;', '}'),
      expect: '一二二三其他\n'
    },

    /* ---------------- 函数 ---------------- */
    {
      name: '递归：阶乘与斐波那契',
      src: L('int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }', 'int fib(int n) { if (n < 2) return n; return fib(n - 1) + fib(n - 2); }', 'int main() {', '    printf("%d %d\\n", fact(5), fib(10));', '    return 0;', '}'),
      expect: '120 55\n'
    },
    {
      name: '值传递不改实参',
      src: L('void change(int x) { x = 999; }', 'int main() { int a = 1; change(a); printf("%d\\n", a); return 0; }'),
      expect: '1\n'
    },
    {
      name: '函数原型与相互递归',
      src: L('int isOdd(int n);', 'int isEven(int n) { return n == 0 ? 1 : isOdd(n - 1); }', 'int isOdd(int n) { return n == 0 ? 0 : isEven(n - 1); }', 'int main() { printf("%d %d\\n", isEven(10), isOdd(7)); return 0; }'),
      expect: '1 1\n'
    },

    /* ---------------- 数组 ---------------- */
    {
      name: '数组求和与最大值',
      src: L('int main() {', '    int a[5] = {3, 1, 4, 1, 5};', '    int s = 0, m = a[0];', '    for (int i = 0; i < 5; i++) { s += a[i]; if (a[i] > m) m = a[i]; }', '    printf("%d %d\\n", s, m);', '    return 0;', '}'),
      expect: '14 5\n'
    },
    {
      name: '二维数组',
      src: L('int main() {', '    int g[2][3] = {{1, 2, 3}, {4, 5, 6}};', '    int s = 0;', '    for (int i = 0; i < 2; i++) for (int j = 0; j < 3; j++) s += g[i][j];', '    printf("%d %d\\n", s, g[1][2]);', '    return 0;', '}'),
      expect: '21 6\n'
    },
    {
      name: '字符数组与 strlen',
      src: L('int main() {', '    char s[] = "hello";', '    printf("%s %d\\n", s, strlen(s));', '    printf("%c%c\\n", s[0], s[4]);', '    s[0] = \'H\';', '    printf("%s\\n", s);', '    return 0;', '}'),
      expect: 'hello 5\nho\nHello\n'
    },

    /* ---------------- 指针 ---------------- */
    {
      name: '取地址与解引用',
      src: L('int main() {', '    int a = 10;', '    int *p = &a;', '    *p = 20;', '    printf("%d %d\\n", a, *p);', '    return 0;', '}'),
      expect: '20 20\n'
    },
    {
      name: '指针交换两个数',
      src: L('void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }', 'int main() {', '    int x = 1, y = 2;', '    swap(&x, &y);', '    printf("%d %d\\n", x, y);', '    return 0;', '}'),
      expect: '2 1\n'
    },
    {
      name: 'a[i] 就是 *(a+i)',
      src: L('int main() {', '    int a[4] = {10, 20, 30, 40};', '    printf("%d %d %d\\n", a[2], *(a + 2), 2[a]);', '    int *p = a;', '    printf("%d %d\\n", *p, *(p + 3));', '    p++;', '    printf("%d\\n", *p);', '    return 0;', '}'),
      expect: '30 30 30\n10 40\n20\n'
    },
    {
      name: '指针步长跟类型走',
      src: L('int main() {', '    int a[5] = {0, 1, 2, 3, 4};', '    int *p = a;', '    char c = 0;', '    char *q = &c;', '    printf("%d %d %d\\n", (int)((p + 1) - p), (int)((q + 1) - q), (int)((char*)p - (char*)(p + 1)));', '    printf("%d\\n", sizeof(a) / sizeof(a[0]));', '    return 0;', '}'),
      expect: '1 1 -4\n5\n'
    },
    {
      name: '指针遍历数组',
      src: L('int main() {', '    int a[5] = {1, 2, 3, 4, 5};', '    int *p = a;', '    int s = 0;', '    while (p < a + 5) { s += *p; p++; }', '    printf("%d\\n", s);', '    return 0;', '}'),
      expect: '15\n'
    },
    {
      name: '二级指针',
      src: L('int main() {', '    int a = 7;', '    int *p = &a;', '    int **pp = &p;', '    **pp = 42;', '    printf("%d %d\\n", a, **pp);', '    return 0;', '}'),
      expect: '42 42\n'
    },
    {
      name: '指针与 sizeof',
      src: L('int main() {', '    printf("%d %d %d %d\\n", sizeof(char), sizeof(int), sizeof(double), sizeof(int*));', '    char s[] = "hello";', '    printf("%d %d\\n", sizeof(s), sizeof("hello"));', '    return 0;', '}'),
      expect: '1 4 8 4\n6 6\n'
    },

    /* ---------------- 结构体 ---------------- */
    {
      name: 'struct 定义与访问',
      src: L('struct Point { int x; int y; };', 'int main() {', '    struct Point p;', '    p.x = 3; p.y = 4;', '    printf("%d %d\\n", p.x, p.y);', '    return 0;', '}'),
      expect: '3 4\n'
    },
    {
      name: 'struct 初始化列表',
      src: L('typedef struct { int x, y; } Point;', 'int main() {', '    Point p = {3, 4};', '    printf("%d %d\\n", p.x, p.y);', '    return 0;', '}'),
      expect: '3 4\n'
    },
    {
      name: 'struct 指针 ->',
      src: L('struct P { int x, y; };', 'void move(struct P *p, int dx) { p->x += dx; }', 'int main() {', '    struct P a = {1, 2};', '    move(&a, 10);', '    printf("%d %d\\n", a.x, a.y);', '    return 0;', '}'),
      expect: '11 2\n'
    },
    {
      name: 'struct 数组',
      src: L('struct S { int id; int score; };', 'int main() {', '    struct S all[3] = {{1, 90}, {2, 85}, {3, 77}};', '    int best = 0;', '    for (int i = 1; i < 3; i++) if (all[i].score > all[best].score) best = i;', '    printf("%d %d\\n", all[best].id, all[best].score);', '    return 0;', '}'),
      expect: '1 90\n'
    },
    {
      name: 'struct 值传递是拷贝',
      src: L('struct P { int x; };', 'void bump(struct P p) { p.x = 100; }', 'int main() { struct P a = {1}; bump(a); printf("%d\\n", a.x); return 0; }'),
      expect: '1\n'
    },
    {
      name: 'struct 作为返回值',
      src: L('struct P { int x, y; };', 'struct P make(int a, int b) { struct P p; p.x = a; p.y = b; return p; }', 'int main() {', '    struct P p = make(7, 8);', '    printf("%d %d\\n", p.x, p.y);', '    return 0;', '}'),
      expect: '7 8\n'
    },

    /* ---------------- 动态内存 ---------------- */
    {
      name: 'malloc / free',
      src: L('int main() {', '    int n = 5;', '    int *a = (int*)malloc(n * sizeof(int));', '    for (int i = 0; i < n; i++) a[i] = i * i;', '    int s = 0;', '    for (int i = 0; i < n; i++) s += a[i];', '    printf("%d\\n", s);', '    free(a);', '    return 0;', '}'),
      expect: '30\n'
    },
    {
      name: 'new / delete',
      src: L('#include <iostream>', 'using namespace std;', 'int main() {', '    int *p = new int(42);', '    cout << *p << endl;', '    delete p;', '    int *arr = new int[3];', '    for (int i = 0; i < 3; i++) arr[i] = i + 1;', '    cout << arr[0] + arr[1] + arr[2] << endl;', '    delete[] arr;', '    return 0;', '}'),
      expect: '42\n6\n'
    },

    /* ---------------- 预处理 ---------------- */
    {
      name: '#define 对象宏与函数宏',
      src: L('#define MAX 100', '#define SQR(x) ((x) * (x))', '#define PI 3.14', 'int main() {', '    printf("%d %d\\n", MAX, SQR(5));', '    printf("%d\\n", SQR(2 + 3));', '    printf("%.2f\\n", PI);', '    return 0;', '}'),
      expect: '100 25\n25\n3.14\n'
    },
    {
      name: '#ifdef 条件编译',
      src: L('#define DEBUG', '#ifdef DEBUG', '#define LEVEL 2', '#else', '#define LEVEL 0', '#endif', 'int main() { printf("%d\\n", LEVEL); return 0; }'),
      expect: '2\n'
    },
    {
      name: 'enum 枚举',
      src: L('enum Color { RED, GREEN, BLUE };', 'enum Week { MON = 1, TUE, WED };', 'int main() {', '    printf("%d %d %d\\n", RED, GREEN, BLUE);', '    printf("%d %d\\n", MON, WED);', '    return 0;', '}'),
      expect: '0 1 2\n1 3\n'
    },
    {
      name: '全局变量与函数共享',
      src: L('int total = 0;', 'void add(int v) { total += v; }', 'int main() { add(3); add(4); printf("%d\\n", total); return 0; }'),
      expect: '7\n'
    },
    {
      name: 'const 与 #define 常量数组',
      src: L('const int N = 3;', 'int main() {', '    int a[N] = {1, 2, 3};', '    int s = 0;', '    for (int i = 0; i < N; i++) s += a[i];', '    printf("%d\\n", s);', '    return 0;', '}'),
      expect: '6\n'
    },

    /* ---------------- 字符串库 ---------------- */
    {
      name: 'strlen / strcmp / strcpy / strcat',
      src: L('int main() {', '    char a[20] = "abc";', '    char b[20] = "abd";', '    printf("%d\\n", strlen(a));', '    printf("%d\\n", strcmp(a, b) < 0);', '    char c[20];', '    strcpy(c, a);', '    strcat(c, "def");', '    printf("%s %d\\n", c, strlen(c));', '    return 0;', '}'),
      expect: '3\n1\nabcdef 6\n'
    },
    {
      name: 'sprintf / atoi / toupper',
      src: L('int main() {', '    char buf[32];', '    sprintf(buf, "%d-%s", 42, "x");', '    printf("%s\\n", buf);', '    printf("%d\\n", atoi("123") + 1);', '    printf("%c\\n", toupper(\'a\'));', '    return 0;', '}'),
      expect: '42-x\n124\nA\n'
    },
    {
      name: 'scanf 读取输入',
      src: L('int main() {', '    int a, b;', '    scanf("%d %d", &a, &b);', '    printf("%d\\n", a + b);', '    return 0;', '}'),
      stdin: '12 30',
      expect: '42\n'
    },
    {
      name: 'scanf 读取字符与字符串',
      src: L('int main() {', '    char name[20];', '    int age;', '    scanf("%s %d", name, &age);', '    printf("%s is %d\\n", name, age);', '    return 0;', '}'),
      stdin: 'Turing 41',
      expect: 'Turing is 41\n'
    },

    /* ---------------- 数学库 ---------------- */
    {
      name: '数学函数',
      src: L('int main() {', '    printf("%.4f\\n", sqrt(2.0));', '    printf("%.1f\\n", pow(2, 10));', '    printf("%d\\n", abs(-7));', '    printf("%.1f\\n", fabs(-2.5));', '    return 0;', '}'),
      expect: '1.4142\n1024.0\n7\n2.5\n'
    },

    /* ---------------- C++ ---------------- */
    {
      name: 'cout 与 endl',
      src: L('#include <iostream>', 'using namespace std;', 'int main() {', '    int x = 5;', '    double d = 2.5;', '    cout << "x=" << x << ", d=" << d << endl;', '    cout << "pi=" << 3.14159 << endl;', '    return 0;', '}'),
      expect: 'x=5, d=2.5\npi=3.14159\n'
    },
    {
      name: 'cin 读取',
      src: L('#include <iostream>', 'using namespace std;', 'int main() {', '    int a;', '    cin >> a;', '    cout << a * 2 << endl;', '    return 0;', '}'),
      stdin: '21',
      expect: '42\n'
    },
    {
      name: 'std::string',
      src: L('#include <iostream>', '#include <string>', 'using namespace std;', 'int main() {', '    string s = "hello";', '    s += " world";', '    cout << s << endl;', '    cout << s.size() << endl;', '    cout << s.substr(0, 5) << endl;', '    return 0;', '}'),
      expect: 'hello world\n11\nhello\n'
    },
    {
      name: 'class 构造 / 析构 / 封装',
      src: L('#include <iostream>', 'using namespace std;',
        'class Counter {',
        'private:',
        '    int n;',
        'public:',
        '    Counter() { n = 0; }',
        '    Counter(int start) { n = start; }',
        '    void inc() { n++; }',
        '    int get() { return n; }',
        '};',
        'int main() {',
        '    Counter a;',
        '    Counter b(10);',
        '    a.inc(); a.inc(); a.inc();',
        '    b.inc();',
        '    cout << a.get() << " " << b.get() << endl;',
        '    return 0;',
        '}'),
      expect: '3 11\n'
    },
    {
      name: '继承与多态',
      src: L('#include <iostream>', 'using namespace std;',
        'class Shape {',
        'public:',
        '    virtual double area() { return 0; }',
        '    void describe() { cout << "面积=" << area() << endl; }',
        '};',
        'class Rect : public Shape {',
        '    double w, h;',
        'public:',
        '    Rect(double a, double b) { w = a; h = b; }',
        '    double area() { return w * h; }',
        '};',
        'class Square : public Rect {',
        'public:',
        '    Square(double a) : Rect(a, a) {}',
        '};',
        'int main() {',
        '    Rect r(2, 5);',
        '    Square s(3);',
        '    r.describe();',
        '    s.describe();',
        '    return 0;',
        '}'),
      expect: '面积=10\n面积=9\n'
    },
    {
      name: 'C++ 引用参数',
      src: L('#include <iostream>', 'using namespace std;',
        'void addOne(int& x) { x += 1; }',
        'void swap2(int& a, int& b) { int t = a; a = b; b = t; }',
        'int main() {',
        '    int n = 5;',
        '    addOne(n);',
        '    cout << n << endl;',
        '    int x = 1, y = 2;',
        '    swap2(x, y);',
        '    cout << x << " " << y << endl;',
        '    return 0;',
        '}'),
      expect: '6\n2 1\n'
    },
    {
      name: 'C++ vector 基本操作',
      src: L('#include <iostream>', '#include <vector>', 'using namespace std;',
        'int main() {',
        '    vector<int> v;',
        '    v.push_back(3);',
        '    v.push_back(1);',
        '    v.push_back(4);',
        '    cout << v.size() << endl;',
        '    for (int i = 0; i < (int)v.size(); i++) cout << v[i] << " ";',
        '    cout << endl;',
        '    v.pop_back();',
        '    cout << v.size() << endl;',
        '    return 0;',
        '}'),
      expect: '3\n3 1 4 \n2\n'
    },
    {
      name: 'C++ 范围 for 与引用',
      src: L('#include <iostream>', '#include <vector>', 'using namespace std;',
        'int main() {',
        '    vector<int> v = {1, 2, 3, 4};',
        '    int sum = 0;',
        '    for (int x : v) sum += x;',
        '    cout << sum << endl;',
        '    for (int& x : v) x *= 2;',
        '    for (int x : v) cout << x << " ";',
        '    cout << endl;',
        '    return 0;',
        '}'),
      expect: '10\n2 4 6 8 \n'
    },
    {
      name: 'C++ sort 与迭代器',
      src: L('#include <iostream>', '#include <vector>', '#include <algorithm>', 'using namespace std;',
        'int main() {',
        '    vector<int> v = {5, 2, 9, 1, 7};',
        '    sort(v.begin(), v.end());',
        '    for (int x : v) cout << x << " ";',
        '    cout << endl;',
        '    return 0;',
        '}'),
      expect: '1 2 5 7 9 \n'
    },
    {
      name: 'C++ 结构体作为 vector 元素',
      src: L('#include <iostream>', '#include <vector>', 'using namespace std;',
        'struct Student { string name; int score; };',
        'int main() {',
        '    vector<Student> cls;',
        '    cls.push_back({"小明", 90});',
        '    cls.push_back({"小红", 95});',
        '    for (int i = 0; i < (int)cls.size(); i++)',
        '        cout << cls[i].name << ":" << cls[i].score << endl;',
        '    return 0;',
        '}'),
      expect: '小明:90\n小红:95\n'
    },

    /* ---------------- 运行时错误（应该被抓到并给出友好提示） ---------------- */
    {
      name: '数组越界应被拦截',
      src: L('int main() {', '    int a[3] = {1, 2, 3};', '    int i = 10;', '    printf("%d\\n", a[i]);', '    return 0;', '}'),
      expectError: '越界'
    },
    {
      name: '整数除以 0 应被拦截',
      src: L('int main() {', '    int a = 1, b = 0;', '    printf("%d\\n", a / b);', '    return 0;', '}'),
      expectError: '除以 0'
    },
    {
      name: '空指针解引用应被拦截',
      src: L('int main() {', '    int *p = NULL;', '    printf("%d\\n", *p);', '    return 0;', '}'),
      expectError: '空指针'
    },
    {
      name: '编译错误带行号',
      src: L('int main() {', '    int a = ;', '    return 0;', '}'),
      expectError: '第 2 行'
    }
  ];

  MC.SELFTEST_CASES = CASES;

  /**
   * 跑全部自检，返回 { total, pass, fail, results:[{name, ok, got, want, error}] }
   */
  MC.selfTest = function (onProgress) {
    var results = [];
    var pass = 0;
    for (var i = 0; i < CASES.length; i++) {
      var c = CASES[i];
      var r = { name: c.name, ok: false, got: '', want: '', error: null };
      try {
        var res = MC.run(c.src, { stdin: c.stdin || '', timeLimit: 2500 });
        if (c.expectError) {
          if (!res.ok && res.error) {
            var msg = '第 ' + res.error.line + ' 行: ' + res.error.message;
            if (msg.indexOf(c.expectError) >= 0) { r.ok = true; r.got = msg; }
            else { r.got = msg; r.want = '包含「' + c.expectError + '」'; }
          } else {
            r.got = res.output || '(没有报错)';
            r.want = '应该报错并包含「' + c.expectError + '」';
          }
        } else if (!res.ok) {
          r.got = '第 ' + res.error.line + ' 行: ' + res.error.message;
          r.want = c.expect;
        } else if (res.output === c.expect) {
          r.ok = true;
          r.got = res.output;
        } else {
          r.got = res.output;
          r.want = c.expect;
        }
      } catch (e) {
        r.got = '引擎异常：' + (e && e.message ? e.message : String(e));
        r.want = c.expect || c.expectError;
      }
      if (r.ok) pass++;
      results.push(r);
      if (onProgress) onProgress(i + 1, CASES.length, r);
    }
    return { total: CASES.length, pass: pass, fail: CASES.length - pass, results: results };
  };

})(typeof window !== 'undefined' ? window : globalThis);
