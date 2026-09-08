# DSP 管理系统

基于 Next.js、React、TypeScript 和项目自有 shadcn/ui 组件构建的 DSP 管理项目，包含数据驾驶舱、实时看板和个人设置等页面。

## 本地开发

安装 Node.js 24，并启用 Corepack，使用 `package.json` 指定的 pnpm 版本。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

访问 http://localhost:3000。

## 检查与生产运行

```sh
pnpm lint
pnpm build
pnpm start
```

## 项目目录

- `src/app`：路由与全局样式
- `src/components`：基础组件与布局
- `src/features`：业务功能
- `src/services`、`src/mocks`：服务接口与模拟数据
- `public/assets`：页面静态资源
- `参考文档`、`切图`：需求参考与设计资源

当前项目包含模拟数据，接入真实业务服务前请检查服务实现。UI 开发遵循 `AGENTS.md` 和 `ui-standards.md`。
