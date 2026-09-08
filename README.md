# SUAT 课程表

按周浏览每日课程的单页应用：导入教务系统导出的 `.ics` 课表（或 JSON），在浏览器里查看、编辑并导出为日历文件。
课程数据只保存在浏览器 `localStorage`，不上传任何服务器。

推荐搭配[对应油猴脚本](https://greasyfork.org/zh-CN/scripts/569025-%E6%B7%B1%E5%9C%B3%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%E6%95%99%E5%8A%A1%E7%B3%BB%E7%BB%9F-%E8%AF%BE%E8%A1%A8%E5%AF%BC%E5%87%BAics)使用（源码见仓库根目录 `suat-course-table-ics.user.js`）。
项目源码：<https://github.com/ChickenPige0n/CourseList>

## 快速开始

```bash
bun install      # 安装依赖（也可用 npm install）
bun run dev      # 本地开发（Vite，默认 http://localhost:5173）
bun run build    # 类型检查 + 生产构建，产物在 dist/
bun run preview  # 预览构建产物
```

其他脚本（bun / npm 通用）：

| 命令 | 作用 |
| --- | --- |
| `type-check` | `vue-tsc --noEmit` 全量类型检查 |
| `test` | Vitest 运行全部单元 / 组件测试 |
| `test:watch` | 监听模式 |
| `lint` | ESLint（flat config，含 Vue 与 TypeScript 规则） |

## 功能

- **周视图**：顶部按周浏览，`上一周 / 下一周`、点击日期唤起系统日期选择器、`今天` 回到当日。
- **课程列表**：带时间轴的无卡片列表，展示时间、课程名、教师、地点；当天课程会标注「进行中 / 即将开始 / 已结束」。
- **周条**：每个日期下方的小圆点表示当天课程数量，当天有朱砂色标记。
- **课程详情**：点击课程标题查看详情，可单独导出该课程为 ICS。
- **导入导出**：选择文件 / 粘贴文本导入 JSON 或 ICS；导出全部课程为 `.ics`，或导出 JSON 备份。
- **主题**：跟随系统，也可手动切换并记住选择（首屏前由内联脚本确定主题，避免深色模式闪白）。
- **无障碍与交互**：地标语义 + `h1–h3` 层级、原生 `<dialog>` 焦点管理、Toast 状态播报、`prefers-reduced-motion`、触摸滑动切换周 / 切换日期。
- **快捷键**：`T` 回到今天，`Ctrl/⌘ + ←/→` 切换周，`Esc` 关闭弹窗。

## 导入数据格式

课程数组可以放在以下任意结构中，导入时自动识别：

- `[ … ]`
- `{ "data": [ … ] }`
- `{ "data": { "list": [ … ] } }`
- `{ "list": [ … ] }`

单条课程字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `lessonName` | string | ✅ | 课程名称 |
| `teacherName` | string | | 授课教师，缺省「未知教师」 |
| `classRoomName` | string | | 上课地点，缺省「未知地点」 |
| `startTime` | number | ✅ | 开始时刻，epoch 毫秒（也接受 ISO 字符串 / 秒级时间戳） |
| `endTime` | number | ✅ | 结束时刻，epoch 毫秒 |
| `description` | string | | 课程描述，显示在详情面板 |
| `tagcolour` | string | | 课程色，作为时间轴节点颜色 |

**ICS 导入**（推荐）：

- 设置面板 → 导入与导出 → **选择文件** 选 `.ics`，或 **粘贴文本** 后点「验证格式」/「保存并应用」；
- 自动转换为本页 JSON 后即可编辑、保存、导出；
- 字段映射：`SUMMARY` → 课程名，`LOCATION` → 教室（自动去掉 `[校区]` 前缀），`DESCRIPTION` 中的「教师」→ 授课教师；
- 兼容教务脚本导出的 UTC(`Z`) 时间、本应用导出的浮动时间、`TZID=Asia/Shanghai`、带偏移的时间，以及 `FREQ=WEEKLY` 重复日程（`INTERVAL` / `BYDAY` / `COUNT` / `UNTIL` / `WKST`）与 `EXDATE` 例外。

## 架构

技术选型：**Vue 3 + TypeScript + Vite**，状态用 **Pinia**，测试用 **Vitest**。
这个应用是「纯前端 + 本地存储 + 大量派生视图」的形态：Vue 的响应式与单文件组件能以最小样板表达组件级关注点，TypeScript 让领域模型与导入校验的边界可被编译器守住，Vite 提供零配置的静态构建。

```
src/
├── domain/            纯领域层：不依赖 Vue / DOM，可直接单元测试
│   ├── course.ts         Course 实体、规范化、校验、JSON 序列化
│   ├── calendar.ts       日期与周视图纯函数（不读系统时钟，由调用方注入）
│   ├── importer.ts       JSON / ICS 自动识别入口
│   └── ics/
│       ├── parser.ts     RFC 5545 解析 + 重复日程展开
│       └── serializer.ts RFC 5545 生成（转义、75 八位组折行、UID）
├── infrastructure/    与浏览器交互的薄封装
│   ├── storage.ts        localStorage 安全读写（隐私模式不抛异常）
│   └── download.ts       文件下载 / 读取
├── stores/            Pinia：应用状态
│   ├── courses.ts        课程数据 + 持久化（唯一数据源）
│   ├── schedule.ts       选中日期与派生出的周 / 日视图数据
│   └── preferences.ts    主题偏好
├── composables/       可复用的有状态逻辑
│   ├── useTheme.ts       主题偏好 → <html data-theme> 同步
│   ├── useCourseTransfer.ts  导入 / 导出用例（含提示文案）
│   ├── useToast.ts       提示队列（模块级，任意组件可调用）
│   ├── useBusy.ts        全局忙碌遮罩
│   ├── useKeyboardShortcuts.ts
│   ├── useSwipe.ts       触摸滑动
│   ├── useNow.ts         共享「当前时间」信号（课程状态自动刷新）
│   └── useWindowScrolled.ts
├── ui/               通用展示组件（无业务知识）
│   ├── AppIcon.vue       内联 SVG 图标（icons.ts 为图标表）
│   ├── BaseButton.vue / IconButton.vue
│   ├── BaseDialog.vue    原生 <dialog> 封装（焦点陷阱 + 过渡动画）
│   └── EmptyState.vue / ToastHost.vue / LoadingOverlay.vue
├── components/       业务组件
│   ├── layout/           AppHeader / AppFooter
│   ├── schedule/         WeekStrip / DaySchedule / CourseCard / CourseDetailDialog
│   └── data/             DataDialog / DataFormatHelp
├── styles/           设计令牌与基础样式（组件样式写在各自 SFC 内）
└── App.vue, main.ts
```

分层规则：

1. **domain 不依赖任何框架**：解析、校验、格式化都是纯函数，测试不需要挂载组件。
2. **数据只能经 `normalizeCourses()` 进入应用**：无论来自 localStorage、JSON 还是 ICS，上层拿到的永远是结构合法、按时间排序的 `Course[]`。
3. **store 只管状态与持久化**，提示文案与文件下载属于 `composables`，组件只负责渲染与事件转发。
4. **`ui/` 组件不认识课程**，业务组件不认识 RFC 5545。

## 测试

```bash
bun run test
```

覆盖：

- `tests/domain/` — 日期计算、课程规范化与容错、ICS 解析（UTC / TZID / 浮动时间 / 全天 / 重复日程 / EXDATE / 折行）、ICS 生成（转义、折行、UID、往返一致）、导入识别；
- `tests/stores/` — 持久化、损坏数据降级、按日索引；
- `tests/components/` — 周条与日视图渲染、空状态、事件派发。

## 部署

`vite.config.ts` 中 `base: './'`，构建产物使用相对路径，可直接放到任意静态托管（含子目录、GitHub Pages）。
页面本身不需要服务端；字体走 Google Fonts，网络不可用时自动回退到系统字体。

## 设计系统

排版、间距、动效都以 CSS 变量集中在 `src/styles/tokens.css`，组件只引用令牌，不写魔法数字。

- **字号阶梯**：11 / 12 / 13 / 14 / 15 / 17 / 20 / 24 / 28 px（`--text-2xs` → `--text-3xl`）。层级为：日标题（28px）> 课程标题（17px）> 正文（14–15px）> 标签（12–13px）> 微标签（11px）。
- **行高与字距**：`--leading-tight/snug/normal/relaxed` 与 `--tracking-tight/snug/normal/wide/wider`；中文正文用 `1.6`，小号标签用大字距。
- **间距节奏**：`--space-1`（4px）到 `--space-16`（64px），8px 基准。
- **颜色**：三级墨色（`--ink` / `--ink-2` / `--ink-3`）配单一朱砂强调色；语义状态色只用于「进行中 / 即将开始 / 已结束」，正文对比度均 ≥ 4.5:1。
- **动效**：`--dur-fast`（140ms）/ `--dur`（220ms）/ `--dur-slow`（360ms），配 `--ease`（out-expo）/ `--ease-in-out` / `--ease-spring`。列表 30–36ms 错峰入场，弹窗用 spring 缓动，切换日期时列表交叉淡入；`prefers-reduced-motion` 下全部降为 0.01ms。
- **交互反馈**：按钮按下 `scale(0.975)`、图标按钮 `scale(0.94)`、卡片 hover 时时间轴节点放大、周条选中为墨色实块。
- **无障碍**：地标 + `h1–h3` 层级、跳转链接、`:focus-visible` 描边、原生 `<dialog>` 焦点陷阱、`aria-live` 提示、方向键在周条内移动选中日期、触摸目标 ≥ 44px。

## 设计说明

设计取向为「精炼编辑风」：暖白纸感画布、墨色排版、单一朱砂强调色、发丝线分隔、大留白。
课程列表是带时间轴的无卡片列表，课程 / 状态颜色只作为语义标记。所有正文文字对比度均达到 WCAG AA（浅色与深色主题皆然）。
