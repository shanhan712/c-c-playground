// lessons-02-adv.js —— 章节：func / array / pointer / struct
// 作者：山寒
// 经典 script（非模块写法），顶层只有一条赋值
window.CPP_LESSONS_P2 = [
  {
    id: 'func-1',
    chapter: 'func',
    title: '函数是什么',
    icon: '🧩',
    xp: 15,
    pages: [
      {
        title: '把一段代码打包成机器',
        body: `函数就是一台**小机器**：你往里塞原料（参数），它吐出一个成品（返回值）。

没有函数的时候，所有代码都堆在 [[main]] 里，改一个地方要翻半天。有了函数，就能把一件事打包起来、起个名字，用的时候喊一声就行。

**函数的三要素**：

- 名字：叫得出来才能用，比如 [[add]]
- 参数：原料清单，比如 [[int a, int b]]
- 返回值：成品类型，比如 [[int]]

> 一个函数只干一件事，名字要能读出它干了什么。[[calc]] 这种名字是灾难。`
      },
      {
        title: '第一个函数：加法机',
        body: `先定义，再使用。[[add]] 定义在 [[main]] 前面，所以 [[main]] 里可以直接喊它。

看第三行输出：[[add(-5, 5)]] 得到 0，函数不关心你传进来的是正是负。`,
        code: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    int s = add(3, 4);
    printf("%d\\n", s);
    printf("%d\\n", add(10, 20));
    printf("%d\\n", add(-5, 5));
    return 0;
}`,
        expect: `7
30
0
`
      },
      {
        title: '先打招呼，再干活',
        body: `C 语言是**从上往下**读代码的。如果函数的定义写在 [[main]] 后面，就得先在前面放一份**声明**：把函数头抄一遍，末尾加个分号。

声明就像提前告诉编译器「有这么个函数，长这样」，至于它具体怎么实现，可以晚点再说。

> 这也是大型项目能把代码拆成多个文件的基础：只要能看到声明，就能调用。`,
        code: `#include <stdio.h>

int square(int x);

int main() {
    printf("%d\\n", square(5));
    printf("%d\\n", square(square(2)));
    return 0;
}

int square(int x) {
    return x * x;
}`,
        expect: `25
16
`
      },
      {
        title: 'void：只干活，不交货',
        body: `[[void]] 表示**没有返回值**。这种函数一样有用——它可以直接打印东西，或者修改传进来的变量。

调用一个 [[void]] 函数时，别写成 [[int x = cheer(1, 2)]]，编译器会当场翻脸。

注意 [[putchar]] 只能输出单个字符，所以想换行就自己 [[putchar]] 一个换行符。`,
        code: `#include <stdio.h>

void cheer(char c, int n) {
    for (int i = 0; i < n; i++) {
        putchar(c);
    }
    putchar('\\n');
}

int main() {
    cheer('*', 5);
    cheer('#', 3);
    return 0;
}`,
        expect: `*****
###
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

int f(int x) {
    return x * 2 + 1;
}

int main() {
    printf("%d\\n", f(f(1)));
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['3', '5', '7', '9'],
        answer: 2,
        explain: '内层 [[f(1)]] 先算：1 * 2 + 1 = 3。这个 3 再当成参数传进去：3 * 2 + 1 = 7。嵌套调用永远是**从里往外**算的，别看两层就慌。'
      },
      {
        type: 'choice',
        question: '如果函数定义写在 [[main]] 后面，那 [[main]] 前面必须补上什么？',
        options: ['什么都不用写', '把函数体整体搬到 main 里', '加一个 #define', '把这个函数的声明（函数头 + 分号）抄一遍'],
        answer: 3,
        explain: '走到调用点时，编译器必须先知道这个函数**叫什么、要几个什么类型的参数、返回什么**，而声明恰好提供了这些信息。定义可以晚一点出现。'
      },
      {
        type: 'choice',
        question: '关于 [[void]] 函数，下面哪种说法是对的？',
        options: ['void 函数没有返回值，不能把调用结果赋给变量', 'void 函数不能有参数', 'void 函数必须写 return 0', 'void 函数不能打印任何东西'],
        answer: 0,
        explain: '[[void]] 就是「不交货」。它可以有任意参数，可以用裸 [[return;]] 提前结束，但调用它的表达式本身不产生值，写 [[int x = f();]] 会编译报错。'
      }
    ]
  },
  {
    id: 'func-2',
    chapter: 'func',
    title: '参数是复印件',
    icon: '📮',
    xp: 20,
    pages: [
      {
        title: '值传递：改的是复印件',
        body: `C 语言默认**值传递**：调用函数时，实参的值被**复制**一份塞进形参。函数里改来改去，改的都是那份复印件，原件毫发无伤。

> 记住这句话，指针那一章就成功了一半：**函数里改不了外面的变量，除非你把它的地址交给函数**。

- 形参：函数定义里写的名字，是复印件
- 实参：调用时真正传进去的值，是原件
- 函数返回后，形参这份复印件就被扔掉了`
      },
      {
        title: '两个同名的 x',
        body: `看下面这段代码：[[main]] 里有个 [[x]]，[[tryChange]] 里也有个 [[x]]。它们是**两个完全不同的变量**，只是碰巧重名了。

[[main]] 里的 1 被复制进 [[tryChange]]，函数里把复印件改成 100 并打印，函数一结束复印件就销毁，[[main]] 的 1 从头到尾没被碰过。`,
        code: `#include <stdio.h>

void tryChange(int x) {
    x = 100;
    printf("inside: x = %d\\n", x);
}

int main() {
    int x = 1;
    tryChange(x);
    printf("outside: x = %d\\n", x);
    return 0;
}`,
        expect: `inside: x = 100
outside: x = 1
`
      },
      {
        title: '作用域：变量也有地盘',
        body: `变量只在自己出生的那对花括号里活着，这叫**作用域**。

内层再定义一个同名变量叫**遮蔽**：在内层，外层那个被挡住了；出了花括号，外层又回来了。

循环里声明的 [[int i]] 和 [[int b]]，出了循环就消失，这就是「变量的生命周期」。`,
        code: `#include <stdio.h>

int main() {
    int a = 10;
    {
        int a = 20;
        printf("inner a = %d\\n", a);
    }
    printf("outer a = %d\\n", a);

    for (int i = 0; i < 2; i++) {
        int b = i + 1;
        printf("b = %d\\n", b);
    }
    return 0;
}`,
        expect: `inner a = 20
outer a = 10
b = 1
b = 2
`
      },
      {
        title: '多个出口：提前 return',
        body: `一个函数可以有**好几个** [[return]]，谁先被执行谁说了算，后面的代码直接跳过。

这种写法叫「守卫式返回」：把特殊情况先处理掉，剩下的就是主干逻辑，读起来比层层嵌套的 [[else]] 清爽得多。`,
        code: `#include <stdio.h>

int max3(int a, int b, int c) {
    int m = a;
    if (b > m) m = b;
    if (c > m) m = c;
    return m;
}

int isEven(int n) {
    if (n % 2 == 0) {
        return 1;
    }
    return 0;
}

int main() {
    printf("%d\\n", max3(3, 9, 5));
    printf("%d\\n", isEven(7));
    printf("%d\\n", isEven(8));
    return 0;
}`,
        expect: `9
0
1
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

void swap(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

int main() {
    int x = 1, y = 2;
    swap(x, y);
    printf("%d %d\\n", x, y);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['1 2', '2 1', '1 1', '2 2'],
        answer: 0,
        explain: '[[swap]] 里确实交换成功了——但它交换的是两份**复印件**。函数一返回，复印件就被扔掉，[[main]] 里的 x 和 y 从头到尾没被碰过。想在函数里改外面，必须传**地址**：[[swap(&x, &y)]]，形参写成 [[int* a]]。'
      },
      {
        type: 'choice',
        question: '调用 [[add(3, 4)]] 时，数字 3 和 4 是怎么进入函数的？',
        options: ['直接把变量本身交给函数', '把 3 和 4 的地址传给函数', '复制一份值传给形参 a 和 b', '先存到全局变量再传进去'],
        answer: 2,
        explain: '默认的值传递就是**复制**。好处是函数里怎么折腾都伤不到调用者；坏处是改不了外面，而且参数如果是很大的结构体，复制本身也挺费。'
      },
      {
        type: 'choice',
        question: '在 [[for (int i = 0; i < 3; i++)]] 循环结束后，再写 [[printf("%d", i);]] 会怎样？',
        options: ['正常打印 3', '编译报错，i 不在这个作用域里', '正常打印 2', '打印一个随机值'],
        answer: 1,
        explain: '在 [[for]] 的初始化部分声明 [[int i]]，它的地盘就是整个循环（含循环体）。循环一结束 [[i]] 就销毁了，后面再提它属于「未声明的标识符」。把 [[int i]] 提到循环外面声明就能解决。'
      }
    ]
  },
  {
    id: 'func-3',
    chapter: 'func',
    title: '递归：自己叫自己',
    icon: '🔁',
    xp: 25,
    pages: [
      {
        title: '俄罗斯套娃',
        body: `递归就是函数**调用自己**。写递归只要想清楚两件事：

1. **出口**（终止条件）：什么时候停下来，不再往下叫
2. **递推**：这一层怎么利用「下一层的结果」

> 忘了出口 = 无限套娃 = 栈溢出崩溃。这是新手第一大死法。

递归的执行过程像剥洋葱：一层层进去，碰到出口后，再一层层带着结果回来。每一层都在等下一层的答案。`
      },
      {
        title: '阶乘：第一个递归',
        body: `[[fact(5)]] 要算 5 * [[fact(4)]]，而 [[fact(4)]] 又要算 4 * [[fact(3)]]，一路问到 [[fact(1)]]，出口返回 1，然后层层往回乘。

代码只有三行，却完成了 n 次乘法，这就是递归的魔力。`,
        code: `#include <stdio.h>

int fact(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}

int main() {
    for (int i = 1; i <= 5; i++) {
        printf("%d! = %d\\n", i, fact(i));
    }
    return 0;
}`,
        expect: `1! = 1
2! = 2
3! = 6
4! = 24
5! = 120
`
      },
      {
        title: '斐波那契与累加',
        body: `[[fib]] 的出口是 [[n < 2]]，[[sumTo]] 的出口是 [[n == 0]]。

出口不一定只有一个，但**必须能被走到**。比如 [[fib]] 里如果写成 [[n <= 1]] 的递归调用，就会无限循环下去。

这一页的输出第一行是个数列，用 [[if (i > 0)]] 来控制空格，保证行尾没有多余空格。`,
        code: `#include <stdio.h>

int fib(int n) {
    if (n < 2) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}

int sumTo(int n) {
    if (n == 0) {
        return 0;
    }
    return n + sumTo(n - 1);
}

int main() {
    for (int i = 0; i <= 7; i++) {
        if (i > 0) printf(" ");
        printf("%d", fib(i));
    }
    printf("\\n");
    printf("sum = %d\\n", sumTo(100));
    return 0;
}`,
        expect: `0 1 1 2 3 5 8 13
sum = 5050
`
      },
      {
        title: '打印的时机决定顺序',
        body: `[[printf]] 写在递归调用**前面**，就是「进去的时候打印」，顺序从 3 到 1。

如果把 [[printf]] 挪到调用**后面**，打印顺序会整个倒过来。这就是所谓的「回来的时候再处理」，很多需要逆序输出的算法就靠这一手。

> 递归调用之前是「去程」，之后是「回程」。想清楚你要在哪一程干活。`,
        code: `#include <stdio.h>

void countDown(int n) {
    if (n == 0) {
        printf("go!\\n");
        return;
    }
    printf("%d\\n", n);
    countDown(n - 1);
}

int main() {
    countDown(3);
    return 0;
}`,
        expect: `3
2
1
go!
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

int mystery(int n) {
    if (n == 0) {
        return 0;
    }
    return 1 + mystery(n / 2);
}

int main() {
    printf("%d\\n", mystery(10));
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['2', '3', '4', '5'],
        answer: 2,
        explain: '这其实是「10 能连续除以几次 2」：10 → 5 → 2 → 1 → 0，一共除了 4 次，所以递归了 4 层，返回 4。手算递归最好的办法是**列一张表**，把每层的 n 和返回值写下来。'
      },
      {
        type: 'choice',
        question: '一个递归函数最不能少的是什么？',
        options: ['能到达的终止条件（出口）', '至少两个参数', '每层都要 printf', '一个全局变量'],
        answer: 0,
        explain: '没有出口的递归会一直调用自己，每调用一层就吃掉一块栈空间，很快就会**栈溢出**，程序直接崩。写递归先写出口、再写递推，这是铁律。'
      },
      {
        type: 'choice',
        question: '求 1 到 n 的和，用递归 [[n + sumTo(n - 1)]] 和用循环，最大的区别是什么？',
        options: ['递归算得更快', '循环不能求 1 到 n 的和', '递归不需要返回值', '递归每层都占栈空间，n 很大时会爆栈；循环不会'],
        answer: 3,
        explain: '两者结果和复杂度都一样，区别在开销：递归每层都要保存现场（占栈），n 到几十万级别就可能爆栈。能用循环简单搞定的事不必上递归——递归真正的战场是树、图、分治这类天然嵌套的问题。'
      }
    ]
  },
  {
    id: 'array-1',
    chapter: 'array',
    title: '一维数组',
    icon: '🚗',
    xp: 18,
    pages: [
      {
        title: '一排连续的车位',
        body: `数组就是**一排紧挨着的、类型相同的车位**，每个车位有个编号（下标），从 **0** 开始。

- [[int a[5];]] 一次开 5 个 int 车位，下标范围是 0 到 4
- 没有 a[5] 这个车位，越界访问不会报错，只会悄悄踩坏别人家的内存
- 所有元素类型必须相同，长度必须是一个**编译期就能确定的数**

> 为什么从 0 开始？因为下标本质是「离开头**偏移**几个位置」。第一个车位偏移 0 格，很合理。`
      },
      {
        title: '定义、初始化、遍历',
        body: `用 [[#define N 5]] 把长度写成宏，循环条件写 [[i < N]]，以后要改长度只改一处。

[[sizeof(a) / sizeof(a[0])]] 也能算出长度，但只在数组**还在当前作用域**时有效——一旦传进函数，数组就退化成指针了，那时候 [[sizeof]] 算出来的是指针的大小。`,
        code: `#include <stdio.h>
#define N 5

int main() {
    int a[N] = {1, 2, 3, 4, 5};
    printf("N = %d\\n", N);
    for (int i = 0; i < N; i++) {
        printf("a[%d] = %d\\n", i, a[i]);
    }
    return 0;
}`,
        expect: `N = 5
a[0] = 1
a[1] = 2
a[2] = 3
a[3] = 4
a[4] = 5
`
      },
      {
        title: '求和、求最值',
        body: `求最值的套路：先把 [[mx]] 设成数组的第一个元素（**不要设成 0**！数组全是负数时 0 就错了），然后一个个比过去。

顺便用 [[idx]] 记住最大值在哪一位，这种「边遍历边记录」的写法在数组题里到处都是。`,
        code: `#include <stdio.h>
#define N 6

int main() {
    int a[N] = {4, 8, 1, 9, 3, 6};
    int sum = 0;
    int mx = a[0];
    int mn = a[0];
    int idx = 0;

    for (int i = 0; i < N; i++) {
        sum += a[i];
        if (a[i] > mx) {
            mx = a[i];
            idx = i;
        }
        if (a[i] < mn) {
            mn = a[i];
        }
    }

    printf("sum = %d\\n", sum);
    printf("max = %d at index %d\\n", mx, idx);
    printf("min = %d\\n", mn);
    return 0;
}`,
        expect: `sum = 31
max = 9 at index 3
min = 1
`
      },
      {
        title: '初始化的小把戏',
        body: `- 只写前几个值，剩下的自动补 **0**
- 完全不初始化的话，里面装的是**垃圾值**，用之前必须自己一个个赋值
- 想全部填 0，写 [[int a[5] = {0};]] 就够了
- 循环打印时用 [[if (i < N - 1)]] 控制空格，能避免行尾多一个空格

> 数组不能整体赋值，也不能用 == 比较，只能一个一个元素来。`,
        code: `#include <stdio.h>
#define N 5

int main() {
    int a[N] = {7, 7};
    for (int i = 0; i < N; i++) {
        printf("%d", a[i]);
        if (i < N - 1) printf(" ");
    }
    printf("\\n");

    int b[3];
    b[0] = 1;
    b[1] = b[0] + 1;
    b[2] = b[1] + 1;
    printf("%d %d %d\\n", b[0], b[1], b[2]);
    return 0;
}`,
        expect: `7 7 0 0 0
1 2 3
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

int main() {
    int a[4] = {2, 4, 6, 8};
    int s = 0;
    for (int i = 1; i < 3; i++) {
        s += a[i];
    }
    printf("%d\\n", s);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['6', '10', '12', '18'],
        answer: 1,
        explain: '循环跑 i = 1 和 i = 2 两轮，加的是 a[1] 和 a[2]，也就是 4 + 6 = 10。注意 [[i < 3]] 不含 3，所以 a[3] 根本没参与——边界差一位是数组题最经典的坑。'
      },
      {
        type: 'choice',
        question: '[[int a[5] = {1, 2, 3, 4, 5};]] 里合法的下标范围是？',
        options: ['1 到 5', '1 到 4', '0 到 4', '0 到 5'],
        answer: 2,
        explain: '5 个车位，下标是 0、1、2、3、4。访问 a[5] 属于**越界**，C 不会拦你，读出来的是别人家的内存，写进去更会把数据踩坏——这种 bug 往往在很远的地方才爆炸。'
      },
      {
        type: 'choice',
        question: '求数组最大值时，为什么最好把初值设成第一个元素，而不是 0？',
        options: ['因为第一个元素一定最大', '因为 0 不能赋给 int', '因为这样循环能少跑一次', '因为元素可能是负数，用 0 当初始最大值会得到错误答案'],
        answer: 3,
        explain: '如果数组是 -8、-3、-20，用 0 当初始最大值，最后会得出「最大值是 0」——数组里根本没有这个数。用第一个元素当擂主，才能保证答案一定来自数组内部。'
      }
    ]
  },
  {
    id: 'array-2',
    chapter: 'array',
    title: '字符数组与 C 字符串',
    icon: '🔤',
    xp: 24,
    pages: [
      {
        title: '末尾藏着一个 0',
        body: `C 语言没有专门的字符串类型，**字符数组就是字符串**，规矩只有一条：末尾必须有一个值为 0 的字符当**结束标记**。

- [[char s[] = "abc";]] 实际占了 **4** 个格子：a、b、c、0
- 所有打印和求长度的函数都是**一路看到 0 才停**
- 忘了那个 0，[[printf]] 配上 [[%s]] 会一直往后读，读出乱码甚至崩溃

> 类比：一串珍珠，最后一颗是**黑色的终止珠**。数珠子的人一看到黑色就停手。`,
        code: `#include <stdio.h>

int main() {
    char name[6] = {'H', 'e', 'l', 'l', 'o', 0};
    char word[] = "Hi!";

    printf("%s\\n", name);
    puts(word);

    for (int i = 0; word[i] != 0; i++) {
        printf("[%c]", word[i]);
    }
    printf("\\n");
    return 0;
}`,
        expect: `Hello
Hi!
[H][i][!]
`
      },
      {
        title: '手写 strlen 和 countChar',
        body: `标准库的 [[strlen]] 其实就是一个「一路数到 0 为止」的循环。自己写一遍，就明白为什么求长度是 O(n)——它必须从头走到尾。

形参写成数组的样子和写成指针是一回事：数组当参数会**退化成指针**，所以函数里算不出数组长度，必须靠那个 0，或者额外传一个长度进来。`,
        code: `#include <stdio.h>

int myStrlen(char s[]) {
    int n = 0;
    while (s[n] != 0) {
        n++;
    }
    return n;
}

int countChar(char s[], char c) {
    int n = 0;
    for (int i = 0; s[i] != 0; i++) {
        if (s[i] == c) n++;
    }
    return n;
}

int main() {
    char s[] = "banana";
    printf("len = %d\\n", myStrlen(s));
    printf("count a = %d\\n", countChar(s, 'a'));
    printf("count n = %d\\n", countChar(s, 'n'));
    return 0;
}`,
        expect: `len = 6
count a = 3
count n = 2
`
      },
      {
        title: '复制与拼接的思路',
        body: `复制就是**一个字符一个字符搬过去**，最后亲手补上 0。

拼接（[[strcat]]）也一样：先跑到第一个字符串的 0 那里，再从那儿接着搬第二个。目标数组一定要**留够空间**，否则就是越界写。

> 记住：C 字符串的复制、拼接、比较都不能用 = 和 ==，必须靠函数或者自己写循环。`,
        code: `#include <stdio.h>

void myCopy(char dst[], char src[]) {
    int i = 0;
    while (src[i] != 0) {
        dst[i] = src[i];
        i++;
    }
    dst[i] = 0;
}

int main() {
    char src[] = "code";
    char dst[16];

    myCopy(dst, src);
    printf("src = %s\\n", src);
    printf("dst = %s\\n", dst);
    printf("src[3] = %c, src[4] = %d\\n", src[3], src[4]);
    return 0;
}`,
        expect: `src = code
dst = code
src[3] = e, src[4] = 0
`
      },
      {
        title: '字符其实是个小整数',
        body: `字符在内存里存的是编号（ASCII），所以 [[char]] 可以参与加减比较。

- 小写字母是连续的，[[c - 'a']] 能算出它在字母表里的位置
- 大写变小写可以 [[c + 32]]，这是大小写差 32 的缘故
- [['0']] 和 [[0]] 完全不是一回事：前者是编号 48 的字符，后者是结束标记

> 用字符做算术很方便，但也很容易写出看不懂的代码，记得配一句注释。`,
        code: `#include <stdio.h>

int main() {
    char c = 'c';
    printf("index = %d\\n", c - 'a');
    printf("upper = %c\\n", c - 32);
    printf("next = %c\\n", c + 1);
    printf("digit 0 code = %d\\n", '0');
    return 0;
}`,
        expect: `index = 2
upper = C
next = d
digit 0 code = 48
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

int main() {
    char s[] = "abc";
    printf("%d\\n", s[1] + s[2] - s[0]);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['98', '99', '100', '101'],
        answer: 2,
        explain: '[[char]] 参与运算时会变成对应的 ASCII 码：b 是 98，c 是 99，a 是 97，98 + 99 - 97 = 100。字符可以当小整数用，但别把字母和数字混着算，很容易出玄学结果。'
      },
      {
        type: 'choice',
        question: '[[char s[] = "hello";]] 这个数组一共占几个字节？',
        options: ['5', '7', '由编译器决定', '6'],
        answer: 3,
        explain: '5 个字母 + 末尾那个结束标记 0，一共 6 个。这就是为什么 [[strlen(s)]] 返回 5，而 [[sizeof(s)]] 返回 6——一个是**字符数**，一个是**占的格子数**。'
      },
      {
        type: 'choice',
        question: '遍历一个字符数组时，循环条件写哪个最稳？',
        options: ['i < 5', 'i <= 100', 's[i] != 0', 's[i] != 32'],
        answer: 2,
        explain: '靠**结束标记**停下，字符串多长都不会错。写死 [[i < 5]] 只对特定长度有效，换个输入就崩。这也是标准库的做法：不数长度，只看有没有碰到那个 0。'
      }
    ]
  },
  {
    id: 'array-3',
    chapter: 'array',
    title: '二维数组入门',
    icon: '🧾',
    xp: 28,
    pages: [
      {
        title: '一张表格',
        body: `二维数组就是**表格**，或者想成电影院的座位：第几排、第几列。

- [[int m[2][3];]] 是 **2 行 3 列**，一共 6 个格子
- 第一个下标是**行**，第二个下标是**列**
- 左上角是第 0 行第 0 列，右下角是第 1 行第 2 列

> 内存里它其实是**一条长龙**：先放完第 0 行，再放第 1 行。所谓「二维」只是我们看它的方式。`
      },
      {
        title: '定义与双层遍历',
        body: `初始化用**双层花括号**：外层每个大括号代表一行。

遍历用两层 [[for]]：外层走行 [[i]]，内层走列 [[j]]。这个「i 行 j 列」的双层循环是二维数组的万能钥匙，几乎所有二维题都是它的变体。`,
        code: `#include <stdio.h>
#define R 2
#define C 3

int main() {
    int m[R][C] = {{1, 2, 3}, {4, 5, 6}};
    for (int i = 0; i < R; i++) {
        for (int j = 0; j < C; j++) {
            printf("%d", m[i][j]);
            if (j < C - 1) printf(" ");
        }
        printf("\\n");
    }
    return 0;
}`,
        expect: `1 2 3
4 5 6
`
      },
      {
        title: '每行求和',
        body: `求每行的和，就把累加变量 [[rowSum]] 声明在**外层循环里面**——这样每换一行，它就被重新清零。

如果把它声明在外面，就变成求总和了。**变量声明的位置决定它是「每行一个」还是「全程一个」**，这是二维题的关键手感。`,
        code: `#include <stdio.h>
#define R 3
#define C 4

int main() {
    int m[R][C] = {
        {1, 2, 3, 4},
        {5, 6, 7, 8},
        {9, 10, 11, 12}
    };

    for (int i = 0; i < R; i++) {
        int rowSum = 0;
        for (int j = 0; j < C; j++) {
            rowSum += m[i][j];
        }
        printf("row %d sum = %d\\n", i, rowSum);
    }

    int total = 0;
    for (int i = 0; i < R; i++) {
        for (int j = 0; j < C; j++) {
            total += m[i][j];
        }
    }
    printf("total = %d\\n", total);
    return 0;
}`,
        expect: `row 0 sum = 10
row 1 sum = 26
row 2 sum = 42
total = 78
`
      },
      {
        title: '转置：行列互换',
        body: `转置就是把 [[m[i][j]]] 搬到 [[t[j][i]]]：两个下标一交换。

注意 [[t]] 的形状要**反过来开**：原来的 2 行 3 列，转置后是 3 行 2 列。行列写反了虽然通常还能编译，但遍历时的逻辑会全错。

> 二维数组必须显式指定列数（[[int m[][3]]] 是合法的，[[int m[][] ]] 不合法），因为列数决定了每一行有多长。`,
        code: `#include <stdio.h>
#define R 2
#define C 3

int main() {
    int m[R][C] = {{1, 2, 3}, {4, 5, 6}};
    int t[C][R];

    for (int i = 0; i < R; i++) {
        for (int j = 0; j < C; j++) {
            t[j][i] = m[i][j];
        }
    }

    for (int i = 0; i < C; i++) {
        for (int j = 0; j < R; j++) {
            printf("%d", t[i][j]);
            if (j < R - 1) printf(" ");
        }
        printf("\\n");
    }
    return 0;
}`,
        expect: `1 4
2 5
3 6
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

int main() {
    int m[2][2] = {{1, 2}, {3, 4}};
    int s = 0;
    for (int i = 0; i < 2; i++) {
        s += m[i][i];
    }
    printf("%d\\n", s);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['4', '5', '6', '10'],
        answer: 1,
        explain: '[[m[i][i]]] 取的是**主对角线**：m[0][0] 是 1，m[1][1] 是 4，加起来 5。别把整个数组求和的 10 当成答案——循环条件限制了两个下标必须相同。'
      },
      {
        type: 'choice',
        question: '[[int m[3][4];]] 这个数组一共有多少个元素？',
        options: ['7', '34', '4', '12'],
        answer: 3,
        explain: '3 行 × 4 列 = 12 个元素。第一个下标管行数，第二个管列数，写反了形状就变了，遍历逻辑也会跟着全错。'
      },
      {
        type: 'choice',
        question: '遍历二维数组时，双层循环通常怎么安排内外层？',
        options: ['外层走行 i，内层走列 j，符合内存顺序', '外层走列，内层走行，效率更高', '顺序无所谓，结果一定不同', '必须用 while，不能用 for'],
        answer: 0,
        explain: '内存里是**先存完一整行再存下一行**的，所以外层走行、内层走列能顺着内存一路读下去，缓存友好。反过来写结果一样，但访问是跳着的，数据量大时明显更慢。'
      }
    ]
  },
  {
    id: 'pointer-1',
    chapter: 'pointer',
    title: '取地址与解引用',
    icon: '📍',
    xp: 22,
    pages: [
      {
        title: '指针就是门牌号',
        body: `内存是一栋巨大的楼，每个格子都有唯一编号，叫**地址**。变量住在某个格子里，指针就是一张**写着门牌号的纸条**。

- [[&a]]：取变量 a 的地址，读作「a 的地址」
- [[int* p = &a;]]：p 是一个指针，专门存 int 的门牌号
- [[*p]]：按门牌号找过去，把里面的东西拿出来，这叫**解引用**

> 关键区别：[[p]] 是门牌号本身，[[*p]] 是门牌号指向的那个房间里的内容。

我们可以用 [[%p]] 把地址打印出来，但**地址每次运行都可能不一样**，所以这里的例子只看「通过指针改到的值」，不打印地址本身。`
      },
      {
        title: '顺着门牌号改东西',
        body: `[[int* p = &a;]] 之后，[[p]] 和 [[a]] 就绑定了：读 [[*p]] 就是读 a，写 [[*p]] 就是写 a。

注意定义指针时的写法：[[int *p]] 和 [[int* p]] 都对，编译器不挑。但写 [[int *p, q;]] 时只有 p 是指针，q 是普通 int——想两个都是指针，必须写成 [[int *p, *q;]]。`,
        code: `#include <stdio.h>

int main() {
    int a = 10;
    int *p = &a;

    printf("a = %d\\n", a);
    printf("*p = %d\\n", *p);

    *p = 99;
    printf("after *p = 99:\\n");
    printf("a = %d\\n", a);
    printf("*p = %d\\n", *p);
    return 0;
}`,
        expect: `a = 10
*p = 10
after *p = 99:
a = 99
*p = 99
`
      },
      {
        title: '让指针换一个门牌号',
        body: `[[p = &b]] 改的是**纸条上写的号码**，也就是指针的指向，原来那个变量一点没动。

[[*p = *p + 10]] 改的是**房间里的东西**，也就是 b 的值。

分清这两件事，指针就通了：一个改箭头，一个改箭头指的东西。`,
        code: `#include <stdio.h>

int main() {
    int a = 1, b = 2;
    int *p = &a;

    printf("%d\\n", *p);
    p = &b;
    printf("%d\\n", *p);

    *p = *p + 10;
    printf("a = %d, b = %d\\n", a, b);
    return 0;
}`,
        expect: `1
2
a = 1, b = 12
`
      },
      {
        title: '指针作参数：终于能改外面了',
        body: `[[swap(&x, &y)]] 传的是**门牌号**，函数顺着门牌号就能找到原变量，所以这次真的换了。

**函数想改调用者的变量，就必须拿到它的地址**——这是指针存在的头号理由。

传数组元素也一样：[[&a[i]]] 就是第 i 个车位的门牌号，交换首尾元素只是把两个门牌号交给同一个函数。`,
        code: `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main() {
    int x = 1, y = 2;
    swap(&x, &y);
    printf("x = %d, y = %d\\n", x, y);

    int arr[3] = {5, 6, 7};
    swap(&arr[0], &arr[2]);
    printf("%d %d %d\\n", arr[0], arr[1], arr[2]);
    return 0;
}`,
        expect: `x = 2, y = 1
7 6 5
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

int main() {
    int a = 3;
    int *p = &a;
    *p = *p * 2;
    a++;
    printf("%d\\n", *p);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['3', '6', '7', '8'],
        answer: 2,
        explain: '[[*p = *p * 2]] 把 a 改成了 6，接着 [[a++]] 又把它变成 7。因为 p 一直指着 a，最后读 [[*p]] 得到的就是 7。指针不是快照，它是一根**实时连着的线**。'
      },
      {
        type: 'choice',
        question: '[[&a]] 和 [[*p]] 分别是什么？',
        options: ['&a 取变量 a 的地址，*p 取出 p 指向的值', '两个都是取地址', '两个都是取值', '*p 取地址，&a 取值'],
        answer: 0,
        explain: '[[&]] 是「问地址」，[[*]] 是「按地址取内容」，一进一出正好相反。记法：[[&a]] 读作「a 的地址」，[[*p]] 读作「p 指向的东西」。'
      },
      {
        type: 'choice',
        question: '函数想让调用者的变量真的被修改，应该怎么做？',
        options: ['把变量名改成一样的', '把变量的地址（指针）传进去，函数里用 * 修改', '在函数里 return 新值就够了', '把变量声明成全局的再传参'],
        answer: 1,
        explain: '值传递只复制复印件，所以必须传**地址**，让函数拿到原件的钥匙。返回新值也能改，但一次只能改一个；传地址可以一次改多个，数组和结构体更是非它不可。'
      }
    ]
  },
  {
    id: 'pointer-2',
    chapter: 'pointer',
    title: '指针类型与指针运算',
    icon: '🧭',
    xp: 28,
    pages: [
      {
        title: '类型决定一步走多远',
        body: `指针里存的都是地址，那为什么还分 [[int*]] 和 [[char*]]？

因为**类型决定步长**：[[int* p]] 执行 [[p + 1]] 时不是加 1 个字节，而是跳过**一个 int 的大小**，正好落到下一个 int 上。

- [[int*]] 一步 4 个字节（常见平台上）
- [[char*]] 一步 1 个字节
- [[double*]] 一步 8 个字节

> 所以 [[p + 1]] 的含义是「**下一个同类型元素**」，而不是「地址数值加一」。这也是指针必须带类型的原因。`
      },
      {
        title: '数组名就是首地址',
        body: `**数组名就是首元素的地址**，所以 [[int *p = a;]] 和 [[int *p = &a[0];]] 完全等价。

而 [[*(p + i)]] 和 [[p[i]]] 也是完全等价的——方括号只是「先加再解引用」的语法糖。看懂了这一层，很多看起来很玄的指针写法就都不神秘了。`,
        code: `#include <stdio.h>

int main() {
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;

    for (int i = 0; i < 5; i++) {
        printf("%d\\n", *(p + i));
    }
    return 0;
}`,
        expect: `10
20
30
40
50
`
      },
      {
        title: '指针的加减法',
        body: `[[p++]] 让 p 指向下一个 int；[[p - 3]] 往回退三个。**指针减指针**得到的是「中间隔了几个元素」，不是字节差。

这一切都建立在一个前提上：指针必须指向**同一片连续内存**，否则运算结果毫无意义。

> 指针可以比大小、可以相减，但只能在同一个数组（或同一块内存）内部玩。`,
        code: `#include <stdio.h>

int main() {
    int a[4] = {1, 2, 3, 4};
    int *p = &a[0];
    int *q = &a[3];

    printf("p points to %d\\n", *p);
    printf("q points to %d\\n", *q);

    p++;
    printf("after p++: %d\\n", *p);

    p += 2;
    printf("after p += 2: %d\\n", *p);

    printf("back to start: %d\\n", *(p - 3));
    return 0;
}`,
        expect: `p points to 1
q points to 4
after p++: 2
after p += 2: 4
back to start: 1
`
      },
      {
        title: '把指针当数组用',
        body: `数组传进函数会**退化成指针**，所以 [[sumArray]] 里根本不知道数组有多长，长度必须另外传进来。

函数里可以放心地用 [[p[i]]] 这种写法，它和你熟悉的数组下标一模一样——因为 [[p[i]]] 本来就是 [[*(p + i)]]。

[[sumArray(a + 1, 3)]] 是从第二个元素开始数 3 个：4 + 6 + 8 = 18。`,
        code: `#include <stdio.h>

int sumArray(int *p, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += p[i];
    }
    return s;
}

int main() {
    int a[5] = {2, 4, 6, 8, 10};
    printf("sum = %d\\n", sumArray(a, 5));
    printf("sum = %d\\n", sumArray(a + 1, 3));
    return 0;
}`,
        expect: `sum = 30
sum = 18
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

int main() {
    int a[4] = {5, 10, 15, 20};
    int *p = a + 1;
    p += 2;
    printf("%d\\n", *p);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['10', '15', '20', '5'],
        answer: 2,
        explain: '[[a + 1]] 指向第二个元素（值 10），再 [[p += 2]] 往前走两个 int，落到第 4 个元素（值 20）。记住指针加法是**按元素个数**走的，不是按字节。'
      },
      {
        type: 'choice',
        question: '[[int *p]] 执行 [[p + 1]] 时，地址值实际增加了多少？',
        options: ['1 个字节', '4 个字节，也就是一个 int 的大小', '不确定，由 p 当前指向的值决定', '不会增加，这只是语法'],
        answer: 1,
        explain: '指针算术的步长是 [[sizeof(指向的类型)]]。常见平台上 [[int]] 是 4 字节，所以 [[p + 1]] 跳过 4 个字节，正好落在下一个 int 上。换个类型步长就变，这就是指针必须带类型的原因。'
      },
      {
        type: 'choice',
        question: '函数 [[int sumArray(int *p, int n)]] 为什么还需要参数 n？',
        options: ['为了让循环看起来好看', '因为 C 规定函数必须传两个参数', '为了指定从哪个位置开始求和', '因为数组传进函数后退化成指针，函数里算不出它有多长'],
        answer: 3,
        explain: '数组作参数会退化成**首元素地址**，长度信息在退化那一刻就丢了。在函数里写 [[sizeof(p)]] 得到的是**指针**的大小，不是数组的大小——这是新手非常容易踩的坑。'
      }
    ]
  },
  {
    id: 'pointer-3',
    chapter: 'pointer',
    title: '空指针、野指针与 const',
    icon: '🚧',
    xp: 33,
    pages: [
      {
        title: '指针三大坑',
        body: `指针本身很简单，坑都在「它到底指向哪儿」：

1. **空指针**：[[int *p = NULL;]]，明确表示「暂时不指任何地方」。解引用它会当场崩溃，所以用之前先判 [[if (p != NULL)]]
2. **野指针**：[[int *p;]] 之后没赋值就用，它指向一个随机地址，读写都是灾难
3. **悬空指针**：指向的内存已经释放了，或者变量已经出了作用域，再解引用就是踩空

> 三条保命规则：**定义时就初始化**；**用完就置 NULL**；**不确定就判空**。`
      },
      {
        title: '解引用之前先判空',
        body: `[[printValue]] 的第一件事就是判空，这叫**防御式编程**。

一旦传进来空指针，函数礼貌地打个招呼就返回，而不是让整个程序崩掉。在只有几百行的小程序里看不出好处，但真实项目里，这种检查能省下无数个深夜。

> [[NULL]] 就是「这张纸条上什么都没写」，它和「纸条上写了个乱码地址」完全是两回事。`,
        code: `#include <stdio.h>

void printValue(int *p) {
    if (p == NULL) {
        printf("null pointer, skip\\n");
        return;
    }
    printf("value = %d\\n", *p);
}

int main() {
    int a = 7;
    int *p = &a;
    int *q = NULL;

    printValue(p);
    printValue(q);
    printValue(NULL);
    return 0;
}`,
        expect: `value = 7
null pointer, skip
null pointer, skip
`
      },
      {
        title: 'const 的两种摆法',
        body: `读法有个小技巧：**从右往左读**，看 const 挨着谁。

- [[const int* p]]：p 是个指针，指向 const int——**值不能改，指向能改**
- [[int* const q]]：q 是个 const 指针，指向 int——**指向不能改，值能改**
- [[const int* const r]]：两个都不能改

一句话：[[const]] 挨着谁，谁就被锁住。

> 要注意 a 自己并没有变成常量，[[const int* p = &a;]] 只是承诺「不通过 p 去改」，直接写 [[a = 5]] 照样合法。`,
        code: `#include <stdio.h>

int main() {
    int a = 1, b = 2;

    const int *p = &a;
    p = &b;
    printf("%d\\n", *p);

    int * const q = &a;
    *q = 100;
    printf("%d\\n", a);

    const int * const r = &b;
    printf("%d\\n", *r);
    return 0;
}`,
        expect: `2
100
2
`
      },
      {
        title: '二级指针：门牌号的登记表',
        body: `[[p]] 存的是 a 的地址，[[pp]] 存的是 **p 的地址**，套了两层。

[[**pp]] 就是「先按 pp 找到 p，再按 p 找到 a」。二级指针听着吓人，其实只是**多解引用一次**。

> 什么时候真的需要它？当你想在函数里**修改一个指针本身**（比如让它指向别处）时，就得把指针的地址传进去，那就是二级指针。`,
        code: `#include <stdio.h>

void setToZero(int **pp) {
    **pp = 0;
}

int main() {
    int a = 42;
    int *p = &a;
    int **pp = &p;

    printf("*p = %d\\n", *p);
    printf("**pp = %d\\n", **pp);

    setToZero(pp);
    printf("a = %d\\n", a);
    return 0;
}`,
        expect: `*p = 42
**pp = 42
a = 0
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

void change(int *p) {
    *p = 5;
}

int main() {
    int a = 1;
    int *q = &a;
    change(q);
    printf("%d\\n", a);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['5', '1', '0', '编译错误'],
        answer: 0,
        explain: '传进去的是**地址的副本**，但两份副本指向同一个房间，所以 [[*p = 5]] 修改的是真正的 a。这和值传递不矛盾：复制的是门牌号，不是房间里的东西。'
      },
      {
        type: 'choice',
        question: '下面哪种写法最容易造出野指针？',
        options: ['int *p = NULL;', 'int a = 1; int *p = &a;', 'int *p = &a; 用完之后 p = NULL;', 'int *p; 之后直接 *p = 10;'],
        answer: 3,
        explain: '[[int *p;]] 里的 p 存的是一个**随机地址**，没初始化就解引用，等于拿着一张乱写的门牌号去砸别人家的门。规矩很简单：**指针定义时就给个说法**，哪怕先写 [[NULL]]。'
      },
      {
        type: 'choice',
        question: '[[const int *p = &a;]] 这行代码限制了下面哪件事？',
        options: ['不能修改 p 指向哪个变量', 'p 不能参与任何运算', '不能通过 p 修改 a 的值', 'a 从此变成常量，不能再赋值'],
        answer: 2,
        explain: '[[const]] 在星号左边，锁的是**指向的内容**：[[*p = 5]] 非法，但 [[p = &b]] 合法。而且 a 本身并没有变成常量，直接写 [[a = 5]] 照样可以——[[const]] 约束的是这个指针，不是那个变量。'
      }
    ]
  },
  {
    id: 'struct-1',
    chapter: 'struct',
    title: '结构体定义与成员',
    icon: '🗃',
    xp: 20,
    pages: [
      {
        title: '把相关信息装进一个档案袋',
        body: `现实里的「一个学生」不是一个 int 能装下的：有名字、学号、分数。结构体就是**自己造一个类型**，把这些字段打包进一个档案袋。

- [[struct Point { int x; int y; };]] 定义了一个新类型
- **末尾那个分号千万别忘**，漏了是新手最常见的编译错误
- 用点号取成员：[[p.x]] 读作「p 的 x」

> 类比：数组是**同一种**东西排成一排，结构体是**不同种**东西装成一袋。`
      },
      {
        title: '定义、赋值、点号访问',
        body: `结构体的用法就三步：定义类型、声明变量、用点号访问成员。

[[struct Point p1;]] 只是开了一个袋子，里面是**垃圾值**，所以要一个个赋。而 [[struct Point p2 = {10, 20};]] 是按**定义时的成员顺序**一次填好。`,
        code: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main() {
    struct Point p1;
    p1.x = 3;
    p1.y = 4;

    struct Point p2 = {10, 20};

    printf("p1 = (%d, %d)\\n", p1.x, p1.y);
    printf("p2 = (%d, %d)\\n", p2.x, p2.y);
    printf("sum = %d\\n", p1.x + p1.y + p2.x + p2.y);
    return 0;
}`,
        expect: `p1 = (3, 4)
p2 = (10, 20)
sum = 37
`
      },
      {
        title: '结构体可以整个复制',
        body: `[[struct Player b = a;]] 是**逐成员复制**：b 得到一份完全独立的副本，之后改 b 一点都不影响 a。

- 结构体能整体赋值，这比数组方便得多
- 但结构体**不能用 == 直接比较**，想判断两个结构体是否相等，只能一个成员一个成员比
- 值传递、赋值都是复制整个袋子，成员多的时候开销不小

> 这里 b 是在 a 的基础上改出来的，所以名字一样、等级和血量不同。`,
        code: `#include <stdio.h>

struct Player {
    char name[8];
    int level;
    int hp;
};

int main() {
    struct Player a = {"Ann", 3, 120};
    struct Player b = a;

    b.level = 5;
    b.hp = 200;

    printf("%s L%d HP%d\\n", a.name, a.level, a.hp);
    printf("%s L%d HP%d\\n", b.name, b.level, b.hp);
    return 0;
}`,
        expect: `Ann L3 HP120
Ann L5 HP200
`
      },
      {
        title: '成员可以是各种类型',
        body: `结构体的成员可以是 int、double、**字符数组**，甚至别的结构体。

初始化时按定义顺序给值，用花括号括起来。注意字符数组成员**能**直接用字符串字面量初始化，但之后**不能**用等号整体赋值——[[p.name = "ABC"]] 是非法的，数组不能整体赋值。`,
        code: `#include <stdio.h>

struct Product {
    char name[10];
    double price;
    int count;
};

int main() {
    struct Product p = {"Pen", 2.5, 4};
    printf("%s\\n", p.name);
    printf("total = %.2f\\n", p.price * p.count);
    printf("count = %d\\n", p.count);
    return 0;
}`,
        expect: `Pen
total = 10.00
count = 4
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

struct Node {
    int a;
    int b;
};

int main() {
    struct Node n = {3, 4};
    n.a = n.a + n.b;
    n.b = n.a - n.b;
    printf("%d %d\\n", n.a, n.b);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['3 4', '7 4', '7 3', '4 3'],
        answer: 2,
        explain: '第一句让 [[n.a]] 变成 3 + 4 = 7；第二句用**已经改过**的 n.a 算：7 - 4 = 3。最终输出 7 和 3。这类题必须一行一行更新，别拿初始值心算。'
      },
      {
        type: 'choice',
        question: '定义结构体时，最后那个大括号后面最容易漏掉什么？',
        options: ['一个逗号', '一个分号', '一句 return 0', '一个换行'],
        answer: 1,
        explain: '[[struct Point { int x; int y; };]] 末尾的分号是整个定义语句的结束符，漏了就报错，而且报错信息往往指向下一行，非常迷惑。'
      },
      {
        type: 'choice',
        question: '已知 [[struct Point p;]]，怎么访问它的成员 x？',
        options: ['p->x', 'p[x]', '*p.x', 'p.x'],
        answer: 3,
        explain: '记住七个字：**变量用点，指针用箭头**。[[p.x]] 里的点读作「的」——p 的 x。[[p->x]] 是给指针准备的写法，用在普通变量上会编译报错。'
      }
    ]
  },
  {
    id: 'struct-2',
    chapter: 'struct',
    title: '结构体数组与指针',
    icon: '📇',
    xp: 26,
    pages: [
      {
        title: '一排档案袋',
        body: `结构体数组就是**同一个抽屉里放了一排档案袋**：

- [[struct Student cls[3];]] 开 3 个学生的位置
- [[cls[0].name]] 读作「第 0 个学生的名字」
- 遍历用普通 [[for]]，和数组一模一样

> 顺序别记反：**先用下标取袋子，再用点号取袋子里的东西**。`
      },
      {
        title: '在结构体数组里找最大值',
        body: `找最高分的套路和找数组最大值一模一样，只是比较的从 [[cls[i]]] 换成了 [[cls[i].score]]。

用 [[best]] 记住**下标**而不是值，最后就能拿着它取出完整的那个学生——名字、分数一次全有了。`,
        code: `#include <stdio.h>

struct Student {
    char name[8];
    int score;
};

int main() {
    struct Student cls[3] = {
        {"Ann", 88},
        {"Bob", 95},
        {"Cid", 72}
    };

    int best = 0;
    for (int i = 0; i < 3; i++) {
        printf("%s: %d\\n", cls[i].name, cls[i].score);
        if (cls[i].score > cls[best].score) {
            best = i;
        }
    }
    printf("best = %s\\n", cls[best].name);
    return 0;
}`,
        expect: `Ann: 88
Bob: 95
Cid: 72
best = Bob
`
      },
      {
        title: '结构体指针与箭头',
        body: `[[ptr->x]] 完全等价于 [[(*ptr).x]]，两条输出和两次修改的结果完全一样。

为什么要专门造一个箭头？因为 [[*ptr.x]] 的优先级会先算 [[ptr.x]]（那是错的），必须加括号写成 [[(*ptr).x]]。写起来又丑又容易错，所以干脆给了一个箭头。

> 一句话总结：[[ptr->x]] 就是「顺着指针，取里面的 x」。`,
        code: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main() {
    struct Point p = {3, 4};
    struct Point *ptr = &p;

    printf("x = %d, y = %d\\n", ptr->x, ptr->y);

    ptr->x = 30;
    (*ptr).y = 40;

    printf("x = %d, y = %d\\n", p.x, p.y);
    return 0;
}`,
        expect: `x = 3, y = 4
x = 30, y = 40
`
      },
      {
        title: 'typedef：给类型起个短名字',
        body: `[[typedef struct { int x; } Point;]] 之后，[[Point]] 就是类型名，不用每次再写 [[struct]] 那三个字母。

上面这种写法一次干了**两件事**：定义结构体 + 起别名，所以结构体本身连标签都没有（匿名结构体）。想写 [[struct Point p;]] 反而不行了。

> 注意这里 typedef 出来的是**类型**，不是变量。变量名字和类型名字在 C 里是两个不同的命名空间，可以同名。`,
        code: `#include <stdio.h>

typedef struct {
    char name[8];
    int hp;
} Hero;

int main() {
    Hero h = {"Zed", 100};
    Hero *p = &h;

    printf("%s has %d hp\\n", p->name, p->hp);
    p->hp -= 30;
    printf("%s has %d hp\\n", h.name, h.hp);

    Hero team[2] = {{"Ann", 80}, {"Bob", 90}};
    int total = 0;
    for (int i = 0; i < 2; i++) {
        total += team[i].hp;
    }
    printf("total hp = %d\\n", total);
    return 0;
}`,
        expect: `Zed has 100 hp
Zed has 70 hp
total hp = 170
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

struct P {
    int x;
};

int main() {
    struct P arr[3] = {{1}, {2}, {3}};
    struct P *p = arr + 1;
    p->x += 10;
    printf("%d\\n", arr[1].x);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['1', '2', '11', '12'],
        answer: 3,
        explain: '[[arr + 1]] 指向第二个元素，[[p->x += 10]] 把它从 2 改成 12，打印 [[arr[1].x]] 就是 12。注意 [[arr + 1]] 是按**结构体元素的个数**跳的，不是按字节跳。'
      },
      {
        type: 'choice',
        question: '指针 p 指向一个结构体时，访问成员该用哪种写法？',
        options: ['p.x', 'p->x', 'p[x]', 'p::x'],
        answer: 1,
        explain: '指针用箭头，变量用点。[[p->x]] 就是 [[(*p).x]] 的简写。记法：**指针既然带星，就配个箭头**。'
      },
      {
        type: 'choice',
        question: '[[typedef struct { int x; } Point;]] 之后，声明一个 Point 变量的正确写法是？',
        options: ['Point p;', 'struct Point p;', 'typedef Point p;', 'struct p Point;'],
        answer: 0,
        explain: '这里结构体本身是**匿名**的，[[typedef]] 已经把 [[Point]] 变成了类型名，所以直接写 [[Point p;]] 就行。写成 [[struct Point p;]] 反而会报错，因为没有叫 Point 的结构体标签。'
      }
    ]
  },
  {
    id: 'struct-3',
    chapter: 'struct',
    title: '结构体作参数与嵌套',
    icon: '🧰',
    xp: 32,
    pages: [
      {
        title: '复印整袋，还是给钥匙？',
        body: `结构体作参数有两种方式，选错了要么慢，要么改不动：

1. **值传递** [[void f(struct Hero h)]]：把整袋档案**复印一份**给函数。函数里怎么改都不影响外面，袋子里东西多时复制也很费
2. **指针传递** [[void f(struct Hero *h)]]：只给一把**钥匙**（地址）。函数里用 [[h->hp]] 就能改到原袋，效率也高

> 要改原数据就传指针；只是读一读，传指针更省，传值更安全。真实项目里读操作也常写成指向常量的指针，两头兼顾。`
      },
      {
        title: '值传递：函数里改了，外面没变',
        body: `函数里明明把血量加到了 150，回到 [[main]] 还是 100——因为函数改的是**复印件**。

这正是值传递的特性：有时候它是保护（函数绝不会弄脏你的数据），有时候它是坑（你以为改到了，其实没有）。`,
        code: `#include <stdio.h>

struct Hero {
    int hp;
    int mp;
};

void healByValue(struct Hero h) {
    h.hp += 50;
    printf("in func: hp = %d\\n", h.hp);
}

int main() {
    struct Hero a = {100, 20};
    healByValue(a);
    printf("in main: hp = %d\\n", a.hp);
    return 0;
}`,
        expect: `in func: hp = 150
in main: hp = 100
`
      },
      {
        title: '指针传递：这次真的改了',
        body: `[[healByPointer(&a)]] 把地址交出去，函数里的 [[h->hp]] 改的就是 [[main]] 里那个 [[a]]。

想一次修改结构体里的**多个成员**，这是唯一优雅的做法——总不能让函数 return 一个结构体，然后你又忘了接返回值。`,
        code: `#include <stdio.h>

struct Hero {
    int hp;
    int mp;
};

void healByPointer(struct Hero *h) {
    h->hp += 50;
    h->mp -= 10;
}

int main() {
    struct Hero a = {100, 20};
    healByPointer(&a);
    printf("hp = %d, mp = %d\\n", a.hp, a.mp);
    return 0;
}`,
        expect: `hp = 150, mp = 10
`
      },
      {
        title: '嵌套结构体：袋子里还有袋子',
        body: `嵌套就是**一层层用点号往里钻**：[[t.due.y]] 读作「t 的 due 的 y」。

初始化时内层结构体也用自己的花括号：[[{"Homework", {2024, 9, 1}, 0}]]。

- 嵌套让「日期」「坐标」这类小结构体可以复用
- 点号可以在一条链上用好几次，一路钻到底
- 但嵌套别超过两三层，再深就该拆开或者改用指针了

> 注意 printf 里用 [[%d]] 打印月份 9，不会补成 09——补零是格式的事，和结构体无关。`,
        code: `#include <stdio.h>

struct Date {
    int y;
    int m;
    int d;
};

struct Task {
    char title[10];
    struct Date due;
    int done;
};

int main() {
    struct Task t = {"Homework", {2024, 9, 1}, 0};

    printf("%s\\n", t.title);
    printf("due: %d-%d-%d\\n", t.due.y, t.due.m, t.due.d);

    t.done = 1;
    printf("done = %d\\n", t.done);
    return 0;
}`,
        expect: `Homework
due: 2024-9-1
done = 1
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>

struct Inner {
    int v;
};

struct Outer {
    struct Inner in;
    int extra;
};

void bump(struct Outer *o) {
    o->in.v++;
    o->extra += 2;
}

int main() {
    struct Outer o = {{5}, 10};
    bump(&o);
    printf("%d %d\\n", o.in.v, o.extra);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['5 10', '6 10', '5 12', '6 12'],
        answer: 3,
        explain: '传的是地址，所以两个成员都被改到了：[[o->in.v]] 从 5 变 6，[[o->extra]] 从 10 变 12。访问嵌套成员时，进了指针那层用箭头，往里面继续用点号。'
      },
      {
        type: 'choice',
        question: '一个结构体有几十个成员，函数只是想读取它的数据，参数怎么写比较好？',
        options: ['照常传值，反正编译能过', '传指针并加 const，只读又不复制', '把结构体拆成很多个 int 传进去', '只能把它设成全局变量'],
        answer: 1,
        explain: '传值会把**整个结构体复制一份**，成员越多越亏。传 const 指针既避免了复制，又用 const 表明「我只读不改」，是这个场景的标准写法。'
      },
      {
        type: 'choice',
        question: '已知 [[struct Task t;]]，[[t.due.y]] 表示什么？',
        options: ['t 的 due 成员本身', '先取 y 再取 due', 't 里的 due 成员的 y 成员', '语法错误，必须用箭头'],
        answer: 2,
        explain: '点号可以从左往右**一路钻**：先拿到 [[t.due]]（一个 Date 结构体），再从它里面取 [[y]]。整条链访问的都是同一个 [[t]]，中途没有任何复制发生。'
      }
    ]
  }
];
