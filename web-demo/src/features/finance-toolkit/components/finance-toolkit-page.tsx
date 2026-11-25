"use client"

import { CalculatorIcon, DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const instructions = [
  {
    title: "下载并解压",
    description: "下载 ZIP 并解压，得到 GOFO结算工具 Setup 0.1.0.exe。",
  },
  {
    title: "安装程序",
    description: "双击安装程序，按照安装向导完成安装。",
  },
  {
    title: "启动工具",
    description: "从桌面快捷方式“GOFO结算工具”启动。",
  },
]

export function FinanceToolkitPage() {
  return (
    <section
      aria-labelledby="settlement-tool-title"
      className="@container/toolkit mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 py-8 @3xl/content:gap-16"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-4 text-left">
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-selected text-brand"
          >
            <CalculatorIcon className="size-7" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 id="settlement-tool-title" className="text-2xl leading-8 font-medium">
              GOFO 结算工具
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" size="lg">离线版 · Windows</Badge>
              <span className="text-sm text-muted-foreground tabular-nums">v0.1.0</span>
            </div>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          离线运行的财务结算核对工具，下载安装后本地使用，无需联网。
        </p>
        <Button
          type="button"
          className="w-48"
          onClick={() => toast.info("下载入口暂未接入")}
        >
          <DownloadIcon data-icon="inline-start" />
          下载
        </Button>
      </div>

      <Card className="[--card-spacing:--spacing(8)]">
        <CardHeader>
          <CardTitle className="font-medium">
            <h2>使用说明</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-6 @3xl/toolkit:grid-cols-3 @3xl/toolkit:gap-0">
            {instructions.map((instruction, index) => (
              <li
                key={instruction.title}
                className="flex min-w-0 flex-col gap-3 border-t pt-6 first:border-t-0 first:pt-0 @3xl/toolkit:border-t-0 @3xl/toolkit:pt-0 @3xl/toolkit:not-first:border-l @3xl/toolkit:not-first:pl-8 @3xl/toolkit:not-last:pr-8"
              >
                <span aria-hidden="true" className="text-5xl leading-none font-medium tabular-nums text-muted-foreground/45">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-medium">{instruction.title}</h3>
                  <p className="break-words text-sm leading-relaxed text-muted-foreground">
                    {instruction.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  )
}
