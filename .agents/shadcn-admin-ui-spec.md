# Shadcn Admin UI 与交互规则沉淀

> 来源：`https://shadcn-nextjs-admincn-full-navbar-layout-admin-template.vercel.app`
> 源码仓库：`https://github.com/satnaing/shadcn-admin` (Vite + React 19 + Tailwind v4 + shadcn/ui new-york)
> 沉淀范围：字体 / 间距 / 颜色 / 圆角 / 阴影 / 组件规格 / 布局系统 / 页面范式 / 交互模式

---

## 0. 设计哲学（先理解后落地）

| 维度 | 取舍 | 说明 |
| --- | --- | --- |
| 视觉密度 | 中高 | 信息密集但不压迫，靠 1px 边框 + 极轻阴影分层，而非粗框线 |
| 色彩 | 中性 slate 为底，主色"近黑" | primary 不是品牌色而是 `oklch(0.208 0.042 265.755)` 近黑色；用 chart-1..5 表达数据色 |
| 圆角 | 全局 10px (0.625rem) | 偏现代柔和，组件级再细分为 sm/md/lg/xl |
| 阴影 | 极克制 | 默认 `shadow-xs` / `shadow-sm`；强调靠边框 + 背景对比，而非厚阴影 |
| 主题 | 浅色 / 深色 双轨 | 通过 `.dark` 类切换；所有颜色用 CSS 变量驱动 |
| 响应式 | 移动优先 + 容器查询 | 用 `@container/content` 让内容区自适应，而非只依赖视口断点 |
| 可访问性 | WAI-ARIA + 键盘可达 | 所有交互组件基于 Radix UI，自带 focus-ring / aria-* / SkipLink |
| 国际化 | 默认 LTR + 完整 RTL | 使用逻辑属性 `ps-/pe-/ms-/me-/inset-s-/inset-e-` 而非 left/right |

---

## 1. 技术栈与依赖约束

### 1.1 核心依赖（来自 `package.json`）

```
react                ^19.2.5
tailwindcss          ^4.2.2     # Tailwind v4，CSS-first 配置
@tailwindcss/vite    ^4.2.2
tw-animate-css       ^1.4.0     # 替代 tailwindcss-animate
class-variance-authority ^0.7.1 # 组件变体
tailwind-merge       ^3.5.0     # 类名合并
clsx                 ^2.1.1
@radix-ui/react-*              # 所有交互原语
lucide-react         ^1.8.0     # 主图标库
@tanstack/react-router ^1.168   # 路由
@tanstack/react-table ^8.21     # 表格
@tanstack/react-query ^5.99
recharts             ^3.8.1     # 图表
react-hook-form      ^7.72
@hookform/resolvers  ^5.2
zod                  ^4.3       # 表单与搜索参数校验
zustand              ^5.0       # 状态
cmdk                 1.1.1      # 命令面板
sonner               ^2.0.7     # Toast
react-day-picker     9.14
input-otp            ^1.4
date-fns             ^4.1
@clerk/react         ^6.4       # 鉴权（可选）
```

### 1.2 shadcn/ui 配置（`components.json`）

```json
{
  "style": "new-york",          // 用 new-york 风格（线条更利落）
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/styles/index.css",
    "baseColor": "slate",       // 基础中性色为 slate
    "cssVariables": true,       // 必须开启 CSS 变量
    "prefix": ""
  },
  "iconLibrary": "lucide"
}
```

### 1.3 落地约束

- 必须使用 **Tailwind v4** 的 `@import 'tailwindcss'` 与 `@theme inline`，不再用 `tailwind.config.ts`
- 颜色一律走 CSS 变量（`var(--primary)` 等），**不允许硬编码十六进制**
- 类名合并统一用 `cn()` 工具（`clsx` + `tailwind-merge`）
- 组件用 `data-slot` 标识语义槽位，便于样式覆盖与测试

---

## 2. 设计 Token

### 2.1 圆角（`--radius`）

```css
:root { --radius: 0.625rem; }  /* 10px 全局基准 */

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);  /* 6px  - 小输入框、Badge */
  --radius-md: calc(var(--radius) - 2px);  /* 8px  - Button、Input、Tabs */
  --radius-lg: var(--radius);              /* 10px - Card、Dialog */
  --radius-xl: calc(var(--radius) + 4px);  /* 14px - 大容器 */
}
```

### 2.2 颜色（oklch，浅色 / 深色双轨）

```css
:root {
  /* 基础文本与背景 */
  --background:          oklch(1 0 0);                    /* #fff */
  --foreground:          oklch(0.129 0.042 264.695);       /* 近黑 */
  --card:                oklch(1 0 0);                    /* 卡片 = 背景 */
  --card-foreground:     oklch(0.129 0.042 264.695);
  --popover:             oklch(1 0 0);
  --popover-foreground:  oklch(0.129 0.042 264.695);

  /* 主色：近黑（非品牌色），用品牌色请覆盖 --primary */
  --primary:             oklch(0.208 0.042 265.755);
  --primary-foreground:  oklch(0.984 0.003 247.858);

  /* 次级 / 静默 / 强调（统一为浅灰） */
  --secondary:           oklch(0.968 0.007 247.896);
  --secondary-foreground: oklch(0.208 0.042 265.755);
  --muted:               oklch(0.968 0.007 247.896);
  --muted-foreground:    oklch(0.554 0.046 257.417);      /* 辅助文字 */
  --accent:              oklch(0.968 0.007 247.896);
  --accent-foreground:   oklch(0.208 0.042 265.755);

  /* 危险 */
  --destructive:         oklch(0.577 0.245 27.325);

  /* 边框 / 输入框 / 焦点环 */
  --border:              oklch(0.929 0.013 255.508);
  --input:               oklch(0.929 0.013 255.508);
  --ring:                oklch(0.704 0.04 256.788);

  /* 图表色板（5 色，暖+冷+紫） */
  --chart-1: oklch(0.646 0.222 41.116);   /* 橙 */
  --chart-2: oklch(0.6 0.118 184.704);    /* 青 */
  --chart-3: oklch(0.398 0.07 227.392);   /* 深蓝 */
  --chart-4: oklch(0.828 0.189 84.429);   /* 金 */
  --chart-5: oklch(0.769 0.188 70.08);    /* 暖橙 */

  /* 侧边栏：默认与背景同色 */
  --sidebar:               var(--background);
  --sidebar-foreground:    var(--foreground);
  --sidebar-primary:       var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent:        var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border:        var(--border);
  --sidebar-ring:          var(--ring);
}

.dark {
  --background:          oklch(0.129 0.042 264.695);
  --foreground:          oklch(0.984 0.003 247.858);
  --card:                oklch(0.14 0.04 259.21);          /* 卡片比背景略亮 */
  --card-foreground:     oklch(0.984 0.003 247.858);
  --popover:             oklch(0.208 0.042 265.755);
  --popover-foreground:  oklch(0.984 0.003 247.858);
  --primary:             oklch(0.929 0.013 255.508);      /* 深色模式主色反白 */
  --primary-foreground:  oklch(0.208 0.042 265.755);
  --secondary:           oklch(0.279 0.041 260.031);
  --secondary-foreground: oklch(0.984 0.003 247.858);
  --muted:               oklch(0.279 0.041 260.031);
  --muted-foreground:    oklch(0.704 0.04 256.788);
  --accent:              oklch(0.279 0.041 260.031);
  --accent-foreground:   oklch(0.984 0.003 247.858);
  --destructive:         oklch(0.704 0.191 22.216);
  --border:              oklch(1 0 0 / 10%);               /* 白 10% 透明 */
  --input:               oklch(1 0 0 / 15%);               /* 白 15% 透明 */
  --ring:                oklch(0.551 0.027 264.364);

  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}
```

### 2.3 字体

```css
@theme inline {
  --font-inter:   'Inter', 'sans-serif';
  --font-manrope: 'Manrope', 'sans-serif';
}
```

- 可选字体列表：`['inter', 'manrope', 'system']`（在 `/settings/appearance` 切换）
- 默认 `font-sans` = `Inter`；标题 / 品牌可换 `Manrope`
- **移动端强制 16px** 防止 iOS 聚焦缩放：

```css
@media screen and (max-width: 767px) {
  input, select, textarea { font-size: 16px !important; }
}
```

### 2.4 字号 / 字重约定（Tailwind class）

| 用途 | class | 实际值 |
| --- | --- | --- |
| 页面主标题 H1 | `text-2xl font-bold tracking-tight md:text-3xl` | 24/30px |
| 区块标题 H2 | `text-2xl font-bold tracking-tight` | 24px |
| 卡片标题 | `font-semibold leading-none` | 16px |
| 卡片描述 | `text-sm text-muted-foreground` | 14px |
| KPI 数值 | `text-2xl font-bold` | 24px |
| KPI 标签 | `text-sm font-medium` | 14px |
| KPI 趋势 | `text-xs text-muted-foreground` | 12px |
| 表头 | `text-sm font-medium whitespace-nowrap` | 14px |
| 表格内容 | `text-sm` (table 默认) | 14px |
| Badge | `text-xs font-medium` | 12px |
| Sidebar 子项 sm | `text-xs` | 12px |
| Body 默认 | `text-sm` (page default) | 14px |

### 2.5 间距与容器

- **容器** `@utility container`：`margin-inline: auto; padding-inline: 2rem;`
- **主内容区** `Main`：`px-4 py-6`；非 fluid 时 `@7xl/content:max-w-7xl` 居中
- **卡片内边距** `Card`：纵向 `py-6`，header / content / footer 横向 `px-6`
- **卡片子项间距** `gap-6`（Card 用 flex flex-col）
- **Header** 内部：`p-4` + `gap-3 sm:gap-4`
- **页面级垂直 rhythm**：`space-y-4`（小） / `space-y-8`（表单字段）

### 2.6 阴影

| 用途 | class |
| --- | --- |
| Button / Input 默认 | `shadow-xs` |
| Card / Dialog / TabsTrigger 选中 | `shadow-sm` |
| Header 滚动后浮起 | `shadow`（offset > 10 时） |
| 选中行 / hover | 无阴影，仅背景变化 |

### 2.7 焦点环（统一约定）

```css
focus-visible:border-ring
focus-visible:ring-ring/50
focus-visible:ring-[3px]
aria-invalid:border-destructive
aria-invalid:ring-destructive/20      /* light */
dark:aria-invalid:ring-destructive/40  /* dark */
```

### 2.8 滚动条

```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
```

隐藏滚动条工具：`@utility no-scrollbar`

---

## 3. 布局系统

### 3.1 整体结构

```
SidebarProvider                       ← 提供侧栏上下文 + CSS 变量
├── SkipToMain                       ← 无障碍跳转链接
├── AppSidebar                       ← 左侧栏
│   ├── SidebarHeader  (p-2 gap-2)   ← TeamSwitcher
│   ├── SidebarContent (flex-1 overflow-auto)
│   │   └── SidebarGroup (p-2)       ← NavGroup，可折叠
│   ├── SidebarFooter  (p-2 gap-2)   ← NavUser
│   └── SidebarRail                   ← 拖拽条
└── SidebarInset                     ← 右侧主区
    └── Header (h-16) + Main
```

### 3.2 侧栏尺寸常量

```ts
const SIDEBAR_WIDTH        = '16rem';  // 256px 桌面展开
const SIDEBAR_WIDTH_MOBILE = '18rem';  // 288px 移动端 Sheet
const SIDEBAR_WIDTH_ICON   = '3rem';   // 48px  折叠成图标
const SIDEBAR_COOKIE_NAME  = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;  // 7 天
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';            // Cmd/Ctrl+B 切换
```

### 3.3 侧栏变体（collapsible + variant 二维）

| 维度 | 取值 | 行为 |
| --- | --- | --- |
| `collapsible` | `offcanvas` | 折叠时整条侧栏滑出（默认） |
| `collapsible` | `icon` | 折叠成 48px 图标条，子菜单变 Dropdown |
| `collapsible` | `none` | 不可折叠 |
| `variant` | `sidebar` | 侧栏贴边占位（默认） |
| `variant` | `floating` | 侧栏浮起，外缘 padding + 圆角 + 阴影 |
| `variant` | `inset` | 主区有 margin，与 floating 类似但主区有背景 |

### 3.4 Header

- 高度固定 `h-16`（64px）
- `sticky top-0 z-50 w-[inherit]`，滚动 `offset > 10` 后加 `shadow` + `backdrop-blur-lg`
- 内容布局：`flex items-center gap-3 p-4 sm:gap-4`
- 默认元素顺序：`SidebarTrigger(outline, max-md:scale-125)` + `Separator(h-6 vertical)` + `TopNav(me-auto)` + `Search` + `ThemeSwitch` + `ConfigDrawer` + `ProfileDropdown`
- 移动端 `TopNav` 折叠为 `DropdownMenu`（trigger 是 icon button）

### 3.5 Main

```tsx
<main
  data-layout={fixed ? 'fixed' : 'auto'}
  className={cn(
    'px-4 py-6',
    fixed && 'flex grow flex-col overflow-hidden',
    !fluid && '@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl',
  )}
/>
```

- `fixed`：用于设置页等需要内部滚动的内容（高度撑满 `100svh`）
- `fluid`：false 时内容最大宽度 `80rem`（max-w-7xl）并居中

### 3.6 断点（Tailwind v4 默认 + 容器查询）

| 断点 | 宽度 | 用途 |
| --- | --- | --- |
| `sm` | 640px | 手机 → 平板；KPI 卡 1→2 列 |
| `md` | 768px | 侧栏图标模式；TopNav 显隐切换 |
| `lg` | 1024px | KPI 4 列；表格子项 sticky |
| `xl` | 1280px | TopNav 间距 `xl:space-x-6` |
| `2xl` | 1536px | — |
| `@7xl/content` | 容器 1280px | 内容居中 |
| `@4xl/content` | 容器 1024px | 表格首列切换 sticky |
| `@container/content` | 任意 | SidebarInset 整体作为容器查询根 |

### 3.7 设置页两栏布局范式

```tsx
<Main fixed>
  <div className='space-y-0.5'>
    <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>Settings</h1>
    <p className='text-muted-foreground'>...</p>
  </div>
  <Separator className='my-4 lg:my-6' />
  <div className='flex flex-1 flex-col space-y-2 overflow-hidden lg:flex-row lg:space-x-12'>
    <aside className='top-0 lg:sticky lg:w-1/5'> <SidebarNav /> </aside>
    <div className='flex w-full overflow-y-hidden p-1'> <Outlet /> </div>
  </div>
</Main>
```

---

## 4. 组件规格（精确像素值）

### 4.1 Button

```ts
buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all',
  'disabled:pointer-events-none disabled:opacity-50',
  '[&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4 shrink-0 [&_svg]:shrink-0',
  'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90 dark:bg-destructive/60',
        outline:     'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:   'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:       'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link:        'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm:      'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg:      'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon:    'size-9',
      },
    },
  }
)
```

| 尺寸 | 高度 | 横向 padding | 圆角 |
| --- | --- | --- | --- |
| default | 36px | 16px | 8px |
| sm | 32px | 12px | 8px |
| lg | 40px | 24px | 8px |
| icon | 36×36 | — | 8px |

### 4.2 Card

```tsx
Card        → 'flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm'
CardHeader  → 'grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6'
CardTitle   → 'leading-none font-semibold'
CardDescription → 'text-sm text-muted-foreground'
CardAction  → 'col-start-2 row-span-2 row-start-1 self-start justify-self-end'
CardContent → 'px-6'
CardFooter  → 'flex items-center px-6 [.border-t]:pt-6'
```

- 卡片左右 padding 始终 `px-6` (24px)，纵向 `py-6`
- Header 与 Content 之间靠 Card 自身的 `gap-6` 分隔
- KPI 卡特殊用法：`CardHeader` 加 `flex flex-row items-center justify-between space-y-0 pb-2`，`CardTitle` 用 `text-sm font-medium`

### 4.3 Input

```tsx
'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs',
'transition-[color,box-shadow] outline-none',
'selection:bg-primary selection:text-primary-foreground',
'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
'placeholder:text-muted-foreground',
'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
'md:text-sm dark:bg-input/30',
'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
```

- 默认高度 `h-9`（36px），与 Button default 对齐
- 移动端 `text-base` (16px) 防缩放，桌面 `md:text-sm` (14px)
- 文件输入用 `file:` 前缀独立样式

### 4.4 Badge

```ts
'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit',
'whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none',
'transition-[color,box-shadow] overflow-hidden'
```

| variant | 样式 |
| --- | --- |
| default | `border-transparent bg-primary text-primary-foreground` |
| secondary | `border-transparent bg-secondary text-secondary-foreground` |
| destructive | `border-transparent bg-destructive text-white dark:bg-destructive/60` |
| outline | `text-foreground [a&]:hover:bg-accent` |

侧栏内 NavBadge 特例：`rounded-full px-1 py-0 text-xs`

### 4.5 Dialog

```tsx
DialogOverlay  → 'fixed inset-0 z-50 bg-black/50' + fade 动画
DialogContent → 'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-lg'
DialogHeader  → 'flex flex-col gap-2 text-center sm:text-start'
DialogFooter  → 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'
DialogTitle   → 'text-lg leading-none font-semibold'
DialogDescription → 'text-sm text-muted-foreground'
CloseButton   → 'absolute inset-e-4 top-4 rounded-xs opacity-70 hover:opacity-100'
```

- 内容最大宽度 `sm:max-w-lg`（32rem = 512px），移动端 `max-w-[calc(100%-2rem)]`
- 关闭按钮固定在 `top-4 inset-e-4`
- 动画：`fade-in-0 / zoom-in-95`（开启） / `fade-out-0 / zoom-out-95`（关闭）

### 4.6 Table

```tsx
Table        → 容器 'relative w-full overflow-x-auto'；table 'w-full caption-bottom text-sm'
TableHeader  → '[&_tr]:border-b'
TableBody    → '[&_tr:last-child]:border-0'
TableRow    → 'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'
TableHead    → 'h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-foreground'
TableCell   → 'p-2 align-middle whitespace-nowrap'
TableFooter  → 'border-t bg-muted/50 font-medium'
TableCaption → 'mt-4 text-sm text-muted-foreground'
```

- 表头高度 40px，单元格 padding 仅 `p-2`（8px，紧凑型）
- 行 hover 用 `bg-muted/50`，选中用 `bg-muted`，**不**用阴影
- 列内 Checkbox 用 `*:[[role=checkbox]]:translate-y-0.5` 微调垂直对齐
- 容器外层用 `overflow-hidden rounded-md border` 包裹

### 4.7 Tabs

```tsx
Tabs        → 'flex flex-col gap-2'
TabsList    → 'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-0.75 text-muted-foreground'
TabsTrigger → 'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground transition-[color,box-shadow]',
              'data-[state=active]:bg-background data-[state=active]:shadow-sm',
              'dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground'
TabsContent → 'flex-1 outline-none'
```

- TabsList 高度 36px，内边距 3px (`p-0.75`)
- Trigger 选中：背景变 `background` + `shadow-sm` + 1px 边框（深色模式才显）

### 4.8 Sidebar 组件群（关键尺寸）

| 子组件 | 关键 class |
| --- | --- |
| SidebarHeader / SidebarFooter | `flex flex-col gap-2 p-2` |
| SidebarContent | `flex min-h-0 flex-1 flex-col gap-2 overflow-auto` |
| SidebarGroup | `relative flex w-full min-w-0 flex-col p-2` |
| SidebarGroupLabel | `flex h-8 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70`；折叠态 `-mt-8 opacity-0` |
| SidebarMenu | `flex w-full min-w-0 flex-col gap-1` |
| SidebarMenuButton (default) | `h-8 px-2 rounded-md gap-2`；hover/active → `bg-sidebar-accent`；折叠态 `size-8! p-2!` |
| SidebarMenuButton (lg, 用于 NavUser) | `h-12` |
| SidebarMenuSub | `mx-3.5 border-s border-sidebar-border px-2.5 py-0.5 gap-1` |
| SidebarMenuSubButton | `h-7 px-2 rounded-md text-sm` |
| SidebarMenuBadge | `absolute inset-e-1 h-5 min-w-5 px-1 text-xs tabular-nums` |
| SidebarRail | `absolute inset-y-0 w-4 -translate-x-1/2`，hover 显示 0.5px 拖拽条 |
| SidebarTrigger | `variant=ghost size=icon size-7` |
| SidebarInset (variant=inset) | `md:m-2 md:ms-0 md:rounded-xl md:shadow-sm` |

### 4.9 表单（react-hook-form + zod）

```tsx
<Form>
  <form className='space-y-8'>              {/* 字段间距 32px */}
    <FormField name='x' render={({ field }) => (
      <FormItem>
        <FormLabel>Name</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormDescription>...</FormDescription>  {/* text-sm text-muted-foreground */}
        <FormMessage />                          {/* text-destructive text-sm */}
      </FormItem>
    )} />
  </form>
</Form>
```

- 字段垂直间距 `space-y-8`（32px）
- Combobox 模式：`Popover` + `Command` + `Button variant=outline role=combobox w-50`

---

## 5. 页面范式

### 5.1 Dashboard 范式

```tsx
<Header>
  <TopNav links={topNav} className='me-auto' />
  <Search /><ThemeSwitch /><ConfigDrawer /><ProfileDropdown />
</Header>
<Main>
  <div className='mb-2 flex items-center justify-between space-y-2'>
    <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
    <div className='flex items-center space-x-2'>
      <Button>Download</Button>
    </div>
  </div>

  <Tabs defaultValue='overview' className='space-y-4'>
    <div className='w-full overflow-x-auto pb-2'>
      <TabsList> ... </TabsList>
    </div>

    <TabsContent value='overview' className='space-y-4'>
      {/* KPI 行：4 列网格 */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card> KPI 卡 </Card> ×4
      </div>
      {/* 二级行：4 + 3 列 */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>大图表</Card>
        <Card className='col-span-1 lg:col-span-3'>侧边列表</Card>
      </div>
    </TabsContent>
  </Tabs>
</Main>
```

### 5.2 KPI 卡范式

```tsx
<Card>
  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
    <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
    <svg className='h-4 w-4 text-muted-foreground' />
  </CardHeader>
  <CardContent>
    <div className='text-2xl font-bold'>$45,231.89</div>
    <p className='text-xs text-muted-foreground'>+20.1% from last month</p>
  </CardContent>
</Card>
```

### 5.3 列表页范式（Users）

```tsx
<Header fixed>
  <Search className='me-auto' />
  <ThemeSwitch /><ConfigDrawer /><ProfileDropdown />
</Header>

<Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
  {/* 标题 + 主操作 */}
  <div className='flex flex-wrap items-end justify-between gap-2'>
    <div>
      <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
      <p className='text-muted-foreground'>Manage your users and their roles here.</p>
    </div>
    <UsersPrimaryButtons />
  </div>

  {/* 数据表 */}
  <UsersTable data={users} search={search} navigate={navigate} />

  {/* 全局对话框（受 Provider 控制） */}
  <UsersDialogs />
</Main>
```

### 5.4 数据表范式（TanStack Table）

```tsx
<div className='max-sm:has-[div[role=toolbar]]:mb-16 flex flex-1 flex-col gap-4'>
  <DataTableToolbar
    searchPlaceholder='Filter users...'
    searchKey='username'
    filters={[
      { columnId: 'status', title: 'Status', options: [...] },
      { columnId: 'role',   title: 'Role',   options: [...] },
    ]}
  />

  <div className='overflow-hidden rounded-md border'>
    <Table> ... </Table>
  </div>

  <DataTablePagination className='mt-auto' />
  <DataTableBulkActions />  {/* 浮动工具条，移动端 mb-16 */}
</div>
```

关键约定：
- URL 同步：`pagination`、`columnFilters` 通过 `useTableUrlState` 与 search params 双向同步
- 列定义用 `meta.className` 控制粘性：`max-md:sticky inset-s-0 z-10 drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)]`
- 空态：`<TableCell colSpan={n} className='h-24 text-center'>No results.</TableCell>`
- 状态色用 Badge variant=outline + 动态 class（如 `callTypes.get(status)`）

### 5.5 设置页范式（已含 3.7）

侧栏导航项：

```ts
const sidebarNavItems = [
  { title: 'Profile',       href: '/settings',                 icon: <UserCog size={18} /> },
  { title: 'Account',       href: '/settings/account',        icon: <Wrench size={18} /> },
  { title: 'Appearance',    href: '/settings/appearance',      icon: <Palette size={18} /> },
  { title: 'Notifications', href: '/settings/notifications',  icon: <Bell size={18} /> },
  { title: 'Display',       href: '/settings/display',         icon: <Monitor size={18} /> },
]
```

### 5.6 User Settings（目标页面 `?setting=general`）

页面分块（每块一张 Card）：
1. **Personal Information** — 头像 + 姓名 + 角色
2. **Email & Password** — 邮箱、当前密码、新密码 + 实时强度校验（≥12 字符、大小写、数字、特殊符号各 1 项）
3. **Connect Accounts** — 第三方账号（Google / Slack）卡片网格
4. **Social URLs** — 社交链接列表
5. **Danger Zone** — 红色 destructive Card，删除账号需二次确认

### 5.7 实际部署站点完整页面清单（nextjs-admin 实抓）

> 以下内容来自对 `https://shadcn-nextjs-admincn-full-navbar-layout-admin-template.vercel.app` 全站点的实际抓取（每条均访问过）。
> 这是 **shadcn-admin (Vite 版)** 的 Next.js 商业版本，命名 `AdminCNDashboard Template`，导航结构更复杂、页面更丰富。

#### 5.7.1 完整侧栏导航结构（6 个一级分组 / 28 个内页）

| 分组 | 路径 | 页面名称 | 主要内容 |
| --- | --- | --- | --- |
| **Dashboard & Layouts** | `/dashboard/sales` | Sales | Top Services 进度条 + Conversion 漏斗 + Course 表 |
| | `/dashboard/finance` | Finance | Yearly report + Top Products by Sales/Volume + User 表 |
| | `/dashboard/logistics` | Logistics | Vehicle overview + Vehicles Condition + On route vehicle 表 |
| | `/dashboard/productivity` | Productivity | Project Timeline + Project List + User 表 |
| | `/dashboard/campaign` | Campaign | Customers + Monthly campaign + Plan + Vehicles Condition + User 表 |
| | `/dashboard/analytics` | Analytics | 内容与 Sales 相同（疑似占位/重定向） |
| | `/dashboard/payments` | Payments | Income/Expense + Payment History 表 + Sales by countries + Transactions |
| | `/dashboard/ecommerce` | eCommerce | Total Sales/Orders + Popular product + Product 表 |
| | `/dashboard/orders` | Orders | Shipped/Damaged/Missed + Sales metrics + Revenue goal + Customer 表 |
| **Apps** | `/apps/mail` | Mail | 三栏：folder 列表 / 邮件列表 / 邮件详情 |
| | `/apps/chat` | Chat | 三栏：会话列表 / 消息流 / 输入区 |
| | `/apps/kanban` | Kanban | 4 列看板（Backlog/In Progress/Review/Done） |
| | `/apps/calendar` | Calendar | 月视图 + 事件筛选（6 类标签） |
| | `/apps/contact` | Contact | 字母分组联系人 + 详情面板 |
| **Pages** | `/pages/pricing` | Pricing | 3 套方案 + 功能矩阵对比 |
| | `/pages/faq` | FAQ | 手风琴式问答 + 多分类支持卡片 |
| **Forms & Tables** | `/forms/form-validation` | Form Validation | 4 段分步表单 + zod 校验 |
| | `/datatable` | Data Table | 11 种数据表变体演示 |
| **Components & Charts** | 外链 | shadcnstudio.com | — |
| **Miscellaneous** | 外链 | Support / Documentation | — |

> 附加发现：`/pages/user-settings`、`/pages/user-profile`、`/pages/user-list` 三个页面不在主导航里但可访问，对应"用户管理"类页面。

#### 5.7.2 Dashboard 9 个页面范式分类

抓取后发现 Dashboard 实际呈现 **6 种内容卡片模式**，按出现频次排序：

**A. KPI 数字卡（4 列网格，所有 dashboard 都有）**

```tsx
<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
  <Card>
    <CardContent className='p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-muted-foreground'>Total Profit</p>
          <p className='text-2xl font-bold'>$88.5k</p>
        </div>
        {/* 趋势 badge */}
        <span className='text-destructive'>-18%</span>
      </div>
      <p className='text-xs text-muted-foreground'>Last week</p>
    </CardContent>
  </Card>
</div>
```

变种：含趋势条（▲/▼）、含 mini sparkline 图、含 Icon + 进度条。

**B. 标题 + 描述 + 复杂内容的 Card（主区）**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Earning Report</CardTitle>
    <CardDescription>Weekly Earning overview</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 3 行：标签 + 数值 + 百分比 + 横向 mini bar */}
    <div className='space-y-4'>
      <div>
        <div className='flex justify-between text-sm'>
          <span>Net profit <span className='text-muted-foreground'>Sales</span></span>
          <span>$1,623 <span className='text-muted-foreground'>20.3%</span></span>
        </div>
        <Progress value={20.3} className='mt-2' />
      </div>
    </div>
  </CardContent>
</Card>
```

**C. 进度条对比卡（Top Services / Top Products）**

```tsx
<Card>
  <CardHeader><CardTitle>Top Services by Sales</CardTitle></CardHeader>
  <CardContent className='space-y-4'>
    {items.map(item => (
      <div key={item.name}>
        <div className='flex justify-between text-sm mb-1'>
          <span>{item.name}</span><span>{item.value}%</span>
        </div>
        <Progress value={item.value} />
      </div>
    ))}
  </CardContent>
</Card>
```

**D. 漏斗 / 流程卡（Conversion rate）**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Conversion rate</CardTitle>
    <CardDescription>Compared to last month</CardDescription>
  </CardHeader>
  <CardContent className='space-y-2'>
    {/* 4 阶段，每行：图标 + 阶段名 + 数值 + 百分比 */}
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'><Icon /> Impressions</div>
      <span>12.2K Visits</span><span>20.3%</span>
    </div>
  </CardContent>
</Card>
```

**E. 用户列表卡（Person 卡，常见于 dashboard 末尾）**

```tsx
<Card>
  <CardContent className='p-6 flex items-center gap-4'>
    <Avatar className='h-12 w-12'><AvatarImage /><AvatarFallback>AG</AvatarFallback></Avatar>
    <div className='flex-1'>
      <p className='font-medium'>Angel George</p>
      <p className='text-xs text-muted-foreground'>Product Manager</p>
    </div>
    <Button variant='outline' size='sm'>Follow</Button>
  </CardContent>
</Card>
```

**F. 表格卡（Payment History / Course 等）**

直接在 Card 内嵌 `<Table>`，含分页 `Showing 1 to 5 of 25 entries`，**Toolbar 含 Select Category / Select Stock / Select Status**。

**G. 营销升级卡（Upgrade your plan）**

```tsx
<Card className='bg-primary text-primary-foreground'>
  <CardContent className='p-6'>
    <p className='text-sm opacity-80'>Platinum · Last 6 months</p>
    <p className='text-2xl font-bold'>$5,550<span className='text-sm font-normal'>/Year</span></p>
    <Button variant='secondary' className='mt-4'>Upgrade</Button>
  </CardContent>
</Card>
```

#### 5.7.3 Dashboard 9 个页面差异化要点

| 页面 | 独有组件 |
| --- | --- |
| Sales | Top Services（横向进度条） + Conversion rate 漏斗 + Course 表 |
| Finance | Yearly report + Top Products by Sales **& by Volume** 双榜 + Payment History |
| Logistics | **Vehicle overview**（圆环图 + 状态卡）+ **Vehicles Condition**（5 级条形图）+ On route vehicle 表 |
| Productivity | **Project Timeline** + Project List（带任务进度）+ Weekly overview 圆环 |
| Campaign | Customers 数 + **Monthly campaign state**（5 阶段漏斗）+ Plan 选择 + Vehicles Condition |
| Analytics | 复用 Sales 内容（疑似未实现，应作"占位"处理） |
| Payments | **Income vs Expense 双进度条** + Payment History 表 + **Sales by countries**（国旗 + 数值）+ Transactions |
| eCommerce | Total Sales/Orders + **Popular product**（产品图卡列表）+ Product 表 |
| Orders | **3 个 KPI 计数卡**（Shipped/Damaged/Missed）+ Product insight + **Sales metrics** + **Revenue goal**（环形进度）+ **Cohort analysis** + Customer 表 |

#### 5.7.4 Apps 页面范式（5 个）

**A. `/apps/mail` — 三栏邮件客户端**

```
┌──────────────┬────────────────────┬──────────────────┐
│ Folders      │ Email list         │ Email detail     │
│ - Inbox (12) │ ┌──────────────┐  │ Subject          │
│ - Sent       │ │ From + Avatar │  │ From / Date      │
│ - Drafts     │ │ Subject       │  │ Body (prose)    │
│ - Starred    │ │ Preview       │  │ Actions: Reply  │
│ Labels       │ └──────────────┘  │ Attachments      │
│ - Family     │ ×N                │                  │
└──────────────┴────────────────────┴──────────────────┘
```

- 左栏宽度约 16rem，固定
- 中栏可滚动，每项高约 80px
- 右栏 `prose dark:prose-invert` 排版

**B. `/apps/chat` — 三栏聊天**

```
┌─────────────┬────────────────────────────────────┐
│ Conversations│ Header (Avatar + name + status)   │
│ ┌─────────┐  │ ┌──────────────────────────────┐  │
│ │ Avatar  │  │ │      消息流（左右气泡）       │  │
│ │ Name    │  │ │  Self message (右对齐 primary)│  │
│ │ Preview │  │ │  Other message (左对齐 muted) │  │
│ │ Time    │  │ └──────────────────────────────┘  │
│ │ Unread  │  │ Input box + emoji + attach + send │
│ └─────────┘  │                                    │
└─────────────┴────────────────────────────────────┘
```

- 左栏 18rem
- 空态：`Choose from your existing conversations`
- 输入区 `sticky bottom-0`

**C. `/apps/kanban` — 4 列看板**

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Backlog (3) │ In Progress│ Review (2) │ Done (3)    │
│ ┌─────────┐ │ ┌─────────┐│ ┌─────────┐│ ┌─────────┐ │
│ │ priority│ │ │ priority││ │ priority││ │ priority│ │
│ │ Title   │ │ │ Title   ││ │ Title   ││ │ Title   │ │
│ │ [cover] │ │ │ [cover] ││ │ [cover] ││ │ [cover] │ │
│ │ tags    │ │ │ tags    ││ │ tags    ││ │ tags    │ │
│ │ due date│ │ │ due date││ │ due date││ │ due date│ │
│ │ avatars │ │ │ avatars ││ │ avatars ││ │ avatars │ │
│ └─────────┘ │ └─────────┘│ └─────────┘│ └─────────┘ │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

- 4 列等宽（`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`）
- 列头：`title (count)` + 添加按钮
- 卡片可拖拽（dnd-kit）
- priority 用色块标识：`high`（红）/ `medium`（黄）/ `low`（灰）
- 卡片含：封面图（可选）+ 标签 + 到期日 + 多头像堆叠

**D. `/apps/calendar` — 月视图日历**

```
┌───────────────────────┬───────────────┐
│ ◀ August 2026 ▶       │ Event filters │
├───────────────────────┤  • All        │
│ Sun Mon Tue Wed Thu Fri│  • Family    │
│  26  27  28  29  30  31│  • Business  │
│   1   2   3   4   5   6│  • Personal  │
│   ...                  │  • Holiday   │
│                       │  • Etc       │
└───────────────────────┴───────────────┘
```

- 7×6 网格
- 每格高约 120px，含事件点（彩色 dot / 块）
- 顶部切换：◀ 月份 ▶ + Today
- 右栏筛选：6 类标签 checkbox

**E. `/apps/contact` — 联系人**

```
┌──────────────────────┬─────────────────────┐
│ Search + Labels      │ Welcome to Contacts │
│ [Input with start icon]│                  │
│                      │ "Kickstart your contacts growth..."│
│ A (4)                │ [+ Add Contact]     │
│  Alice Johnson       │                     │
│   customer           │                     │
│  Aron Thompson       │                     │
│   lead vip +1        │                     │
│ B (2)                │                     │
│  Benjamin White      │                     │
│   partner customer +1│                    │
└──────────────────────┴─────────────────────┘
```

- 左栏按字母分组（A/B/C/...）
- 每条：Avatar + 姓名 + 邮箱 + 标签 badges
- 多标签：`customercustomer` 形式（主标签 + 副标签 + 计数）
- 选中态高亮，右栏显示详情或空态

#### 5.7.5 Pages 页面范式（2 个）

**A. `/pages/pricing` — 价格表**

```tsx
<section>
  <header className='text-center'>
    <h1 className='text-3xl font-bold md:text-4xl'>Pricing Details</h1>
    <p className='text-muted-foreground'>A Comprehensive Breakdown...</p>
    <span className='badge'>Flat 20% OFF</span>
  </header>

  <div className='grid gap-6 md:grid-cols-3'>
    {/* 3 个方案卡 */}
    <Card className={i === 1 ? 'border-primary shadow-lg' : ''}>
      <CardHeader>
        <p>Essential Plan</p>
        <p className='text-3xl font-bold'>$29<span className='text-base'>/month</span></p>
        {i === 1 && <Badge>Trending</Badge>}
      </CardHeader>
      <CardContent>
        <Button className='w-full' variant={i === 1 ? 'default' : 'outline'}>
          Get Started
        </Button>
      </CardContent>
    </Card>
  </div>

  {/* 功能矩阵表：Feature × Plan 三列 */}
  <table>
    <thead><tr><th>Feature</th><th>Basic</th><th>Advanced</th><th>Advanced</th></tr></thead>
    <tbody>
      <tr><td>Core Analytics</td><td>✓</td><td>✓</td><td>✓</td></tr>
      {/* ... */}
    </tbody>
  </table>
</section>
```

- Hero 居中标题 + 副标题 + 优惠 badge
- 3 列方案卡，**中间卡用 `border-primary shadow-lg` 高亮**，加 `Badge=Trending`
- 下方功能矩阵表：每行一个功能，3 列对应 3 个方案（用 ✓ 或文字描述）

**B. `/pages/faq` — FAQ**

```tsx
<section>
  <header>
    <h1>Frequently Inquired Queries</h1>
    <p>Find answers about analytics, permissions, billing...</p>
    <img src='/images/misc/faq-illustration.webp' />
  </header>

  {/* 按主题分组 */}
  <section>
    <h2>General Usage</h2>
    <p>Core questions about navigating and managing your admin dashboard workspace.</p>
    <Accordion>
      <AccordionItem>
        <AccordionTrigger>How do I customize my dashboard layout?</AccordionTrigger>
        <AccordionContent>Open the dashboard settings menu...</AccordionContent>
      </AccordionItem>
    </Accordion>
  </section>

  {/* 底部 3 个支持卡片 */}
  <section className='grid gap-4 md:grid-cols-3'>
    <Card><CardHeader><CardTitle>Contact Technical Support</CardTitle></CardHeader><CardContent>...</CardContent></Card>
    <Card>...Request Product Guidance</Card>
    <Card>...Explore Admin Documentation</Card>
  </section>
</section>
```

- Hero 含插画
- 主体：多个主题分组，每组用 `Accordion`（cmdk 实现）
- 底部：3 列支持渠道卡片

#### 5.7.6 Forms & Tables 页面范式（2 个）

**A. `/forms/form-validation` — 分段表单**

页面分 4 大段，每段一张 Card + CardHeader 描述：

```tsx
<Main className='space-y-6'>
  <FormCard title='Personal Information' description='Please provide your basic information'>
    <FormField name='fullName' label='Full Name' description='Your full name as it appears on official documents' />
    <FormField name='email' label='Email Address' description="We'll never share your email..." />
    <FormField name='password' label='Password' description='Must be at least 8 characters with uppercase, lowercase, and numbers' />
  </FormCard>

  <FormCard title='Profile Details' description='Tell us more about yourself'>
    <FormField name='dob' label='Date of Birth' type='date' />
    <FormField name='age' label='Age' description='You must be at least 18 years old to register' />
    <FormField name='country' label='Country' type='combobox' />
    <FormField name='language' label='Preferred Language (Optional)' type='combobox' />
    <FormField name='bio' label='Bio' type='textarea' description='Brief description about yourself (0/500 characters)' />
  </FormCard>

  <FormCard title='Preferences' description='Customize your experience'>
    <FormField name='topics' label='Newsletter Topics' type='multi-checkbox' />
    <FormField name='settings' label='Communication Settings' type='switch-group' />
    <FormField name='2fa' label='Two-Factor Authentication' type='switch' />
  </FormCard>

  <FormCard title='Account Type' description='Choose the plan that best fits your needs'>
    <FormField name='plan' type='radio-cards' options={[
      { value: 'personal', title: 'Personal', description: 'For individual use with basic features' },
      { value: 'business', title: 'Business', description: 'For small to medium-sized teams' },
      { value: 'enterprise', title: 'Enterprise', description: 'For large organizations' },
    ]} />
  </FormCard>
</Main>
```

要点：
- 每段 Card 都有 `CardTitle` + `CardDescription`
- 每个字段都带 `description`（`text-sm text-muted-foreground`）
- 字段类型：input / date / combobox / textarea / multi-checkbox / switch / radio-cards
- Bio 字段含字符计数（0/500）
- 校验用 zod schema，错误显示在字段下方

**B. `/datatable` — 11 种数据表变体演示**

| # | 名称 | 关键特性 |
| --- | --- | --- |
| 1 | Basic Data Table | 仅分页，无 toolbar |
| 2 | Data Table with Column Visibility | 顶部"列可见性"下拉（Checkbox 列表） |
| 3 | Data table with Filters | Toolbar 含 Select Role / Select Plan / Select Status 三个筛选器 |
| 4 | Data table with Resizable Columns | 列宽可拖拽（react-resizable-panels） |
| 5 | Data table with Pinnable Columns | 列可固定到左侧（pin icon） |
| 6 | Data Table with Page Size Selector | 分页器含 `Show [10/20/30/50]` 下拉 |
| 7 | Data table with Draggable Columns | 列顺序可拖拽重排 |
| 8 | Data table with Expandable Rows | 行可展开（ChevronRight → 旋转 90° → 显示子内容） |
| 9 | Data table with Progress | 单元格内嵌 `<Progress>` + 百分比文字 |
| 10 | Data table with Export Buttons | Toolbar 含 Export CSV / Print / Copy 按钮 + 3 个筛选器 |
| 11 | Data table with Graph | 单元格内嵌 mini sparkline 图表 |

通用结构：
```tsx
<Card>
  <CardHeader className='flex flex-row items-center justify-between'>
    <div>
      <CardTitle>{tableName}</CardTitle>
      <CardDescription>{tableDesc}</CardDescription>
    </div>
    {/* 右侧 toolbar：列可见性 / 筛选器 / 导出按钮 */}
  </CardHeader>
  <CardContent className='p-0'>
    <div className='overflow-hidden border-t'>
      <Table>
        <TableHeader> ... </TableHeader>
        <TableBody> ... </TableBody>
      </Table>
    </div>
    <DataTablePagination className='border-t p-3' />
  </CardContent>
</Card>
```

注意：
- 11 个表 demo 都按"卡片包裹"的统一模式呈现
- 表头按字母表顺序排序的多列：User / Role / Plan / Billing / Status / Actions
- `Actions` 列固定为行末，含 dropdown menu（编辑 / 复制 / 删除）
- 状态列用 Badge variant=outline + 动态颜色 class

#### 5.7.7 整站页面模式总览

| 模式 | 用途 | 页面 |
| --- | --- | --- |
| **KPI 4 列网格** | 顶部数据概览 | 所有 dashboard |
| **二级 7 列网格**（4+3 / 5+2） | 主图表 + 辅助列表 | sales / payments / orders |
| **三栏布局** | 复杂应用 | mail / chat |
| **多列看板** | 状态推进 | kanban |
| **字母分组列表** | 通讯录类 | contact |
| **月历网格** | 时间维度 | calendar |
| **居中 Hero + 矩阵** | 营销页 | pricing |
| **手风琴 + 卡片** | 帮助页 | faq |
| **分段表单** | 多步录入 | form-validation |
| **卡片包裹表格** | 列表 / demo | datatable / 所有 dashboard 末尾 |

---

## 6. 交互模式

### 6.1 侧栏

| 交互 | 触发 | 行为 |
| --- | --- | --- |
| 展开 / 折叠 | 点击 SidebarTrigger / 拖 SidebarRail / `Cmd/Ctrl+B` | CSS 过渡 `transition-[width,inset-inline] duration-200 ease-linear` |
| 移动端打开 | 点击 SidebarTrigger | `Sheet` 从左侧滑入，宽度 18rem，遮罩 `bg-black/50` |
| 折叠态子菜单 | hover SidebarMenuButton | `Tooltip`（右侧）+ `DropdownMenu`（替代 Collapsible） |
| 展开态子菜单 | 点击 CollapsibleTrigger | `ChevronRight` 旋转 90°，`slideDown/slideUp 300ms ease-out` |
| 状态持久化 | setOpen 时 | 写 cookie `sidebar_state=true/false`，max-age 7 天 |
| 活跃项判定 | `checkIsActive(href, item)` | 精确匹配 + 子项匹配 + 主路径前缀匹配（mainNav=true） |

### 6.2 顶部导航（TopNav）

- 桌面（`lg+`）：`hidden lg:flex items-center space-x-4 xl:space-x-6`
- 移动（`<lg`）：折叠为 `DropdownMenu`，trigger = `Button size=icon variant=outline className=md:size-7 lg:hidden`
- 链接样式：`text-sm font-medium transition-colors hover:text-primary`
- 非活跃：`text-muted-foreground`；`disabled` 走 TanStack Router 的 disabled

### 6.3 全局搜索（Command Menu）

- 触发：Header 的 `Search` 按钮 → 调用 `useSearch().setOpen(true)`
- 实现：`CommandDialog` (cmdk) + `ScrollArea type=hover className='h-72 pe-1'`
- 分组：遍历 `sidebarData.navGroups`，子菜单展开为 `父项 > 子项`
- 末尾固定 Theme 分组：Light / Dark / System
- 选中项左侧 `ArrowRight size-2 text-muted-foreground/80`

### 6.4 用户菜单（NavUser / ProfileDropdown）

**NavUser（侧栏 footer）**

- Trigger：`SidebarMenuButton size=lg`，包含 Avatar(8×8 rounded-lg) + 用户名+邮箱两行 + ChevronsUpDown
- Content 宽度：`min-w-56` 且 `w=(--radix-dropdown-menu-trigger-width)`（与 trigger 同宽）
- 桌面 `side=right align=end`，移动 `side=bottom`
- 顶部 Label：复用 trigger 的 Avatar + 用户名结构
- 退出：`DropdownMenuItem variant=destructive` → 打开 `SignOutDialog` 二次确认

**ProfileDropdown（Header）**

- Trigger：`Button variant=ghost h-8 w-8 rounded-full` 包 Avatar(8×8)
- Content：`w-56 align=end forceMount`
- 菜单项带 shortcut：`DropdownMenuShortcut` 显示 `⇧⌘P` / `⌘B` / `⌘S` / `⇧⌘Q`

### 6.5 表单提交反馈

- 用 `sonner` Toast 提示，自定义 `showSubmittedData(data)` 工具
- 校验由 `zodResolver(schema)` 注入；schema 常见约束：
  - `name: z.string().min(1).min(2).max(30)`
  - `dob: z.date()`
  - `language: z.string()`

### 6.6 主题切换

- 三态：`light / dark / system`
- 切换器：`ThemeSwitch` 组件 → `useTheme().setTheme(...)`
- 实现：在 `<html>` 上加 `.dark` 类
- 持久化：cookie + localStorage

### 6.7 配置抽屉（ConfigDrawer）

- Trigger：Header 中的齿轮 icon
- 内容：布局选项（collapsible / variant / layout=fixed|auto / content=fluid）
- 用 `Sheet side=right`

### 6.8 加载与骨架

- 路由切换：`react-top-loading-bar` 顶部进度条
- 表格骨架：`SidebarMenuSkeleton`（h-8 + size-4 icon + 50~90% 随机宽度文本）
- 通用：`<Skeleton className='h-4 w-...' />`

### 6.9 动画

| 名称 | 时长 | 用途 |
| --- | --- | --- |
| `fade-in-0 / fade-out-0` | 200ms | Dialog / Dropdown / Sheet |
| `zoom-in-95 / zoom-out-95` | 200ms | Dialog |
| `slide-down / slide-up` | 300ms ease-out | Sidebar Collapsible 子菜单 |
| 侧栏宽度过渡 | 200ms linear | collapsible 切换 |
| `rotate-90` | 200ms | NavGroup 的 ChevronRight |

---

## 7. 可访问性 & 国际化

### 7.1 必备项

- `SkipToMain` 在 SidebarProvider 内首位，跳到 `<main id=main>`
- 所有 icon-only button 必带 `<span className='sr-only'>...</span>`
- 焦点环统一 `focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring`
- 表单错误用 `aria-invalid` + `aria-describedby` 自动关联 FormMessage
- 表格选择列 `aria-label='Select all' / 'Select row'`

### 7.2 RTL 支持

- 全部用逻辑属性：`ms-` / `me-` / `ps-` / `pe-` / `inset-s-` / `inset-e-` / `border-s` / `border-e`
- `ChevronRight` 在 RTL 自动 `rtl:rotate-180`
- 侧栏 `side=right` 模式下整组容器自动镜像

### 7.3 移动端防缩放

```css
@media screen and (max-width: 767px) {
  input, select, textarea { font-size: 16px !important; }
}
body[data-scroll-locked] { overflow: unset !important; }  /* 取消 Radix 锁滚动 */
```

---

## 8. 落地清单（Checklist）

落地一个新页面时按此清单核对：

- [ ] 顶层结构：`<Header>` + `<Main>`，且 Main 在 `SidebarInset` 内
- [ ] Header 元素顺序：`SidebarTrigger` + `Separator` + 业务导航（`me-auto`）+ `Search` + `ThemeSwitch` + `ConfigDrawer` + `ProfileDropdown`
- [ ] Main 内首块为标题区：`h1.text-2xl.font-bold.tracking-tight`（`md:text-3xl` 仅设置页用） + `p.text-muted-foreground` 描述
- [ ] 内容容器：`grid gap-4`（默认） / `flex flex-1 flex-col gap-4 sm:gap-6`（列表页）
- [ ] 卡片用 `Card` + `CardHeader` + `CardContent`，左右 padding 自动 `px-6`
- [ ] KPI 网格：`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`
- [ ] 二级网格：`grid grid-cols-1 gap-4 lg:grid-cols-7` + `col-span-4 / col-span-3`
- [ ] 按钮：默认 `h-9`；表格行内操作用 `size=icon` 或 `size=sm`； destructive 用 `variant=destructive`
- [ ] 表单字段间距 `space-y-8`， Combobox 用 `Popover + Command` 组合
- [ ] 表格容器 `overflow-hidden rounded-md border`，URL 同步分页 / 筛选
- [ ] 所有颜色用 CSS 变量，禁止 `#hex`；所有间距用 Tailwind 类
- [ ] 所有交互元素配 `sr-only` 文案与 `aria-label`
- [ ] RTL：用 `ms/me/ps/pe/inset-s/inset-e`，不要写 `ml/mr/pl/pr/left/right`
- [ ] 移动端字号 ≥ 16px，禁用焦点缩放

---

## 9. 与 GOFO 项目映射（项目记忆关联）

> 当前项目记忆约束（GOFO-web-design）与此规范的差异：

| 维度 | GOFO 现状 | shadcn-admin 推荐 | 落地建议 |
| --- | --- | --- | --- |
| 主色 | `--gofo-primary` (#fc4c02 橙) | `--primary` 近黑 | 沿用 GOFO 橙作为品牌色覆盖 `--primary` |
| Header 高度 | 48px (`--gofo-header-height`) | 64px (`h-16`) | 推荐改为 56px 折中 |
| Sidebar 宽度 | 55px ↔ 270px | 48px (icon) ↔ 256px (expand) | 推荐对齐 shadcn：48 ↔ 256 |
| Sidebar hover 延迟 | 120ms | 无延迟（点击触发） | 业务强约束时保留 120ms |
| Tabs 高度 | 41px (`--gofo-tabs-height`) | 36px (`h-9`) | 推荐对齐 36px |
| 圆角 | 无统一变量 | `--radius: 0.625rem` | 引入 `--gofo-radius` 统一 |
| 阴影 | sidebar `0 2px 8px rgba(0,0,0,.15)` | `shadow-sm` 极克制 | 保留 GOFO sidebar 阴影 |
| 字体 | 未约束 | Inter / Manrope | 明确 Inter 为默认 sans |

---

## 10. 参考文件路径（源仓库）

```
src/styles/theme.css              ← 全部颜色与字体 token
src/styles/index.css              ← Tailwind v4 入口 + 容器/滚动条/动画
src/config/fonts.ts               ← 可选字体清单
src/components/ui/*               ← shadcn 组件实现（30+ 个）
src/components/layout/*            ← 侧栏/顶栏/Main 布局组件
src/components/layout/data/sidebar-data.ts  ← 导航数据结构
src/features/dashboard/*          ← 仪表盘页面范式
src/features/users/*              ← 列表页 + 数据表范式
src/features/settings/*           ← 设置页范式（5 个子页）
```
