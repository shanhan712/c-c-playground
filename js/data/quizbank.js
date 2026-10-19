/**
 * 作者：山寒
 * quizbank.js —— C/C++ 学习网页的题库数据（纯数据文件，经典 script，非 ES module）
 * 由页面通过 window.CPP_QUIZBANK 读取。
 * 字段：id / topic / level / q / code(可选) / options / answer / explain
 * topic 取值：基础 / 数组 / 指针 / 字符串 / 结构体 / 内存 / C++ / 算法 / 易错
 * level 取值：easy / mid / hard
 */
window.CPP_QUIZBANK = [
  /* ============ 基础 ============ */
  {
    id: 'q-basics-001',
    topic: '基础',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    float f = 16.0f;
    int n = 5;
    printf("%.2f\\n", f / 4);
    printf("%d\\n", n / 2);
    return 0;
}`,
    options: [
      '4.00 和 2.5',
      '4.00 和 2',
      '4 和 2',
      '4.000000 和 2'
    ],
    answer: 1,
    explain: 'f 是 float，f / 4 是浮点除法，结果是 double 4.0，用 %.2f 输出为 4.00。n 是 int，n / 2 是整数除法，5 / 2 直接截断成 2 而不是四舍五入得到 2.5。两个易错点：一是 %.2f 只保留两位小数；二是两个整数相除会丢掉小数部分，想要 2.5 必须写成 n / 2.0 或 (double)n / 2。'
  },
  {
    id: 'q-basics-002',
    topic: '基础',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int x = 7, y = 6, z = 4;
    int r;
    if (x > y && y++ > z) {
        r = 1;
    } else {
        r = 0;
    }
    printf("%d %d\\n", r, y);
    return 0;
}`,
    options: [
      '0 6',
      '0 7',
      '1 7',
      '1 6'
    ],
    answer: 2,
    explain: 'x > y 为真，于是求 && 右边：先取 y 的值 6 与 z 比较得到真，比较完成后 y 才自增到 7；真 && 真为真，r = 1，所以输出 1 7。易错点是把短路求值当成“不做自增”——短路只在左边为假时跳过右边，而这里左边为真，右边照样求值并产生副作用。'
  },
  {
    id: 'q-basics-003',
    topic: '基础',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 5, b = 2;
    printf("%d %d %d\\n", a / b, a % b, -7 % 3);
    return 0;
}`,
    options: [
      '2.5 1 -1',
      '2 1 1',
      '2 0 -1',
      '2 1 -1'
    ],
    answer: 3,
    explain: 'a / b = 5 / 2 = 2（整数除法截断）。a % b = 5 % 2 = 1。C 语言取余的符号跟随被除数：-7 / 3 是 -2，-7 % 3 就是 -7 - (-2 * 3) = -1。易错点：误以为取余结果一定非负，或者误以为 5 / 2 会得到 2.5。'
  },
  {
    id: 'q-basics-004',
    topic: '基础',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int i = 3;
    printf("%d ", i++);
    printf("%d ", ++i);
    printf("%d\\n", i);
    return 0;
}`,
    options: [
      '4 5 5',
      '3 4 4',
      '3 5 4',
      '3 5 5'
    ],
    answer: 3,
    explain: '后置 i++ 先把 3 送给 printf，再把 i 加到 4；前置 ++i 先把 i 加到 5，再把 5 送出去；最后 i 就是 5，输出 3 5 5。易错点：把 i++ 也当成自增后再取值，忽略后置版本的特点是“先取值、后自增”。'
  },
  {
    id: 'q-basics-005',
    topic: '基础',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int x = 1, y = 2;
    printf("%d\\n", x > y == 0);
    return 0;
}`,
    options: [
      '0',
      '1',
      '2',
      '编译错误'
    ],
    answer: 1,
    explain: '关系运算符 > 的优先级高于 ==，所以先算 x > y 得到 0，再算 0 == 0 得到 1。易错点：凭直觉从左往右读成 x > (y == 0)，那会得到 1 > 0 也就是 1——本题恰好同为 1，但只要换成 x = 0、y = 1 两种读法就会分道扬镳，所以必须记住优先级而不是靠猜。'
  },
  {
    id: 'q-basics-006',
    topic: '基础',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int n = 1;
    for (int i = 0; i < 5; i++) {
        if (i % 2 == 0) {
            continue;
        }
        n *= i;
    }
    printf("%d\\n", n);
    return 0;
}`,
    options: [
      '15',
      '0',
      '3',
      '8'
    ],
    answer: 2,
    explain: 'i 取 0、1、2、3、4：偶数（0、2、4）被 continue 跳过，只有 i 为 1 和 3 时执行 n *= i。第一次 n = 1 * 1 = 1，第二次 n = 1 * 3 = 3。易错点：把 continue 当成 break，以为循环提前结束；continue 只跳过本轮循环体剩下的语句，循环本身照常继续。'
  },
  {
    id: 'q-basics-007',
    topic: '基础',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    unsigned int a = 3;
    int b = -5;
    printf("%d\\n", a > b);
    return 0;
}`,
    options: [
      '0',
      '1',
      '3',
      '不确定'
    ],
    answer: 0,
    explain: 'a 是 unsigned int，b 是 int，比较前 b 会被转换成 unsigned int：-5 的补码是 0xFFFFFFFB，当成无符号数是一个非常大的值（4294967291），所以 3 > 4294967291 为假，输出 0。易错点：以为“3 > -5 当然成立”。只要比较双方有无符号不一致，有符号数就会被隐式转换成无符号数，负值瞬间变成天文数字。'
  },
  {
    id: 'q-basics-008',
    topic: '基础',
    level: 'hard',
    q: '关于宏定义，下面哪个说法正确？',
    code: `#include <stdio.h>
#define MUL(a, b) a * b

int main(void) {
    printf("%d\\n", MUL(1 + 2, 3 + 4));
    return 0;
}`,
    options: [
      '展开成 (1 + 2) * (3 + 4)，输出 21',
      '展开成 1 + 2 * 3 + 4，输出 11',
      '展开成 1 + 2 * 3 + 4，输出 21',
      '编译报错，因为宏参数不能是表达式'
    ],
    answer: 1,
    explain: '函数宏只是纯粹的文本替换：MUL(1 + 2, 3 + 4) 变成 1 + 2 * 3 + 4，乘法先算，得 1 + 6 + 4 = 11。正确写法是每个参数和整体都加括号：#define MUL(a, b) ((a) * (b))。易错点：以为宏像函数一样先算好参数再传入，宏没有“参数求值”这一步。'
  },
  {
    id: 'q-basics-009',
    topic: '基础',
    level: 'mid',
    q: '关于 do-while 循环，下面哪个说法正确？',
    options: [
      '循环体至少执行一次，while 条件后面的分号可以省略',
      '和 while 完全等价，条件不成立时一次都不执行',
      '循环体至少执行一次，且循环体结尾的 while 条件后面必须写分号',
      '循环体至少执行两次'
    ],
    answer: 2,
    explain: 'do-while 先执行循环体再判断条件，所以条件一开始就为假时循环体也已经跑过一次；语法上它以 while (条件); 结尾，那个分号是语句的一部分，漏写会直接编译错误。对比记忆：while 是“先判断后执行”，条件不成立时一次都不执行。'
  },
  {
    id: 'q-basics-010',
    topic: '基础',
    level: 'easy',
    q: '指针没有指向有效对象时执行 *p = 10，最可能发生什么？',
    options: [
      '变量 p 被自动置为 NULL',
      '运行时崩溃或破坏了别的数据',
      '编译期直接报错',
      '这一步被安全跳过，什么也不发生'
    ],
    answer: 1,
    explain: '解引用一个无效（未初始化、已释放或为空）的指针会写到不属于你的内存，结果是程序崩溃或悄悄改坏其他变量的数据；空指针解引用则通常是段错误。它属于典型的未定义行为，绝不可能“安全跳过”，编译器多数情况下也检查不出来。正确做法是初始化指针、用完置 NULL，使用前先判空。'
  },

  /* ============ 算法 ============ */
  {
    id: 'q-algo-001',
    topic: '算法',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int fact(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}

int main(void) {
    for (int i = 1; i <= 5; i++) {
        printf("%d ", fact(i));
    }
    printf("\\n");
    return 0;
}`,
    options: [
      '1 2 6 24 100',
      '1 2 3 4 5',
      '1 2 6 24 120',
      '2 6 24 120 720'
    ],
    answer: 2,
    explain: '阶乘递归：fact(1) = 1、fact(2) = 2、fact(3) = 6、fact(4) = 24、fact(5) = 120。易错点：一是把循环写成 i = 1; i <= 5 却以为会算到 6!；二是把返回类型写成 int 后算大的阶乘会溢出，13! 就已经超出 int 范围。n <= 1 返回 1 也兼顾了 n = 0（0! = 1）。'
  },
  {
    id: 'q-algo-002',
    topic: '算法',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += a[i];
    }
    printf("%d\\n", sum);
    return 0;
}`,
    options: [
      '14',
      '16',
      '10',
      '15'
    ],
    answer: 3,
    explain: '1 + 2 + 3 + 4 + 5 = 15。易错点：把循环条件写成 i <= 5 会多读一个 a[5]，而下标 5 已经越界（合法下标是 0 到 4），这就是常见的“数组越界”。另一个易错点是写完 for 后在分号处就结束语句，导致循环体只执行一次。'
  },
  {
    id: 'q-algo-003',
    topic: '算法',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int f(int n) {
    if (n <= 1) {
        return n;
    }
    return f(n - 1) + f(n - 2);
}

int main(void) {
    printf("%d\\n", f(6));
    return 0;
}`,
    options: [
      '13',
      '8',
      '5',
      '6'
    ],
    answer: 1,
    explain: '这是斐波那契数列（f(0) = 0, f(1) = 1）：0, 1, 1, 2, 3, 5, 8，所以 f(6) = 8。容易混的是把 f(6) 数成第 7 项 13，那其实是 f(7)。记忆点：当 n <= 1 返回 n 时，数列从 f(0) = 0 开始，f(6) 是第 7 个数。'
  },
  {
    id: 'q-algo-004',
    answerKind: 'behavior',
    topic: '算法',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int count = 0;
    for (int i = 2; i <= 20; i++) {
        int ok = 1;
        for (int j = 2; j * j <= i; j++) {
            if (i % j == 0) {
                ok = 0;
                break;
            }
        }
        if (ok) {
            count++;
            printf("%d ", i);
        }
    }
    printf("\\ncount = %d\\n", count);
    return 0;
}`,
    options: [
      '2 3 5 7 11 13 17 19 然后 count = 8',
      '2 3 5 7 11 13 17 19 然后 count = 9',
      '3 5 7 11 13 17 19 然后 count = 7',
      '2 3 5 7 11 13 17 19 23 然后 count = 9'
    ],
    answer: 0,
    explain: '20 以内的素数是 2、3、5、7、11、13、17、19，共 8 个。判断倍数时只试到 j * j <= i 就够（若 i 是合数必有不超过根号 i 的因子），因此没有多余循环；打印时用空格分隔后统一换行，所以答案行是这些素数再加 count = 8。'
  },
  {
    id: 'q-algo-005',
    topic: '算法',
    level: 'mid',
    q: '这段二分查找代码输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[8] = {1, 3, 5, 7, 9, 11, 13, 15};
    int key = 7;
    int left = 0, right = 7, ans = -1;
    while (left <= right) {
        int mid = (left + right) / 2;
        if (a[mid] == key) {
            ans = mid;
            break;
        } else if (a[mid] < key) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    printf("%d\\n", ans);
    return 0;
}`,
    options: [
      '7',
      '-1',
      '4',
      '3'
    ],
    answer: 3,
    explain: '先 mid = (0 + 7) / 2 = 3，a[3] = 7 正好等于 key，ans 记为 3。易错点：把输出当成被查找的值 7；ans 存的是下标。还要注意 mid = (left + right) / 2 在 left 和 right 都很大时可能溢出，更稳妥的写法是 left + (right - left) / 2。'
  },
  {
    id: 'q-algo-006',
    answerKind: 'behavior',
    topic: '算法',
    level: 'hard',
    q: '这段程序为什么输出 120 = 5! 而不是 1? 以下哪个说法正确？',
    code: `#include <stdio.h>

int main(void) {
    long acc = 1;
    int n = 5;
    while (n > 0) {
        acc *= n;
        n--;
    }
    printf("%ld\\n", acc);
    return 0;
}`,
    options: [
      '循环依次乘 5、4、3、2、1，累乘结果正好是 120',
      'n-- 使 n 从 5 递减，但 0 也会参与乘法，所以结果应该是 0',
      'acc 是 long，乘法会被取整，结果应是 24',
      '循环只会执行一次，因为 n 在条件里就被减到 4'
    ],
    answer: 0,
    explain: 'n 的取值序列是 5、4、3、2、1：当 n = 1 时 acc *= 1 并让 n 变成 0，循环条件 n > 0 再判断为假、退出，0 并不会被乘进去。所以 acc = 5 * 4 * 3 * 2 * 1 = 120。易错点：担心“n 减到 0 会把结果乘成 0”，忽略条件是在每轮循环末尾重新检查的。'
  },
  {
    id: 'q-algo-007',
    topic: '算法',
    level: 'hard',
    q: '这段字符串反转程序输出什么？',
    code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[20] = "abcd";
    int n = (int)strlen(s);
    for (int i = 0; i < n / 2; i++) {
        char t = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = t;
    }
    printf("%s\\n", s);
    return 0;
}`,
    options: [
      'abcd',
      'dcba',
      'dcb',
      '空行'
    ],
    answer: 1,
    explain: 'n = 4，循环做两次：i = 0 交换 s[0] 与 s[3]（a 与 d），i = 1 交换 s[1] 与 s[2]（b 与 c），得到 dcba。i < n / 2 保证每个位置只交换一次，多走一步会再换回去、变回原样。易错点：把 i < n / 2 写成 i <= n / 2 导致字符换回来。'
  },
  {
    id: 'q-algo-008',
    topic: '算法',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int n = 4;
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        int t = a + b;
        a = b;
        b = t;
    }
    printf("%d\\n", a);
    return 0;
}`,
    options: [
      '5',
      '2',
      '3',
      '8'
    ],
    answer: 2,
    explain: '迭代 4 次后 a 的值依次是 1、1、2、3：第一次 a = 1、b = 1；第二次 a = 1、b = 2；第三次 a = 2、b = 3；第四次 a = 3、b = 5。所以 a = 3（b 才是 5）。易错点：循环结束后分不清 a 与 b 谁是新项——每次都是先把 a 挪成 b，所以 a 始终是“上一项”。'
  },
  {
    id: 'q-algo-009',
    topic: '算法',
    level: 'mid',
    q: '这段冒泡排序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {4, 2, 5, 1, 3};
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4 - i; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
    for (int i = 0; i < 5; i++) {
        printf("%d", a[i]);
    }
    printf("\\n");
    return 0;
}`,
    options: [
      '54321',
      '1234',
      '12543',
      '12345'
    ],
    answer: 3,
    explain: '冒泡排序每轮把当前范围内最大的数送到末尾，四轮之后数组升序为 1 2 3 4 5，打印时没有分隔符所以是 12345。易错点：内层写成 j < 5 - i（多比较一次，虽然本轮不会越界到 a[5]，但循环次数不对）或把条件写成 a[j] < a[j + 1] 排成降序。'
  },
  {
    id: 'q-algo-010',
    topic: '算法',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int n = 3;
    int steps = 0;
    for (int i = 0; i < n; i++) {
        steps = steps * 2 + 1;
    }
    printf("%d\\n", steps);
    return 0;
}`,
    options: [
      '7',
      '8',
      '6',
      '15'
    ],
    answer: 0,
    explain: '这一步递推正好对应汉诺塔的最少移动次数 2 的 n 次方减 1：n = 1 时 1，n = 2 时 3，n = 3 时 7。易错点：把“移动 n 个盘子”写成只算一层的展开，或者误认为每次加 2 而不是“翻倍再加一”。记住递推式 f(n) = 2 * f(n - 1) + 1 更保险。'
  },
  {
    id: 'q-algo-011',
    topic: '算法',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[4] = {10, 20, 30, 40};
    int max = a[0];
    for (int i = 1; i < 4; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }
    printf("%d\\n", max);
    return 0;
}`,
    options: [
      '10',
      '40',
      '30',
      '70'
    ],
    answer: 1,
    explain: '打擂台法：先让 max 等于第一个元素 10，之后 20、30、40 依次上台比较，最后一个更大的 40 留下。易错点：把 max 初始化为 0——若数组全是负数就会错误地输出 0，所以初始化成 a[0] 更安全。'
  },
  {
    id: 'q-algo-012',
    answerKind: 'behavior',
    topic: '算法',
    level: 'mid',
    q: '这段递归调用会发生什么？',
    code: `#include <stdio.h>

void f(int n) {
    printf("%d ", n);
    f(n + 1);
}

int main(void) {
    f(1);
    return 0;
}`,
    options: [
      '打印 1 到 10 后自动停止',
      '只打印一次 1，然后 main 返回',
      '递归没有终止条件，最终因栈溢出而崩溃',
      '编译期就会报错，递归函数必须有 if'
    ],
    answer: 2,
    explain: '每层递归都会在栈上留下一帧，n 一直加 1、永远不满足任何返回条件，直到栈空间耗尽、程序崩溃（栈溢出）。递归必须同时具备“终止条件”和“规模向终止条件靠近”两个要素。易错点：以为编译器会检查递归是否有出口——这属于运行时行为，编译期不会报错。'
  },
  {
    id: 'q-algo-013',
    topic: '算法',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 4; i++) {
        for (int j = 1; j <= i; j++) {
            sum += j;
        }
    }
    printf("%d\\n", sum);
    return 0;
}`,
    options: [
      '10',
      '16',
      '24',
      '20'
    ],
    answer: 3,
    explain: '外层每轮把 1 + 2 + ... + i 累加进 sum：i = 1 得 1，i = 2 得 3，i = 3 得 6，i = 4 得 10，合计 20。易错点：把内层写成 j <= 4（每轮都加 1 到 4，结果变成 40），或者以为 sum 在内层循环里被清零。'
  },

  /* ============ C++ ============ */
  {
    id: 'q-cpp-001',
    topic: 'C++',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Base {
public:
    Base() {
        cout << "Base:" ;
    }
    ~Base() {
        cout << "~Base:";
    }
};

class Derived : public Base {
public:
    Derived() {
        cout << "Derived:" ;
    }
    ~Derived() {
        cout << "~Derived:";
    }
};

int main() {
    Derived d;
    cout << "body";
    return 0;
}`,
    options: [
      'Base:Derived:body~Base:~Derived:',
      'Base:Derived:body~Derived:~Base:',
      'Derived:Base:body~Derived:~Base:',
      'Base:Derived:~Derived:~Base:body'
    ],
    answer: 1,
    explain: '构造顺序是由基类到派生类（先搭地基再盖楼），析构顺序正好相反，由派生类到基类（先拆楼再拆地基）。所以先输出 Base:Derived:，进入 main 函数体输出 body，离开作用域时输出 ~Derived:~Base:。易错点：把析构顺序也记成基类在前。'
  },
  {
    id: 'q-cpp-002',
    topic: 'C++',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    v.push_back(10);
    v.push_back(20);
    v.push_back(30);
    cout << v.size() << " " << v[1] << endl;
    return 0;
}`,
    options: [
      '2 20',
      '3 10',
      '3 20',
      '3 30'
    ],
    answer: 2,
    explain: 'push_back 依次追加 10、20、30，size() 得到 3；下标从 0 开始，v[0] = 10、v[1] = 20、v[2] = 30，所以输出 3 20。易错点：把 v[1] 当成第一个元素。另外 at(1) 与 v[1] 的区别在于 at 会做越界检查并抛异常，而 [] 越界属于未定义行为。'
  },
  {
    id: 'q-cpp-003',
    answerKind: 'behavior',
    topic: 'C++',
    level: 'mid',
    q: '运行后程序会输出什么？',
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    int cnt = 0;
    for (unsigned int i = 0; i < v.size() - 1; i++) {
        cnt++;
    }
    cout << cnt << endl;
    return 0;
}`,
    options: [
      '输出 0，因为空 vector 的循环条件一开始就是假',
      '输出 1，因为 i < -1 会执行一次',
      '编译不通过，unsigned int 与 size_t 不能比较',
      '因为 size() 返回无符号数，空 vector 的 size() - 1 会回绕成极大值，循环几乎不可能正常结束'
    ],
    answer: 3,
    explain: 'size() 返回 size_t（无符号类型），v.size() - 1 得到的是无符号运算结果：0 - 1 回绕成该类型能表示的最大值。于是 i < v.size() - 1 恒为真，循环不再受“容器是否为空”保护，cnt 会一路加到无符号溢出，程序无法按预期退出。正确做法是先判 !v.empty()，或者把长度存进 int 再减，避免无符号下溢。这道题的重点不是它打印什么，而是这个条件本身就是错的。'
  },
  {
    id: 'q-cpp-004',
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Counter {
private:
    int value;
public:
    Counter(int v) {
        value = v;
    }
    void add(int n) {
        value += n;
    }
    int get() {
        return value;
    }
};

int main() {
    Counter c(10);
    c.add(5);
    cout << c.get() << endl;
    return 0;
}`,
    options: [
      '15',
      '10',
      '5',
      '编译错误，value 是私有的'
    ],
    answer: 0,
    explain: '构造函数把 value 初始化为 10，add(5) 把它加到 15，get() 返回 15。private 只限制在类外直接写 c.value——通过公有成员函数访问完全合法，这正是封装的意义。易错点：以为成员变量是私有的就连成员函数也不能用，或者以为构造函数必须显式调用。'
  },
  {
    id: 'q-cpp-005',
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

int main() {
    int a = 5;
    int &r = a;
    r += 3;
    cout << a << " " << r << endl;
    return 0;
}`,
    options: [
      '5 8',
      '8 8',
      '8 5',
      '编译错误，引用不能参与算术运算'
    ],
    answer: 1,
    explain: '引用 r 是 a 的别名，对 r 的任何操作都等同于直接操作 a；r += 3 之后 a 和 r 都是 8。引用必须在定义时就绑定，并且一旦绑定不能改绑到别的变量（这和指针不同）。易错点：把引用当成拷贝，以为改 r 不影响 a。'
  },
  {
    id: 'q-cpp-006',
    answerKind: 'behavior',
    topic: 'C++',
    level: 'hard',
    q: '这段代码的输出说明基类 speak 缺少什么？',
    code: `#include <iostream>
using namespace std;

class Animal {
public:
    void speak() {
        cout << "动物" << endl;
    }
};

class Dog : public Animal {
public:
    void speak() {
        cout << "汪汪" << endl;
    }
};

int main() {
    Dog d;
    Animal *p = &d;
    p->speak();
    return 0;
}`,
    options: [
      '缺少 virtual，所以编译期就报错',
      '输出“汪汪”，虚函数只影响析构',
      '缺少 virtual，所以调用的是基类版本，输出“动物”',
      '输出“动物”，因为派生类对象在赋值时被切片了'
    ],
    answer: 2,
    explain: 'speak 不是虚函数，通过基类指针调用时按指针的静态类型 Animal 在编译期就绑定了 Animal::speak，运行时不会去查派生类，所以输出“动物”。要得到“汪汪”，基类必须写 virtual void speak()，派生类写 override 标记。至于切片指的是用基类对象（而非引用或指针）接收派生类对象而丢掉派生部分，本题 p 是指针，并没有发生切片。'
  },
  {
    id: 'q-cpp-007',
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s = "abc";
    cout << s.size() << " " << s + "def" << " " << s << endl;
    return 0;
}`,
    options: [
      '3 abcdef abcdef',
      '6 abcdef abc',
      '3 def abc',
      '3 abcdef abc'
    ],
    answer: 3,
    explain: 's.size() 一开始是 3；s + "def" 生成一个临时的新字符串 abcdef 用于输出，s 本身不变，所以最后打印的仍是 abc。易错点：以为 + 是就地追加，其实追加要用 s += "def" 或 s.append，那才会真正改变 s。'
  },
  {
    id: 'q-cpp-008',
    topic: 'C++',
    level: 'easy',
    q: '关于 C++ 的 new 与 delete，下面哪个说法正确？',
    options: [
      '用 new[] 申请的数组必须用 delete[] 释放，否则行为未定义',
      'new 出来的对象不需要释放，程序结束会自动回收',
      '单个对象和数组都可以用 delete 释放，没有区别',
      'new 返回的指针不能参与指针运算'
    ],
    answer: 0,
    explain: 'new[] 与 delete[] 必须严格配对：对数组误用 delete 属于未定义行为，通常会导致只析构第一个元素甚至堆结构被破坏。new 申请的堆内存不会自动回收，程序长期运行会内存泄漏（进程结束时才由系统回收）。另外 new 返回的是普通指针，完全可以做指针运算和下标访问。'
  },
  {
    id: 'q-cpp-009',
    answerKind: 'behavior',
    topic: 'C++',
    level: 'hard',
    q: '这段代码的输出是什么，说明了什么？',
    code: `#include <iostream>
using namespace std;

class Base {
public:
    int value;
};

class Derived : public Base {
public:
    int extra;
};

int main() {
    Derived d;
    d.value = 12;
    Base b = d;
    cout << b.value << endl;
    return 0;
}`,
    options: [
      '12；对象的赋值会完整拷贝所有成员，extra 也一起复制过去了',
      '12；用基类对象接收派生类对象会发生对象切片，派生部分被丢掉',
      '编译错误；基类对象不能由派生类对象初始化',
      '0；value 没有被正确初始化'
    ],
    answer: 1,
    explain: 'Base b = d; 触发对象切片：只把 d 中属于 Base 的那一部分拷进 b，Derived 新加的 extra 被丢弃。所以 b.value 仍然读到 12，输出 12；但如果你事后修改 b.extra 是不可能的——b 根本没有这个成员。要保留多态行为，应该用基类指针或引用（Base *p = &d;），它们不会切片。'
  },
  {
    id: 'q-cpp-010',
    topic: 'C++',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Widget {
public:
    Widget() {
        cout << "ctor ";
    }
    Widget(const Widget &o) {
        cout << "copy ";
    }
    ~Widget() {
        cout << "dtor ";
    }
};

int main() {
    Widget a;
    Widget b = a;
    return 0;
}`,
    options: [
      'ctor copy dtor',
      'ctor ctor dtor dtor',
      'ctor copy dtor dtor',
      'copy copy dtor dtor'
    ],
    answer: 2,
    explain: 'Widget a; 调用默认构造函数输出 ctor；Widget b = a; 是用 a 初始化 b，调用拷贝构造函数输出 copy（不是赋值，赋值要写成已存在对象之间的 b = a）。离开 main 时两个对象按后创建先销毁的顺序析构，输出两次 dtor，最终是 ctor copy dtor dtor。易错点：以为 Widget b = a; 会调用两次默认构造，或者以为它会调用 operator=。'
  },
  {
    id: 'q-cpp-011',
    topic: 'C++',
    level: 'hard',
    runnable: false,
    q: '下面哪个函数声明是非法的？（这是一段示意代码，不能直接编译——请逐个判断 ①~④）',
    code: `// 下面每组声明单独出现时，哪一组不能通过编译
class A {
public:
    void f(int a = 1, int b);        // ①
    void g(int a, int b = 2);        // ②
    void h(int a = 1, int b = 2);    // ③
    void k(int &a, const int &b = 0); // ④
};`,
    options: [
      '②：默认值只能写在参数列表第一个参数上',
      '③：一个函数最多只能有一个默认参数',
      '④：引用参数不能有默认值',
      '①：带默认值的参数之后不能再出现没有默认值的参数'
    ],
    answer: 3,
    explain: 'C++ 规定：一旦某个形参带上了默认值，它右边的所有形参都必须有默认值，否则调用时无法从右往左补全。所以 ① 非法，②③ 合法（③ 的默认参数可以多于一个），④ 也合法（const int &b = 0 甚至能绑定到临时对象）。易错点：以为默认参数只能放在第一个参数上，或者以为只能有一个。'
  },
  {
    id: 'q-cpp-012',
    topic: 'C++',
    level: 'easy',
    q: '关于 std::sort，下面哪个说法正确？',
    options: [
      '它排序的是左闭右开区间 [begin, end)，可以在第三个参数传入自定义比较函数',
      '排序区间包含 end，所以调用时要写 sort(v.begin(), v.end() + 1)',
      '只能用于数组，不能用于 vector',
      '默认按降序排列，升序必须自己写比较函数'
    ],
    answer: 0,
    explain: 'sort 的区间是左闭右开的 [begin, end)，第二个参数指向“最后一个元素的下一个位置”，写成 v.end() 就不会漏掉任何元素。默认用 operator< 排成升序，想降序就传入比较函数（如返回 a > b）。它不仅能排数组指针，也能排 vector 的迭代器；但比较函数必须满足严格弱序，写成 a >= b 在某些实现下会导致越界崩溃。'
  },

  /* ============ 数组 ============ */
  {
    id: 'q-array-001',
    topic: '数组',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3};
    printf("%d %d %d\\n", a[0], a[2], a[4]);
    return 0;
}`,
    options: [
      '1 3 随机值',
      '1 3 0',
      '1 3 越界崩溃',
      '编译错误，初始化元素太少'
    ],
    answer: 1,
    explain: '初始化列表只给出前三个元素，剩下的元素会被自动补 0，所以 a[3] 和 a[4] 都是 0，输出 1 3 0。注意区别：只有写成 = {1, 2, 3} 这种带花括号的聚合初始化才会补零；如果只写 int a[5]; 则不初始化，元素是垃圾值，打印它们毫无意义。'
  },
  {
    id: 'q-array-002',
    topic: '数组',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    double a[5] = {0};
    printf("%.1f %d\\n", a[2], (int)(sizeof(a) / sizeof(a[0])));
    return 0;
}`,
    options: [
      '0.0 8',
      '随机值 5',
      '0.0 5',
      '0.0 40'
    ],
    answer: 2,
    explain: 'double a[5] = {0} 是最经典的清零写法：只有第一个元素被显式写成 0，其余元素自动补零，所以 a[2] 是 0.0。sizeof(a) 是数组总字节数 40，sizeof(a[0]) 是单个元素 8，相除得到元素个数 5。易错点：把 sizeof(a) 直接当成元素个数（40 而不是 5）。'
  },
  {
    id: 'q-array-003',
    simDiffers: '模拟器是 32 位指针模型（指针 4 字节），真机 64 位是 8 字节——题干已注明「在 64 位平台上」',
    topic: '数组',
    level: 'mid',
    q: '这段程序输出什么？（在 64 位平台上）',
    code: `#include <stdio.h>

void f(int a[]) {
    printf("%d\\n", (int)sizeof(a));
}

int main(void) {
    int a[10];
    printf("%d\\n", (int)sizeof(a));
    f(a);
    return 0;
}`,
    options: [
      '40 和 40',
      '10 和 8',
      '10 和 10',
      '40 和 8'
    ],
    answer: 3,
    explain: '数组作为函数参数时会退化成指向首元素的指针 int *，所以函数里面的 sizeof(a) 求的是指针大小，而不是整个数组的 40 字节。注意这个值和平台位数有关：64 位平台上指针 8 字节，输出 40 和 8；32 位平台上指针 4 字节，输出 40 和 4。易错点：在函数里用 sizeof(a) / sizeof(a[0]) 求元素个数，结果永远是 2（8 / 4）甚至 1。正确做法是把长度作为单独的参数传进去。'
  },
  {
    id: 'q-array-004',
    topic: '数组',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    char s[] = "hello";
    int n = 0;
    while (s[n] != '\\0') {
        n++;
    }
    printf("%d %d\\n", n, (int)sizeof(s));
    return 0;
}`,
    options: [
      '5 6',
      '5 5',
      '6 6',
      '6 5'
    ],
    answer: 0,
    explain: '字符串 "hello" 有 5 个可见字符，加上结尾的 \'\\0\'，字符数组 s 一共占 6 字节：所以循环数出的长度是 5，而 sizeof(s) 是 6。易错点：把 sizeof 当成字符串长度，忘记尾部还有个 \\0；用 strlen 得到的才是 5。'
  },
  {
    id: 'q-array-005',
    answerKind: 'behavior',
    topic: '数组',
    level: 'hard',
    q: '这段代码会输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[3] = {1, 2, 3};
    for (int i = 0; i <= 3; i++) {
        printf("%d ", a[i]);
    }
    printf("\\n");
    return 0;
}`,
    options: [
      '输出 1 2 3 0，因为越界元素自动补 0',
      '先输出 1 2 3，再越界读取 a[3]，属于未定义行为，结果不可预期',
      '输出 1 2 3，编译器会自动忽略越界访问',
      '编译期直接报错'
    ],
    answer: 1,
    explain: '合法下标只有 0、1、2，而循环条件 i <= 3 让 i 取到 3，a[3] 已经越界。C/C++ 不做下标检查：越界读可能读到相邻变量、栈上垃圾值，也可能直接崩溃，标准把这定义为未定义行为，因此没有“正确答案”。正确写法是 i < 3，或者用 sizeof(a) / sizeof(a[0]) 算出长度。'
  },
  {
    id: 'q-array-006',
    answerKind: 'behavior',
    topic: '数组',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {5, 4, 3, 2, 1};
    int cnt = 0;
    for (int i = 0; i < 5; i++) {
        if (a[i] > a[i + 1]) {
            cnt++;
        }
    }
    printf("%d\\n", cnt);
    return 0;
}`,
    options: [
      '4',
      '5',
      '访问越界，a[5] 不属于数组，结果不可预期',
      '3'
    ],
    answer: 2,
    explain: '数组只有下标 0 到 4，当 i = 4 时表达式要读 a[5]，已经越界。虽然很多环境里 a[5] 恰好紧挨着数组后面、是个无法预知的值，但这不是程序可以依赖的行为，属于未定义行为。想统计相邻逆序对，循环条件应写成 i < 4（或者 i < n - 1）。易错点：只想着“数组有 5 个元素，循环走 5 次正好”，忘了循环体里访问的是 a[i + 1]。'
  },
  {
    id: 'q-array-007',
    topic: '数组',
    level: 'easy',
    q: '下面哪个说法正确？',
    options: [
      '数组下标可以从 1 开始',
      '数组长度可以在运行时用变量决定，属于标准 C',
      '数组名可以出现在赋值号左边，例如 a = b;',
      'int a[3] = {1.5, 2.5, 3.5}; 不允许，会编译错误'
    ],
    answer: 3,
    explain: '双精度字面量 1.5 需要收缩转换成 int 才能进数组，这种“花括号内的窄化转换”在 C++ 中是错误、在 C 中会给出警告，因此这一行不能算合法写法。其余三项都错：C/C++ 数组下标从 0 开始；长度必须是编译期常量（变长数组不是标准 C，C++ 里更是没有）；数组名不是可修改的左值，a = b 无法通过编译。'
  },

  /* ============ 指针 ============ */
  {
    id: 'q-ptr-001',
    topic: '指针',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 10;
    int *p = &a;
    *p = 20;
    printf("%d\\n", a);
    return 0;
}`,
    options: [
      '20',
      '10',
      '0',
      '地址值'
    ],
    answer: 0,
    explain: 'p 保存的是 a 的地址，*p = 20 就是“把 20 写到 p 指向的那块内存”，也就是直接修改 a，所以输出 20。易错点：以为 *p = 20 改的是指针 p 自己。要区分三件事：p 是指针本身、&a 是地址、*p 是通过指针访问的目标。'
  },
  {
    id: 'q-ptr-002',
    topic: '指针',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[4] = {5, 10, 15, 20};
    int *p = a;
    printf("%d %d\\n", *p, *(p + 2));
    return 0;
}`,
    options: [
      '5 15',
      '5 10',
      '5 3',
      '0 15'
    ],
    answer: 0,
    explain: 'p 指向 a[0]，*p 是 5；p + 2 不是地址加 2 个字节，而是向后移动两个 int（8 字节），指向 a[2]，所以 *(p + 2) 是 15。这是指针运算的关键规则：加减的步长由所指类型的大小决定。易错点：以为 p + 2 等价于字节偏移 2。'
  },
  {
    id: 'q-ptr-003',
    topic: '指针',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

void change(int x) {
    x = 100;
}

int main(void) {
    int a = 5;
    change(a);
    printf("%d\\n", a);
    return 0;
}`,
    options: [
      '5',
      '100',
      '0',
      '不确定'
    ],
    answer: 0,
    explain: 'C 的参数传递是值传递：change(a) 把 a 的值拷贝一份给形参 x，函数里改的是那份副本，函数返回后副本销毁，实参 a 一直是 5。要让函数改到外面的变量，必须传地址（void change(int *x) 配合 change(&a)）并在里面写 *x = 100。易错点：以为参数名相同就会改到原变量。'
  },
  {
    id: 'q-ptr-004',
    topic: '指针',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    int *p = &a[1];
    int *q = &a[4];
    printf("%d\\n", (int)(q - p));
    return 0;
}`,
    options: [
      '3',
      '6',
      '12',
      '4'
    ],
    answer: 0,
    explain: '同类型指针相减得到的是“隔了多少个元素”，而不是字节差：q 指向 a[4]、p 指向 a[1]，中间相隔 3 个元素，所以结果是 3（如果按字节算则是 12，而直接写 q - p 不是字节差）。易错点：把指针差当成地址差；想要字节差必须先把两边转成 char *。'
  },
  {
    id: 'q-ptr-005',
    topic: '指针',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    int *p = a;
    printf("%d ", *p);
    p++;
    printf("%d ", *p);
    (*p)++;
    printf("%d\\n", *p);
    return 0;
}`,
    options: [
      '1 2 3',
      '1 2 2',
      '1 1 2',
      '2 2 3'
    ],
    answer: 0,
    explain: '第一步 *p 是 a[0] = 1；p++ 让指针前进一个元素、指向 a[1]；此时 *p 仍是 2；(*p)++ 是对“所指对象”自增，a[1] 变成 3，所以最后打印 3，输出 1 2 3。易错点：混淆 p++（指针移动）与 (*p)++（目标值加一），后者必须加括号，写成 *p++ 的含义完全不同。'
  },
  {
    id: 'q-ptr-006',
    topic: '指针',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 10;
    int *p = &a;
    int **pp = &p;
    **pp = 99;
    printf("%d\\n", a);
    return 0;
}`,
    options: [
      '99',
      '10',
      '地址值',
      '段错误'
    ],
    answer: 0,
    explain: 'pp 是二级指针，指向指针 p；*pp 得到 p（也就是 a 的地址），**pp 就是 a 本身，所以 **pp = 99 把 a 改成了 99。逐层剥开记：pp 存 p 的地址，*pp 是 p，**pp 是 a。易错点：以为要写 *pp = 99 就能改到 a，那实际上改的是 p 的指向。'
  },
  {
    id: 'q-ptr-007',
    topic: '指针',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[3] = {2, 4, 6};
    int *p = a;
    int *q = a + 2;
    printf("%d\\n", *q - *p);
    return 0;
}`,
    options: [
      '4',
      '2',
      '6',
      '8'
    ],
    answer: 0,
    explain: '*q 是 a[2] = 6，*p 是 a[0] = 2，两者相减得到 4（注意是先解引用再相减，得到的是两个整数的差，不是指针差）。如果写成 q - p 则是指针相减，结果是元素个数 2。易错点：把 *q - *p 与 q - p 混为一谈——星号的位置决定了算的是值还是位置。'
  },
  {
    id: 'q-ptr-008',
    topic: '指针',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int x = 5;
    int *p = &x;
    printf("%d\\n", *p + 1);
    return 0;
}`,
    options: [
      '6',
      '5',
      '编译错误，指针不能相加',
      '地址值加 1'
    ],
    answer: 0,
    explain: '*p + 1 先解引用得到 5，再加 1，输出 6；x 本身没变，仍然是 5。易错点：把 *p + 1 当成 (*p)++，以为会修改 x；要修改得写 (*p)++ 或 *p += 1。另外“指针加整数”是合法的（表示移动若干元素），但“指针加指针”不允许。'
  },

  /* ============ 字符串 ============ */
  {
    id: 'q-str-001',
    topic: '字符串',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    char s[10] = "Hi";
    printf("%s\\n", s);
    return 0;
}`,
    options: [
      'Hi',
      'Hi 加一串垃圾字符',
      '编译错误，字符串太长',
      '空行'
    ],
    answer: 0,
    explain: '用字符串字面量初始化字符数组时，"Hi" 的三个字符 H、i、\\0 会被写进数组，余下的位置自动补 0。判断字符串到哪里结束只认 \\0，所以 printf 读到 i 就停下，输出干净的 Hi。易错点：以为余下位置是垃圾值——本地字符数组的部分初始化同样会补零。'
  },
  {
    id: 'q-str-002',
    topic: '字符串',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "hello";
    printf("%d\\n", (int)strlen(s));
    return 0;
}`,
    options: [
      '5',
      '6',
      '4',
      '不确定'
    ],
    answer: 0,
    explain: 'strlen 从首字符开始数到 \\0 之前，返回的是有效字符个数：hello 是 5。易错点：把 strlen(s) 与 sizeof(s) 混用——sizeof 包含结尾的 \\0，是 6。另外如果字符数组里没有 \\0（比如手工逐字符填满整个数组），strlen 会一直往后读到越界，结果不可预期。'
  },
  {
    id: 'q-str-003',
    topic: '字符串',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[20] = "Hi";
    strcat(s, " there");
    printf("%s %d\\n", s, (int)strlen(s));
    return 0;
}`,
    options: [
      'Hi there 8',
      'Hi 8',
      'Hi there 9',
      'Hi there 2'
    ],
    answer: 0,
    explain: 'strcat 从 s 的 \\0 处开始追加，把 " there" 连同它自己的结束符一起拷进去，s 变成 "Hi there"：8 个可见字符（H、i、空格、t、h、e、r、e）加一个 \\0。易错点：以为 strcat 会补空格或自动分配空间——它不会，目标数组必须自己保证够大，否则缓冲区溢出；strlen 也只在追加完成后调用才得到 8。'
  },
  {
    id: 'q-str-004',
    topic: '字符串',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char a[] = "abc";
    char b[] = "abd";
    printf("%d %d\\n", strcmp(a, b) < 0, strcmp(a, b) == 0);
    return 0;
}`,
    options: [
      '1 0',
      '0 1',
      '-1 0',
      '1 1'
    ],
    answer: 0,
    explain: 'strcmp 按字典序逐字符比较：abc 与 abd 前两个字符相同，第三个 c（99）小于 d（100），于是返回一个负值。所以 strcmp(a, b) < 0 为真（1），strcmp(a, b) == 0 为假（0），输出 1 0。易错点：以为 strcmp 返回的一定是 -1、0、1 这三个值——标准只保证负数/0/正数，具体数值由实现决定。'
  },
  {
    id: 'q-str-005',
    topic: '字符串',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    char s[] = "abc";
    s[1] = '\\0';
    printf("%s %d\\n", s, (int)sizeof(s));
    return 0;
}`,
    options: [
      'a 4',
      'abc 4',
      'a 3',
      'a 2'
    ],
    answer: 0,
    explain: '把 s[1] 改成 \\0 后，字符串在第一个字符后就结束了，printf 只输出 a。而 sizeof(s) 是数组本身的大小，在编译期就定好了 4（a、b、c、\\0），跟内容变成什么无关。易错点：以为改了 \\0 的位置 sizeof 会变小——sizeof 看的是数组的字节容量，不是字符串当前的长度。'
  },
  {
    id: 'q-str-006',
    topic: '字符串',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    char s[5] = "abcd";
    char t[5];
    int i;
    for (i = 0; i < 4; i++) {
        t[i] = s[i];
    }
    t[4] = '\\0';
    printf("%s\\n", t);
    return 0;
}`,
    options: [
      'abcd',
      'abcd 加乱码',
      '空行',
      '编译错误'
    ],
    answer: 0,
    explain: 's 恰好有 5 个字符位（abcd 加 \\0，正好放得下），循环把 4 个可见字符逐个拷进 t，然后手工写入结尾的 \\0，t 才是一个合法字符串，输出 abcd。关键点在于字符串必须自己保证有 \\0 结尾。易错点：只拷贝可见字符而忘记补 \\0，那样 printf 会越过数组末尾继续读，打印出乱码甚至崩溃。'
  },
  {
    id: 'q-str-007',
    answerKind: 'behavior',
    topic: '字符串',
    level: 'hard',
    q: '这段代码的输出是什么，说明什么问题？',
    code: `#include <stdio.h>

int main(void) {
    char s[4] = "hello";
    printf("%s\\n", s);
    return 0;
}`,
    options: [
      '编译警告或错误：初始化的字符串（含结尾 \\0 共 6 字节）放不进 4 字节的数组',
      '正常输出 hello，多余字符自动丢弃',
      '输出 hel，末尾的 lo 被截掉',
      '输出 4'
    ],
    answer: 0,
    explain: '"hello" 需要 6 个字节（5 个字符加结尾 \\0），而数组只有 4 字节，装不下：C 中会给出“初始化字符串过长”的警告，C++ 中是编译错误。如果某个编译器仍放行，它也只是把前 4 个字符塞进去并且不保证 \\0，printf 会继续越界读。正确做法是让数组足够大（char s[6] 或干脆 char s[] = "hello" 让编译器自己算）。易错点：以为超长部分会被安全截断成合法字符串。'
  },

  /* ============ 结构体 ============ */
  {
    id: 'q-struct-001',
    topic: '结构体',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point p = {3, 4};
    printf("%d\\n", p.x + p.y);
    return 0;
}`,
    options: [
      '7',
      '34',
      '3',
      '编译错误，Point 需要 typedef'
    ],
    answer: 0,
    explain: '{3, 4} 按成员声明顺序初始化 x = 3、y = 4，相加得 7。C 中写 struct Point p; 时必须带上 struct 关键字（除非先 typedef），C++ 里则可以省略。易错点：以为输出是字符串拼接的 34——x + y 是整数相加。'
  },
  {
    id: 'q-struct-002',
    topic: '结构体',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

struct Student {
    char name[10];
    int score;
};

int main(void) {
    struct Student arr[3] = {
        {"Tom", 70},
        {"Jerry", 95},
        {"Spike", 88}
    };
    struct Student *p = arr;
    printf("%s %d\\n", (p + 1)->name, (p + 1)->score);
    return 0;
}`,
    options: [
      'Jerry 95',
      'Tom 70',
      'Spike 88',
      'Jerry 70'
    ],
    answer: 0,
    explain: 'p 指向结构体数组首元素 arr[0]，p + 1 按“一个结构体”为步长前进，指向 arr[1]，所以读到 Jerry 和 95。易错点：以为 p + 1 只移动 1 个字节，或者把 -> 写成 .（(p + 1).name 不合法，点号左边必须是结构体对象而不是指针）。'
  },
  {
    id: 'q-struct-003',
    answerKind: 'behavior',
    topic: '结构体',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

struct A {
    char c;
    int i;
};

int main(void) {
    printf("%d %d\\n", (int)sizeof(char), (int)sizeof(struct A));
    return 0;
}`,
    options: [
      '结构体因内存对齐会插入填充字节，sizeof(struct A) 通常为 8 而不是 5',
      'sizeof(struct A) 一定是 5，等于两个成员大小之和',
      'sizeof(struct A) 一定是 16，因为结构体至少占 16 字节',
      'sizeof(struct A) 无法确定，编译会失败'
    ],
    answer: 0,
    explain: 'char 占 1 字节，int 通常占 4 字节且需要 4 字节对齐：编译器会在 c 后面插入 3 字节填充，让 i 落在 4 的倍数地址上，因此结构体大小通常是 8 而不是 1 + 4 = 5。这属于实现定义的行为，具体数值取决于平台和编译选项，但“会插入填充、不等于成员大小之和”是通用结论。把 int 换成两个 char 才能得到无填充的紧凑布局。'
  },

  /* ============ 内存 ============ */
  {
    id: 'q-mem-001',
    answerKind: 'behavior',
    topic: '内存',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = (int *)malloc(5 * sizeof(int));
    if (p == NULL) {
        return 1;
    }
    printf("%d\\n", p[0]);
    free(p);
    return 0;
}`,
    options: [
      '内容不确定：malloc 不会初始化内存，可能打印任意值',
      '一定打印 0',
      '一定打印 5',
      '编译错误，p[0] 不能用于 malloc 返回的指针'
    ],
    answer: 0,
    explain: 'malloc 只负责划出一块内存，不会清零，所以 p[0] 里是之前遗留的数据，打印出来是不可预期的值。需要用零初始化就改用 calloc(5, sizeof(int))，或者自己写循环赋值、用 memset 清零。易错点：以为新申请的内存天然是 0——这是 calloc 的行为，不是 malloc 的。'
  },
  {
    id: 'q-mem-002',
    answerKind: 'behavior',
    topic: '内存',
    level: 'easy',
    q: '这段程序有什么问题？',
    code: `#include <stdio.h>

int *getValue(void) {
    int local = 42;
    return &local;
}

int main(void) {
    int *p = getValue();
    printf("%d\\n", *p);
    return 0;
}`,
    options: [
      '返回了局部变量的地址，函数结束后该内存已失效，解引用它属于未定义行为',
      '没有问题，输出 42',
      '只是会造成内存泄漏',
      '编译错误，不能返回指针'
    ],
    answer: 0,
    explain: 'local 是函数内的局部变量，函数返回时它所在的栈帧就被回收了；返回它的地址得到的是一个悬垂指针，之后再解引用会读到已被覆盖的数据甚至崩溃。“在函数里返回局部变量的地址”是经典错误。可行做法是把变量声明为 static（生命周期延长）、在堆上 malloc 后返回、或者由调用者传入缓冲区地址。'
  },
  {
    id: 'q-mem-003',
    topic: '内存',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = (int *)malloc(3 * sizeof(int));
    if (p == NULL) {
        return 1;
    }
    p[0] = 1;
    p[1] = 2;
    p[2] = 3;
    printf("%d\\n", p[0] + p[1] + p[2]);
    free(p);
    p = NULL;
    return 0;
}`,
    options: [
      '6',
      '3',
      '0',
      '不确定'
    ],
    answer: 0,
    explain: 'malloc 申请了 3 个 int 的空间，赋值后求和得到 6；free 之后再打不打印都无所谓，因为打印发生在 free 之前。真正的易错点在 free(p); 之后：那块内存已经归还，p 立即成了悬垂指针，再访问 p[0] 就是未定义行为，所以随后写 p = NULL 是个好习惯——它让后续的误用立刻变成可发现的空指针解引用，而不是“看起来正常”。'
  },
  {
    id: 'q-mem-004',
    answerKind: 'behavior',
    topic: '内存',
    level: 'hard',
    q: '这段程序有什么问题？',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *a = (int *)malloc(4 * sizeof(int));
    for (int i = 0; i < 4; i++) {
        a[i] = i * 2;
    }
    int *b = a;
    free(a);
    printf("%d\\n", b[1]);
    return 0;
}`,
    answer: 0,
    options: [
      'b 与 a 指向同一块内存，free(a) 之后 b 成为悬垂指针，再访问 b[1] 属于未定义行为',
      '没有问题，b 是 a 的副本，free(a) 不影响 b',
      '输出 2，程序完全正常',
      '只是内存泄漏，程序仍然输出正确结果'
    ],
    explain: 'int *b = a; 只是拷贝了地址，a 和 b 指向同一块堆内存。free(a) 后这块内存被归还给分配器，随时可能被下一次 malloc 占用，此时的 b 就是悬垂指针，读 b[1] 属于未定义行为：可能侥幸打印 2，也可能打印别的值或者崩溃。这类“多个指针共享一块内存、释放后还有人在用”的问题是最难查的一类 bug，规范做法是明确所有权、释放后把相关指针都置 NULL。'
  },
  {
    id: 'q-mem-005',
    answerKind: 'behavior',
    topic: '内存',
    level: 'mid',
    q: '这段程序有什么问题？',
    code: `#include <stdio.h>
#include <stdlib.h>

void make(void) {
    int *p = (int *)malloc(10 * sizeof(int));
    p[0] = 1;
    printf("%d\\n", p[0]);
}

int main(void) {
    make();
    return 0;
}`,
    options: [
      'malloc 得到的内存没有 free，函数返回后指针丢失，造成内存泄漏',
      '没有问题，函数结束时栈上的 p 会被自动 free',
      'p[0] = 1 越界了',
      'printf 之后才能 free，所以必须把 free 写在 printf 前面'
    ],
    answer: 0,
    explain: 'malloc 申请的是堆内存，它不是局部变量，不会随函数返回而释放；p 这个指针变量本身在栈上、函数结束就没了，于是那块 40 字节的堆内存再也无人能释放——这就是内存泄漏。堆内存必须显式 free，而且要在丢掉指针之前调用。易错点：把“局部变量自动回收”的规则套到 malloc 出来的内存上。'
  },
  {
    id: 'q-mem-006',
    topic: '内存',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *a = (int *)malloc(n * sizeof(int));
    if (a == NULL) {
        return 1;
    }
    for (int i = 0; i < n; i++) {
        a[i] = i * i;
    }
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("%d\\n", sum);
    free(a);
    a = NULL;
    return 0;
}`,
    options: [
      '30',
      '25',
      '55',
      '10'
    ],
    answer: 0,
    explain: 'a[i] = i * i 得到 0、1、4、9、16，求和 0 + 1 + 4 + 9 + 16 = 30。malloc 申请的是一段连续内存，可以像数组一样用下标访问，这正是它常见的使用方式。易错点：把平方和误算成 1 到 5 的和 15 或 1 到 5 的平方和 55（55 是 0 到 4 之外再加了 25 的结果）。'
  },

  /* ============ 易错 ============ */
  {
    id: 'q-pit-001',
    topic: '易错',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int x = 5;
    printf("%d\\n", x / 2 * 4);
    return 0;
}`,
    options: [
      '8',
      '10',
      '2',
      '20'
    ],
    answer: 0,
    explain: '/ 和 * 同级且左结合，所以先算 5 / 2 = 2（整数除法截断），再算 2 * 4 = 8。易错点：凭数学直觉先算 2 * 4 再除，误得 10。只要中间出现整数除法，小数部分就已经永久丢掉了，把 x / 2 * 4 写成 x * 4 / 2 才能得到 10。'
  },
  {
    id: 'q-pit-002',
    topic: '易错',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int i = 1;
    printf("%d ", i++ * 2);
    printf("%d\\n", i);
    return 0;
}`,
    options: [
      '2 2',
      '2 3',
      '4 2',
      '4 3'
    ],
    answer: 0,
    explain: 'i++ 是后置自增：表达式的值取自增之前的 1，1 * 2 = 2 被打印，随后 i 才变成 2。所以输出 2 2。易错点：以为打印的是 2 * 2 = 4。前置版本 ++i * 2 才会先自增再计算，输出 4 2。'
  },
  {
    id: 'q-pit-003',
    topic: '易错',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int n = 10;
    while (n > 0) {
        n -= 3;
        printf("%d ", n);
    }
    return 0;
}`,
    options: [
      '7 4 1 -2',
      '10 7 4 1',
      '7 4 1',
      '10 7 4 1 -2'
    ],
    answer: 0,
    explain: '每轮先减 3 再打印：n 依次变成 7、4、1、-2，打印 7 4 1 -2；当 n = -2 时 while 条件 n > 0 为假，循环才结束。易错点：以为减到 1 就停——1 > 0 仍然成立，还会再执行一轮。判断循环次数不能只看“会不会变负”，要看条件表达式的真假。'
  },
  {
    id: 'q-pit-004',
    answerKind: 'behavior',
    topic: '易错',
    level: 'mid',
    q: '这段程序的循环体执行了几次？',
    code: `#include <stdio.h>

int main(void) {
    int count = 0;
    for (int i = 0; i < 5; i++) {
        ;
    }
    printf("%d\\n", count);
    return 0;
}`,
    options: [
      '5 次，但循环体是个空语句，所以 count 一直是 0，最后输出 0',
      '0 次，因为循环体为空',
      '1 次',
      '编译错误，for 后面不能跟分号'
    ],
    answer: 0,
    explain: 'for 后面那个分号本身就是循环体（空语句），语法上完全合法，循环照常执行 5 次，只是每次什么都不做；count 从未被修改，输出 0。易错点：以为分号会让循环不执行。真正危险的是把分号误写在 if 后面，例如 if (x > 0); cnt++; 会让 cnt++ 无论条件真假都执行。'
  },
  {
    id: 'q-pit-005',
    topic: '易错',
    level: 'mid',
    q: '这段程序能通过编译吗？问题在哪？',
    code: `#include <stdio.h>

int main(void) {
    int x = 5;
    if (x = 0) {
        printf("x 是 0");
    } else {
        printf("x 不是 0");
    }
    printf(" x = %d\\n", x);
    return 0;
}`,
    options: [
      '能编译，但因为把 == 写成 =，先给 x 赋值为 0，条件变成假，输出 x 不是 0 x = 0',
      '编译错误，if 条件里不能有赋值',
      '输出 x 是 0 x = 5',
      '输出 x 是 0 x = 0'
    ],
    answer: 0,
    explain: '赋值表达式 x = 0 的值就是赋进去的 0，作为条件被视为假，所以走 else 分支；同时 x 真的被改成了 0，最后打印 x 不是 0 x = 0。这类“把 == 误写成 =”的 bug 编译器通常只给警告，很容易漏掉。习惯写法是把常量放左边：if (0 == x)，一旦漏写等号就会变成 0 = x，直接编译报错暴露问题。'
  },
  {
    id: 'q-pit-006',
    answerKind: 'behavior',
    topic: '易错',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 1, b = 2;
    printf("%d\\n", a > b ? a : b);
    printf("%d\\n", (a > b ? a : b) + 1);
    return 0;
}`,
    options: [
      '2 然后 3',
      '1 然后 2',
      '2 然后 2',
      '1 然后 3'
    ],
    answer: 0,
    explain: '条件运算符 ?: 的优先级低于 >，所以 a > b ? a : b 等价于 (a > b) ? a : b：a > b 为假，取 b = 2，第一行输出 2；第二行整体加 1 得 3。易错点：以为 ?: 会先于比较运算求值，或者把 printf 里的表达式顺序记错。注意 ?: 的优先级还高于赋值号 =，这也是 a = b > c ? d : e 常被读错的原因。'
  },
  {
    id: 'q-pit-007',
    topic: '易错',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    char c = 'A';
    printf("%c %d\\n", c + 1, c);
    return 0;
}`,
    options: [
      'B 65',
      'A 66',
      'B 66',
      '66 65'
    ],
    answer: 0,
    explain: 'c 存的是字符 A 的编码 65；c + 1 进行整型提升后得到 66，用 %c 输出就按编码解释成字符 B。而 c 本身没变，%d 打出它的编码 65，所以输出 B 65。易错点：把 %c 与 %d 的对应关系弄反，或者以为 c + 1 会修改 c（要改得写 c++ 或 c += 1）。'
  },
  {
    id: 'q-pit-008',
    topic: '易错',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 10;
    int b = a;
    b = 20;
    printf("%d %d\\n", a, b);
    return 0;
}`,
    options: [
      '10 20',
      '20 20',
      '10 10',
      '编译错误'
    ],
    answer: 0,
    explain: 'int b = a; 是把 a 的值拷贝一份给 b，之后 a 和 b 就是两块独立的存储，改 b 不影响 a，所以输出 10 20。这是理解值语义的基石。易错点：把基本类型的赋值当成“让 b 成为 a 的别名”——别名效果要靠引用 int &b = a; 或指针 int *p = &a; 才能实现。'
  },
  {
    id: 'q-pit-009',
    topic: '易错',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 10;
    int b = a++;
    int c = ++a;
    printf("%d %d %d\\n", a, b, c);
    return 0;
}`,
    options: [
      '12 10 12',
      '12 10 11',
      '11 10 12',
      '12 11 12'
    ],
    answer: 0,
    explain: 'int b = a++; 先把 a 的旧值 10 赋给 b，a 变成 11；int c = ++a; 先把 a 加到 12，再把 12 赋给 c。于是 a = 12、b = 10、c = 12，输出 12 10 12。易错点：把 b 也记成 11，或者在 printf 里再写一次 a++ 导致又自增一次（那会改变结果顺序，是典型的未定义行为隐患）。'
  },
  {
    id: 'q-pit-010',
    topic: '易错',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    int *p = a;
    printf("%d\\n", *p + 1);
    return 0;
}`,
    options: [
      '2',
      '1',
      '地址值加 1',
      '11'
    ],
    answer: 0,
    explain: '*p + 1 先取 p 指向的 a[0] = 1，再加 1，结果是 2；数组内容和指针都没变。如果写 *(p + 1) 则是指针先移动一个元素再解引用，得到 a[1] = 2——本题两种写法恰好都输出 2，但含义完全不同：一个改的是值，一个改的是位置。若写成 *p++ 会同时移动指针（并返回移动前指向的值），是最容易看走眼的一种。'
  },
  {
    id: 'q-basics-101',
    topic: '基础',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 5, b = 2;
    printf("%d %d\\n", a / b, a % b);
    return 0;
}`,
    options: [
      '2 1',
      '2.5 1',
      '2 0',
      '2.5 0'
    ],
    answer: 0,
    explain: '两个 int 相除做的是整数除法，5 / 2 直接截断为 2；% 取余得到 1。只有操作数中至少有一个是浮点类型时才会算出 2.5，所以不能按数学除法来选。'
  },
  {
    id: 'q-basics-102',
    topic: '基础',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    printf("%d\\n", 'A' + 1);
    return 0;
}`,
    options: [
      '65',
      '66',
      '67',
      '98'
    ],
    answer: 1,
    explain: '字符常量 \'A\' 在表达式里按它的 ASCII 码 65 参与运算，加 1 得到 66。很多人会顺手选 67（那是 \'C\'），或者以为 %d 会把 66 再转成字符 \'B\' 打印出来。'
  },
  {
    id: 'q-basics-103',
    topic: '基础',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

void add(int x) {
    x = x + 10;
}

int main(void) {
    int a = 5;
    add(a);
    printf("%d\\n", a);
    return 0;
}`,
    options: [
      '5',
      '10',
      '15',
      '0'
    ],
    answer: 0,
    explain: 'C 语言函数参数是值传递：调用 add(a) 时把 5 复制给形参 x，函数里改的是副本，main 里的 a 完全不受影响，所以仍输出 5。易错点是看到 x = x + 10 就以为 a 也被改了；想在函数里改实参必须传指针。'
  },
  {
    id: 'q-basics-104',
    topic: '基础',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    int n = sizeof(a) / sizeof(a[0]);
    printf("%d\\n", n);
    return 0;
}`,
    options: [
      '1',
      '4',
      '5',
      '20'
    ],
    answer: 2,
    explain: 'sizeof(a) 数的是整个数组占的字节数（本机 int 为 4 字节，所以是 20），sizeof(a[0]) 是单个元素的 4 字节，相除正好得到元素个数 5。易错点是把 sizeof 当成“数组长度”直接得 4，或者把字节数 20 当答案。'
  },
  {
    id: 'q-array-101',
    topic: '数组',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[6] = {2, 4};
    printf("%d %d %d\\n", a[0] + a[1], a[3], (int)(sizeof(a) / sizeof(a[0])));
    return 0;
}`,
    options: [
      '6 随机值 6',
      '6 0 6',
      '2 0 2',
      '6 0 2'
    ],
    answer: 1,
    explain: '只写了两个初始值，其余元素按 C 的规则自动补 0，所以 a[3] 是 0 而不是随机值。a[0] + a[1] = 2 + 4 = 6；sizeof(a) 是 24 字节，除以 sizeof(a[0]) 得元素个数 6。易错点：以为没初始化的元素是垃圾值，或者把 6 当成字节数。'
  },
  {
    id: 'q-array-102',
    topic: '数组',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    printf("%d %d\\n", a[1][1], a[0][2]);
    return 0;
}`,
    options: [
      '5 6',
      '4 3',
      '5 3',
      '6 3'
    ],
    answer: 2,
    explain: '二维数组的两个下标都从 0 开始：a[1][1] 是第 2 行第 2 列，值为 5；a[0][2] 是第 1 行第 3 列，值为 3。易错点：把 a[1][1] 数成第 1 行第 1 列而答 4，或者把 a[0][2] 错当成第 2 列的 2。'
  },
  {
    id: 'q-array-103',
    topic: '数组',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    for (int i = 0; i < 5 / 2; i++) {
        int t = a[i];
        a[i] = a[4 - i];
        a[4 - i] = t;
    }
    printf("%d %d %d\\n", a[0], a[2], a[4]);
    return 0;
}`,
    options: [
      '5 3 1',
      '5 4 1',
      '5 3 5',
      '1 3 5'
    ],
    answer: 0,
    explain: '循环只走 i = 0、1（i < 5 / 2 即 i < 2），把 a[0] 与 a[4]、a[1] 与 a[3] 交换，中间元素 a[2] 不动，数组逆序成 5 4 3 2 1。易错点：把循环写成 i < 5 会把数组再换回去变回原样，或者以为 a[2] 也被交换。'
  },
  {
    id: 'q-array-104',
    topic: '数组',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[6] = {1, 2, 3, 4, 5, 6};
    int first = a[0];
    for (int i = 1; i < 6; i++) {
        a[i - 1] = a[i];
    }
    a[5] = first;
    printf("%d %d %d\\n", a[0], a[2], a[5]);
    return 0;
}`,
    options: [
      '2 4 6',
      '1 3 5',
      '2 3 1',
      '2 4 1'
    ],
    answer: 3,
    explain: '循环把每个元素左移一位，数组变成 2 3 4 5 6 6；最后用事先保存的 first 覆盖末尾，得到 2 3 4 5 6 1。所以 a[0] = 2、a[2] = 4、a[5] = 1。易错点：不保存 a[0] 就直接移位，会丢掉 1；或者以为 a[5] 仍是 6。'
  },
  {
    id: 'q-ptr-101',
    topic: '指针',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[6] = {10, 20, 30, 40, 50, 60};
    int *p = a + 1;
    printf("%d %d %d\\n", *p, p[2], *(p + 4));
    return 0;
}`,
    options: [
      '10 30 50',
      '20 40 60',
      '20 30 50',
      '20 40 50'
    ],
    answer: 1,
    explain: 'p = a + 1 让 p 指向 a[1]，所以 *p 是 20。p[2] 等价于 *(p + 2)，即 a[3]，值为 40；*(p + 4) 是 a[5]，值为 60。易错点是把 p[2] 当成 a[2] 而答成 20 40 50，其实指针下标同样从 p 当前位置起算。'
  },
  {
    id: 'q-ptr-102',
    topic: '指针',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

void fill(int *p) {
    p++;
    *p = 99;
}

int main(void) {
    int a[3] = {1, 2, 3};
    fill(a);
    printf("%d %d %d\\n", a[0], a[1], a[2]);
    return 0;
}`,
    options: [
      '99 2 3',
      '1 99 3',
      '1 2 99',
      '1 2 3'
    ],
    answer: 1,
    explain: '形参 p 是按值传递的指针副本，p++ 只让副本指向 a[1]，并不会改变 main 里的 a（数组名本身也不能被赋值）。但 *p = 99 写的是副本当前指向的 a[1]，所以数组变成 1 99 3。易错点：以为 p++ 能移动调用者的指针，或者以为改的是 a[0]。'
  },
  {
    id: 'q-ptr-103',
    topic: '指针',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {1, 2, 3, 4, 5};
    int *p = &a[1];
    int *q = a + 4;
    printf("%d %d\\n", (int)(q - p), *(q - 1));
    return 0;
}`,
    options: [
      '3 4',
      '12 4',
      '3 2',
      '4 3'
    ],
    answer: 0,
    explain: '同一数组内的两个指针相减，结果是它们之间相隔的元素个数，而不是字节数：q 指向 a[4]、p 指向 a[1]，所以 q - p 为 3（若按字节算才是 12）。*(q - 1) 等价 a[3]，值为 4。易错点：用 (int)(q - p) 时误以为得到地址差 12。'
  },
  {
    id: 'q-ptr-104',
    simUnsupported: true,
    topic: '指针',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[3] = {7, 8, 9};
    int *p[3] = {&a[0], &a[1], &a[2]};
    int (*q)[3] = &a;
    printf("%d %d\\n", *p[1], (*q)[2]);
    return 0;
}`,
    options: [
      '7 9',
      '8 8',
      '8 9',
      '编译错误，两种声明互相矛盾'
    ],
    answer: 2,
    explain: 'p 是“指针数组”：3 个 int * 元素，p[1] 是 &a[1]，*p[1] 就是 8。q 是“数组指针”：一个指向 int[3] 的指针，*q 得到整个数组，(*q)[2] 就是 a[2] = 9。易错点：把 int *p[3] 和 int (*q)[3] 当成同一种类型，或者以为 *p[1] 要先解引用整个数组。'
  },
  {
    id: 'q-str-101',
    topic: '字符串',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    char s[] = "hello";
    printf("%c %c %s\\n", s[1], *(s + 4), s + 2);
    return 0;
}`,
    options: [
      'e l llo',
      'e o llo',
      'h o llo',
      'e o hello'
    ],
    answer: 1,
    explain: 's[1] 是第二个字符 e；*(s + 4) 等价 s[4]，是 o。%s 需要的是首地址，s + 2 指向第三个字符 l，于是从那里一直打印到结尾的 \'\\0\'，得到 llo。易错点：把 s + 2 当成“打印 2 个字符”，或者误以为 *s + 2 也是同样意思（那是字符 e 的编码加 2）。'
  },
  {
    id: 'q-str-102',
    topic: '字符串',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    char s[] = "programming";
    int n = 0;
    for (char *p = s; *p != '\\0'; p++) {
        if (*p == 'a' || *p == 'e' || *p == 'i' || *p == 'o' || *p == 'u') {
            n++;
        }
    }
    printf("%d\\n", n);
    return 0;
}`,
    options: [
      '2',
      '3',
      '4',
      '11'
    ],
    answer: 1,
    explain: '循环用指针 p 遍历 s，遇到结尾的 \'\\0\' 就停下，因此不会把结束符算进字符。programming 里的小写元音只有 o、a、i 三个，所以 n 是 3。易错点：把 strlen 的 11 当答案，或者漏掉其中某个元音。'
  },
  {
    id: 'q-struct-101',
    topic: '结构体',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point a = {1, 2};
    struct Point b = a;
    b.x = 10;
    printf("%d %d\\n", a.x, b.x);
    return 0;
}`,
    options: [
      '10 10',
      '1 2',
      '1 10',
      '10 2'
    ],
    answer: 2,
    explain: '结构体赋值是逐成员的值拷贝，b = a 之后 b 是一份独立的数据，改 b.x 不会影响 a.x。所以 a.x 仍是 1，b.x 变成 10。易错点：把结构体赋值想象成引用共享，以为两个变量指向同一块内存。'
  },
  {
    id: 'q-struct-102',
    topic: '结构体',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

struct Box {
    int w;
    int h;
};

void grow(struct Box b) {
    b.w += 10;
}

void grow_ptr(struct Box *b) {
    b->w += 10;
}

int main(void) {
    struct Box b = {5, 6};
    grow(b);
    grow_ptr(&b);
    printf("%d %d\\n", b.w, b.h);
    return 0;
}`,
    options: [
      '25 6',
      '15 6',
      '5 6',
      '15 16'
    ],
    answer: 1,
    explain: 'grow 按值接收整个结构体，改的是副本，不影响 main 里的 b；grow_ptr 接收指针，通过 -> 直接改原对象，所以 w 从 5 变成 15。h 始终没被修改，仍是 6。易错点：以为函数传结构体会自动“传引用”，把两次 +10 都算上得到 25。'
  },
  {
    id: 'q-cpp-101',
    topic: 'C++',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

void addOne(int x) {
    x += 1;
}

void addTwo(int& x) {
    x += 2;
}

int main() {
    int a = 10;
    addOne(a);
    addTwo(a);
    cout << a << endl;
    return 0;
}`,
    options: [
      '10',
      '11',
      '12',
      '13'
    ],
    answer: 2,
    explain: 'addOne 的参数是 int（传值），形参只是 a 的副本，在函数里加 1 不会影响 a。addTwo 的参数是 int&（传引用），形参就是 a 本身，加 2 会真正修改它。所以 a 从 10 变成 12。易错点：以为 addOne 也改了 a。'
  },
  {
    id: 'q-cpp-102',
    topic: 'C++',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

int twice(const int& x) {
    return x * 2;
}

int main() {
    int a = 5;
    const int b = 7;
    cout << twice(a) + twice(b + 1) << endl;
    return 0;
}`,
    options: [
      '24',
      '26',
      '27',
      '20'
    ],
    answer: 1,
    explain: 'const int& 既能绑定普通变量，也能绑定 const 变量，还能绑定 b + 1 这种临时值（临时对象的生命周期会延长到本次调用结束）。两次调用分别是 5 * 2 = 10 与 8 * 2 = 16，相加得 26。易错点：以为 const 引用不能接表达式，或者把 b + 1 算成 7。'
  },
  {
    id: 'q-cpp-103',
    simUnsupported: true,
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

void show(int x) { cout << "int:" << x << ";"; }
void show(double x) { cout << "double:" << x << ";"; }
void show(const char* s) { cout << "str:" << s << ";"; }

int main() {
    show(3);
    show('A');
    show(2.0f);
    cout << endl;
    return 0;
}`,
    options: [
      'int:3;int:65;double:2;',
      'int:3;int:65;double:2.0;',
      'str:3;int:65;double:2;',
      'int:3;int:65;int:2;'
    ],
    answer: 0,
    explain: 'show(\'A\') 实参是 char：转 int 属于整型提升，转 double 属于浮点转换，提升优于转换，所以选中 show(int)，打印字符 A 的编码 65。show(2.0f) 的 float 转 double 是浮点提升，优于转 int，因此选中 show(double)；cout 默认按 6 位有效数字打印，2.0 显示为 2。'
  },
  {
    id: 'q-cpp-104',
    topic: 'C++',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

int power(int base, int exp = 2) {
    int r = 1;
    for (int i = 0; i < exp; i++) {
        r *= base;
    }
    return r;
}

int main() {
    cout << power(3) << " " << power(2, 3) << " " << power(2, 0) << endl;
    return 0;
}`,
    options: [
      '9 8 1',
      '3 8 0',
      '9 8 0',
      '3 8 1'
    ],
    answer: 0,
    explain: 'exp 有默认值 2，所以 power(3) 等价于 power(3, 2) = 9；power(2, 3) = 8。power(2, 0) 时循环一次也不执行，r 保持初值 1，任何数的 0 次幂都是 1。易错点：把 power(2, 0) 当成 0。'
  },
  {
    id: 'q-cpp-105',
    simUnsupported: true,
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Box {
    int a;
    int b;
public:
    Box(int v) : b(a * 2), a(v) {}
    void show() { cout << a << " " << b << endl; }
};

int main() {
    Box x(3);
    x.show();
    return 0;
}`,
    options: [
      '3 6',
      '6 3',
      '6 6',
      '3 0'
    ],
    answer: 0,
    explain: '初始化列表的真正执行顺序由成员在类中的声明顺序决定，与初始化列表的书写顺序无关。这里 a 先声明，所以先执行 a(v) 得到 3，再执行 b(a * 2) 得到 6。易错点：按书写顺序以为先算 b，从而选 6 3。'
  },
  {
    id: 'q-cpp-106',
    simUnsupported: true,
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Item {
public:
    int v;
    Item(int x) : v(x) { cout << "ctor "; }
    Item(const Item& o) : v(o.v) { cout << "copy "; }
};

void take(Item it) {
    cout << "take ";
}

int main() {
    Item a(1);
    take(a);
    Item b = a;
    cout << b.v << endl;
    return 0;
}`,
    options: [
      'ctor copy take copy 1',
      'ctor take copy 1',
      'ctor copy copy take 1',
      'ctor copy take 1'
    ],
    answer: 0,
    explain: 'Item a(1) 调用普通构造函数，输出 ctor。take(a) 是值传递，用 a 初始化形参，调用拷贝构造，输出 copy，进入函数体再输出 take。Item b = a 虽然写成等号，但它仍是拷贝初始化，并且 a 是左值，不能省略拷贝，所以再输出一次 copy，最后打印 b.v = 1。'
  },
  {
    id: 'q-cpp-107',
    simUnsupported: true,
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Counter {
    static int total;
public:
    Counter() { total++; }
    static int get() { return total; }
};

int Counter::total = 0;

int main() {
    Counter a, b;
    Counter c[3];
    cout << Counter::get() << endl;
    return 0;
}`,
    options: [
      '2',
      '3',
      '5',
      '6'
    ],
    answer: 2,
    explain: '静态成员 total 属于类而不属于某个对象，所有 Counter 对象共用同一份。a、b 各构造一次，数组 c 的 3 个元素各构造一次，共 5 次自增，所以 get() 返回 5。易错点：以为数组只算一个对象，或者把静态成员当成每个对象各有一份。'
  },
  {
    id: 'q-cpp-108',
    topic: 'C++',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Animal {
public:
    virtual void speak() { cout << "animal;"; }
    virtual ~Animal() {}
};

class Dog : public Animal {
public:
    void speak() { cout << "dog;"; }
};

int main() {
    Animal* p = new Dog();
    p->speak();
    Animal a = *p;
    a.speak();
    delete p;
    cout << endl;
    return 0;
}`,
    options: [
      'dog;animal;',
      'animal;animal;',
      'dog;dog;',
      'animal;dog;'
    ],
    answer: 0,
    explain: '通过基类指针 p 调用虚函数 speak 会发生动态绑定，实际调用 Dog::speak，输出 dog。但 Animal a = *p 是用 Dog 对象中的 Animal 子对象去初始化一个 Animal 对象，发生了对象切片，派生部分被切掉，a 的类型就是 Animal；对值对象调用虚函数不构成多态，输出 animal。'
  },
  {
    id: 'q-cpp-109',
    topic: 'C++',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s = "hello";
    s += " world";
    auto n = s.size();
    cout << n << " " << s.substr(6, 5) << endl;
    return 0;
}`,
    options: [
      '11 world',
      '5 world',
      '11 worl',
      '11 hello'
    ],
    answer: 0,
    explain: '拼接后 s 是 "hello world"，共 11 个字符（含中间的空格），所以 size() 为 11。substr(6, 5) 表示从下标 6 开始取 5 个字符，下标 6 正好是 w，得到 "world"。auto 会把 n 推导为 size_t，但 cout 输出仍显示 11。'
  },
  {
    id: 'q-cpp-110',
    topic: 'C++',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v = {5, 10, 15, 20};
    int sum = 0;
    for (auto it = v.begin(); it != v.end(); ++it) {
        if (*it > 8) {
            *it += 1;
        }
        sum += *it;
    }
    cout << sum << " " << v[1] << endl;
    return 0;
}`,
    options: [
      '51 10',
      '53 11',
      '53 10',
      '57 11'
    ],
    answer: 1,
    explain: '迭代器 it 指向元素，*it 就是元素本身，所以 *it += 1 会真的修改容器内容：10、15、20 都大于 8，分别变成 11、16、21，5 不变。累加 5 + 11 + 16 + 21 = 53，而 v[1] 已经是 11。易错点：以为修改的是副本，得到 5+10+15+20 = 50 附近的结果。'
  },
  {
    id: 'q-cpp-111',
    simUnsupported: true,
    topic: 'C++',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <iostream>
using namespace std;

class Tracer {
    int id;
public:
    Tracer() : id(0) { cout << "new" << id << ";"; }
    Tracer(int i) : id(i) { cout << "new" << id << ";"; }
    ~Tracer() { cout << "del" << id << ";"; }
};

int main() {
    Tracer* p = new Tracer(1);
    Tracer* q = new Tracer[2];
    delete p;
    delete[] q;
    cout << endl;
    return 0;
}`,
    options: [
      'new1;new0;new0;del1;del0;del0;',
      'new1;new0;new0;del0;del0;del1;',
      'new1;new0;del1;del0;del0;',
      'new1;new0;new0;del0;del1;del0;'
    ],
    answer: 0,
    explain: 'new Tracer(1) 构造 id 为 1 的对象，输出 new1。new Tracer[2] 需要默认构造函数，会为两个元素各构造一次，都输出 new0。delete p 析构单个对象，输出 del1；delete[] q 按相反顺序析构数组元素，输出两次 del0。注意 new 必须配 delete、new[] 必须配 delete[]，否则是未定义行为。'
  },
  {
    id: 'q-cpp-112',
    simUnsupported: true,
    topic: 'C++',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <iostream>
#include <vector>
using namespace std;

class Store {
    vector<int> d;
public:
    Store() {
        d.push_back(1);
        d.push_back(2);
        d.push_back(3);
        d.push_back(4);
    }
    int sum() {
        int s = 0;
        for (int x : d) s += x;
        return s;
    }
    int sum() const {
        int s = 0;
        for (int x : d) s += x * 2;
        return s;
    }
};

int main() {
    Store a;
    const Store& r = a;
    cout << a.sum() << " " << r.sum() << endl;
    return 0;
}`,
    options: [
      '10 20',
      '20 10',
      '10 10',
      '20 20'
    ],
    answer: 0,
    explain: 'sum 有两个 const 重载版本：非 const 对象 a 调用非 const 版本，累加得 1+2+3+4 = 10；const 引用 r 只能调用 const 成员函数，该版本把每个元素乘 2 再累加，得 20。const 引用绑定的是同一个对象，但调用哪个重载由引用本身的 const 属性决定。'
  },
  {
    id: 'q-algo-101',
    topic: '算法',
    level: 'easy',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}

int main(void) {
    printf("%d\\n", gcd(48, 18));
    return 0;
}`,
    options: [
      '3',
      '6',
      '12',
      '18'
    ],
    answer: 1,
    explain: '这是辗转相除法：48 % 18 = 12，18 % 12 = 6，12 % 6 = 0，循环结束时 b 为 0，非零的 a 就是最大公约数 6。易错点是循环结束后误返回 b（此时 b 已经是 0），或者把最后一次余数 0 当成答案。'
  },
  {
    id: 'q-algo-102',
    topic: '算法',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int f(int n) {
    if (n <= 2) return 1;
    return f(n - 1) + f(n - 2);
}

int main(void) {
    printf("%d\\n", f(7));
    return 0;
}`,
    options: [
      '8',
      '12',
      '13',
      '21'
    ],
    answer: 2,
    explain: '这是递归版斐波那契：前两项都是 1，之后每项等于前两项之和，依次为 1、1、2、3、5、8、13，所以 f(7) = 13。易错点是把 f(7) 当成第 7 项却又从 0 开始数，或者把下一项 21（f(8)）错选进来。'
  },
  {
    id: 'q-algo-103',
    topic: '算法',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a[] = {5, 2, 4, 1, 3};
    int n = 5;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
    for (int i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%d", a[i]);
    }
    printf("\\n");
    return 0;
}`,
    options: [
      '1 2 3 4 5',
      '5 4 3 2 1',
      '1 2 3 5 4',
      '2 1 3 4 5'
    ],
    answer: 0,
    explain: '冒泡排序每轮把未排序部分的最大值“冒”到末尾，条件是 a[j] > a[j+1] 时交换，最终得到升序的 1 2 3 4 5。内层上界写成 n-1-i 是为了不再碰已经排好的尾部；输出时只在 i>0 时补空格，所以行尾没有多余空格。'
  },
  {
    id: 'q-algo-104',
    topic: '算法',
    level: 'hard',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int n = 30, cnt = 0;
    int is_prime[31];
    for (int i = 0; i <= n; i++) is_prime[i] = 1;
    is_prime[0] = 0;
    is_prime[1] = 0;
    for (int i = 2; i * i <= n; i++) {
        if (is_prime[i]) {
            for (int j = i * i; j <= n; j += i) is_prime[j] = 0;
        }
    }
    for (int i = 2; i <= n; i++) {
        if (is_prime[i]) cnt++;
    }
    printf("%d\\n", cnt);
    return 0;
}`,
    options: [
      '9',
      '10',
      '11',
      '12'
    ],
    answer: 1,
    explain: '这是埃氏筛：从 2 开始，把每个素数的倍数（从 i*i 起）标记为合数，最后统计 30 以内的素数 2、3、5、7、11、13、17、19、23、29，共 10 个。易错点是忘了把 0 和 1 标成非素数（会多算 2 个），或者把内层起点写成 2*i（结果不变但思路不是筛法的关键）。'
  },
  {
    id: 'q-pit-101',
    topic: '易错',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int i = 0;
    int a = (i++ > 0) && (i++ > 0);
    printf("%d %d\\n", a, i);
    return 0;
}`,
    options: [
      '0 1',
      '0 2',
      '1 1',
      '1 2'
    ],
    answer: 0,
    explain: '&& 具有短路求值：左边 i++ > 0 用 0 比较，结果为假，同时 i 自增为 1，右边的 i++ 根本不会执行，所以 i 只加了这一次。最终 a = 0、i = 1，输出 0 1；选 0 2 就是忽略了短路。'
  },
  {
    id: 'q-pit-102',
    topic: '易错',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int a = 7, b = 2;
    double x = a / b;
    printf("%.1f\\n", x);
    return 0;
}`,
    options: [
      '3.0',
      '3.5',
      '3',
      '4.0'
    ],
    answer: 0,
    explain: 'a / b 的两个操作数都是 int，先做整数除法得到 3，再赋值给 double 才变成 3.0。类型转换发生在除法之后是没用的，要得到 3.5 必须写成 (double)a / b 或 7.0 / 2。'
  },
  {
    id: 'q-pit-103',
    topic: '易错',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    int x = 5;
    if (x = 0)
        printf("zero\\n");
    else
        printf("nonzero\\n");
    return 0;
}`,
    options: [
      'zero',
      'nonzero',
      '5',
      '程序无法编译'
    ],
    answer: 1,
    explain: 'if (x = 0) 是赋值表达式：先把 0 赋给 x，整个表达式的值也是 0，于是条件为假，走 else 分支输出 nonzero。编译器一般只给警告而不是错误，判断相等必须写 ==；另外别把输出当成 x 的值 5。'
  },
  {
    id: 'q-pit-104',
    topic: '易错',
    level: 'mid',
    q: '这段程序输出什么？',
    code: `#include <stdio.h>

int main(void) {
    printf("%d\\n", 1 << 3 + 1);
    return 0;
}`,
    options: [
      '4',
      '8',
      '9',
      '16'
    ],
    answer: 3,
    explain: '加法 + 的优先级高于左移 <<，所以 1 << 3 + 1 等价于 1 << (3 + 1)，即 1 << 4 = 16。想表达 (1 << 3) + 1 = 9 必须自己加括号；这类“少一对括号”的优先级陷阱在考试里很常见。'
  }
];
