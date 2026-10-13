/**
 * 作者：山寒
 * snippets.js —— C/C++ 学习网页的代码片段数据（纯数据文件，经典 script，非 ES module）
 * 由页面通过 window.CPP_SNIPPETS 读取。
 * 字段：id / title / desc / cat / tags / code / stdin(可选) / expect
 * cat 取值：基础 / 数组 / 指针 / 字符串 / 结构体 / 内存 / C++ / 算法
 */
window.CPP_SNIPPETS = [
  /* ==================== 基础 ==================== */
  {
    id: 'sn-temp',
    title: '摄氏度转华氏度',
    desc: '演示最简单的输入输出与浮点运算：F = C * 9 / 5 + 32。',
    cat: '基础',
    tags: ['浮点运算', 'printf', '格式化输出'],
    code: `#include <stdio.h>

int main(void) {
    double c = 37.0;
    double f = c * 9.0 / 5.0 + 32.0;
    printf("%.2f 摄氏度 = %.2f 华氏度\\n", c, f);
    return 0;
}`,
    expect: `37.00 摄氏度 = 98.60 华氏度
`
  },
  {
    id: 'sn-leap',
    title: '判断闰年',
    desc: '演示 if / else 与逻辑运算符 && || 的组合，覆盖被 100 和 400 整除的特殊情况。',
    cat: '基础',
    tags: ['条件判断', '逻辑运算', '闰年'],
    code: `#include <stdio.h>

int main(void) {
    int years[6] = {1896, 1900, 1996, 2000, 2004, 2100};
    for (int i = 0; i < 6; i++) {
        int y = years[i];
        if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) {
            printf("%d 是闰年\\n", y);
        } else {
            printf("%d 不是闰年\\n", y);
        }
    }
    return 0;
}`,
    expect: `1896 是闰年
1900 不是闰年
1996 是闰年
2000 是闰年
2004 是闰年
2100 不是闰年
`
  },
  {
    id: 'sn-gcd',
    title: '最大公约数与最小公倍数',
    desc: '用辗转相除法求最大公约数，再用 a*b/gcd 求最小公倍数。',
    cat: '基础',
    tags: ['辗转相除', '循环', '函数'],
    code: `#include <stdio.h>

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}

int lcm(int a, int b) {
    return a / gcd(a, b) * b;
}

int main(void) {
    int a = 12, b = 18;
    printf("gcd = %d\\n", gcd(a, b));
    printf("lcm = %d\\n", lcm(a, b));
    printf("gcd(100, 75) = %d\\n", gcd(100, 75));
    return 0;
}`,
    expect: `gcd = 6
lcm = 36
gcd(100, 75) = 25
`
  },
  {
    id: 'sn-mul-table',
    title: '九九乘法表',
    desc: '双重循环的经典练习，内层循环的上限跟着外层变量变化。',
    cat: '基础',
    tags: ['双重循环', '格式化输出'],
    code: `#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 9; i++) {
        for (int j = 1; j <= i; j++) {
            printf("%d*%d=%d", j, i, i * j);
            if (j < i) {
                printf(" ");
            }
        }
        printf("\\n");
    }
    return 0;
}`,
    expect: `1*1=1
1*2=2 2*2=4
1*3=3 2*3=6 3*3=9
1*4=4 2*4=8 3*4=12 4*4=16
1*5=5 2*5=10 3*5=15 4*5=20 5*5=25
1*6=6 2*6=12 3*6=18 4*6=24 5*6=30 6*6=36
1*7=7 2*7=14 3*7=21 4*7=28 5*7=35 6*7=42 7*7=49
1*8=8 2*8=16 3*8=24 4*8=32 5*8=40 6*8=48 7*8=56 8*8=64
1*9=9 2*9=18 3*9=27 4*9=36 5*9=45 6*9=54 7*9=63 8*9=72 9*9=81
`
  },
  {
    id: 'sn-narcissus',
    title: '水仙花数',
    desc: '拆出三位数的百位、十位、个位，判断各位数字的立方和是否等于自身。',
    cat: '基础',
    tags: ['取余', '整除', '循环'],
    code: `#include <stdio.h>

int main(void) {
    for (int n = 100; n <= 999; n++) {
        int a = n / 100;
        int b = n / 10 % 10;
        int c = n % 10;
        if (a * a * a + b * b * b + c * c * c == n) {
            printf("%d\\n", n);
        }
    }
    return 0;
}`,
    expect: `153
370
371
407
`
  },

  /* ==================== 数组 ==================== */
  {
    id: 'sn-arr-maxmin',
    title: '数组求最大值和最小值',
    desc: '先假设第一个元素是最值，再逐个比较并更新。',
    cat: '数组',
    tags: ['遍历', '打擂台法'],
    code: `#include <stdio.h>

int main(void) {
    int a[8] = {23, 7, 91, 45, 4, 66, 12, 58};
    int n = 8;
    int mx = a[0], mn = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > mx) {
            mx = a[i];
        }
        if (a[i] < mn) {
            mn = a[i];
        }
    }
    printf("最大值 = %d\\n", mx);
    printf("最小值 = %d\\n", mn);
    return 0;
}`,
    expect: `最大值 = 91
最小值 = 4
`
  },
  {
    id: 'sn-arr-reverse',
    title: '数组逆序',
    desc: '用首尾双下标交换实现原地逆序，注意循环只走到一半。',
    cat: '数组',
    tags: ['双指针', '原地交换'],
    code: `#include <stdio.h>

int main(void) {
    int a[8] = {1, 2, 3, 4, 5, 6, 7, 8};
    int n = 8;
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    for (int i = 0; i < n; i++) {
        printf("%d", a[i]);
        if (i < n - 1) {
            printf(" ");
        }
    }
    printf("\\n");
    return 0;
}`,
    expect: `8 7 6 5 4 3 2 1
`
  },
  {
    id: 'sn-arr-bubble',
    title: '冒泡排序',
    desc: '每一轮把当前范围内最大的数“冒”到末尾，n 个数最多需要 n-1 轮。',
    cat: '数组',
    tags: ['排序', '双重循环', '交换'],
    code: `#include <stdio.h>

int main(void) {
    int a[8] = {5, 2, 9, 1, 7, 3, 8, 4};
    int n = 8;
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
        printf("%d ", a[i]);
    }
    printf("\\n");
    return 0;
}`,
    expect: `1 2 3 4 5 7 8 9 
`
  },
  {
    id: 'sn-arr-select',
    title: '选择排序',
    desc: '每一轮在未排序区间里选出最小值的下标，再与区间第一个元素交换。',
    cat: '数组',
    tags: ['排序', '选择最小值', '交换'],
    code: `#include <stdio.h>

int main(void) {
    int a[6] = {64, 25, 12, 22, 11, 90};
    int n = 6;
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[minIdx]) {
                minIdx = j;
            }
        }
        if (minIdx != i) {
            int t = a[i];
            a[i] = a[minIdx];
            a[minIdx] = t;
        }
    }
    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }
    printf("\\n");
    return 0;
}`,
    expect: `11 12 22 25 64 90 
`
  },
  {
    id: 'sn-arr-bsearch',
    title: '二分查找',
    desc: '在有序数组中每次砍掉一半区间，注意 while (left <= right) 与 mid 的更新。',
    cat: '数组',
    tags: ['查找', '有序数组', '对数复杂度'],
    code: `#include <stdio.h>

int bsearch(int a[], int n, int key) {
    int left = 0, right = n - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (a[mid] == key) {
            return mid;
        } else if (a[mid] < key) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

int main(void) {
    int a[9] = {2, 5, 8, 12, 16, 23, 38, 56, 72};
    printf("23 的下标: %d\\n", bsearch(a, 9, 23));
    printf("72 的下标: %d\\n", bsearch(a, 9, 72));
    printf("100 的下标: %d\\n", bsearch(a, 9, 100));
    return 0;
}`,
    expect: `23 的下标: 5
72 的下标: 8
100 的下标: -1
`
  },
  {
    id: 'sn-arr-count',
    title: '统计分数段频次',
    desc: '用计数数组统计每个分数段的人数，顺带演示条件循环里的 continue。',
    cat: '数组',
    tags: ['计数数组', '频次统计', 'continue'],
    code: `#include <stdio.h>

int main(void) {
    int scores[12] = {95, 83, 100, 67, 78, 92, 55, 88, 73, 100, 61, 90};
    int cnt[11] = {0};
    for (int i = 0; i < 12; i++) {
        int s = scores[i];
        if (s < 0 || s > 100) {
            continue;
        }
        cnt[s / 10]++;
    }
    printf("100 分：%d 人\\n", cnt[10]);
    printf("90-99 分：%d 人\\n", cnt[9]);
    printf("80-89 分：%d 人\\n", cnt[8]);
    printf("70-79 分：%d 人\\n", cnt[7]);
    printf("60-69 分：%d 人\\n", cnt[6]);
    printf("0-59 分：%d 人\\n", cnt[5] + cnt[4] + cnt[3] + cnt[2] + cnt[1] + cnt[0]);
    return 0;
}`,
    expect: `100 分：2 人
90-99 分：3 人
80-89 分：2 人
70-79 分：2 人
60-69 分：2 人
0-59 分：1 人
`
  },

  /* ==================== 指针 ==================== */
  {
    id: 'sn-ptr-swap',
    title: '用指针交换两个数',
    desc: '值传递改不了实参，只有把地址传进去、在函数里解引用才能改到调用方的变量。',
    cat: '指针',
    tags: ['指针作参数', '解引用', '值传递'],
    code: `#include <stdio.h>

void swapWrong(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

void swapRight(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main(void) {
    int x = 3, y = 8;
    swapWrong(x, y);
    printf("值传递后: x = %d, y = %d\\n", x, y);
    swapRight(&x, &y);
    printf("指针传递后: x = %d, y = %d\\n", x, y);
    return 0;
}`,
    expect: `值传递后: x = 3, y = 8
指针传递后: x = 8, y = 3
`
  },
  {
    id: 'sn-ptr-traverse',
    title: '用指针遍历数组',
    desc: '*p 取当前元素，p++ 让指针指向下一个元素，直到 p < a + n。',
    cat: '指针',
    tags: ['指针运算', '遍历', '数组名'],
    code: `#include <stdio.h>

int main(void) {
    int a[6] = {4, 8, 15, 16, 23, 42};
    int n = 6;
    int sum = 0;
    for (int *p = a; p < a + n; p++) {
        printf("%d ", *p);
        sum += *p;
    }
    printf("\\n和 = %d\\n", sum);
    printf("*(a + 3) = %d\\n", *(a + 3));
    return 0;
}`,
    expect: `4 8 15 16 23 42 
和 = 108
*(a + 3) = 16
`
  },
  {
    id: 'sn-ptr-arrname',
    title: '指针与数组名的关系',
    desc: '数组名在大多数场合退化为首元素地址，a[i] 与 *(a + i) 完全等价，但 sizeof(数组名) 得到的是整个数组的字节数。',
    cat: '指针',
    tags: ['数组名', '等价写法', 'sizeof'],
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;
    printf("a[2]   = %d\\n", a[2]);
    printf("*(a+2) = %d\\n", *(a + 2));
    printf("p[2]   = %d\\n", p[2]);
    printf("*(p+2) = %d\\n", *(p + 2));
    printf("sizeof(a) = %d\\n", (int)sizeof(a));
    printf("元素个数 = %d\\n", (int)(sizeof(a) / sizeof(a[0])));
    return 0;
}`,
    expect: `a[2]   = 30
*(a+2) = 30
p[2]   = 30
*(p+2) = 30
sizeof(a) = 20
元素个数 = 5
`
  },
  {
    id: 'sn-ptr-dynarray',
    title: '动态数组（指针 + malloc）',
    desc: '运行时决定数组长度：malloc 申请、当数组用、末尾 free 释放。',
    cat: '指针',
    tags: ['malloc', 'free', '动态内存'],
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 6;
    int *a = (int *)malloc(n * sizeof(int));
    if (a == NULL) {
        printf("申请失败\\n");
        return 1;
    }
    for (int i = 0; i < n; i++) {
        a[i] = i * i;
    }
    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }
    printf("\\n");
    free(a);
    a = NULL;
    return 0;
}`,
    expect: `0 1 4 9 16 25 
`
  },

  /* ==================== 字符串 ==================== */
  {
    id: 'sn-str-funcs',
    title: '手写 strlen 与 strcpy',
    desc: '用倒序遍历与顺序遍历分别实现两个最常用的字符串函数。',
    cat: '字符串',
    tags: ['字符数组', '遍历', '函数实现'],
    code: `#include <stdio.h>

int my_strlen(const char *s) {
    int n = 0;
    while (s[n] != '\\0') {
        n++;
    }
    return n;
}

void my_strcpy(char *dst, const char *src) {
    int i = 0;
    while (src[i] != '\\0') {
        dst[i] = src[i];
        i++;
    }
    dst[i] = '\\0';
}

int main(void) {
    char dst[32];
    my_strcpy(dst, "hello");
    printf("%s 的长度是 %d\\n", dst, my_strlen(dst));
    printf("空串的长度是 %d\\n", my_strlen(""));
    return 0;
}`,
    expect: `hello 的长度是 5
空串的长度是 0
`
  },
  {
    id: 'sn-str-reverse',
    title: '字符串反转',
    desc: '先求长度，再用首尾双下标交换字符，不需要额外空间。',
    cat: '字符串',
    tags: ['原地反转', '双下标', '字符数组'],
    code: `#include <stdio.h>

int main(void) {
    char s[32] = "hello";
    int len = 0;
    while (s[len] != '\\0') {
        len++;
    }
    for (int i = 0, j = len - 1; i < j; i++, j--) {
        char t = s[i];
        s[i] = s[j];
        s[j] = t;
    }
    printf("%s\\n", s);
    return 0;
}`,
    expect: `olleh
`
  },
  {
    id: 'sn-str-words',
    title: '统计单词个数',
    desc: '用“上一个字符是不是空白”来识别单词开头，注意首字符直接是字母的情况。',
    cat: '字符串',
    tags: ['状态判断', '字符分类', '遍历'],
    code: `#include <stdio.h>

int main(void) {
    char s[] = "  I love   C   programming  ";
    int count = 0;
    int inWord = 0;
    for (int i = 0; s[i] != '\\0'; i++) {
        if (s[i] == ' ') {
            inWord = 0;
        } else if (inWord == 0) {
            inWord = 1;
            count++;
        }
    }
    printf("单词个数 = %d\\n", count);
    return 0;
}`,
    expect: `单词个数 = 4
`
  },
  {
    id: 'sn-str-palindrome',
    title: '判断回文串',
    desc: '首尾同时向中间比较，出现不同立刻判定不是回文。',
    cat: '字符串',
    tags: ['双下标', '回文', '函数返回'],
    code: `#include <stdio.h>

int isPalindrome(const char *s) {
    int len = 0;
    while (s[len] != '\\0') {
        len++;
    }
    int i = 0, j = len - 1;
    while (i < j) {
        if (s[i] != s[j]) {
            return 0;
        }
        i++;
        j--;
    }
    return 1;
}

int main(void) {
    printf("level: %d\\n", isPalindrome("level"));
    printf("abcba: %d\\n", isPalindrome("abcba"));
    printf("hello: %d\\n", isPalindrome("hello"));
    return 0;
}`,
    expect: `level: 1
abcba: 1
hello: 0
`
  },

  /* ==================== 结构体 ==================== */
  {
    id: 'sn-struct-stats',
    title: '学生成绩统计',
    desc: '结构体数组保存多名学生的多门成绩，统计总分、平均分和最高分。',
    cat: '结构体',
    tags: ['struct', '结构体数组', '统计'],
    code: `#include <stdio.h>

struct Student {
    char name[16];
    int c;
    int math;
    int eng;
};

int main(void) {
    struct Student stus[3] = {
        {"张三", 90, 85, 78},
        {"李四", 76, 92, 88},
        {"王五", 88, 79, 95}
    };
    for (int i = 0; i < 3; i++) {
        int total = stus[i].c + stus[i].math + stus[i].eng;
        printf("%s 总分 %d 平均 %.2f\\n", stus[i].name, total, total / 3.0);
    }
    return 0;
}`,
    expect: `张三 总分 253 平均 84.33
李四 总分 256 平均 85.33
王五 总分 262 平均 87.33
`
  },
  {
    id: 'sn-struct-sort',
    title: '按成绩排序结构体数组',
    desc: '交换整个结构体，而不是只交换某个成员，从而保持字段“绑定”在一起。',
    cat: '结构体',
    tags: ['结构体数组', '排序', '整体交换'],
    code: `#include <stdio.h>

struct Student {
    char name[16];
    int score;
};

int main(void) {
    struct Student stus[4] = {
        {"小明", 78},
        {"小红", 92},
        {"小刚", 66},
        {"小美", 85}
    };
    int n = 4;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (stus[j].score < stus[j + 1].score) {
                struct Student t = stus[j];
                stus[j] = stus[j + 1];
                stus[j + 1] = t;
            }
        }
    }
    for (int i = 0; i < n; i++) {
        printf("%s %d\\n", stus[i].name, stus[i].score);
    }
    return 0;
}`,
    expect: `小红 92
小美 85
小明 78
小刚 66
`
  },
  {
    id: 'sn-struct-ptr',
    title: '结构体指针与 -> 运算符',
    desc: '(*p).score 可以简写为 p->score，函数里用结构体指针避免整块拷贝。',
    cat: '结构体',
    tags: ['结构体指针', '箭头运算符', '取地址'],
    code: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main(void) {
    struct Point p = {3, 4};
    struct Point *ptr = &p;
    printf("(x, y) = (%d, %d)\\n", p.x, p.y);
    ptr->x = 10;
    (*ptr).y = 20;
    printf("(x, y) = (%d, %d)\\n", p.x, p.y);
    printf("ptr->x + ptr->y = %d\\n", ptr->x + ptr->y);
    return 0;
}`,
    expect: `(x, y) = (3, 4)
(x, y) = (10, 20)
ptr->x + ptr->y = 30
`
  },

  /* ==================== 内存 ==================== */
  {
    id: 'sn-mem-malloc',
    title: 'calloc 与 malloc：初始化差异',
    desc: 'malloc 不初始化（内容不确定），calloc 会把内存清零，演示时只看 calloc 的值。',
    cat: '内存',
    tags: ['malloc', 'calloc', 'free', '初始化'],
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *a = (int *)calloc(n, sizeof(int));
    if (a == NULL) {
        printf("calloc 失败\\n");
        return 1;
    }
    for (int i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }
    printf("\\n");
    for (int i = 0; i < n; i++) {
        a[i] = i + 1;
    }
    printf("a[4] = %d\\n", a[4]);
    free(a);
    a = NULL;
    int *b = (int *)malloc(n * sizeof(int));
    if (b != NULL) {
        b[0] = 100;
        printf("b[0] = %d\\n", b[0]);
    }
    free(b);
    b = NULL;
    return 0;
}`,
    expect: `0 0 0 0 0 
a[4] = 5
b[0] = 100
`
  },
  {
    id: 'sn-mem-newdelete',
    title: 'C++ 的 new 与 delete',
    desc: '单个对象用 new/delete，数组必须用 new[]/delete[] 配对。',
    cat: '内存',
    tags: ['new', 'delete', '动态数组', 'C++'],
    code: `#include <iostream>
using namespace std;

int main() {
    int *p = new int(42);
    cout << "*p = " << *p << endl;
    delete p;

    int n = 4;
    int *arr = new int[n];
    for (int i = 0; i < n; i++) {
        arr[i] = (i + 1) * 10;
    }
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    delete[] arr;
    return 0;
}`,
    expect: `*p = 42
10 20 30 40 
`
  },
  {
    id: 'sn-mem-2darray',
    title: '一维数组模拟二维数组',
    desc: '用 idx = i * 列数 + j 把二维下标换算成一维下标，只申请一块连续内存。',
    cat: '内存',
    tags: ['二维下标映射', 'new[]', 'free'],
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int rows = 3, cols = 4;
    int *m = (int *)malloc(rows * cols * sizeof(int));
    if (m == NULL) {
        return 1;
    }
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            m[i * cols + j] = (i + 1) * 10 + j;
        }
    }
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            printf("%d ", m[i * cols + j]);
        }
        printf("\\n");
    }
    free(m);
    m = NULL;
    return 0;
}`,
    expect: `10 11 12 13 
20 21 22 23 
30 31 32 33 
`
  },

  /* ==================== C++ ==================== */
  {
    id: 'sn-cpp-class',
    title: '用 class 封装圆和矩形',
    desc: '私有数据成员 + 公有成员函数，面积和周长由类自己算，外部只读结果。',
    cat: 'C++',
    tags: ['class', '封装', '成员函数'],
    code: `#include <iostream>
using namespace std;

class Circle {
private:
    double r;
public:
    void setR(double radius) {
        r = radius;
    }
    double area() {
        return 3.14159 * r * r;
    }
    double perimeter() {
        return 2 * 3.14159 * r;
    }
};

class Rectangle {
private:
    double w;
    double h;
public:
    void setSize(double width, double height) {
        w = width;
        h = height;
    }
    double area() {
        return w * h;
    }
    double perimeter() {
        return 2 * (w + h);
    }
};

int main() {
    Circle c;
    c.setR(2.0);
    cout << "圆 面积 " << c.area() << " 周长 " << c.perimeter() << endl;

    Rectangle rect;
    rect.setSize(3.0, 4.0);
    cout << "矩形 面积 " << rect.area() << " 周长 " << rect.perimeter() << endl;
    return 0;
}`,
    expect: `圆 面积 12.5664 周长 12.5664
矩形 面积 12 周长 14
`
  },
  {
    id: 'sn-cpp-ctor',
    title: '构造函数与析构函数',
    desc: '对象创建时自动调用构造函数，离开作用域时按“后创建先销毁”的顺序调用析构函数。',
    cat: 'C++',
    tags: ['构造函数', '析构函数', '作用域'],
    code: `#include <iostream>
using namespace std;

class Box {
private:
    int side;
public:
    Box(int s) {
        side = s;
        cout << "构造 Box(" << side << ")" << endl;
    }
    ~Box() {
        cout << "析构 Box(" << side << ")" << endl;
    }
    int volume() {
        return side * side * side;
    }
};

int main() {
    Box a(2);
    Box b(3);
    cout << "体积 " << a.volume() << " " << b.volume() << endl;
    return 0;
}`,
    expect: `构造 Box(2)
构造 Box(3)
体积 8 27
析构 Box(3)
析构 Box(2)
`
  },
  {
    id: 'sn-cpp-polymorphism',
    title: '继承与多态',
    desc: '基类指针指向派生类对象，virtual 函数在运行时决定调用谁。',
    cat: 'C++',
    tags: ['继承', 'virtual', '多态', '基类指针'],
    code: `#include <iostream>
using namespace std;

class Animal {
public:
    virtual void speak() {
        cout << "动物发出声音" << endl;
    }
};

class Dog : public Animal {
public:
    void speak() override {
        cout << "汪汪" << endl;
    }
};

class Cat : public Animal {
public:
    void speak() override {
        cout << "喵喵" << endl;
    }
};

int main() {
    Animal a;
    Dog d;
    Cat c;
    a.speak();
    d.speak();
    c.speak();

    Animal *p1 = &d;
    Animal *p2 = &c;
    p1->speak();
    p2->speak();
    return 0;
}`,
    expect: `动物发出声音
汪汪
喵喵
汪汪
喵喵
`
  },
  {
    id: 'sn-cpp-vector',
    title: 'std::vector 常用操作',
    desc: 'push_back 追加、size 取长度、下标与 at 取元素、pop_back 与 clear 清理。',
    cat: 'C++',
    tags: ['vector', 'push_back', '范围 for'],
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v = {1, 2, 3};
    v.push_back(4);
    v.push_back(5);
    cout << "size = " << v.size() << endl;
    cout << "v[0] = " << v[0] << ", at(1) = " << v.at(1) << endl;
    int sum = 0;
    for (int x : v) {
        sum += x;
    }
    cout << "sum = " << sum << endl;
    v.pop_back();
    cout << "pop 后 size = " << v.size() << endl;
    v.clear();
    cout << "clear 后 size = " << v.size() << endl;
    return 0;
}`,
    expect: `size = 5
v[0] = 1, at(1) = 2
sum = 15
pop 后 size = 4
clear 后 size = 0
`
  },
  {
    id: 'sn-cpp-string',
    title: 'std::string 用法',
    desc: '字符串拼接用 +，求长度用 size()，需要 C 风格字符串时用 c_str()。',
    cat: 'C++',
    tags: ['string', '拼接', 'substr', 'c_str'],
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string a = "Hello";
    string b = "World";
    string s = a + ", " + b + "!";
    cout << s << endl;
    cout << "长度 = " << s.size() << endl;
    cout << "子串 = " << s.substr(0, 5) << endl;
    cout << "find(World) = " << s.find("World") << endl;
    cout << "首字符 = " << s[0] << endl;
    if (a == "Hello") {
        cout << "a 与 Hello 相等" << endl;
    }
    printf("%s\\n", s.c_str());
    return 0;
}`,
    expect: `Hello, World!
长度 = 13
子串 = Hello
find(World) = 7
首字符 = H
a 与 Hello 相等
Hello, World!
`
  },
  {
    id: 'sn-cpp-sort',
    title: 'std::sort 排序',
    desc: '默认升序排区间 [begin, end)，也可以传一个自己写的比较函数实现降序。',
    cat: 'C++',
    tags: ['algorithm', 'sort', '比较函数', '范围 for'],
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

bool cmp(int a, int b) {
    return a > b;
}

int main() {
    vector<int> v = {5, 2, 9, 1, 7, 3};

    sort(v.begin(), v.end());
    cout << "升序: ";
    for (int x : v) {
        cout << x << " ";
    }
    cout << endl;

    sort(v.begin(), v.end(), cmp);
    cout << "降序: ";
    for (int x : v) {
        cout << x << " ";
    }
    cout << endl;
    return 0;
}`,
    expect: `升序: 1 2 3 5 7 9 
降序: 9 7 5 3 2 1 
`
  },

  /* ==================== 算法 ==================== */
  {
    id: 'sn-algo-fib',
    title: '斐波那契：循环与递归',
    desc: '同一个数列两种写法，直观对比递归的调用开销。',
    cat: '算法',
    tags: ['递归', '循环', '数列'],
    code: `#include <stdio.h>

long fibLoop(int n) {
    if (n <= 2) {
        return 1;
    }
    long a = 1, b = 1;
    for (int i = 3; i <= n; i++) {
        long t = a + b;
        a = b;
        b = t;
    }
    return b;
}

long fibRec(int n) {
    if (n <= 2) {
        return 1;
    }
    return fibRec(n - 1) + fibRec(n - 2);
}

int main(void) {
    printf("fibLoop(10) = %ld\\n", fibLoop(10));
    printf("fibRec(10)  = %ld\\n", fibRec(10));
    printf("fibLoop(20) = %ld\\n", fibLoop(20));
    return 0;
}`,
    expect: `fibLoop(10) = 55
fibRec(10)  = 55
fibLoop(20) = 6765
`
  },
  {
    id: 'sn-algo-fact',
    title: '阶乘（递归与 long）',
    desc: '递归终止条件 n <= 1 返回 1，用 long 避免过早溢出。',
    cat: '算法',
    tags: ['递归', '阶乘', '溢出'],
    code: `#include <stdio.h>

long fact(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}

int main(void) {
    for (int i = 1; i <= 6; i++) {
        printf("%d! = %ld\\n", i, fact(i));
    }
    printf("10! = %ld\\n", fact(10));
    return 0;
}`,
    expect: `1! = 1
2! = 2
3! = 6
4! = 24
5! = 120
6! = 720
10! = 3628800
`
  },
  {
    id: 'sn-algo-sieve',
    title: '素数筛',
    desc: '埃氏筛：把每个素数的倍数全部标记为合数，剩下的就是素数。',
    cat: '算法',
    tags: ['素数', '筛法', '数组标记'],
    code: `#include <stdio.h>

int main(void) {
    int n = 30;
    int isPrime[31];
    for (int i = 0; i <= n; i++) {
        isPrime[i] = 1;
    }
    isPrime[0] = 0;
    isPrime[1] = 0;
    for (int i = 2; i * i <= n; i++) {
        if (isPrime[i]) {
            for (int j = i * i; j <= n; j += i) {
                isPrime[j] = 0;
            }
        }
    }
    int count = 0;
    for (int i = 2; i <= n; i++) {
        if (isPrime[i]) {
            printf("%d ", i);
            count++;
        }
    }
    printf("\\n共 %d 个素数\\n", count);
    return 0;
}`,
    expect: `2 3 5 7 11 13 17 19 23 29 
共 10 个素数
`
  },
  {
    id: 'sn-algo-hanoi',
    title: '汉诺塔',
    desc: '把 n-1 个盘子先移到辅助柱，再移动最大盘，最后把 n-1 个移回目标柱。',
    cat: '算法',
    tags: ['递归', '分治', '汉诺塔'],
    code: `#include <stdio.h>

int steps = 0;

void hanoi(int n, char from, char to, char via) {
    if (n == 0) {
        return;
    }
    hanoi(n - 1, from, via, to);
    steps++;
    printf("第 %d 步：把盘子 %d 从 %c 移到 %c\\n", steps, n, from, to);
    hanoi(n - 1, via, to, from);
}

int main(void) {
    hanoi(3, 'A', 'C', 'B');
    printf("共 %d 步\\n", steps);
    return 0;
}`,
    expect: `第 1 步：把盘子 1 从 A 移到 C
第 2 步：把盘子 2 从 A 移到 B
第 3 步：把盘子 1 从 C 移到 B
第 4 步：把盘子 3 从 A 移到 C
第 5 步：把盘子 1 从 B 移到 A
第 6 步：把盘子 2 从 B 移到 C
第 7 步：把盘子 1 从 A 移到 C
共 7 步
`
  },
  {
    id: 'sn-algo-yanghui',
    title: '杨辉三角',
    desc: '每个数等于上一行同列与上一行前一列之和，边界列恒为 1。',
    cat: '算法',
    tags: ['二维数组', '递推', '杨辉三角'],
    code: `#include <stdio.h>

int main(void) {
    int a[6][6] = {0};
    for (int i = 0; i < 6; i++) {
        a[i][0] = 1;
        a[i][i] = 1;
    }
    for (int i = 2; i < 6; i++) {
        for (int j = 1; j < i; j++) {
            a[i][j] = a[i - 1][j - 1] + a[i - 1][j];
        }
    }
    for (int i = 0; i < 6; i++) {
        for (int j = 0; j <= i; j++) {
            printf("%d", a[i][j]);
            if (j < i) {
                printf(" ");
            }
        }
        printf("\\n");
    }
    return 0;
}`,
    expect: `1
1 1
1 2 1
1 3 3 1
1 4 6 4 1
1 5 10 10 5 1
`
  }
];
