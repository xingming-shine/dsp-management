# DSP 管理系统

基于 Next.js、React、TypeScript 和项目自有 shadcn/ui 组件构建的 DSP 管理项目，包含数据驾驶舱、实时看板和个人设置等页面。可运行的 Web demo 位于 `web-demo/`，项目资料保留在仓库根目录。

## 本地开发

安装 Node.js 24，并启用 Corepack，使用 `web-demo/package.json` 指定的 pnpm 版本。

```sh
corepack enable
cd web-demo
pnpm install --frozen-lockfile
pnpm dev
```

访问 http://localhost:3000。

## 检查与生产运行

```sh
cd web-demo
pnpm lint
pnpm build
pnpm start
```

## Vercel 发布

在现有 Vercel 项目的 **Build and Deployment → Root Directory** 中填写 `web-demo`。设置从下一次部署起生效，生产域名和页面路径保持不变。

## 项目目录

- `web-demo/src/app`：路由与全局样式
- `web-demo/src/components`：基础组件与布局
- `web-demo/src/features`：业务功能
- `web-demo/src/services`、`web-demo/src/mocks`：服务接口与模拟数据
- `web-demo/public/assets`：页面静态资源
- `web-demo/demo`：独立 HTML 预览
- `参考文档`、`切图`：需求参考与设计资源

当前项目包含模拟数据，接入真实业务服务前请检查服务实现。UI 开发遵循 `AGENTS.md` 和 `ui-standards.md`。
