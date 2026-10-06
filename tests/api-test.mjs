// End-to-end API tests for every feature (no packages needed, uses Node's built-in fetch).
//
// 1. Reset the database:  run schema.sql and seed.sql (see README)
// 2. Start the backend:   php -S localhost:8000 -t backend  (with the flags from the README)
// 3. Run:                 node tests/api-test.mjs
//
// The tests change data (they raise and approve requests), so reset the database before each run.
import { readFileSync } from 'fs'
const API = process.env.API || 'http://localhost:8000/api'
const DOCS = new URL('../backend/database/sample-docs/', import.meta.url).pathname
let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : '  -> ' + extra}`) }

async function call(path, { token, method = 'GET', body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) })
  const type = res.headers.get('content-type') || ''
  const data = type.includes('json') ? await res.json() : await res.arrayBuffer()
  return { status: res.status, data, type }
}
const login = async (who) => (await call('/login.php', { method: 'POST', body: { email: `${who}@sobha.test`, password: 'password' } })).data.token
const ids = (r) => r.data.data.map((x) => x.id).sort((a, b) => a - b).join(',')

console.log('\n--- Auth')
ok((await call('/login.php', { method: 'POST', body: { email: 'admin@sobha.test', password: 'nope' } })).status === 401, 'wrong password -> 401')
const T = {}
for (const r of ['admin', 'supervisor', 'supervisor2', 'engineer', 'qcs', 'qaqc']) T[r] = await login(r)
ok(Object.values(T).every(Boolean), 'all 6 users can log in')
ok((await call('/me.php', { token: T.qcs })).data.user.role === 'qcs', 'me.php returns the right user')
ok((await call('/me.php')).status === 401, 'no token -> 401')
const tmp = await login('qcs')
await call('/logout.php', { token: tmp, method: 'POST' })
ok((await call('/me.php', { token: tmp })).status === 401, 'token stops working after logout')

console.log('\n--- Projects')
let r = await call('/projects.php', { token: T.admin })
ok(r.data.data.length === 3, '3 seeded projects')
ok((await call('/projects.php', { token: T.engineer, method: 'POST', body: { name: 'X' } })).status === 403, 'engineer cannot add project -> 403')
ok((await call('/projects.php', { token: T.admin, method: 'POST', body: { name: 'The Crest' } })).status === 422, 'duplicate name -> 422')
ok((await call('/projects.php', { token: T.admin, method: 'POST', body: { name: '  ' } })).status === 422, 'empty name -> 422')
r = await call('/projects.php', { token: T.admin, method: 'POST', body: { name: 'Sobha One', copy_from_project_id: 1 } })
const sobhaOne = r.data.id
ok(r.status === 201, 'admin adds project copying rules')
r = await call(`/sub-activities.php?project_id=${sobhaOne}`, { token: T.admin })
const seahaven = await call('/sub-activities.php?project_id=1', { token: T.admin })
ok(JSON.stringify(r.data.data.map((x) => [x.engineer_required, x.qcs_required, x.qaqc_required, x.random_inspection_count])) ===
   JSON.stringify(seahaven.data.data.map((x) => [x.engineer_required, x.qcs_required, x.qaqc_required, x.random_inspection_count])), 'copied rules are identical to Seahaven')
r = await call('/projects.php', { token: T.admin, method: 'POST', body: { name: 'Sobha Empty' } })
const empty = r.data.id
r = await call(`/sub-activities.php?project_id=${empty}`, { token: T.admin })
ok(r.data.data.length === 9 && r.data.data.every((x) => !Number(x.engineer_required) && !Number(x.qcs_required) && !Number(x.qaqc_required)), 'project without copy: 9 sub-activities, all ❌')

console.log('\n--- Inspection configuration (per project)')
const floor = (rows) => rows.data.data.find((x) => x.name === 'Floor Tiling')
let f1 = floor(await call('/sub-activities.php?project_id=1', { token: T.admin }))
let f2 = floor(await call('/sub-activities.php?project_id=2', { token: T.admin }))
ok(f1.engineer_required == 1 && f1.qaqc_required == 1, 'Seahaven Floor Tiling = all 3 levels')
ok(f2.engineer_required == 0 && f2.qcs_required == 1 && f2.qaqc_required == 0 && f2.random_inspection_count == 10, 'The Crest Floor Tiling = QCS only, count 10')
ok((await call('/sub-activities.php', { token: T.admin })).status === 422, 'missing project_id -> 422')
ok((await call('/sub-activities.php?project_id=2&id=6', { token: T.engineer, method: 'PUT', body: { engineer_required: true } })).status === 403, 'engineer cannot edit rules -> 403')
r = await call('/sub-activities.php?project_id=2&id=6', { token: T.admin, method: 'PUT', body: { engineer_required: true, qcs_required: true, qaqc_required: false, random_inspection_count: '15' } })
ok(r.status === 200, 'admin edits The Crest / Wall Tile')
const wall = (rows) => rows.data.data.find((x) => x.name === 'Wall Tile')
const w2 = wall(await call('/sub-activities.php?project_id=2', { token: T.admin }))
const w1 = wall(await call('/sub-activities.php?project_id=1', { token: T.admin }))
ok(w2.engineer_required == 1 && w2.random_inspection_count == 15, 'The Crest Wall Tile updated')
ok(w1.engineer_required == 0 && w1.random_inspection_count == null, 'Seahaven Wall Tile NOT changed')
r = await call('/sub-activities.php?project_id=1&division=MEP%20Division', { token: T.admin })
ok(r.data.data.length === 2, 'division filter on config')
r = await call('/sub-activities.php?project_id=1&search=ceiling', { token: T.admin })
ok(r.data.data.length === 2, 'search "ceiling" on config -> 2')

console.log('\n--- Lists: Inspection Requests (all) vs CAPA Workflow (mine)')
const expectMine = { supervisor: '1,2,5', supervisor2: '3,4', engineer: '1,2,5', qcs: '1,2,3,4,5', qaqc: '1,2,4,5', admin: '1,2,3,4,5' }
for (const [role, want] of Object.entries(expectMine)) {
  const all = await call('/capa-requests.php', { token: T[role] })
  const mine = await call('/capa-requests.php?scope=mine', { token: T[role] })
  ok(all.data.data.length === 5 && ids(mine) === want, `${role}: all=5, mine=${want}`, `got all=${all.data.data.length} mine=${ids(mine)}`)
}
r = await call('/capa-requests.php?my_pending=1', { token: T.qcs })
ok(ids(r) === '2,4', 'QCS "only my pending" = 2,4', ids(r))
r = await call('/capa-requests.php?project=The%20Crest', { token: T.admin })
ok(ids(r) === '3', 'filter by project')
r = await call('/capa-requests.php?status=open', { token: T.admin })
ok(ids(r) === '2,4', 'filter by status')
r = await call('/capa-requests.php?created_date=2023-12-01', { token: T.admin })
ok(r.data.data.length === 5, 'filter by created date')
r = await call('/capa-requests.php?search=leak', { token: T.admin })
ok(ids(r) === '1', 'search "leak"')
r = await call('/capa-requests.php?search=tower%20c', { token: T.admin })
ok(ids(r) === '5', 'search "tower c"')
r = await call("/capa-requests.php?search=' OR 1=1 --", { token: T.admin })
ok(r.status === 200 && r.data.data.length === 0, 'SQL-injection text in search is harmless')
r = await call('/filter-options.php', { token: T.admin })
ok(r.data.projects.length === 5 && r.data.projects[0].id, 'filter options include projects with ids')

console.log('\n--- Raising requests (rules come from the project)')
const base = { tower: 'Tower B', floor: 'B - P3', unit: 'B0305', defect_type: 'Tile crack', defect_count: 12, technician: 'Rahul Verma' }
ok((await call('/capa-requests.php', { token: T.engineer, method: 'POST', body: { ...base, project_id: 1, sub_activity_id: 1 } })).status === 403, 'engineer cannot raise -> 403')
ok((await call('/capa-requests.php', { token: T.supervisor, method: 'POST', body: { ...base, project_id: 1 } })).status === 422, 'missing sub-activity -> 422')
ok((await call('/capa-requests.php', { token: T.supervisor, method: 'POST', body: { ...base, project_id: empty, sub_activity_id: 1 } })).status === 422, 'project with no levels -> 422')
r = await call('/capa-requests.php', { token: T.supervisor, method: 'POST', body: { ...base, project_id: 2, sub_activity_id: 1 } })
const crestReq = r.data.id
let d = await call(`/capa-request.php?id=${crestReq}`, { token: T.supervisor })
ok(d.data.data.approvals.map((a) => a.level).join() === 'qcs', 'The Crest + Floor Tiling -> only QCS step')
r = await call('/capa-requests.php', { token: T.supervisor, method: 'POST', body: { ...base, project_id: 1, sub_activity_id: 1 } })
const seaReq = r.data.id
d = await call(`/capa-request.php?id=${seaReq}`, { token: T.supervisor })
ok(d.data.data.approvals.map((a) => a.level).join() === 'engineer,qcs,qaqc', 'Seahaven + Floor Tiling -> Engineer, QCS, QAQC')
ok(d.data.data.current_level === 'engineer' && d.data.data.status === 'open', 'new request is open, waiting for engineer')

console.log('\n--- Approval workflow')
const act = (who, id, action, comment = '') => call('/capa-action.php', { token: T[who], method: 'POST', body: { request_id: id, action, comment } })
ok((await act('qcs', seaReq, 'approve')).status === 403, 'QCS cannot act before engineer -> 403')
ok((await act('supervisor', seaReq, 'approve')).status === 403, 'supervisor cannot approve -> 403')
ok((await act('engineer', seaReq, 'reject')).status === 422, 'reject without comment -> 422')
ok((await act('engineer', seaReq, 'approve', 'ok')).data.request_status === 'open', 'engineer approves -> still open')
ok((await act('engineer', seaReq, 'approve', 'again')).status === 403, 'engineer cannot approve twice -> 403')
ok((await act('qcs', seaReq, 'approve', 'ok')).data.request_status === 'open', 'QCS approves -> still open')
ok((await act('qaqc', seaReq, 'approve', 'final')).data.request_status === 'closed', 'QAQC approves -> closed')
ok((await act('qaqc', seaReq, 'approve', 'again')).status === 422, 'cannot act on a closed request -> 422')
d = await call(`/capa-request.php?id=${seaReq}`, { token: T.admin })
ok(d.data.data.approvals.every((a) => a.status === 'approved' && a.approver_name && a.acted_at), 'timeline has name + time on every step')
ok((await act('qcs', crestReq, 'reject', 'Redo the tiles')).data.request_status === 'rejected', 'QCS rejects -> rejected')

console.log('\n--- Documents')
d = await call('/capa-request.php?id=1', { token: T.engineer })
ok(d.data.data.documents.length === 2, 'request 1 has 2 seeded documents')
const docId = d.data.data.documents[0].id
r = await call(`/documents.php?id=${docId}`, { token: T.engineer })
ok(r.status === 200 && r.type === 'image/png' && r.data.byteLength === 76118, 'any user can view a document (real PNG returned)')
ok((await call(`/documents.php?id=${docId}`)).status === 401, 'document without token -> 401')
ok((await call('/documents.php?id=9999', { token: T.engineer })).status === 404, 'missing document -> 404')
const fileForm = (reqId, files) => { const f = new FormData(); f.append('request_id', reqId); files.forEach(([buf, name, type]) => f.append('files[]', new Blob([buf], { type }), name)); return f }
const png = readFileSync(DOCS + 'glass-bend-photo.png'), pdf = readFileSync(DOCS + 'inspection-report.pdf')
r = await call('/documents.php', { token: T.supervisor, method: 'POST', form: fileForm(seaReq, [[png, 'photo.png', 'image/png'], [pdf, 'report.pdf', 'application/pdf']]) })
ok(r.status === 201, 'creator uploads PNG + PDF', JSON.stringify(r.data))
d = await call(`/capa-request.php?id=${seaReq}`, { token: T.qaqc })
ok(d.data.data.documents.map((x) => x.original_name).join() === 'photo.png,report.pdf', 'uploaded documents appear on the request')
ok((await call('/documents.php', { token: T.supervisor2, method: 'POST', form: fileForm(seaReq, [[png, 'p.png', 'image/png']]) })).status === 403, 'other supervisor cannot upload -> 403')
ok((await call('/documents.php', { token: T.engineer, method: 'POST', form: fileForm(seaReq, [[png, 'p.png', 'image/png']]) })).status === 403, 'engineer cannot upload -> 403')
ok((await call('/documents.php', { token: T.supervisor, method: 'POST', form: fileForm(seaReq, [[Buffer.from('<?php echo 1;'), 'evil.png', 'image/png']]) })).status === 422, 'PHP file renamed to .png is rejected (content check)')
ok((await call('/documents.php', { token: T.supervisor, method: 'POST', form: fileForm(seaReq, [[Buffer.alloc(2.5 * 1024 * 1024), 'big.pdf', 'application/pdf']]) })).status === 422, 'file over 2 MB -> 422')
r = await call('/documents.php', { token: T.supervisor, method: 'POST', form: fileForm(seaReq, [[Buffer.alloc(13 * 1024 * 1024), 'huge.pdf', 'application/pdf']]) })
ok(r.status === 413 && r.type.includes('json'), 'upload over 12 MB total -> clean JSON 413')
ok((await call('/documents.php', { token: T.supervisor, method: 'POST', form: fileForm(seaReq, Array(6).fill([png, 'p.png', 'image/png'])) })).status === 422, 'more than 5 files -> 422')
ok((await call('/documents.php', { token: T.supervisor, method: 'POST', form: fileForm(seaReq, []) })).status === 422, 'no files -> 422')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
