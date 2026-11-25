/** 演示用 DMS 组织快照；生产环境由发布服务从 DMS 同步。 */
export type DmsOrgNode = {
  id: string
  parentId: string | null
  name: string
  type: "headquarters" | "region" | "station" | "dsp"
  status: "active" | "inactive"
}

export type DmsOrgSnapshot = {
  version: string
  syncedAt: string
  nodes: DmsOrgNode[]
}

const demoNodes: DmsOrgNode[] = [
  { id: "hq-gofo", parentId: null, name: "Gofo-Express 总部", type: "headquarters", status: "active" },
  { id: "region-east", parentId: "hq-gofo", name: "美东大区", type: "region", status: "active" },
  { id: "station-jfk", parentId: "region-east", name: "纽约站点", type: "station", status: "active" },
  { id: "org-1", parentId: "station-jfk", name: "JAM-JJ", type: "dsp", status: "active" },
  { id: "org-2", parentId: "station-jfk", name: "JAM-SS", type: "dsp", status: "active" },
  { id: "station-bos", parentId: "region-east", name: "波士顿站点", type: "station", status: "active" },
  { id: "org-3", parentId: "station-bos", name: "ATL-LG", type: "dsp", status: "active" },
  { id: "org-4", parentId: "station-bos", name: "NYC-PK", type: "dsp", status: "active" },
  { id: "station-phl", parentId: "region-east", name: "费城站点", type: "station", status: "active" },
  { id: "org-8", parentId: "station-phl", name: "PHL-NR", type: "dsp", status: "active" },
  { id: "org-9", parentId: "station-phl", name: "PHL-RV", type: "dsp", status: "active" },
  { id: "station-atl", parentId: "region-east", name: "亚特兰大站点", type: "station", status: "active" },
  { id: "org-10", parentId: "station-atl", name: "ATL-EC", type: "dsp", status: "active" },
  { id: "org-11", parentId: "station-atl", name: "ATL-SQ", type: "dsp", status: "active" },
  { id: "region-west", parentId: "hq-gofo", name: "美西大区", type: "region", status: "active" },
  { id: "station-lax", parentId: "region-west", name: "洛杉矶站点", type: "station", status: "active" },
  { id: "org-5", parentId: "station-lax", name: "LAX-CX", type: "dsp", status: "active" },
  { id: "station-sea", parentId: "region-west", name: "西雅图站点", type: "station", status: "active" },
  { id: "org-6", parentId: "station-sea", name: "SEA-NW", type: "dsp", status: "active" },
  { id: "org-7", parentId: "station-sea", name: "SEA-OLD", type: "dsp", status: "inactive" },
  { id: "station-sfo", parentId: "region-west", name: "旧金山站点", type: "station", status: "active" },
  { id: "org-12", parentId: "station-sfo", name: "SFO-AL", type: "dsp", status: "active" },
  { id: "org-13", parentId: "station-sfo", name: "SFO-BR", type: "dsp", status: "active" },
  { id: "station-san", parentId: "region-west", name: "圣迭戈站点", type: "station", status: "active" },
  { id: "org-14", parentId: "station-san", name: "SAN-ML", type: "dsp", status: "active" },
  { id: "org-15", parentId: "station-san", name: "SAN-HT", type: "dsp", status: "active" },
  { id: "region-central", parentId: "hq-gofo", name: "美中大区", type: "region", status: "active" },
  { id: "station-chi", parentId: "region-central", name: "芝加哥站点", type: "station", status: "active" },
  { id: "org-16", parentId: "station-chi", name: "CHI-NW", type: "dsp", status: "active" },
  { id: "org-17", parentId: "station-chi", name: "CHI-TS", type: "dsp", status: "active" },
  { id: "station-dal", parentId: "region-central", name: "达拉斯站点", type: "station", status: "active" },
  { id: "org-18", parentId: "station-dal", name: "DAL-AK", type: "dsp", status: "active" },
  { id: "org-19", parentId: "station-dal", name: "DAL-PM", type: "dsp", status: "active" },
]

export async function loadDemoDmsOrgTree(): Promise<DmsOrgSnapshot> {
  return { version: "demo-dms-2026-11-23", syncedAt: new Date().toISOString(), nodes: demoNodes.map((node) => ({ ...node })) }
}

export function invalidDspIds(ids: string[], snapshot: DmsOrgSnapshot | null): string[] {
  if (!snapshot) return ids
  const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]))
  return ids.filter((id) => {
    const node = nodes.get(id)
    if (!node || node.type !== "dsp" || node.status !== "active") return true
    let parentId = node.parentId
    while (parentId) {
      const parent = nodes.get(parentId)
      if (!parent || parent.status !== "active") return true
      parentId = parent.parentId
    }
    return false
  })
}
