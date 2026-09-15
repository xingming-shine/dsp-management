// Dependency-free runtime checks for the presentation model. No prototype/browser execution.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const nodeRequire = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cache = new Map()
function load(file) {
  file = path.resolve(root, file)
  if (cache.has(file)) return cache.get(file).exports
  const loaded = { exports: {} }; cache.set(file, loaded)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const localRequire = (name) => {
    const resolved = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null
    return resolved ? load(`${resolved}.ts`) : nodeRequire(name)
  }
  new Function('require', 'module', 'exports', code)(localRequire, loaded, loaded.exports)
  return loaded.exports
}
const m = load('src/features/data-cockpit/cockpit-model.ts')
const scores = load('src/features/data-cockpit/score-model.ts')
let checks = 0
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`) }
const near = (a, b) => assert.ok(Math.abs(a - b) < .00001, `${a} != ${b}`)
check('5号、7号当天开放上月，数据未就绪仍回退', () => {
  assert.equal(m.mockAvailability('driver', '2026-09-04').latestReadyPeriod, '2026-07')
  assert.equal(m.mockAvailability('driver', '2026-09-05').latestReadyPeriod, '2026-08')
  assert.equal(m.mockAvailability('month', '2026-09-06').latestReadyPeriod, '2026-07')
  assert.equal(m.mockAvailability('month', '2026-09-07').latestReadyPeriod, '2026-08')
  assert.equal(m.mockAvailability('month', '2026-09-07', true).latestReadyPeriod, '2026-07')
  assert.equal(m.resolveReadyPeriod('2026-08', { latestReadyPeriod: '2026-07', status: 'processing' }), '2026-07')
})
check('周三更新、自然周及跨年周号', () => {
  assert.equal(m.mockAvailability('week', '2026-09-08').latestReadyPeriod, '2026-08-24~2026-08-30')
  assert.equal(m.mockAvailability('week', '2026-09-09').latestReadyPeriod, '2026-08-31~2026-09-06')
  assert.equal(m.weekOf('2027-01-01'), '2026-12-28~2027-01-03')
  assert.equal(m.weekNumber('2027-01-01'), 53)
})
check('区间含首尾、上限、倒序、未来日期', () => {
  assert.equal(m.validateSelection('day', '2026-08-01', '2026-08-31', '2026-09-09'), '')
  assert.ok(m.validateSelection('day', '2026-08-01', '2026-09-01', '2026-09-09'))
  assert.ok(m.validateSelection('month', '2025-08', '2026-08', '2026-09-09'))
  assert.ok(m.validateSelection('day', '2026-09-09', '2026-09-08', '2026-09-09'))
  assert.ok(m.validateSelection('day', '2026-09-09', '2026-09-10', '2026-09-09'))
  assert.equal(m.selectedPeriods({ mode: 'month', value: '2026-08', range: { start: '2025-09', end: '2026-08' } }).length, 12)
})
check('日周月成熟度边界', () => {
  assert.ok(m.isUpdating('rate4800', 'day', '2026-09-08', '2026-09-09'))
  assert.ok(!m.isUpdating('rate4800', 'day', '2026-09-07', '2026-09-09'))
  assert.ok(m.isUpdating('rate7200', 'week', '2026-08-31~2026-09-06', '2026-09-08'))
  assert.ok(!m.isUpdating('rate7200', 'week', '2026-08-31~2026-09-06', '2026-09-09'))
  assert.ok(m.isUpdating('rate4800', 'month', '2026-08', '2026-09-01'))
  assert.ok(!m.isUpdating('rate4800', 'month', '2026-08', '2026-09-02'))
})
const records = m.recordsFor({ mode: 'month', value: '2026-08' })
const v = m.aggregate(records)
check('每日数量非负、妥投桶/客诉桶/工时加总一致', () => {
  for (const r of records) {
    for (const value of Object.values(r.values)) assert.ok(Number.isFinite(value) && value >= 0)
    const d = r.values
    assert.equal(d.delivered + d.exception, d.should)
    assert.equal([0,1,2,3,4].reduce((s, i) => s + d[`bucket${i}`], 0), d.delivered)
    assert.equal([0,1,2,3].reduce((s, i) => s + d[`complaint${i}`], 0), d.complaint)
    assert.equal(d.sortMinutes + d.firstMinutes + d.deliveryMinutes, d.workMinutes)
  }
})
check('汇总=所有司机子行；比率从分子分母重算', () => {
  const children = m.byPerspective(records, 'driver')
  for (const key of ['should','delivered','picked','expected','workMinutes','podBad']) assert.equal(children.reduce((s, r) => s + r.values[key], 0), v[key])
  near(v.pickupRate, v.picked / v.expected * 100)
  near(v.rate2400, v.assessed2400 / v.assessedShould * 100)
  near(v.pph, v.should / (v.deliveryMinutes / 60))
})
check('运单详情条数=卡片数量；运单标识无重复', () => {
  for (const key of ['unfinished','podBad','fake','suspected','broken','dnr','complaint','validComplaint']) {
    const rows = m.parcelsFor(records, key)
    assert.equal(rows.length, v[key])
    assert.equal(new Set(rows.map((r) => r.waybill)).size, rows.length)
  }
})
check('剔除按日期+指标+票去重，重复原因不重复扣减', () => {
  const rows = m.exclusionsFor(records)
  assert.equal(new Set(rows.map((r) => `${r.date}/${r.metric}/${r.waybill}`)).size, rows.length)
  assert.equal(rows.filter((r) => r.metric === '2400').length, v.excluded)
  assert.equal(rows.filter((r) => r.metric === '2400' && r.status === '已妥投').length, v.excludedDelivered)
  assert.equal(v.assessedShould, v.should - v.excluded)
  assert.equal(v.assessed2400, v.vol2400 - v.excludedDelivered)
})
check('司机分项/总分/人数同源，等级阈值与字段完整', () => {
  const rows = scores.driverMonth('2026-08')
  for (const r of rows) {
    near(r.values.service + r.values.quality + r.values.efficiency, r.values.total)
    near(r.values.score2400 + r.values.score4800 + r.values.score72, r.values.service)
  }
  assert.equal(scores.driverSummary(rows).drivers, rows.length)
  assert.equal(scores.driverOverallColumns.length, 15)
  assert.equal(scores.driverScoreColumns.length, 38)
  assert.equal(scores.driverLevel(28.5, 30), '优秀')
  assert.equal(scores.driverLevel(38, 40), '优秀')
  assert.equal(scores.driverLevel(14.9, 30), '重点关注')
})
check('排名20列，政策边界及得分加总', () => {
  assert.equal(scores.rankColumns.length, 20)
  assert.equal(scores.rankAvailable('month', '2026-06'), false)
  assert.equal(scores.rankAvailable('week', '2026-07-06~2026-07-12'), true)
  for (const r of scores.rankingRows('month', '2026-08')) near(r.values.timeliness + r.values.quality + r.values.complaint + r.values.team + r.values.adjust, r.values.total)
})
check('CSV的BOM、逗号、引号、换行、0和空值', () => {
  const csv = m.serializeCSV(['字段','值'], [['逗号,引号"换行\n',0],['缺失','']])
  assert.equal(csv.charCodeAt(0), 0xfeff)
  assert.ok(csv.includes('"逗号,引号""换行\n","0"'))
  assert.ok(csv.endsWith('"缺失",""'))
})
check('总览DSP排名模块保留周期切换、详情入口与可访问图表', () => {
  const file = 'src/features/data-cockpit/components/overview-tab.tsx'
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  assert.match(source, /<Tabs value=\{rankMode\}/)
  assert.match(source, /<TabsTrigger value="week">周排名<\/TabsTrigger>/)
  assert.match(source, /<TabsTrigger value="month">月排名<\/TabsTrigger>/)
  assert.match(source, /onClick=\{\(\) => onNavigate\("ranking"\)\}/)
  assert.match(source, /<EChartsChart option=\{radar\} height="compact" ariaLabel="维度得分对比" \/>/)
})
console.log(`\n${checks} groups passed.`)
