import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { LEVEL_LABELS, capitalize, formatDateTime } from '../utils'

const emptyFilters = {
  project: '',
  division: '',
  sub_division: '',
  activity: '',
  sub_activity: '',
  status: '',
  created_date: '',
  my_pending: '',
}

// One filter dropdown. Kept outside CapaList so React doesn't recreate it on every render.
function FilterSelect({ label, value, values, onChange, format = (v) => v }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}</option>
      {values.map((v) => (
        <option key={v} value={v}>{format(v)}</option>
      ))}
    </select>
  )
}

export default function CapaList() {
  const { user } = useAuth()
  const isApprover = ['engineer', 'qcs', 'qaqc'].includes(user.role)

  const [requests, setRequests] = useState([])
  const [options, setOptions] = useState(null) // values for the dropdowns
  const [filters, setFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load dropdown values once
  useEffect(() => {
    api('/filter-options.php').then(setOptions).catch((err) => setError(err.message))
  }, [])

  // Load the list every time a filter changes
  useEffect(() => {
    // Only send filters that have a value: {project: 'The Crest'} -> "?project=The+Crest"
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
    const query = new URLSearchParams(activeFilters).toString()

    setLoading(true)
    api('/capa-requests.php?' + query)
      .then((res) => setRequests(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filters])

  function changeFilter(name, value) {
    setFilters({ ...filters, [name]: value })
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">CAPA Requests List</h1>
        {user.role === 'supervisor' && (
          <Link to="/capa/new" className="btn-primary">+ Raise Request</Link>
        )}
      </div>

      <div className="card">
        {options && (
          <div className="filters">
            <strong>Filter By</strong>
            <FilterSelect label="Project" value={filters.project} values={options.projects} onChange={(v) => changeFilter('project', v)} />
            <FilterSelect label="Division" value={filters.division} values={options.divisions} onChange={(v) => changeFilter('division', v)} />
            <FilterSelect label="Sub-Division" value={filters.sub_division} values={options.sub_divisions} onChange={(v) => changeFilter('sub_division', v)} />
            <FilterSelect label="Activity" value={filters.activity} values={options.activities} onChange={(v) => changeFilter('activity', v)} />
            <FilterSelect label="Sub-Activity" value={filters.sub_activity} values={options.sub_activities} onChange={(v) => changeFilter('sub_activity', v)} />
            <FilterSelect label="Status" value={filters.status} values={options.statuses} onChange={(v) => changeFilter('status', v)} format={capitalize} />
            <input
              type="date"
              title="CAPA Created At"
              value={filters.created_date}
              onChange={(e) => changeFilter('created_date', e.target.value)}
            />
            {isApprover && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.my_pending === '1'}
                  onChange={(e) => changeFilter('my_pending', e.target.checked ? '1' : '')}
                />
                Only my pending
              </label>
            )}
            <button className="btn-link dark" onClick={() => setFilters(emptyFilters)}>Clear</button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <table className="table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Tower</th>
              <th>Division</th>
              <th>Activity</th>
              <th>Sub-Activity</th>
              <th>Defect Type</th>
              <th>Defect Count</th>
              <th>CAPA Created At</th>
              <th>Approver</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="11" className="muted">Loading...</td></tr>}
            {!loading && requests.length === 0 && (
              <tr><td colSpan="11" className="muted">No requests found</td></tr>
            )}

            {!loading && requests.map((r) => (
              <tr key={r.id}>
                <td>{r.project}</td>
                <td>{r.tower}</td>
                <td>{r.division}</td>
                <td>{r.activity}</td>
                <td>{r.sub_activity}</td>
                <td>{r.defect_type}</td>
                <td>{r.defect_count}</td>
                <td>{formatDateTime(r.created_at)}</td>
                <td>{r.steps.map((s) => LEVEL_LABELS[s.level]).join(', ')}</td>
                <td>
                  <div className="status-cell">
                    {/* One dot per approval step: green = approved, orange = pending, red = rejected */}
                    {r.steps.map((s) => (
                      <span key={s.level} className={`dot ${s.status}`} title={`${LEVEL_LABELS[s.level]}: ${s.status}`} />
                    ))}
                    <span>{capitalize(r.status)}</span>
                  </div>
                  {r.my_turn && <span className="badge">Action Required</span>}
                </td>
                <td>
                  <Link to={`/capa/${r.id}`} className="icon-link" title="View">👁</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
