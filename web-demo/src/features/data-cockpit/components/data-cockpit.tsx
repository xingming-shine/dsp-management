"use client"

import Image from "next/image"
import { useState, useSyncExternalStore } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOrganization } from "@/features/organizations/organization-context"
import { OverviewTab } from "./overview-tab"
import { OperationalTab } from "./cockpit-operations"
import { CockpitDriver } from "./cockpit-driver"
import { CockpitRanking } from "./cockpit-ranking"
import { cockpitTabs } from "../mock-data"
import { defaultSelection, type Selection } from "../cockpit-model"
import type { CockpitView } from "../types"
import { getDspScenario } from "../mocks"

function isCockpitView(value: string | null): value is CockpitView {
  return cockpitTabs.some((tab) => tab.value === value)
}
function subscribeLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  return () => window.removeEventListener("popstate", onChange)
}
function getLocationView(): CockpitView {
  const queryView = new URLSearchParams(window.location.search).get("view")
  return isCockpitView(queryView) ? queryView : "overview"
}
export function DataCockpit() {
  const { organizationId } = useOrganization()
  const scenario = getDspScenario(organizationId)
  const view = useSyncExternalStore<CockpitView>(subscribeLocation, getLocationView, (): CockpitView => "overview")
  const [context, setContext] = useState<Selection>(defaultSelection())
  const [navigation, setNavigation] = useState(0)
  const navigate = (next: CockpitView, selection?: Selection) => {
    setContext(selection || defaultSelection())
    setNavigation((n) => n + 1)
    const url = new URL(window.location.href)
    if (next === "overview") url.searchParams.delete("view")
    else url.searchParams.set("view", next)
    window.history.replaceState(null, "", url)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }
  return <div className="relative -m-4 flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
      <Image
        src="/assets/dsp-ranking/data-cockpit-page-bg.png"
        alt=""
        width={1986}
        height={792}
        priority
        sizes="100vw"
        className="pointer-events-none absolute right-0 -top-[45px] h-auto w-full object-contain object-right-top"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <Tabs value={view} onValueChange={(v) => isCockpitView(v) && navigate(v)} className="relative z-10 gap-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto pb-1"><TabsList variant="line">{cockpitTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}</TabsList></div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{scenario.sizeLabel}</Badge>
            <span className="tabular-nums">{scenario.driverCount} 名司机 · {Math.round(scenario.driverCount * scenario.activeRate)} 名活跃 · {scenario.routeCount} 个路区</span>
            <span>{scenario.operatingMode}</span>
          </div>
        </div>
        <TabsContent value="overview"><OverviewTab organizationId={organizationId} onNavigate={navigate} /></TabsContent>
        <TabsContent value="ranking"><CockpitRanking organizationId={organizationId} /></TabsContent>
        {(["capacity", "efficiency", "timeliness", "quality"] as const).map((tab) => <TabsContent key={tab} value={tab}><OperationalTab key={`${tab}/${navigation}`} view={tab} selection={context} organizationId={organizationId} /></TabsContent>)}
        <TabsContent value="driver"><CockpitDriver key={navigation} organizationId={organizationId} initial={context.mode === "month" ? context : undefined} /></TabsContent>
      </Tabs>
    </div>
}
