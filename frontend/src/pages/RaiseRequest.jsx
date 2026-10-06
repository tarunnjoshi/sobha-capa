import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { LEVEL_LABELS } from '../utils'

const emptyForm = {
  project: '',
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
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Load the sub-activity dropdown and existing project names (for suggestions)
  useEffect(() => {
    api('/sub-activities.php').then((res) => setSubActivities(res.data))
    api('/filter-options.php').then((res) => setProjects(res.projects))
  }, [])

  // One change handler for all inputs: uses the input's "name" attribute
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Show which levels will approve, based on the Admin's config
  const selected = subActivities.find((s) => String(s.id) === form.sub_activity_id)
  const approvers = selected
    ? ['engineer', 'qcs', 'qaqc'].filter((level) => Number(selected[`${level}_required`]))
    : []

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api('/capa-requests.php', { method: 'POST', body: form })
      navigate('/capa') // back to the list, the new request is on top
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="page-title">Raise CAPA Request</h1>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div>
          <label>Project</label>
          {/* datalist = free text, but suggests existing projects */}
          <input name="project" list="projects" value={form.project} onChange={handleChange} required />
          <datalist id="projects">
            {projects.map((p) => <option key={p} value={p} />)}
          </datalist>
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
          <select name="sub_activity_id" value={form.sub_activity_id} onChange={handleChange} required>
            <option value="">Select sub-activity</option>
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

        {error && <p className="error full">{error}</p>}

        <div className="full form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/capa')}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Submit Request'}</button>
        </div>
      </form>
    </>
  )
}
