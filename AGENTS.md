# DSP 管理项目指令

## 作用范围

本文件只适用于当前仓库根目录及其所有子目录。这里的 UI 约束不得被视为
用户级、工作区级或跨项目规则。

## UI 工作要求

- 开始 UI 工作前，先完整阅读 `ui-standards.md`。
- 使用当前仓库根目录的 `components.json`。
- 只在 `src/app/globals.css` 维护主题 token 和全局样式。
- 只使用或修改 `src/components/ui` 中的项目自有基础组件。
- 使用当前仓库 `.agents/skills/shadcn` 下的项目级 shadcn Skill。
- 所有 shadcn 命令必须从当前仓库根目录运行，并使用项目的 pnpm。
- 不从其他项目导入组件、CSS、配置、Skill 或 UI 规范。
- 不把本项目的 UI 规则写入用户级或全局 Codex 指令。
- 若全局 UI 指令与 `ui-standards.md` 冲突，当前仓库内以
  `ui-standards.md` 为准。

## 验证

- UI 变更后运行 `pnpm lint`。
- 提交前运行 `pnpm build`。
- 新增 shadcn 组件前先使用 `--dry-run` 检查将要写入的文件。
