# DSP 管理项目 UI 规范

## 作用范围

本规范只适用于当前仓库及其子目录，不是个人级、工作区级或跨项目 UI 规范。
不得把本文件、主题 token、组件源码或相关 AI 指令复制到其他项目。

## 技术基线

- 框架：Next.js App Router、TypeScript。
- 样式：Tailwind CSS v4。
- 组件：shadcn/ui，Radix 基座，Nova 预设。
- 主题：Neutral、CSS Variables、OKLCH 色彩。
- 参考配色：冷浅灰 `#f5f6f9` 承担系统画布与顶部栏底色，白色承担侧边
  导航、卡片、
  表格和弹层等内容面，GOFO 品牌橙 `#ff6703` 承担主操作、品牌识别、
  鼠标悬停、选中指示和键盘焦点，近黑色承担主要文字，低饱和青绿
  `oklch(0.63 0.105 178)` 承担数据强调和主图表系列。
- 图标：Lucide。

## 唯一事实来源

1. `components.json`：shadcn/ui 生成配置与路径。
2. `src/app/globals.css`：主题 token 与全局样式。
3. `src/components/ui`：当前项目拥有的 UI 基础组件源码。
4. `.agents/skills/shadcn`：当前项目的 shadcn AI 工作流。
5. 本文件：项目 UI 设计与组合约束。

## 组件规则

- 优先复用 `src/components/ui` 中的组件。
- 新建基础组件前，先通过 shadcn CLI 搜索并预览已有组件。
- 业务组件放在 `src/components` 的业务子目录，不放入 `src/components/ui`。
- 使用 `@/components/ui/...` 导入本项目组件。
- 禁止从其他仓库、其他项目目录或用户全局目录导入 UI 组件。
- 除非需求明确，不将本项目组件发布为跨项目共享包。

## 样式规则

- 优先使用 `background`、`foreground`、`primary`、`secondary`、`muted`、
  `accent`、`destructive`、`border` 等语义 token。
- 主题色、圆角、字体和深色模式只在 `src/app/globals.css` 维护。
- 浅色模式的 `background` 使用 `#f5f6f9`，`card`、`popover` 和 `sidebar`
  保持白色；边框使用 `#e4e8f0`。不在业务页面单独重复设置页面底色。
- 默认主按钮使用 `brand` 品牌橙与 `brand-foreground` 白色文字；近黑
  `primary` 保留给需要中性强强调的非按钮界面元素。
- GOFO 品牌橙通过 `brand`、`brand-hover`、`brand-selected`、`ring` 和
  `sidebar-ring` 等语义 token 使用；青绿数据强调色通过
  `data-accent` 和 `chart-1` 使用。
- 品牌橙只用于小面积识别与交互反馈：系统 Logo 细节、一级导航选中
  短指示条、组件悬停/选中态和可见焦点环。悬停使用 `brand-hover`
  的 6% 半透明橙色背景并保持深灰文字；选中使用 `brand-selected`
  浅桃色背景 `#fff4ed` 与品牌橙 `#ff6703` 的 `brand-ink`
  文字。焦点环最终可见透明度控制在
  30%–40%。深色模式下相应提高透明度，不使用大面积实色橙。不将其用于表格表头、
  常规正文或错误/警告语义；主按钮是允许使用品牌橙的唯一大面积交互控件。
- 每个页面保持不超过 2–3 个橙色视觉锚点，单个组件只保留一种橙色
  强调方式。
- 不在业务页面硬编码品牌橙或数据强调色，也不手写重复的深色模式
  颜色覆盖。
- 布局间距使用 `gap-*`，不使用 `space-x-*` 或 `space-y-*`。
- 宽高相等时使用 `size-*`。
- 条件 class 使用 `cn()`。
- `className` 主要用于布局与响应式组合，不随意覆盖基础组件的颜色和字体。

## 字体与字号

- 全系统正文、导航、表格、按钮、表单、英文、数字、页面标题、区块标题、
  核心指标、代码和编号统一使用苹方字体栈。`font-sans`、`font-heading` 与
  `font-mono` 均映射为 `"PingFang SC"`，并依次回退到冬青黑体、微软雅黑、
  系统无衬线字体。
- `font-heading` 与 `font-mono` 继续作为语义类保留，但不再切换到 Manrope 或
  Geist Mono。需要对齐的金额、时间、百分比和指标数字使用 `tabular-nums`；
  不依赖等宽字体实现列对齐。
- 正文、导航和常规表单控件默认使用 `text-sm`（14px），并继承
  `--font-weight-body`（400）常规字重；激活导航、标签、表头和需要强调的短文本
  可按组件语义使用 500。按钮统一使用 `--button-font-size`（13px）与
  `font-normal`（400）。表格内文字、辅助标签、图表刻度和低优先级说明使用
  `text-xs`（12px）。
- 强调正文和紧凑标题使用 `text-base`（16px）；区块标题按层级使用
  `text-lg`（18px）或 `text-xl`（20px）。
- 页面标题和核心指标按层级使用 `text-2xl`（24px）或 `text-3xl`（30px），
  不在业务页面使用任意像素字号。
- 移动端输入框、选择框和文本域保持至少 16px，避免移动浏览器聚焦时缩放页面。
- 字体家族只通过 `src/app/globals.css` 的主题 token 维护，不在业务组件中直接
  声明字体名称，也不通过 `next/font/google` 加载远程字体。

## 日期与时间

- 系统默认按美国常用顺序展示日期，完整日期使用
  `MM/DD/YYYY`，例如 `08/21/2026`；月份使用 `MM/YYYY`，例如
  `08/2026`。
- 日期时间统一使用 24 小时制 `MM/DD/YYYY HH:mm`，例如
  `08/21/2026 13:05`；需要秒级精度的实时时间使用 `HH:mm:ss`，
  例如 `16:42:18`。不显示 `AM` / `PM`。
- 日期范围的起止值均使用完整美国日期，中间使用 en dash：
  `08/21/2026 – 08/27/2026`。紧凑图表坐标可使用 `MM/DD`，但 Tooltip、
  表格和详情必须补全年份。
- 系统默认时区为 `America/New_York`，所有带时间的展示都必须明确
  使用当前用户时区；用户切换时区后应重新格式化同一时间点，
  不得直接修改原始时间值。
- 展示格式与机器值分离。接口、数据库、排序键和表单提交值继续使用
  ISO 8601：纯日期使用 `YYYY-MM-DD`，时间点使用含时区或偏移量的
  ISO 时间戳。原生 `input[type="date"]` 的 `value` 也保持 `YYYY-MM-DD`。
- 业务页面不得手工拼接或硬编码日期时间字符串；统一通过项目共享
  formatter 展示，基于 `Intl.DateTimeFormat("en-US")` 并显式设置
  `hourCycle: "h23"`。统一 formatter 应处理无效值、缺失值、夏令时、
  跨日与跨年场景。
- 日期时间表格列使用 `tabular-nums`；当界面上下文无法明确时区时，
  在列名、Tooltip 或区块说明中标注时区缩写。

## 圆角

- 全局基础圆角 `--radius` 统一为 `0.375rem`（6px），只在
  `src/app/globals.css` 维护，业务页面不硬编码任意圆角值。
- 圆角层级沿用现有倍率：`rounded-sm` = 3.6px（0.6×）、
  `rounded-md` = 4.8px（0.8×）、`rounded-lg` = 6px（1×）、
  `rounded-xl` = 8.4px（1.4×）、`rounded-2xl` = 10.8px（1.8×）。
- 按钮、输入框、选择器、导航项和菜单项优先使用 `rounded-md`；
  表格、Popover、下拉菜单和局部容器优先使用 `rounded-lg`；Card
  和 Dialog 优先使用 `rounded-xl`。
- 嵌套容器的内层圆角不得大于外层；连接型组件只保留组合外侧圆角。
  Avatar、状态点和明确的胶囊形结构使用 `rounded-full`。

## 线条与边框

- Card、表格、表单控件、弹层和页面区域的结构边框统一使用
  `border`（1px），不使用 2px 或更粗的结构框。
- 同一视觉容器只使用一种静态层级表达：绘制结构边框时不得同时添加阴影。
  Card、表格、表单控件和描边按钮使用 1px 边框且不使用阴影；Popover、
  DropdownMenu、Select 菜单、Sheet 等浮层使用阴影时不再绘制边框或轮廓环。
  键盘焦点环与错误校验环属于短暂交互反馈，不受此限制。
- 分隔线统一为 1px，使用 `border-*`、`h-px` 或 `w-px`。相邻容器不得
  叠加两条边框；连接型组件应移除内部重复边。
- 表格外框、横向分隔线及 `variant="grid"` 的竖向分隔线均为 1px。
- Tabs 选中指示线统一为 2px，使用 `h-0.5` 或 `w-0.5`。
- 一级导航选中短指示条统一为 2px，实色使用 `brand` token，不通过
  加粗导航容器边框表达选中。
- 键盘 `focus-visible` 焦点环统一为 `ring-1`（1px），使用品牌橙
  `ring` token，最终可见透明度保持 30%–40%。错误校验状态继续使用
  `destructive` 语义，不与普通键盘焦点环混用。
- Avatar 叠放隔离环可保留 2px；Lucide 图标保留默认 2px 描边。
  这两者不属于容器结构边框。

## Tabs

- 所有业务页签使用 `src/components/ui/tabs.tsx`，保留 `default` 与 `line`
  两套 variant；业务页面不得自行覆盖字号、高度、颜色或指示线粗细。
- Tabs 文字统一为 `text-sm`（14px）、`font-medium`，横向 TabsList 高度统一为
  44px（`h-11`），TabsTrigger 左右内边距统一为 16px（`px-4`）。
- TabsList 使用基础圆角 `rounded-lg`（6px），TabsTrigger 使用
  `rounded-md`（4.8px）；`line` variant 不绘制容器圆角和背景。
- `default` variant 用于页面内部分类：TabsList 使用 `muted` 背景；选中项使用
  `brand-selected`（浅色模式 `#fff4ed`）背景与 `brand`
  （品牌橙 `#ff6703`）文字，可使用轻阴影，但不得同时绘制可见边框。
- `line` variant 用于页面主模块和看板切换：TabsList 使用透明背景与 6px
  间距（`gap-1.5`）；选中项使用 `brand`（品牌橙 `#ff6703`）文字和
  2px 指示线，不使用背景、
  可见边框或阴影。横向指示线位于底部，纵向指示线位于右侧。
- `default` 与 `line` 两套 variant 的选中文字均必须直接使用
  `brand` token，不得回退为 `foreground`、`primary` 或业务页硬编码色值。
- 两套 variant 的 Hover 均使用 `brand-hover`（浅色模式 6% 品牌橙）
  背景与 `brand`（品牌橙 `#ff6703`）文字；键盘焦点使用项目统一的
  1px 品牌橙焦点环。禁用项透明度为 50%。
- Tab 文案保持简短且不换行；窄屏优先减少 Tab 数量或允许 Tabs 区域自身横向
  滚动，不缩小字号，也不造成页面整体横向滚动。

## 按钮

- 所有业务操作统一使用 `src/components/ui/button.tsx`，保留 `default`、
  `outline`、`secondary`、`ghost`、`destructive` 和 `link` 六种 variant；
  业务页面不得覆盖按钮字号、字重、颜色或交互状态。
- 按钮基线字号统一为 `--button-font-size`（13px），字重为 `font-normal`（400），
  基础圆角使用 `rounded-md`（4.8px）。默认尺寸高 36px、左右内边距 16px；
  `xs`、`sm`、`lg` 高度分别为 24px、32px、40px。
- `default` 是主按钮，使用品牌橙 `brand`（`#ff6703`）背景与白色
  `brand-foreground` 文字。每个页面、Dialog 或独立操作区只保留一个主按钮。
- `outline` 使用 1px `border` 和 `card` 背景且不使用阴影；`secondary` 用于
  次级填充操作；`ghost` 用于低强调操作；`destructive` 仅用于删除或不可逆操作。
- `link` 是文本按钮，默认使用品牌橙文字；Hover 时增加 `brand-hover` 底色框，
  不通过下划线表达悬停。
- 纯图标按钮（Icon-only Button）使用同一 `Button` 组件的 `icon-xs`、
  `icon-sm`、`icon` 和 `icon-lg` 尺寸，可视尺寸分别为 24px、28px、36px 和
  40px。`icon-xs` / `icon-sm` 仅用于紧凑表格和工具栏；独立操作优先使用
  `icon`，更强调的操作使用 `icon-lg`。
- 普通纯图标按钮统一使用 1px `border`、`card` 背景和品牌橙图标，
  不使用阴影；Hover 使用 `brand-hover`，持续选中状态使用
  `brand-selected` 并设置 `aria-pressed`。危险图标按钮继续使用
  `destructive` 语义。Lucide 图标自身保持默认 2px 描边，1px 仅指按钮外框。
- 纯图标按钮必须提供明确的 `aria-label`；含义不熟悉或需要补充说明时组合
  项目 `Tooltip`。不得仅依赖图标形状表达删除、提交等高风险操作；
  加载时用 `Spinner` 替换图标并同时设置 `disabled`。
- 普通按钮 Active 时向下位移 1px，Disabled 透明度为 50%；键盘焦点使用项目统一
  的 1px 品牌橙焦点环。按钮内图标使用 `data-icon="inline-start"` 或
  `data-icon="inline-end"`，不在业务页面单独设置图标尺寸。

## 图表配色

- 图表统一使用 `src/features/data-cockpit/components/echarts-chart.tsx` 读取
  `src/app/globals.css` 中的语义 token；业务页面不得直接写入 Hex、RGB 或
  Tailwind 色值。浅色和深色模式保持相同的系列色身份。
- 标准系列色按以下固定顺序使用：`chart-1` 青绿 `#5bc49f`、`chart-2`
  蓝 `#60acfc`、`chart-3` 青 `#32d3eb`、`chart-4` 琥珀 `#feb64d`、
  `chart-5` 紫 `#9287e7`、`chart-6` 珊瑚 `#ff7c7c`。系列颜色跟随图例
  顺序依次分配，不因筛选、排序或页面切换改变同一指标的颜色身份。
- 单系列和主分析系列优先使用 `chart-1`；多系列优先使用前 6 个标准色。超过
  6 个系列时应优先合并低价值分类；确需扩展时，只能从标准色叠加约 20% 白或
  10% 黑形成明度层级，并在全局 token 中登记，不在业务页面临时生成杂色。
- 业务语义优先于系列顺序：成功使用 `success`，提醒使用 `warning`，错误、失败
  和高风险使用 `destructive`，待处理或未开始使用 `border`/`muted`。珊瑚色
  `chart-6` 仅用于无正负含义的分类；存在异常语义时必须改用语义色。
- 折线图在系列较少时使用克制的标准色，系列较多时提高色相区分但不得使用高饱和
  撞色；面积填充使用对应系列色约 10% 不透明度，叠加系列不超过 4 个。
- 柱状图按主题系列色区分类别；同一指标跨时间比较保持同色。正负、达标/未达标
  等状态不得只依靠系列色，必须同时使用标签、图例或形状说明。
- 饼图用于有明确整体关系的数据。连续或有序分段优先采用同一色相的明度层级；
  无序类别使用标准系列色。类别过多时合并为“其他”，避免依靠大量近似颜色区分。
- 渐变只用于连续数值、密度或强调范围，且必须使用同一色系、控制明度跨度；禁止
  装饰性彩虹渐变。图表背景保持透明，由白色 Card 承载；坐标轴与网格线使用
  `border`，图例与辅助文字使用 `muted-foreground`。
- GOFO 品牌橙 `brand` 不进入默认图表系列色板，只用于图表筛选的 Hover、选中、
  键盘焦点以及确有品牌含义的单个标记；同一图表不得把品牌橙同时用作系列色和
  交互强调色。
- 颜色不得成为唯一的信息载体；状态、阈值和异常必须辅以文字、数值、线型、形状
  或图例。图表文字与背景保持清晰对比，避免高彩度颜色作为大面积背景。

## 表格

- 所有业务表格使用 `src/components/ui/table.tsx` 提供的项目基础组件，不在页面
  重复实现表格边框、字号、行高和交互状态。
- 表格内文字统一使用 `text-xs`（12px），表头使用 `font-medium`（500），普通
  单元格继承正文常规字重（400）。
- 表头和数据行统一采用宽松的 48px 行高；表头使用中性浅色背景。
- 表格外层使用语义 `border` 和项目 `rounded-lg` 圆角，表格自身不使用阴影。
- 所有表格保留轻量横向分隔线，不默认使用斑马纹；悬停使用
  `brand-hover`，选中使用 `brand-selected`。
- 字段较少、以阅读和操作为主的列表使用默认 `<Table>`，不添加竖向分隔线。
- 字段较多、需要横向比较连续指标的数据表使用 `<Table variant="grid">`，在列间
  添加竖向分隔线。是否使用 `grid` 由业务语义决定，不根据数据行数量自动切换。
- 文本默认左对齐；数量、金额、百分比和日期时间等可比较数据右对齐，并使用
  `tabular-nums`；状态使用项目 `Badge`。
- 表头保持简短且不换行。行操作位于最右侧，优先使用项目按钮或
  `DropdownMenu`，不得压过主要数据。
- 表格在窄屏允许自身横向滚动，不得造成页面整体横向滚动，也不得通过缩小字号
  容纳更多字段；移动端优先保留关键列，将次要信息移入详情面板或详情页。
- 筛选、批量操作、导出、记录数和分页应与表格组成一个连续的数据区域。
  加载、空结果和失败状态分别使用项目 `Skeleton`、`Empty` 和 `Alert`/toast。

## 表格查询工具栏

- 需要查询条件的运营列表统一采用“查询工具栏 + 表格 + 分页”的单一数据区域。
  查询条件、已选条件、导出、批量操作、记录数和分页不得拆成彼此独立的 Card，
  整个区域仅保留一个 1px 外框和必要的 1px 内部分隔线，不使用静态阴影。
- 查询字段使用 `FieldGroup`、`Field` 与项目 `Input`、`Select`、日期控件等基础
  组件组合；业务页面不得手写控件边框、字号、焦点或状态颜色。字段标签使用
  `text-xs`（12px）/400，控件文字使用 `text-sm`（14px）/400，控件高度使用默认
  36px，字段间距为 12px，工具栏内边距为 16px。
- 桌面端首行默认放置 4 个最高频且能显著缩小结果集的条件，按等宽四列排列。
  关键词、状态、日期/日期范围与路区等为优先条件；低频或组合条件折叠到
  “更多条件”，展开后另起行显示，不能挤压首行高频条件。
- 操作区固定另起一行：导出及“更多条件”放左侧；查询与重置放右侧，顺序为
  “查询 → 重置”。查询使用唯一的 `default` 主按钮，重置与导出使用 `outline`；
  不为查询工具栏添加第二个实色主按钮。导出必须基于当前已提交的查询条件。
- 已提交条件在操作区下方以可移除标签展示。“已选条件”说明和标签文字均为
  `text-xs`（12px）/400，不加粗；标签使用 `brand-selected` 浅色背景、1px 轻边框
  和 `rounded-sm`，移除按钮必须有 `aria-label` 且支持键盘操作。标签不是状态语义，
  不使用 success、warning 或 destructive 色。
- 点击查询后刷新表格并回到第 1 页；重置应清空全部条件、已选条件标签和展开状态，
  并回到第 1 页。查询、重置、导出及移除标签均应提供可见的键盘焦点状态；加载、
  空结果和失败状态分别使用项目 `Skeleton`、`Empty` 和 `Alert`/toast。
- 窄屏下查询字段按单列排列；操作行允许换行但导出保持在左侧组，查询和重置保持在
  右侧组且顺序不变。不得隐藏必填或高频条件，也不得造成页面整体横向滚动；字段较多
  的表格只允许表格区域自身横向滚动。

## 分页

- 数据列表统一使用 `src/components/ui/pagination.tsx`。基础页码可组合
  `Pagination` 系列原语；完整数据表优先使用受控 `DataPagination`，不得在业务页面
  重复实现页码计算、跳页校验或分页交互样式。
- 分页字号统一为 `--pagination-font-size`（13px）、字重为 400；当前页使用 500。
  控件高度统一为 `--pagination-control-height`（32px），页码间距使用
  `--pagination-gap`（6px），基础圆角使用 `rounded-md`（4.8px）。
- 页码、上一页、下一页、页容量选择和跳页输入使用 1px 结构边框且不使用阴影。
  Hover 使用 `brand-hover` 背景与品牌橙文字；当前页使用 `brand-selected` 背景、
  `brand` 文字和透明边框。键盘焦点使用项目统一的 1px 品牌橙焦点环，禁用状态
  透明度为 50%。
- 完整分页默认显示总记录数、每页条数、上一页、页码、下一页与跳页输入；每页条数
  默认提供 10、20、50 三档，切换后必须回到第 1 页。跳页值必须限制在有效页码范围内。
- 桌面端左侧放置总记录数和每页条数，右侧放置页码导航和跳页；窄屏上下堆叠，
  上一页和下一页隐藏文字，仅保留图标，页码只保留首页、当前页和末页，且不得造成
  页面整体横向滚动。
- 表格与分页必须共享同一个 1px 外框。通过 `<Table footer={<DataPagination ... />}>`
  将分页放入表格容器，分页自身只绘制顶部 1px 分隔线，不另加外框或阴影，避免
  双边框和边框、阴影叠加。

## 组合与无障碍

- 优先组合现有 shadcn 组件，不重复制作已有基础控件。
- 表单控件必须有可访问的标签、说明和校验状态。
- Dialog、Sheet 和 Drawer 必须提供可访问标题。
- Avatar 必须提供 fallback。
- 加载、空状态、提示、分隔线、标签和 toast 使用对应项目组件。
- 所有交互必须支持键盘操作，并使用品牌橙 `ring` token 保持可见的
  焦点状态；错误态继续使用 `destructive` 焦点反馈。

## 变更流程

1. 运行 `pnpm shadcn info --json` 确认项目配置。
2. 使用 `pnpm shadcn search` 或官方文档查找组件。
3. 使用 `pnpm shadcn add <name> --dry-run` 预览变更。
4. 安装或更新项目内组件。
5. 检查 `src/components/ui` 和 `src/app/globals.css` 的差异。
6. 运行 `pnpm lint` 和 `pnpm build`。

## 禁止事项

- 不在 `~/.codex/AGENTS.md` 或其他全局 AI 指令中加入本规范。
- 不在 `~/.agents/skills` 或 `~/.codex/skills` 安装本项目 Skill。
- 不复制其他项目的 `components.json`、`globals.css` 或 `components/ui`。
- 不引用目标项目之外的 UI 源码。
