"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ArrowLeftIcon, ArrowRightIcon, ExternalLinkIcon, FileQuestionIcon, Maximize2Icon, VideoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { LearningContent, LearningItem } from "../data"

export function LearningContentBody({ item }: { item: LearningItem }) {
  const content = item.content
  if (item.type === "PPT" && content?.kind === "slides") return <SlideContent content={content} title={item.title} />
  if (item.type === "图文" && content?.kind === "article") return <ArticleContent content={content} />
  if (item.type === "视频") return <VideoContent content={content?.kind === "video" ? content : undefined} title={item.title} />
  if (item.type === "外部链接") return <ExternalContent content={content?.kind === "external" ? content : undefined} title={item.title} />
  return <MissingContent type={item.type} />
}

function SlideContent({ content, title }: { content: Extract<LearningContent, { kind: "slides" }>; title: string }) {
  const [index, setIndex] = useState(0)
  const viewerRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const slide = content.slides[index]
  if (!slide) return <MissingContent type="PPT" />

  function changeSlide(next: number) {
    setIndex(next)
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  return <section aria-label={`${title} 幻灯片`} className="flex flex-col gap-3">
    <div ref={viewerRef} className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 fullscreen:justify-center fullscreen:rounded-none fullscreen:border-0 fullscreen:bg-background fullscreen:p-6">
      <div className="relative flex aspect-video flex-col justify-between gap-5 overflow-y-auto rounded-md bg-card p-6 sm:p-10">
        {slide.image ? <><h3 ref={headingRef} tabIndex={-1} className="sr-only">{slide.title}</h3><Image src={slide.image.src} alt={slide.image.alt} width={1600} height={900} className="absolute inset-0 size-full object-contain" /></> : <>
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium text-muted-foreground">{slide.subtitle ?? "GOFO DSP · 学习资料"}</p>
            <h3 ref={headingRef} tabIndex={-1} className="text-xl font-medium leading-snug outline-none sm:text-2xl">{slide.title}</h3>
            <ul className="grid gap-2 text-sm leading-relaxed sm:gap-3 sm:text-base">
              {slide.points?.map((point) => <li key={point} className="flex items-start gap-3"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-data-accent" />{point}</li>)}
            </ul>
          </div>
          <p className="text-right text-xs text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")} / {String(content.slides.length).padStart(2, "0")}</p>
        </>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">第 {index + 1} / {content.slides.length} 页</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => changeSlide(index - 1)}><ArrowLeftIcon data-icon="inline-start" />上一页</Button>
          <Button type="button" variant="outline" size="sm" disabled={index === content.slides.length - 1} onClick={() => changeSlide(index + 1)}>下一页<ArrowRightIcon data-icon="inline-end" /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void viewerRef.current?.requestFullscreen() }}><Maximize2Icon data-icon="inline-start" />全屏</Button>
        </div>
      </div>
    </div>
  </section>
}

function ArticleContent({ content }: { content: Extract<LearningContent, { kind: "article" }> }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-4">
    {content.sections.map((section, index) => <section key={`${section.heading}-${index}`} className="flex flex-col gap-3">
      <h3 className="border-b pb-3 text-base font-medium">{section.heading}</h3>
      {section.paragraphs?.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-foreground/85">{paragraph}</p>)}
      {section.points ? <ul className="flex flex-col gap-2 pl-5 text-sm leading-7 text-foreground/85">{section.points.map((point) => <li key={point} className="list-disc">{point}</li>)}</ul> : null}
      {section.image ? <figure className="flex flex-col gap-2"><Image src={section.image.src} alt={section.image.alt} width={1200} height={675} className="h-auto w-full rounded-lg border object-contain" /><figcaption className="text-xs text-muted-foreground">{section.image.caption ?? section.image.alt}</figcaption></figure> : null}
    </section>)}
  </div>
}

function VideoContent({ content, title }: { content?: Extract<LearningContent, { kind: "video" }>; title: string }) {
  return <section aria-label={`${title} 视频`} className="flex flex-col gap-5">
    {content?.src ? <video className="aspect-video w-full rounded-lg bg-foreground object-contain" controls preload="metadata" poster={content.poster} aria-label={title}>
      <source src={content.src} />
      {content.captions ? <track kind="captions" src={content.captions} srcLang="zh" label="中文字幕" /> : null}
      当前浏览器无法播放此视频。
    </video> : <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 p-6 text-center"><VideoIcon className="size-8 text-muted-foreground" /><p className="text-sm font-medium">视频文件待配置</p><p className="text-xs text-muted-foreground">配置可播放的视频地址后，可在此处直接观看。</p></div>}
    {content?.chapters?.length ? <div className="flex flex-col gap-3"><h3 className="text-sm font-medium">视频章节</h3><ol className="grid gap-2 sm:grid-cols-2">{content.chapters.map((chapter) => <li key={`${chapter.time}-${chapter.title}`} className="flex gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"><span className="tabular-nums text-muted-foreground">{chapter.time}</span>{chapter.title}</li>)}</ol></div> : null}
  </section>
}

function ExternalContent({ content, title }: { content?: Extract<LearningContent, { kind: "external" }>; title: string }) {
  const domain = content?.url ? new URL(content.url).hostname.replace(/^www\./, "") : null
  return <section aria-label={`${title} 外部资源`} className="flex flex-col gap-5 rounded-xl border p-5 sm:p-6">
    <div className="flex size-10 items-center justify-center rounded-lg bg-muted"><ExternalLinkIcon className="size-5 text-brand" /></div>
    <div className="flex flex-col gap-2"><p className="text-xs text-muted-foreground">外部学习资料 · {content?.source ?? domain ?? "来源待配置"}</p><h3 className="text-lg font-medium">{title}</h3><p className="text-sm leading-6 text-muted-foreground">{content?.summary ?? "外部链接尚未配置，请联系内容管理员。"}</p></div>
    {domain ? <p className="break-all text-xs text-muted-foreground">目标网站：{domain}</p> : null}
    {content?.url ? <Button asChild className="self-start"><a href={content.url} target="_blank" rel="noopener noreferrer">打开外部内容<ExternalLinkIcon data-icon="inline-end" /></a></Button> : null}
  </section>
}

function MissingContent({ type }: { type: LearningItem["type"] }) {
  return <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 p-6 text-center"><FileQuestionIcon className="size-8 text-muted-foreground" /><p className="text-sm font-medium">{type}内容待配置</p><p className="text-xs text-muted-foreground">请联系内容管理员补充此条学习资料。</p></div>
}
