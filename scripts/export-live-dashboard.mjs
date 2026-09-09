import { spawn } from "node:child_process"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"

const sourceUrl = process.argv[2] ?? "http://127.0.0.1:3000/live-dashboard"
const outputPath = resolve(process.argv[3] ?? "demo/live-dashboard.html")
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const debuggingPort = 9333
const profilePath = await mkdtemp(`${tmpdir()}/dsp-dashboard-export-`)

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profilePath}`,
  "about:blank",
], { stdio: "ignore" })

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

async function findDebugTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`)
      const targets = await response.json()
      const page = targets.find((target) => target.type === "page")
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      // Chrome may need a moment to expose its debugging endpoint.
    }
    await delay(100)
  }
  throw new Error("Chrome debugging endpoint did not become available")
}

const socket = new WebSocket(await findDebugTarget())
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener("open", resolveOpen, { once: true })
  socket.addEventListener("error", rejectOpen, { once: true })
})

let commandId = 0
const pendingCommands = new Map()
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data)
  if (!message.id) return
  const pending = pendingCommands.get(message.id)
  if (!pending) return
  pendingCommands.delete(message.id)
  if (message.error) pending.reject(new Error(message.error.message))
  else pending.resolve(message.result)
})

function command(method, params = {}) {
  commandId += 1
  const id = commandId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolveCommand, rejectCommand) => {
    pendingCommands.set(id, { resolve: resolveCommand, reject: rejectCommand })
  })
}

try {
  await command("Page.enable")
  await command("Runtime.enable")
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await command("Page.navigate", { url: sourceUrl })

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await command("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    })
    if (state.result.value === "complete") break
    await delay(100)
  }

  await delay(1800)
  await command("Runtime.evaluate", {
    expression: `(async () => {
      const step = Math.max(500, window.innerHeight * 0.75)
      for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
        window.scrollTo(0, top)
        await new Promise((resolve) => setTimeout(resolve, 80))
      }
      window.scrollTo(0, 0)
      await new Promise((resolve) => setTimeout(resolve, 250))
    })()`,
    awaitPromise: true,
  })

  const snapshot = await command("Runtime.evaluate", {
    expression: `(async () => {
      const toDataUrl = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const inlineUrl = async (rawUrl, baseUrl) => {
        if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("#")) return rawUrl
        try {
          const absoluteUrl = new URL(rawUrl, baseUrl).href
          const response = await fetch(absoluteUrl)
          if (!response.ok) return rawUrl
          return await toDataUrl(await response.blob())
        } catch {
          return rawUrl
        }
      }

      const inlineCssUrls = async (cssText, baseUrl) => {
        const matches = [...cssText.matchAll(/url\\((['\"]?)(.*?)\\1\\)/g)]
        const replacements = await Promise.all(matches.map(async (match) => ({
          source: match[0],
          replacement: 'url("' + await inlineUrl(match[2], baseUrl) + '")',
        })))
        let output = cssText
        for (const item of replacements) output = output.replaceAll(item.source, item.replacement)
        return output
      }

      for (const canvas of [...document.querySelectorAll("canvas")]) {
        try {
          const bounds = canvas.getBoundingClientRect()
          const image = document.createElement("img")
          image.src = canvas.toDataURL("image/png")
          image.alt = canvas.getAttribute("aria-label") || "数据图表"
          image.className = canvas.className
          image.style.cssText = canvas.style.cssText
          image.style.width = bounds.width + "px"
          image.style.height = bounds.height + "px"
          image.style.display = "block"
          canvas.replaceWith(image)
        } catch {
          // Keep the original element if a canvas cannot be serialized.
        }
      }

      const stylesheetLinks = [...document.querySelectorAll('link[rel="stylesheet"]')]
      for (const link of stylesheetLinks) {
        try {
          const response = await fetch(link.href)
          const style = document.createElement("style")
          style.dataset.exportedFrom = link.href
          style.textContent = await inlineCssUrls(await response.text(), link.href)
          link.replaceWith(style)
        } catch {
          // A same-origin stylesheet should normally be readable; leave it in place otherwise.
        }
      }

      for (const image of [...document.images]) {
        image.src = await inlineUrl(image.currentSrc || image.src, document.baseURI)
        image.removeAttribute("srcset")
      }

      for (const element of [...document.querySelectorAll('[style*="url("]')]) {
        element.setAttribute("style", await inlineCssUrls(element.getAttribute("style"), document.baseURI))
      }

      for (const input of document.querySelectorAll("input")) input.setAttribute("value", input.value)
      for (const textarea of document.querySelectorAll("textarea")) textarea.textContent = textarea.value

      document.querySelectorAll("script, link[rel='icon'], link[rel='preload'], link[rel='modulepreload'], link[rel='prefetch']").forEach((node) => node.remove())
      document.querySelectorAll("nextjs-portal").forEach((node) => node.remove())
      document.documentElement.dataset.exportedPage = "live-dashboard"
      document.documentElement.style.scrollBehavior = "auto"

      const exportStyle = document.createElement("style")
      exportStyle.textContent = "html,body{min-height:100%;}body{overflow:auto!important;}button,a,input,select{cursor:default!important;}"
      document.head.append(exportStyle)

      return '<!doctype html>\\n' + document.documentElement.outerHTML
    })()`,
    awaitPromise: true,
    returnByValue: true,
  })

  const html = snapshot.result.value
  if (!html?.includes("实时看板")) throw new Error("The rendered dashboard was not found in the captured page")

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, html, "utf8")
  console.log(`Exported ${outputPath}`)
} finally {
  socket.close()
  chrome.kill("SIGTERM")
}
