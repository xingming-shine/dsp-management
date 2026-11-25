"use client"

import { useRef, useState, type ComponentProps } from "react"
import { CopyIcon, ImageIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import { DataPagination } from "@/components/ui/pagination"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatTime } from "@/lib/date-time"
import { cn } from "@/lib/utils"

export type WaybillDetailSheetRow = {
  trackingNumber: string
  pushedAt: string
  pickupCourier: string | null
  pickupStatus: string
  waybillStatus?: string
  actionAt: string
  route: string
  postalCode: string
  nonStandardReturnInfo?: {
    returnedAt: string
    stationName: string
    reason: string
    operator: string
  } | null
}

export function WaybillDetailSheet({
  row,
  onOpenChange,
  embedded = false,
}: {
  row: WaybillDetailSheetRow | null
  onOpenChange: (open: boolean) => void
  embedded?: boolean
}) {
  const [podPage, setPodPage] = useState(1)
  const [podPageSize, setPodPageSize] = useState(20)
  const [issuePage, setIssuePage] = useState(1)
  const [issuePageSize, setIssuePageSize] = useState(20)
  const [previewImage, setPreviewImage] = useState<number | null>(null)
  const sheetContentRef = useRef<HTMLDivElement>(null)
  const operationRecords = row
    ? [
        {
          label: row.pickupStatus,
          time: row.nonStandardReturnInfo?.returnedAt ?? row.actionAt,
          operator: row.nonStandardReturnInfo?.operator ?? row.pickupCourier ?? "系统",
          location: row.nonStandardReturnInfo?.stationName ?? row.route,
        },
        { label: "快递员取件", time: row.actionAt, operator: row.pickupCourier ?? "—", location: row.route },
        { label: "扫描分拣", time: row.pushedAt, operator: "站点操作员", location: row.route },
        { label: "站点签入", time: row.pushedAt, operator: "系统", location: row.route },
        { label: "任务推送", time: row.pushedAt, operator: "系统", location: row.route },
      ]
    : []

  const copyTrackingNumber = async () => {
    if (!row) return

    try {
      await navigator.clipboard.writeText(row.trackingNumber)
      toast.success("单号已复制")
    } catch {
      toast.error("复制失败，请手动复制单号")
    }
  }

  return (
    <>
      <Sheet
        open={Boolean(row)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
          onOpenChange(open)
        }}
      >
        <DetailSurface
          embedded={embedded}
          ref={sheetContentRef}
          className="w-full gap-0 p-0 sm:!w-[85vw] sm:!max-w-none"
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            sheetContentRef.current?.focus()
          }}
        >
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 border-transparent bg-transparent shadow-none hover:border-transparent"
              aria-label="关闭运单详情"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </SheetClose>
          {row ? (
            <>
              <SheetHeader className="gap-1 px-6 py-5 pe-14 sm:px-10 sm:pe-16">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="flex items-center gap-1">
                    <SheetTitle className="text-xl">{row.trackingNumber}</SheetTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 border-transparent bg-transparent text-brand shadow-none hover:border-transparent hover:bg-transparent hover:text-brand"
                      onClick={copyTrackingNumber}
                      aria-label="复制单号"
                    >
                      <CopyIcon aria-hidden="true" />
                    </Button>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    运单状态：{row.waybillStatus ?? row.pickupStatus}
                  </span>
                </div>
                <SheetDescription className="sr-only">
                  {row.trackingNumber} 的运单详情
                </SheetDescription>
              </SheetHeader>

              <div className={cn("min-h-0 min-w-0 flex-1", embedded ? "block overflow-y-auto @[52rem]:grid @[52rem]:grid-cols-[minmax(0,1fr)_28rem]" : "grid xl:grid-cols-[minmax(0,1fr)_28rem]")}>
                <div className={cn("min-h-0 min-w-0 px-6 pb-5 sm:px-10", embedded ? "@[52rem]:overflow-y-auto" : "overflow-y-auto")}>
                  <section aria-labelledby="recipient-information-title">
                    <h3 id="recipient-information-title" className="font-heading text-base font-medium">
                      收件人信息
                    </h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
                      {[
                        ["国家", "USA"],
                        ["收件州/省", "California"],
                        ["收件郡县", "San Francisco"],
                        ["收件地邮编", row.postalCode],
                        ["收件区", "Mission Bay"],
                        ["收件地址", "168 N 193RD AVE"],
                      ].map(([label, value]) => (
                        <div key={label} className={label === "收件地址" ? "sm:col-span-3" : undefined}>
                          <dt className="text-sm font-medium text-foreground">{label}</dt>
                          <dd className="mt-1 text-sm text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section className="mt-6" aria-labelledby="additional-information-title">
                    <h3 id="additional-information-title" className="font-heading text-base font-medium">
                      附加信息
                    </h3>
                    <Tabs defaultValue="pod" className="mt-3 gap-3">
                      <div className="relative w-fit">
                        <Separator className="absolute inset-x-0 -bottom-[5px]" />
                        <TabsList variant="line">
                          <TabsTrigger value="pod">POD信息</TabsTrigger>
                          <TabsTrigger value="issue">问题件记录</TabsTrigger>
                        </TabsList>
                      </div>
                      <TabsContent value="pod" className="min-w-0">
                        <Table
                          variant="grid"
                          viewportClassName="h-72"
                          footer={
                            <DataPagination
                              page={podPage}
                              pageSize={podPageSize}
                              total={1}
                              onPageChange={setPodPage}
                              onPageSizeChange={setPodPageSize}
                              pageSizeOptions={[10, 20, 50]}
                            />
                          }
                        >
                          <TableHeader>
                            <TableRow>
                              <TableHead>签到类型</TableHead>
                              <TableHead>POD图片</TableHead>
                              <TableHead>签收快递员名称</TableHead>
                              <TableHead>签收日期</TableHead>
                              <TableHead>妥投时效</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="[&_tr:last-child]:border-b">
                            <TableRow>
                              <TableCell>门口/院内</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3].map((image) => (
                                    <Button
                                      key={image}
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      className="bg-brand-selected text-brand hover:bg-brand-hover hover:text-brand"
                                      aria-label={`查看 POD 图片 ${image} 大图`}
                                      onClick={() => setPreviewImage(image)}
                                    >
                                      <ImageIcon aria-hidden="true" />
                                    </Button>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>{row.pickupCourier ?? "—"}</TableCell>
                              <TableCell className="tabular-nums">
                                {formatDate(row.actionAt)} {formatTime(row.actionAt)}
                              </TableCell>
                              <TableCell className="tabular-nums">2400</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TabsContent>
                      <TabsContent value="issue" className="min-w-0">
                        <Table
                          variant="grid"
                          className="min-w-[70rem]"
                          viewportClassName="h-72"
                          footer={
                            <DataPagination
                              page={issuePage}
                              pageSize={issuePageSize}
                              total={0}
                              onPageChange={setIssuePage}
                              onPageSizeChange={setIssuePageSize}
                              pageSizeOptions={[10, 20, 50]}
                            />
                          }
                        >
                          <TableHeader>
                            <TableRow>
                              <TableHead>问题件类型</TableHead>
                              <TableHead>异常备注</TableHead>
                              <TableHead>上传图片</TableHead>
                              <TableHead>处理指令</TableHead>
                              <TableHead>处理人</TableHead>
                              <TableHead>处理时间</TableHead>
                              <TableHead>上报人</TableHead>
                              <TableHead>上报机构</TableHead>
                              <TableHead>上报时间</TableHead>
                              <TableHead>处理备注</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="[&_tr:last-child]:border-b">
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={10} className="h-60 p-0">
                                <Empty className={cn("sticky left-0 min-h-60 rounded-none", !embedded && "w-[calc(100vw-2.5rem)] sm:w-[calc(85vw-2.5rem)] xl:w-[calc(85vw-30.5rem)]")}>
                                  <EmptyDescription>暂无数据</EmptyDescription>
                                </Empty>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TabsContent>
                    </Tabs>
                  </section>
                </div>

                <aside className={cn("min-h-0 border-t px-6 py-5 sm:px-10", embedded ? "@[52rem]:overflow-y-auto @[52rem]:border-t-0 @[52rem]:border-s" : "xl:border-t-0 xl:border-s")} aria-labelledby="operation-record-title">
                  <h3 id="operation-record-title" className="font-heading text-base font-medium">
                    操作记录
                  </h3>
                  <ol className="mt-4 flex flex-col gap-5 border-s ps-5">
                    {operationRecords.map((record, index) => (
                      <li key={`${record.label}-${index}`} className="relative text-sm">
                        <span
                          className={cn(
                            "absolute -start-[1.625rem] top-1 size-2.5 rounded-full border-2 bg-card",
                            index === 0 ? "border-brand" : "border-muted-foreground/35"
                          )}
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p>{record.label}</p>
                            <p className="mt-1 tabular-nums text-muted-foreground">
                              {formatDate(record.time)} {formatTime(record.time)}
                            </p>
                          </div>
                          <p className="text-end text-muted-foreground">
                            {record.operator}
                            <br />
                            {record.location}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </aside>
              </div>
            </>
          ) : null}
        </DetailSurface>
      </Sheet>

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">POD 图片 {previewImage}</DialogTitle>
          <DialogDescription className="sr-only">
            查看 POD 图片 {previewImage} 大图
          </DialogDescription>
          <div className="flex aspect-[4/3] max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-muted">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <ImageIcon className="size-20" aria-hidden="true" />
              <span className="text-sm">POD 图片 {previewImage}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The same detail content can live in a workspace without creating a portal or overlay. */
function DetailSurface({ embedded, children, ...props }: ComponentProps<typeof SheetContent> & { embedded: boolean }) {
  if (embedded) return <div className="@container relative flex h-full min-w-0 flex-col">{children}</div>
  return <SheetContent {...props}>{children}</SheetContent>
}
