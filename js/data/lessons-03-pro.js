// C/C++ 学习网页 · 第三部分数据
// 作者：山寒
// 负责章节：memory（内存与指针进阶）/ cpp-oop（C++ 类与对象）/ cpp-stl（STL 容器与算法）
// 约定：body / code / stdin / expect 一律使用反引号模板字符串；行内代码写成 [[双中括号]]。

window.CPP_LESSONS_P3 = [
  {
    id: 'memory-1',
    chapter: 'memory',
    title: '为什么需要动态内存',
    icon: '🧠',
    xp: 20,
    pages: [
      {
        title: '栈上的数组，大小得提前说死',
        body: `先看一段特别正常的代码：

[[int score[5] = {90, 85, 77, 92, 60};]]

这个 5 是写死在代码里的，编译器一眼就看明白了：要 5 个 int。于是它在**栈**上给你划出 5 个格子的位置。

栈上的内存有个脾气：**来得快、走得也快，但大小必须提前说清楚**。函数一返回，栈上那块地方立刻被系统收走。

> 栈就像食堂的餐盘架：用完自动收走，但你打饭的时候就得说清楚要几个碗，不能说吃完了再要。

那如果数组要多长，得等程序跑起来、用户输入了才知道呢？比如"请输入班级人数，然后输入每个人的分数"。这时候写死大小就不行了——写小了不够用，写大了浪费，还容易被别人超过。

这时候就得换一种思路：**让程序运行起来之后，再向系统临时借一块内存**。这就是动态内存。`,
        code: `#include <stdio.h>

int main() {
    int score[5] = {90, 85, 77, 92, 60};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += score[i];
    }
    printf("sum = %d\\n", sum);
    printf("avg = %d\\n", sum / 5);
    return 0;
}`,
        expect: `sum = 404
avg = 80
`
      },
      {
        title: 'malloc：向系统借一块内存',
        body: `堆（heap）是一大片公共内存。想借多少、借多久，由你在程序运行时自己决定。借的动作叫 [[malloc]]：

- [[malloc(字节数)]]：向系统要这么多字节，成功就返回这块内存的首地址，失败返回 [[NULL]]
- 它的返回值类型是 [[void *]]，所以要强制转换成你要的指针类型
- 借来的东西必须自己还，还的动作叫 [[free(指针)]]

> [[malloc]] 只负责划地盘，**不会帮你把里面的东西擦干净**。刚拿到的内存里装的是上一轮留下的垃圾值。

怎么算要多少字节？用 [[sizeof]] 出场：

[[int *p = (int *)malloc(5 * sizeof(int));]]

这句话的意思是：我要 5 个 int 那么大的地方。写成 [[malloc(20)]] 在你这台机器上也能跑，但换台机器、换个类型就可能错，所以永远用 [[sizeof]] 去乘。`,
        code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n = 5;
    int *p = (int *)malloc(n * sizeof(int));
    if (p == NULL) {
        printf("malloc failed\\n");
        return 1;
    }
    for (int i = 0; i < n; i++) {
        p[i] = (i + 1) * (i + 1);
    }
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += p[i];
        printf("p[%d] = %d\\n", i, p[i]);
    }
    printf("sum = %d\\n", sum);
    free(p);
    p = NULL;
    return 0;
}`,
        expect: `p[0] = 1
p[1] = 4
p[2] = 9
p[3] = 16
p[4] = 25
sum = 55
`
      },
      {
        title: 'calloc：借来就是干净的',
        body: `[[calloc]] 和 [[malloc]] 是兄弟，区别只有两点：

1. 参数是两个：[[calloc(个数, 每个多少字节)]]
2. **它会把整块内存清零**

> 类比一下：[[malloc]] 是借给你一个没洗的碗，[[calloc]] 是洗过消毒的碗。装什么还是你自己决定，但 [[calloc]] 保证里面一开始是空的。

所以当你需要一个"初始全是 0"的数组（计数器、分数桶、统计表），直接用 [[calloc]] 最省事，省得自己再写一个循环去清零。

反过来说，如果你反正要把每个位置都重新赋值，那用 [[malloc]] 就够了，没必要多花那点清零的时间。`,
        code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n = 4;
    int *a = (int *)calloc(n, sizeof(int));
    if (a == NULL) {
        printf("calloc failed\\n");
        return 1;
    }
    printf("after calloc: %d %d %d %d\\n", a[0], a[1], a[2], a[3]);
    for (int i = 0; i < n; i++) {
        a[i] = i * 3;
    }
    for (int i = 0; i < n; i++) {
        printf("a[%d] = %d\\n", i, a[i]);
    }
    free(a);
    a = NULL;
    return 0;
}`,
        expect: `after calloc: 0 0 0 0
a[0] = 0
a[1] = 3
a[2] = 6
a[3] = 9
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n = 3;
    int *p = (int *)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        p[i] = (i + 1) * 2;
    }
    printf("%d\\n", p[0] + p[2]);
    free(p);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['6', '8', '10', '12'],
        answer: 1,
        explain: 'p[0] 是 (0+1)*2 = 2，p[2] 是 (2+1)*2 = 6，加起来是 8。malloc 借来的内存虽然没清零，但我们给每个位置都赋过值了，所以结果和 calloc 一样确定。'
      },
      {
        type: 'choice',
        question: '要申请存放 10 个 double 的堆内存，下面哪一句是对的？',
        options: [
          'double *p = (double *)malloc(sizeof(double));',
          'double *p = (double *)malloc(10);',
          'double *p = (double *)calloc(1);',
          'double *p = (double *)malloc(10 * sizeof(double));'
        ],
        answer: 3,
        explain: 'malloc 的参数是**字节数**，10 个 double 就是 10 * sizeof(double)。写成 malloc(10) 只借到 10 个字节，连 2 个 double 都放不下；sizeof(double) 只够 1 个。'
      },
      {
        type: 'choice',
        question: 'malloc 申请失败的时候会返回什么？',
        options: ['-1', '随机地址', 'NULL', '一块全为 0 的内存'],
        answer: 2,
        explain: 'C 语言里 malloc 和 calloc 失败都返回 [[NULL]]，所以借完内存第一件事就是 [[if (p == NULL)]]。注意"全为 0 的内存"是 calloc **成功**时的特点，不是失败的标志。'
      }
    ]
  },
  {
    id: 'memory-2',
    chapter: 'memory',
    title: '内存泄漏与两种坏指针',
    icon: '🕳️',
    xp: 25,
    pages: [
      {
        title: '内存泄漏：借了不还',
        body: `堆内存最大的坑在这里：**它不会自己回家**。

栈上的数组，函数一结束就没了。但 [[malloc]] 借来的内存，只有你亲手 [[free]] 才会还回去。指针变量本身是存在栈上的，函数返回时那个指针变量会消失——可它指向的堆内存还在那儿躺着，而且**再也没人知道它的地址**。

> 这就是内存泄漏：图书馆借书不还。借一本没事，一天借一万本，图书馆就空了。

看下面这段：[[make_array]] 里 malloc 了一块内存，把指针返回给 [[main]]，最后在 [[main]] 里 free 掉——这是正确的接力方式。如果 [[main]] 里忘了那句 [[free(a)]]，程序跑一万次就会漏掉一万块内存。

有个小技巧：把申请和释放写在**同一个函数**里，或者至少写进同一屏代码里，眼睛一扫就能对上账。`,
        code: `#include <stdio.h>
#include <stdlib.h>

int *make_array(int n) {
    int *p = (int *)malloc(n * sizeof(int));
    if (p == NULL) {
        return NULL;
    }
    for (int i = 0; i < n; i++) {
        p[i] = i + 1;
    }
    return p;
}

int main() {
    int *a = make_array(5);
    int total = 0;
    for (int i = 0; i < 5; i++) {
        total += a[i];
    }
    printf("total = %d\\n", total);
    free(a);
    a = NULL;
    printf("done\\n");
    return 0;
}`,
        expect: `total = 15
done
`
      },
      {
        title: '野指针与悬垂指针',
        body: `两种"用错指针"的经典事故：

- **野指针**：[[int *p;]] 之后还没赋值就写 [[*p = 5;]]。p 里装的是不知道哪来的垃圾数，等于闭着眼睛往一个随机地址里写东西。
- **悬垂指针**：[[free(p);]] 之后继续读 [[*p]]，或者又 [[free(p);]] 一次。内存已经还给系统了，那块地方随时可能被别人用上。

> 踩坑故事：很多人的程序平时跑得好好的，一上量就崩，多半就是这种"释放之后还在用"的问题——它不一定每次都出错，而是取决于那块内存有没有被别人抢走。同一个 bug，今天不复现，明天必复现。

**防身三招**：

1. 指针定义时就初始化成 [[NULL]]，或者立刻指向真实内存
2. [[free(p);]] 之后紧接着 [[p = NULL;]]，让这个指针彻底失去攻击力
3. 用之前先判断是不是空

下面这段代码演示了正确的收尾姿势：free 之后把 p 置空，之后判断它就是完全安全的。`,
        code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int *p = (int *)malloc(sizeof(int));
    if (p == NULL) {
        return 1;
    }
    *p = 7;
    printf("before free: %d\\n", *p);
    free(p);
    p = NULL;
    if (p == NULL) {
        printf("p is null now\\n");
    }
    return 0;
}`,
        expect: `before free: 7
p is null now
`
      },
      {
        title: 'free(NULL) 安全，重复 free 不安全',
        body: `一个好消息：[[free(NULL)]] 是**合法的**，系统会直接忽略，什么都不做。所以"释放之前先判断空"在 C 里不是必须的，但写上去能帮你自己理清逻辑。

一个坏消息：**对同一块内存 free 两次是未定义行为**。第二次 free 的时候，那块内存很可能已经被系统分给别人了，你等于把别人的东西给释放了，程序崩得莫名其妙。

规律记住这一条就够了：**谁申请，谁释放；释放一次，立刻置空。**

> 动态内存就像租房：签合同（malloc）拿到钥匙，退租（free）把钥匙还回去。还完钥匙立刻把手里那把作废（置 NULL），免得哪天又拿旧钥匙去开别人的门。`,
        code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int *p = NULL;
    free(p);
    printf("free(NULL) is safe\\n");

    int *q = (int *)malloc(3 * sizeof(int));
    q[0] = 10;
    q[1] = 20;
    q[2] = 30;
    printf("%d %d %d\\n", q[0], q[1], q[2]);
    free(q);
    q = NULL;
    printf("released\\n");
    return 0;
}`,
        expect: `free(NULL) is safe
10 20 30
released
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <stdio.h>
#include <stdlib.h>

void f() {
    int *p = (int *)malloc(4 * sizeof(int));
    p[0] = 1;
}

int main() {
    f();
    f();
    printf("ok\\n");
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['程序一定崩溃', 'ok', '内存被自动回收了', '编译报错'],
        answer: 1,
        explain: '两次调用 f 都 malloc 了内存却从来没 free，所以泄漏了 2 块内存。但泄漏**不会立刻让程序崩溃**，只是内存越用越少。会立刻出事的，是"用了已经释放的内存"或者"乱踩野指针"。'
      },
      {
        type: 'choice',
        question: '[[free(p);]] 之后又执行了 [[printf("%d", *p);]]，这属于什么问题？',
        options: ['内存泄漏', '栈溢出', '野指针', '悬垂指针（释放后继续使用）'],
        answer: 3,
        explain: '内存已经还给系统了，p 还指着那块地方，这种指针叫**悬垂指针**。野指针是"压根没初始化过"的指针，悬垂指针是"曾经合法、现在失效"的指针，两种都能把你送走。'
      },
      {
        type: 'predict',
        code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int *p = (int *)calloc(4, sizeof(int));
    p[1] = 5;
    p[3] = 7;
    int s = 0;
    for (int i = 0; i < 4; i++) {
        s += p[i];
    }
    printf("%d\\n", s);
    free(p);
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['7', '10', '12', '15'],
        answer: 2,
        explain: 'calloc 把 4 个 int 全部清成 0，我们只改了 p[1] 和 p[3]，所以是 0+5+0+7 = 12。'
      }
    ]
  },
  {
    id: 'memory-3',
    chapter: 'memory',
    title: 'C++ 的 new/delete 与 RAII',
    icon: '🧱',
    xp: 30,
    pages: [
      {
        title: 'new：C++ 的写法，更省心',
        body: `C++ 说：malloc 要算 [[sizeof]]、要强制转换、还要自己乘字节数，太啰嗦了。于是有了 [[new]]：

[[int *p = new int(42);]]

一句话搞定三件事：申请一个 int 的空间、把初值设成 42、返回 [[int *]]。

> 注意那个括号里是**初值**，不是大小！[[new int(42)]] 得到的是一个初值 42 的 int，不是 42 个 int。这个坑不少人踩过。

- [[new int]]：一个没初始化的 int
- [[new int(42)]]：一个初值是 42 的 int
- [[delete p;]]：还回去

[[new]] 返回的指针类型是明确的，不用强制转换，这是它比 [[malloc]] 舒服的第一步。`,
        code: `#include <iostream>

int main() {
    int *p = new int(42);
    std::cout << *p << std::endl;
    *p = *p + 8;
    std::cout << *p << std::endl;
    delete p;
    return 0;
}`,
        expect: `42
50
`
      },
      {
        title: 'new[] 和 delete[] 必须配对',
        body: `要申请一串元素，用 [[new int[n] ]]：

[[int *a = new int[5];]]

还的时候必须用 **[[delete[] a;]]**，而不是 [[delete a;]]。

> 踩坑故事：这是无数人踩过的坑。[[new[] ]] 申请的是一组对象，只有 [[delete[] ]] 才知道"这里要析构 5 个元素"。写成 [[delete a;]]，运气好只析构第一个、剩下的内存泄漏；运气不好直接崩。

记牢这张配对表：

- [[new]] 对 [[delete]]
- [[new[] ]] 对 [[delete[] ]]

C++ 标准里，指针本身不记录自己指向多长的数组。所以释放的时候必须靠你告诉它"这是数组"，这就是 [[delete[] ]] 里那对方括号存在的唯一理由。`,
        code: `#include <iostream>

int main() {
    int n = 5;
    int *a = new int[n];
    for (int i = 0; i < n; i++) {
        a[i] = i * i;
    }
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += a[i];
    }
    std::cout << "sum = " << sum << std::endl;
    delete[] a;
    return 0;
}`,
        expect: `sum = 30
`
      },
      {
        title: 'RAII：让对象自己管自己',
        body: `手动 [[new]]、手动 [[delete]] 还是太容易忘。C++ 的思路是：**把资源的生命周期绑到对象的生命周期上**，这叫 RAII（资源获取即初始化）。

- 对象诞生时，构造函数里把资源拿到手
- 对象消亡时（离开作用域、函数返回），析构函数里自动把资源还回去

你其实早就在用它了：[[std::vector]] 就是。你 [[push_back]] 了一万个元素，从来没写过 [[free]]，离开作用域它自己就收拾干净了——底层那块动态数组，是它在替你 new 和 delete。

[[std::string]] 也一样：字符串想多长就多长，不用你手动管内存。

> 所以从这节开始，你的目标变了：**能不用裸指针就不用**。要数组用 [[std::vector]]，要字符串用 [[std::string]]，把 [[new]] 和 [[delete]] 留给真正需要它的少数场合。`,
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3, 4};
    v.push_back(5);
    int sum = 0;
    for (int i = 0; i < (int)v.size(); i++) {
        sum += v[i];
    }
    std::cout << "size = " << v.size() << std::endl;
    std::cout << "sum = " << sum << std::endl;
    return 0;
}`,
        expect: `size = 5
sum = 15
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <iostream>

int main() {
    int *p = new int(3);
    int *q = new int[3];
    q[0] = 10;
    q[1] = 20;
    q[2] = 30;
    std::cout << *p + q[1] << std::endl;
    delete p;
    delete[] q;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['23', '33', '60', '编译错误'],
        answer: 0,
        explain: '*p 是 3，q[1] 是 20，所以打印 23。注意释放的时候 p 用 delete、q 用 delete[]，配对是正确的。'
      },
      {
        type: 'choice',
        question: '对 new[] 出来的数组用了 delete（漏掉那对方括号），会发生什么？',
        options: [
          '编译器直接报错，程序根本跑不起来',
          '是未定义行为，可能只析构第一个元素、也可能直接崩溃',
          '只会少释放一点点内存，绝对安全',
          'delete 会自动识别是不是数组，没有任何影响'
        ],
        answer: 1,
        explain: '这是未定义行为：编译器不会拦你，运行时表现可能是内存泄漏，也可能是崩溃。所以 [[new]] 配 [[delete]]、[[new[] ]] 配 [[delete[] ]]，永远成对出现。'
      },
      {
        type: 'choice',
        question: '下面哪种做法最符合 RAII 的思想？',
        options: [
          '手动 new 出对象，在函数里每个 return 前都记得 delete',
          '把指针存成全局变量，程序最后统一释放',
          '用 std::vector 装数据，让它自己管理内存',
          'new 完立刻把指针置成 NULL 防止泄漏'
        ],
        answer: 2,
        explain: 'RAII 的核心是**让资源的释放跟着对象的生命周期自动发生**。vector 在析构函数里把底层内存还回去，你不需要写任何释放代码，也不怕中途 return。'
      }
    ]
  },
  {
    id: 'cpp-oop-1',
    chapter: 'cpp-oop',
    title: '从 struct 到 class',
    icon: '📦',
    xp: 25,
    pages: [
      {
        title: 'struct 能装数据，但管不住数据',
        body: `写程序的时候，我们经常需要"把几个相关的数据绑在一起"：学生的姓名 + 分数，点的 x 坐标 + y 坐标。C 语言给的答案是 [[struct]]：

[[struct Student { std::string name; int score; };]]

用起来也简单：定义变量，然后用点号赋值。

> 但 struct 有个致命弱点：**它只是个筐，谁都能往里扔东西**。分数可以被写成 -20，名字可以被写成空字符串，没有任何人拦着。数据坏了，你得满世界去找是谁改的。

这一节我们要做的，就是给这个筐**配一个门卫**。`,
        code: `#include <iostream>
#include <string>

struct Student {
    std::string name;
    int score;
};

int main() {
    Student s;
    s.name = "Tom";
    s.score = 95;
    std::cout << s.name << " " << s.score << std::endl;
    s.score = -20;
    std::cout << s.score << std::endl;
    return 0;
}`,
        expect: `Tom 95
-20
`
      },
      {
        title: 'class：给数据配个门卫',
        body: `C++ 的 [[class]] 在 struct 的基础上加了一把锁：**访问权限**。

- [[private:]] 下面的成员，只有**类自己的成员函数**能碰
- [[public:]] 下面的成员，外面谁都能用

外面想改分数？不给你直接改，只能走我提供的 [[setScore]]，我在里面顺手检查一下范围。

> 这不是多此一举，而是把"规则"关进了盒子里。以后所有非法数据都在门口被拦下，排查问题时你不用再怀疑"是不是哪里偷偷把 score 改坏了"。

还有一个新手最爱问的问题：[[setScore]] 里面的 [[score]] 和参数 [[s]] 是一回事吗？不是。[[score]] 是这个对象自己的成员变量，[[s]] 是外面传进来的参数，两个东西住在不同的地方。`,
        code: `#include <iostream>
#include <string>

class Student {
private:
    std::string name;
    int score;

public:
    void setName(std::string n) {
        name = n;
    }
    void setScore(int s) {
        if (s < 0) {
            s = 0;
        }
        if (s > 100) {
            s = 100;
        }
        score = s;
    }
    std::string getName() {
        return name;
    }
    int getScore() {
        return score;
    }
};

int main() {
    Student s;
    s.setName("Tom");
    s.setScore(95);
    std::cout << s.getName() << " " << s.getScore() << std::endl;
    s.setScore(-20);
    std::cout << s.getScore() << std::endl;
    s.setScore(150);
    std::cout << s.getScore() << std::endl;
    return 0;
}`,
        expect: `Tom 95
0
100
`
      },
      {
        title: 'class 与 struct 的真区别，还有对象数组',
        body: `八卦时间：C++ 里 [[class]] 和 [[struct]] 的**唯一**区别是默认访问权限。

- [[struct]] 默认 public，什么都敞开
- [[class]] 默认 private，什么都锁上

就这么点差别。C++ 社区的习惯是：纯粹装数据的用 [[struct]]，有行为、要封装的用 [[class]]。

对象也能组成数组，写法和 int 数组一模一样：

[[Point ps[3];]]

[[ps[i].x = 1;]]

每个元素都是一个完整的对象，各自有自己的成员变量，互相不干扰。想批量处理三个点？一个 for 循环就搞定了。`,
        code: `#include <iostream>

class Point {
public:
    int x;
    int y;
    int sum() {
        return x + y;
    }
};

int main() {
    Point ps[3];
    for (int i = 0; i < 3; i++) {
        ps[i].x = i + 1;
        ps[i].y = (i + 1) * 10;
    }
    for (int i = 0; i < 3; i++) {
        std::cout << ps[i].x << "," << ps[i].y << " -> " << ps[i].sum() << std::endl;
    }
    return 0;
}`,
        expect: `1,10 -> 11
2,20 -> 22
3,30 -> 33
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <iostream>

class Box {
private:
    int w;
public:
    void set(int v) {
        w = v;
    }
    int get() {
        return w;
    }
};

int main() {
    Box b;
    b.set(4);
    b.set(b.get() + 6);
    std::cout << b.get() << std::endl;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['4', '6', '10', '编译错误，private 成员不能在类外面用'],
        answer: 2,
        explain: 'b.set(4) 之后 w 是 4；接着 b.get() 返回 4，加 6 得 10，再塞回去。整个过程都在类外面通过 public 的成员函数操作，一次都没碰 private 成员，所以能正常编译运行。'
      },
      {
        type: 'choice',
        question: '关于 class 和 struct 的默认访问权限，下面哪句对？',
        options: [
          'struct 默认 private，class 默认 public',
          '两者完全一样，没有任何区别',
          'class 不能有 public 成员',
          'struct 默认 public，class 默认 private'
        ],
        answer: 3,
        explain: '这是 C++ 里两者**唯一**的语言层面区别。习惯上"只装数据"用 struct、"要封装"用 class，但编译器只认默认权限这一条。'
      },
      {
        type: 'choice',
        question: '把 score 改成 private、只留一个会检查范围的 setScore，最大的好处是什么？',
        options: [
          '程序跑得更快',
          '数据能被安全地保护，同时外部代码不用关心里面怎么存的',
          '少写几行代码',
          '对象占的内存更小'
        ],
        answer: 1,
        explain: '封装的好处不在速度，而在**可控**：非法值在门口就被挡住，外部只依赖 setScore 和 getScore 这些接口。哪天你把 score 从 int 改成 double，只要接口不动，用它的代码一行都不用改。'
      }
    ]
  },
  {
    id: 'cpp-oop-2',
    chapter: 'cpp-oop',
    title: '构造、析构与 this',
    icon: '🔧',
    xp: 30,
    pages: [
      {
        title: '构造函数：对象一出生就有值',
        body: `上一节有个毛病你肯定也发现了：[[Student s;]] 出来的时候，name 是空字符串、score 是垃圾值。总得手动 set 一遍，忘了就是 bug。

**构造函数**就是来解决这个的：它的名字和类名完全相同，没有返回类型，**在你创建对象的那一刻自动被调用**。

[[Student(std::string n, int s) { name = n; score = s; }]]

有了它，创建对象可以一步到位：

[[Student a("Tom", 90);]]

> 陷阱预警：[[Student a();]] 这种写法不是"创建一个对象"，而是"声明了一个返回 Student 的函数"。想要默认构造就写 [[Student a;]]，要么就把参数给全。

另外要记住：一旦你自己写了构造函数，编译器就不再白送你那个不带参数的默认构造函数了。`,
        code: `#include <iostream>
#include <string>

class Student {
private:
    std::string name;
    int score;
public:
    Student(std::string n, int s) {
        name = n;
        score = s;
    }
    void print() {
        std::cout << name << ": " << score << std::endl;
    }
};

int main() {
    Student a("Tom", 90);
    Student b("Amy", 88);
    a.print();
    b.print();
    return 0;
}`,
        expect: `Tom: 90
Amy: 88
`
      },
      {
        title: '析构函数：离开作用域自动收摊',
        body: `有出生就有死亡。**析构函数**的名字是"波浪号 + 类名"，没有参数、没有返回值，在对象**销毁的那一刻**自动调用。

[[~Tracer() { std::cout << "destroy"; }]]

对象什么时候死？两种：

1. 局部对象**离开它所在的花括号**时死掉
2. [[main]] 里的局部对象在 [[main]] 返回时死掉

> 关键规律：**多个对象销毁的顺序，和创建顺序正好相反**——后进先出，像叠盘子。

这就是 RAII 的发动机：把"申请内存、打开文件、加锁"放进构造函数，把"释放"放进析构函数。从此不管函数从哪一行 return，收尾工作都不会被漏掉。`,
        code: `#include <iostream>

class Tracer {
public:
    int id;
    Tracer(int i) {
        id = i;
        std::cout << "create " << id << std::endl;
    }
    ~Tracer() {
        std::cout << "destroy " << id << std::endl;
    }
};

int main() {
    Tracer a(1);
    {
        Tracer b(2);
        std::cout << "inside block" << std::endl;
    }
    std::cout << "after block" << std::endl;
    Tracer c(3);
    return 0;
}`,
        expect: `create 1
create 2
inside block
destroy 2
after block
create 3
destroy 3
destroy 1
`
      },
      {
        title: 'this：我在说我自己',
        body: `写成员函数的时候，参数名很容易和成员变量名撞车：

[[void setScore(int score) { score = score; }]]

这句是新手经典 bug：两个 [[score]] 都是参数，成员变量根本没被改到，而且编译器**不会报错**。

C++ 给了你一个隐式指针 [[this]]，它指向"当前这个对象"。哪个对象调用成员函数，[[this]] 就是谁：

[[void setScore(int score) { this->score = score; }]]

前面的 [[this->score]] 是成员变量，后面的 [[score]] 是参数，谁是谁一目了然。

> 小知识：成员函数里光写 [[score]]，其实等价于 [[this->score]]，是编译器偷偷帮你加的。只有名字冲突的时候，才必须把 [[this->]] 显式写出来。

[[this]] 还有个用处：让成员函数返回自己，从而支持 [[a.add(1).add(2)]] 这种链式调用。`,
        code: `#include <iostream>

class Counter {
private:
    int value;
public:
    Counter() {
        value = 0;
    }
    void add(int value) {
        this->value += value;
    }
    int get() {
        return value;
    }
};

int main() {
    Counter c;
    c.add(3);
    c.add(4);
    std::cout << c.get() << std::endl;
    return 0;
}`,
        expect: `7
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <iostream>

class Num {
private:
    int v;
public:
    Num(int x) {
        v = x * 2;
    }
    int get() {
        return v;
    }
};

int main() {
    Num n(5);
    std::cout << n.get() << std::endl;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['5', '10', '25', '编译错误'],
        answer: 1,
        explain: '构造函数里做的是 v = x * 2，传入 5 得到 10。构造函数里可以写任何逻辑，不只是简单赋值。'
      },
      {
        type: 'choice',
        question: '在同一个函数里依次创建了对象 A、B、C，函数结束时析构函数的调用顺序是？',
        options: ['A、B、C', 'C、B、A', '顺序不确定，看编译器心情', '只调用 C 的析构函数'],
        answer: 1,
        explain: '局部对象在**离开作用域时按创建的逆序**销毁，也就是后进先出，所以是 C、B、A。多个对象互相依赖时这个规律很关键。'
      },
      {
        type: 'choice',
        question: '成员函数里写了 [[void set(int score) { this->score = score; }]]，这里的 [[this->score]] 指的是？',
        options: ['参数 score', '一个新创建的局部变量', '全局变量 score', '当前对象自己的成员变量 score'],
        answer: 3,
        explain: '[[this]] 指向调用这个成员函数的那个对象，[[this->score]] 就是它自己的成员变量。右边那个光秃秃的 [[score]] 才是参数。少写 [[this->]] 的话，两个 score 都指参数，成员变量永远改不到。'
      }
    ]
  },
  {
    id: 'cpp-oop-3',
    chapter: 'cpp-oop',
    title: '继承与多态',
    icon: '🎭',
    xp: 35,
    pages: [
      {
        title: '继承：别重复造轮子',
        body: `猫、狗、兔子都有名字、都会吃东西，只有叫声不一样。难道每个类都把 [[name]] 和 [[eat]] 抄一遍？

**继承**解决的正是这个：把公共部分放进一个基类，子类自动拥有它。

[[class Dog : public Animal { };]]

这句读作"Dog 是一种 Animal，用 public 方式继承"。继承之后：

- [[Animal]] 里的 public 成员，[[Dog]] 直接就能用（[[name]]、[[eat()]]）
- [[Dog]] 还能加自己独有的东西（[[bark()]]）
- 创建 [[Dog]] 对象时，会先构造 [[Animal]] 那部分，再构造 [[Dog]] 自己的部分

> 判断该不该用继承，问自己一句："**Dog 是一种 Animal 吗？**"是，就用继承；如果只是"Dog 有一个名字"，那叫组合，不是一个概念。`,
        code: `#include <iostream>
#include <string>

class Animal {
public:
    std::string name;
    void eat() {
        std::cout << name << " is eating" << std::endl;
    }
};

class Dog : public Animal {
public:
    void bark() {
        std::cout << name << " says woof" << std::endl;
    }
};

int main() {
    Dog d;
    d.name = "Rex";
    d.eat();
    d.bark();
    return 0;
}`,
        expect: `Rex is eating
Rex says woof
`
      },
      {
        title: 'virtual：一个指针，两种表现',
        body: `继承只解决了"代码复用"，真正让 C++ 面向对象封神的是**多态**。

先看一个反直觉的现象：如果基类指针指向子类对象，然后调用一个同名函数，默认情况下**调用的居然是基类那个版本**！因为编译器只看指针的**类型**，在编译期就把函数地址定死了。

想让它看对象的**真实身份**，就必须在基类函数前加 [[virtual]]：

[[virtual double area() { return 0.0; }]]

加了 [[virtual]] 之后，调哪个版本改由**运行时**决定：指针实际指向谁，就调谁的方法。这叫**动态绑定**。

> 口诀：**基类写 virtual，子类写 override**。[[override]] 是给编译器看的提醒——"我本来想覆盖基类函数"，名字或参数写错时它立刻报错，能省你一整晚 debug。`,
        code: `#include <iostream>
#include <string>

class Shape {
public:
    virtual double area() {
        return 0.0;
    }
    virtual std::string name() {
        return "Shape";
    }
};

class Rect : public Shape {
private:
    double w;
    double h;
public:
    Rect(double ww, double hh) {
        w = ww;
        h = hh;
    }
    double area() override {
        return w * h;
    }
    std::string name() override {
        return "Rect";
    }
};

int main() {
    Rect r(3.0, 4.0);
    Shape *p = &r;
    std::cout << p->name() << std::endl;
    std::cout << p->area() << std::endl;
    return 0;
}`,
        expect: `Rect
12
`
      },
      {
        title: '多态的真正威力',
        body: `单看刚才那段，你可能觉得多态没什么用：我直接写 [[Rect r;]] 然后 [[r.area();]] 不香吗？

多态的威力在**一批不同的对象用同一套代码处理**的时候才爆发。看下面：把长方形和正方形都塞进同一个数组（基类指针数组），然后一个循环搞定全部。

- 以后再加一个 [[Circle]] 类，主循环**一行都不用改**
- 这就是常说的"对扩展开放，对修改关闭"

> 踩坑故事：很多人忘了在基类写 [[virtual]]，然后盯着屏幕问"为什么我传进去的是正方形，算出来面积是 0？"——因为基类函数不是虚函数，等于告诉编译器"闭着眼睛按类型调就行了"。`,
        code: `#include <iostream>
#include <string>

class Shape {
public:
    virtual double area() {
        return 0.0;
    }
    virtual std::string name() {
        return "Shape";
    }
};

class Rect : public Shape {
private:
    double w;
    double h;
public:
    Rect(double ww, double hh) {
        w = ww;
        h = hh;
    }
    double area() override {
        return w * h;
    }
    std::string name() override {
        return "Rect";
    }
};

class Square : public Shape {
private:
    double a;
public:
    Square(double aa) {
        a = aa;
    }
    double area() override {
        return a * a;
    }
    std::string name() override {
        return "Square";
    }
};

int main() {
    Rect r(2.0, 5.0);
    Square s(3.0);
    Shape *list[2];
    list[0] = &r;
    list[1] = &s;
    for (int i = 0; i < 2; i++) {
        std::cout << list[i]->name() << " area=" << list[i]->area() << std::endl;
    }
    return 0;
}`,
        expect: `Rect area=10
Square area=9
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <iostream>

class Base {
public:
    virtual void who() {
        std::cout << "Base" << std::endl;
    }
};

class Derived : public Base {
public:
    void who() override {
        std::cout << "Derived" << std::endl;
    }
};

int main() {
    Derived d;
    Base *p = &d;
    p->who();
    Base b;
    p = &b;
    p->who();
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['Derived 然后 Base', 'Base 然后 Base', 'Derived 然后 Derived', '编译错误'],
        answer: 0,
        explain: 'p 第一次指向 Derived 对象，因为 who() 是虚函数，调的是 Derived 版本；第二次 p 指向真正的 Base 对象，调的就是 Base 版本。虚函数看的是**对象的真实类型**，不是指针的类型。'
      },
      {
        type: 'choice',
        question: '如果 Base 里的 [[who()]] 忘了写 [[virtual]]，上面那段代码会输出什么？',
        options: ['Derived 然后 Base，不会有变化', 'Base 然后 Base', 'Base 然后 Derived', '编译报错'],
        answer: 1,
        explain: '没有 virtual 就是**静态绑定**：编译器只看 p 的类型是 Base 指针，两次都调 Base::who()，所以两次都打印 Base。这就是"多态失效"最常见的现场。'
      },
      {
        type: 'choice',
        question: '关于 [[class Dog : public Animal]]，下面说法正确的是？',
        options: [
          'Dog 只能继承 Animal 的 private 成员',
          'Dog 和 Animal 是完全相同的两个类型',
          'Dog 拥有 Animal 的公有成员，并且可以添加自己的成员',
          '一个类最多只能被一个类继承'
        ],
        answer: 2,
        explain: 'public 继承下，子类拥有基类的 public 成员，还能追加自己的成员。Dog 是一种 Animal，但 Animal 不一定是 Dog——所以基类指针指向子类对象是合法的，反过来不行。'
      }
    ]
  },
  {
    id: 'cpp-stl-1',
    chapter: 'cpp-stl',
    title: 'std::string 深入',
    icon: '🧵',
    xp: 20,
    pages: [
      {
        title: '会自己长大的字符串',
        body: `C 语言的字符串是字符数组，长度固定，拼接要 [[strcat]]，一不小心就越界。C++ 的 [[std::string]] 把这些全接管了：

- 直接用 [[+]] 拼接，用 [[+=]] 追加
- 用 [[size()]] 或 [[length()]] 问长度，不用再 [[strlen]]
- 内存不够它会自己扩容，你完全不用管

[[std::string c = a + ", " + b + "!"]]

> 提醒：[[size()]] 返回的是一个无符号类型，直接拿去和 int 比较容易出现奇怪的问题。稳妥的写法是 [[(int)c.size()]]。

还有一个隐藏福利：[[std::string]] 管理字符内存的方式就是 RAII，离开作用域自动释放，不用你操心。`,
        code: `#include <iostream>
#include <string>

int main() {
    std::string a = "Hello";
    std::string b = "World";
    std::string c = a + ", " + b + "!";
    std::cout << c << std::endl;
    std::cout << c.size() << std::endl;
    c += "??";
    std::cout << c << std::endl;
    return 0;
}`,
        expect: `Hello, World!
13
Hello, World!??
`
      },
      {
        title: '下标、substr、find',
        body: `[[std::string]] 用起来和数组很像：

- [[s[i] ]]：取第 i 个**字符**，拿到的是 char，不是字符串
- [[s.substr(起点, 长度)]]：切一段出来，返回新的 string，原串一点不动
- [[s.find("xxx")]]：找子串，返回它**第一次出现的下标**

> 坑点：[[find]] 找不到的时候不返回 -1，而是返回 [[std::string::npos]]——一个巨大的无符号数。所以判断"找到没有"要写 [[s.find(x) == std::string::npos]]，别写小于 0，那个条件永远为假。

[[s.substr(2, 3)]] 的意思是：从下标 2 开始，**往后数 3 个**字符，可不是"从 2 到 3"。

如果没有第二个参数，比如 [[s.substr(2)]]，那就是从下标 2 一路取到末尾。`,
        code: `#include <iostream>
#include <string>

int main() {
    std::string s = "abcdefg";
    std::cout << s[0] << s[6] << std::endl;
    std::cout << s.substr(2, 3) << std::endl;
    std::cout << s.find("cd") << std::endl;
    std::cout << (int)s.size() << std::endl;
    return 0;
}`,
        expect: `ag
cde
2
7
`
      },
      {
        title: '比较、修改、拷贝',
        body: `[[std::string]] 之间可以直接用 [[<]] [[>]] [[==]] 比较，比的是**字典序**（一个个字符比 ASCII 码），写起来和比数字一样自然。

- [[a == b]]：内容一样就为真，不用再写 [[strcmp]]
- [[a < b]]：字典序靠前为真
- 想改某个字符，直接 [[a[i] = 'A';]]

注意一个容易搞混的地方：[[std::string c = a;]] 是**真的复制了一份**，改 c 不会影响 a。这和指针赋值完全相反（指针赋值是两个人共享同一份数据）。

想遍历每个字符，用 [[for (int i = 0; i < (int)a.size(); i++)]] 加下标就够了，简单直观。`,
        code: `#include <iostream>
#include <string>

int main() {
    std::string a = "apple";
    std::string b = "banana";
    if (a < b) {
        std::cout << a << " comes first" << std::endl;
    }
    if (a == "apple") {
        std::cout << "same content" << std::endl;
    }
    int count = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        if (a[i] == 'p') {
            count++;
        }
    }
    std::cout << "p count = " << count << std::endl;
    std::string c = a;
    c[0] = 'A';
    std::cout << c << " / " << a << std::endl;
    return 0;
}`,
        expect: `apple comes first
same content
p count = 2
Apple / apple
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <iostream>
#include <string>

int main() {
    std::string s = "hello";
    s += s[1];
    std::cout << s << std::endl;
    std::cout << s.size() << std::endl;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['hello 和 5', 'helloe 和 6', 'helloo 和 6', 'helloe 和 7'],
        answer: 1,
        explain: 's[1] 是字符 e，把 s[1] 追加到末尾之后得到 helloe，长度从 5 变成 6。[[+=]] 既可以接字符串，也可以接单个字符。'
      },
      {
        type: 'choice',
        question: '[[s.find("xyz")]] 在 s 里找不到 xyz 的时候会返回什么？',
        options: ['0', 'NULL', '-1（也就是 std::string::npos）', '抛出一个异常'],
        answer: 2,
        explain: 'find 找不到时返回 [[std::string::npos]]，它实际上是个极大的无符号数。所以判断要用 [[== std::string::npos]]，别写小于 0，否则永远不成立。'
      },
      {
        type: 'choice',
        question: '[[s.substr(2, 3)]] 取的是哪一段？',
        options: [
          '从下标 2 开始的 3 个字符',
          '从下标 3 开始的 2 个字符',
          '下标 2 到下标 3 之间的字符（一共 1 个）',
          '把下标 2 和下标 3 的字符各删掉一个'
        ],
        answer: 0,
        explain: 'substr 的两个参数是"起点下标"和"长度"。所以是从下标 2 开始往后数 3 个字符。第二个参数省略的话，就一路取到末尾。'
      }
    ]
  },
  {
    id: 'cpp-stl-2',
    chapter: 'cpp-stl',
    title: 'std::vector 与范围 for',
    icon: '📚',
    xp: 25,
    pages: [
      {
        title: 'vector：会自己扩容的数组',
        body: `[[std::vector]] 可以说是 C++ 里最重要的容器：**一个能自动扩容的数组**。你用 int 数组会遇到的"长度不够怎么办"，它全替你解决了。

常用操作就这几个：

- [[v.push_back(x)]]：在尾巴上追加一个元素
- [[v.size()]]：现在有几个元素
- [[v[i] ]]：像数组一样取，**不检查越界**
- [[v.at(i)]]：同样取元素，但**越界会报错**，调试时更安全
- [[v.pop_back()]]：删掉最后一个
- [[v.clear()]]：清空

> 重点理解：[[size()]] 是"现在有几个元素"，不是"容量"。容量不够时 vector 会偷偷申请一块更大的内存、把老数据搬过去——所以一旦发生扩容，之前保存的指针和迭代器就全部失效了。`,
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    v.push_back(10);
    v.push_back(20);
    v.push_back(30);
    std::cout << "size = " << v.size() << std::endl;
    std::cout << "v[0] = " << v[0] << std::endl;
    std::cout << "at(1) = " << v.at(1) << std::endl;
    v.pop_back();
    std::cout << "after pop size = " << v.size() << std::endl;
    v.clear();
    std::cout << "after clear size = " << v.size() << std::endl;
    return 0;
}`,
        expect: `size = 3
v[0] = 10
at(1) = 20
after pop size = 2
after clear size = 0
`
      },
      {
        title: '范围 for 和 auto：遍历的最短写法',
        body: `以前遍历数组得写一串 [[for (int i = 0; i < n; i++)]]，C++11 给了个更爽的写法：

[[for (int x : v) { }]]

读作"对 v 里的每一个元素，把它取出来叫 x"。不用关心下标，也不用担心越界。

[[auto]] 则让编译器自己推断类型：

[[for (auto x : v) { }]]

[[auto]] 不是"没有类型"，而是"你帮我写，我不想抄"——它在编译期就定死了，没有任何运行开销。

> 老 C 程序员的忠告：[[auto]] 虽好，别到处用。类型一眼看不出来的时候，老老实实写清楚，反而更利于读代码。

初始化列表也很香，一行就能造出带数据的 vector：

[[std::vector<int> v = {3, 1, 4, 1, 5};]]`,
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {3, 1, 4, 1, 5};
    int sum = 0;
    for (auto x : v) {
        sum += x;
    }
    std::cout << "sum = " << sum << std::endl;
    std::cout << "size = " << v.size() << std::endl;
    return 0;
}`,
        expect: `sum = 14
size = 5
`
      },
      {
        title: '引用与范围 for：改了才算数',
        body: `这是实战里超高频的一个坑：

[[for (int x : v) { x = x * 2; }]]

上面这段**什么都改不了**！因为 [[x]] 是每个元素的一份**拷贝**，你改的是拷贝，原数组纹丝不动。

想真改，必须用**引用**：

[[for (int& x : v) { x = x * 2; }]]

[[int& x]] 的意思是"x 不是新变量，它就是数组里那个元素本人的另一个名字"。改 x 就是改原元素。

- 只想读：写 [[for (int x : v)]]，或者 [[for (const int& x : v)]]，后者省掉拷贝
- 想修改：必须写 [[for (int& x : v)]]

> 函数参数是同一个道理：[[void f(std::vector<int>& v)]] 才能修改外面的 vector；不加那个 [[&]]，传进去的是整个 vector 的拷贝，又慢又改不动。`,
        code: `#include <iostream>
#include <vector>

void doubleAll(std::vector<int>& v) {
    for (int& x : v) {
        x = x * 2;
    }
}

int main() {
    std::vector<int> v = {1, 2, 3};
    doubleAll(v);
    for (int i = 0; i < (int)v.size(); i++) {
        if (i > 0) {
            std::cout << " ";
        }
        std::cout << v[i];
    }
    std::cout << std::endl;
    return 0;
}`,
        expect: `2 4 6
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3, 4};
    v.push_back(v[0] + v[3]);
    int s = 0;
    for (int x : v) {
        s += x;
    }
    std::cout << v.size() << " " << s << std::endl;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['5 15', '4 10', '5 10', '5 14'],
        answer: 0,
        explain: 'v[0] + v[3] 是 1 + 4 = 5，push_back 之后 vector 变成 1、2、3、4、5，元素个数是 5，总和是 15。'
      },
      {
        type: 'predict',
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3};
    for (int x : v) {
        x = x + 100;
    }
    std::cout << v[0] << std::endl;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['101', '1', '100', '编译错误'],
        answer: 1,
        explain: '范围 for 里写 [[for (int x : v)]]，x 是元素的**拷贝**，改 x 完全不影响 vector。想改必须写 [[for (int& x : v)]]。'
      },
      {
        type: 'choice',
        question: '[[v.at(10)]] 越界的时候，和 [[v[10] ]] 比起来区别在哪？',
        options: [
          '没区别，两者都是未定义行为',
          '方括号会检查越界，at 不会',
          'at 会做范围检查并把问题报出来，方括号直接往下读',
          'at 只能读不能写'
        ],
        answer: 2,
        explain: '方括号越界是未定义行为，可能读到垃圾、可能崩溃，也可能看起来"没事"。而 [[v.at(10)]] 一定会检查下标，越界就明确报错。写业务代码时优先用 [[at]]，性能敏感的循环里再用方括号。'
      }
    ]
  },
  {
    id: 'cpp-stl-3',
    chapter: 'cpp-stl',
    title: 'sort、迭代器与 pair',
    icon: '🧰',
    xp: 30,
    pages: [
      {
        title: 'std::sort：一行搞定排序',
        body: `自己写冒泡排序是每个初学者的必修课，但真实项目里没人这么干。C++ 标准库直接把排序给你了：

[[std::sort(v.begin(), v.end());]]

就这一行，默认从小到大。它内部用的是好几种排序算法拼起来的混合策略，比你手写的冒泡快好几个量级。

- [[v.begin()]] 指向第一个元素
- [[v.end()]] 指向**最后一个元素的后面**（注意不是最后一个元素）

> 坑点：[[v.end()]] 是"末尾的下一个位置"，它是个合法的边界，但**不能解引用**，写 [[*v.end()]] 就是未定义行为。所有标准库的区间都是"左闭右开"：包含 begin，不包含 end。

想从大到小排，需要传给 sort 一个比较规则，那属于进阶内容，先把默认升序用熟。`,
        code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> v = {5, 2, 9, 1, 7};
    std::sort(v.begin(), v.end());
    for (int i = 0; i < (int)v.size(); i++) {
        if (i > 0) {
            std::cout << " ";
        }
        std::cout << v[i];
    }
    std::cout << std::endl;
    return 0;
}`,
        expect: `1 2 5 7 9
`
      },
      {
        title: '迭代器：指针的亲戚',
        body: `[[begin()]] 和 [[end()]] 返回的东西叫**迭代器**，你可以先把它当成"指向元素的指针"：

- [[*it]] 取出它指向的元素
- [[it++]] 走到下一个
- [[it + 2]] 直接往前跳两个（vector 的迭代器支持这种随机跳跃）

[[std::vector<int>::iterator it = v.begin();]]

> 那为什么不干脆用下标？因为迭代器是**所有容器通用的语言**。今天你用 vector，明天换成别的容器，[[*it]]、[[it++]] 这套写法基本不变；而下标只有随机访问容器才有。

范围 for 其实就是迭代器写法的语法糖：[[for (int x : v)]] 背后就是拿着 [[begin()]] 一路走到 [[end()]]。`,
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30, 40};
    std::vector<int>::iterator it = v.begin();
    std::cout << *it << std::endl;
    it++;
    std::cout << *it << std::endl;
    it = it + 2;
    std::cout << *it << std::endl;
    std::cout << (it == v.end() - 1) << std::endl;
    return 0;
}`,
        expect: `10
20
40
1
`
      },
      {
        title: 'pair：把两个值绑在一起',
        body: `有时候你需要一次返回两个值，或者把"键"和"值"绑在一起。[[std::pair]] 就是干这个的：

[[std::pair<int, int> p(3, 5);]]

两个成员分别叫 [[first]] 和 [[second]]，公开访问，没有 private 那一套：

- [[p.first]]：第一个值
- [[p.second]]：第二个值

[[std::pair]] 经常和 vector 一起用，比如声明一个 [[std::vector<std::pair<int, int> > v;]]，就能装一堆坐标或者映射关系。注意两个右尖括号之间留个空格，老编译器会把它误认成右移运算符。

> 小知识：pair 比较大小时先比 first，first 相同再比 second。所以把一堆 pair 丢进 [[std::sort]]，会自动按 first 排好序。`,
        code: `#include <iostream>
#include <utility>

int main() {
    std::pair<int, int> p1;
    p1.first = 3;
    p1.second = 5;
    std::cout << p1.first << " " << p1.second << std::endl;

    std::pair<int, int> p2(7, 9);
    std::cout << p2.first + p2.second << std::endl;
    return 0;
}`,
        expect: `3 5
16
`
      },
      {
        title: '把 C 风格数组改写成 vector',
        body: `最后来个实战对比，同一个需求两种写法。

**C 风格**：长度写死、自己数数、自己防越界

[[int raw[6] = {40, 10, 30, 20, 60, 50};]]

**vector 风格**：长度跟着数据走、想加就加、排序一行搞定

[[std::vector<int> v = {40, 10, 30, 20, 60, 50};]]

如果手上已经有一个 C 数组，想转成 vector，两种办法：

1. 循环 [[push_back]] 塞进去，最直观，任何情况都能用
2. 用迭代器范围构造：[[std::vector<int> v(raw, raw + 6);]]，把首尾地址当范围传进去

> 好消息：到处都用 vector 之后，你会发现自己写的 for 循环少了一半，越界 bug 也少了一大半。`,
        code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int raw[6] = {40, 10, 30, 20, 60, 50};
    std::vector<int> v;
    for (int i = 0; i < 6; i++) {
        v.push_back(raw[i]);
    }
    std::sort(v.begin(), v.end());
    std::cout << "size = " << v.size() << std::endl;
    std::cout << "min = " << v[0] << std::endl;
    std::cout << "max = " << v[5] << std::endl;
    return 0;
}`,
        expect: `size = 6
min = 10
max = 60
`
      }
    ],
    challenges: [
      {
        type: 'predict',
        code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> v = {4, 2, 8, 6};
    std::sort(v.begin(), v.end());
    std::cout << v[0] << " " << v[3] << std::endl;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['2 8', '4 6', '8 2', '2 6'],
        answer: 0,
        explain: 'sort 默认升序，排完是 2、4、6、8。v[0] 是最小值 2，v[3] 是最大值 8。'
      },
      {
        type: 'predict',
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {5, 6, 7, 8};
    std::vector<int>::iterator it = v.begin();
    it = it + 2;
    std::cout << *it << std::endl;
    it--;
    std::cout << *it << std::endl;
    return 0;
}`,
        question: '这段代码输出什么？',
        options: ['5 6', '5 7', '7 8', '7 6'],
        answer: 3,
        explain: 'begin() 指向 5，加 2 之后指向 7，所以先打印 7；it-- 退回一格指向 6，打印 6。'
      },
      {
        type: 'choice',
        question: '[[std::pair<int, int> p(3, 9);]] 之后，想取出 9 应该写？',
        options: ['p.first', 'p.second', 'p[1]', 'p->second'],
        answer: 1,
        explain: 'pair 的两个成员叫 [[first]] 和 [[second]]。构造时第一个参数给 first、第二个给 second，所以 9 在 [[p.second]] 里。pair 不支持下标，它也不是指针，所以另外两个选项都不对。'
      }
    ]
  }
];
