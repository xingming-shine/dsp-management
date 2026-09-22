// Regenerate the standalone HTML using this project's own components and CSS.
import { createRequire } from "node:module"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)
const cssRequire = createRequire(require.resolve("@tailwindcss/postcss"))
const { compile } = cssRequire("@tailwindcss/node")
const originalLoaders = { ts: require.extensions[".ts"], tsx: require.extensions[".tsx"] }
function loadTs(module, filename) {
  const source = readFileSync(filename, "utf8").replace(/(["'])@\/([^"']+)\1/g, (_, quote, path) => quote + resolve(root, "src", path) + quote)
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } })
  module._compile(result.outputText, filename)
}
require.extensions[".ts"] = loadTs
require.extensions[".tsx"] = loadTs
let markup
try {
  const { TimelineOptions } = require(resolve(root, "src/components/design/timeline-options.tsx"))
  markup = renderToStaticMarkup(React.createElement(TimelineOptions))
} finally {
  for (const ext of ["ts", "tsx"]) {
    if (originalLoaders[ext]) require.extensions[`.${ext}`] = originalLoaders[ext]
    else delete require.extensions[`.${ext}`]
  }
}
const candidates = [...new Set([...markup.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&gt;", ">").replaceAll("&lt;", "<").split(/\s+/)))]
const compiler = await compile(readFileSync(resolve(root, "src/app/globals.css"), "utf8"), { base: resolve(root, "src/app"), onDependency() {} })
const css = compiler.build(candidates)

function interaction() {
  const lab = document.querySelector(".timeline-lab")
  const announcement = document.querySelector("[data-announcement]")
  document.addEventListener("click", event => {
    const button = event.target.closest("button")
    if (!button) return
    if (button.dataset.scenarioButton) {
      const scenario = button.dataset.scenarioButton
      document.querySelectorAll("[data-scenario]").forEach(panel => { panel.hidden = panel.dataset.scenario !== scenario })
      document.querySelectorAll("[data-scenario-button]").forEach(item => item.setAttribute("aria-pressed", String(item === button)))
      announcement.textContent = `已切换为${button.textContent}示例`
    }
    if (button.dataset.focusOption) {
      lab.dataset.view = button.dataset.focusOption
      announcement.textContent = `正在单独预览方案 ${button.dataset.focusOption.toUpperCase()}`
      document.querySelector('[data-action="overview"]').focus()
    }
    if (button.dataset.action === "overview") {
      lab.dataset.view = "all"
      announcement.textContent = "已展示全部三个方案"
    }
    if (button.dataset.action === "width") {
      const narrow = lab.dataset.width !== "narrow"
      lab.dataset.width = narrow ? "narrow" : "desktop"
      button.setAttribute("aria-pressed", String(narrow))
      button.querySelector("[data-width-label]").textContent = narrow ? "恢复宽屏" : "窄屏预览"
      announcement.textContent = narrow ? "已切换为窄屏预览" : "已恢复宽屏预览"
    }
    if (button.dataset.action === "theme") {
      const dark = document.documentElement.classList.toggle("dark")
      button.setAttribute("aria-pressed", String(dark))
      button.querySelector("[data-theme-label]").textContent = dark ? "浅色预览" : "深色预览"
    }
  })
}

const html = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DSP 审核时间线 · 三套方案</title><style>/* Generated from src/app/globals.css. Do not edit this snapshot. */\n${css}</style></head><body>${markup}<script>(${interaction.toString()})();</script></body></html>`
mkdirSync(resolve(root, "demo"), { recursive: true })
writeFileSync(resolve(root, "demo/timeline-options.html"), html)
console.log("Exported demo/timeline-options.html")
