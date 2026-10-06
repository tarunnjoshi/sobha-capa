import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, uploadDocuments } from '../api'
import { LEVEL_LABELS, checkFiles, formatSize } from '../utils'

const emptyForm = {
  project_id: '',
  tower: '',
  floor: '',
  unit: '',
  sub_activity_id: '',
  defect_type: '',
  defect_count: '',
  technician: '',
}

export default function RaiseRequest() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [subActivities, setSubActivities] = useState([])
  const [projects, setProjects] = useState([])
  const [files, setFiles] = useState([]) // photos / PDFs to attach
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Load the project dropdown once
  useEffect(() => {
    api('/filter-options.php').then((res) => setProjects(res.projects))
  }, [])

  // Rules are per project, so reload the sub-activities (with this project's rules)
  // every time the project changes
  useEffect(() => {
    if (!form.project_id) {
      setSubActivities([])
      return
    }
    api(`/sub-activities.php?project_id=${form.project_id}`).then((res) => setSubActivities(res.data))
  }, [form.project_id])

  // One change handler for all inputs: uses the input's "name" attribute
  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'project_id') {
      // New project = different rules, so the user must pick the sub-activity again
      setForm({ ...form, project_id: value, sub_activity_id: '' })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  // Show which levels will approve, based on the Admin's rules for this project
  const selected = subActivities.find((s) => String(s.id) === form.sub_activity_id)
  const approvers = selected
    ? ['engineer', 'qcs', 'qaqc'].filter((level) => Number(selected[`${level}_required`]))
    : []

  function handleFiles(e) {
    const chosen = [...e.target.files]
    const problem = checkFiles(chosen)
    setError(problem)
    setFiles(problem ? [] : chosen)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    // Step 1: create the request
    let requestId
    try {
      const res = await api('/capa-requests.php', { method: 'POST', body: form })
      requestId = res.id
    } catch (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    // Step 2: attach the files. If this fails the request still exists,
    // so we open it anyway: the supervisor can add the files from the detail page.
    if (files.length) {
      try {
        await uploadDocuments(requestId, files)
      } catch (err) {
        alert(`Request raised, but the documents were not uploaded: ${err.message}`)
      }
    }

    navigate(`/capa/${requestId}`)
  }

  return (
    <>
      <h1 className="page-title">Raise CAPA Request</h1>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div>
          <label>Project</label>
          <select name="project_id" value={form.project_id} onChange={handleChange} required>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label>Tower</label>
          <input name="tower" value={form.tower} onChange={handleChange} placeholder="Tower A" required />
        </div>
        <div>
          <label>Floor</label>
          <input name="floor" value={form.floor} onChange={handleChange} placeholder="A - P4" required />
        </div>
        <div>
          <label>Unit</label>
          <input name="unit" value={form.unit} onChange={handleChange} placeholder="A0402" required />
        </div>

        <div className="full">
          <label>Sub-Activity</label>
          <select name="sub_activity_id" value={form.sub_activity_id} onChange={handleChange} disabled={!form.project_id} required>
            <option value="">{form.project_id ? 'Select sub-activity' : 'Select a project first'}</option>
            {subActivities.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.division} / {s.activity})
              </option>
            ))}
          </select>
          {selected && (
            <p className="hint">
              Approval flow: {approvers.length ? approvers.map((l) => LEVEL_LABELS[l]).join(' → ') : 'none configured'}
            </p>
          )}
        </div>

        <div>
          <label>Defect Type</label>
          <input name="defect_type" value={form.defect_type} onChange={handleChange} placeholder="UCM Leak" required />
        </div>
        <div>
          <label>Defect Count</label>
          <input name="defect_count" type="number" min="1" value={form.defect_count} onChange={handleChange} required />
        </div>
        <div>
          <label>Technician</label>
          <input name="technician" value={form.technician} onChange={handleChange} required />
        </div>

        <div className="full">
          <label>Documents (photos or PDF, max 5 files, 2 MB each)</label>
          <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={handleFiles} />
          {files.map((f) => (
            <p key={f.name} className="muted-text">📎 {f.name} · {formatSize(f.size)}</p>
          ))}
        </div>

        {error && <p className="error full">{error}</p>}

        <div className="full form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/capa')}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Submit Request'}</button>
        </div>
      </form>
    </>
  )
}
