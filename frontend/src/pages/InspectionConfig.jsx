import { Fragment, useEffect, useState } from 'react'
import { api } from '../api'

const LEVELS = ['engineer', 'qcs', 'qaqc']

// Green ✓ or red ✕ box. When "onClick" is given (edit mode) it becomes a button.
function LevelIcon({ on, onClick }) {
  return (
    <button
      type="button"
      className={`level-icon ${on ? 'on' : 'off'} ${onClick ? 'editable' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      {on ? '✓' : '✕'}
    </button>
  )
}

export default function InspectionConfig() {
  const [rows, setRows] = useState([])
  const [options, setOptions] = useState(null)
  const [filters, setFilters] = useState({ division: '', sub_division: '', activity: '' })
  const [editingId, setEditingId] = useState(null) // which row is in edit mode
  const [draft, setDraft] = useState(null)         // the edited values of that row
  const [viewId, setViewId] = useState(null)       // which row shows extra details
  const [error, setError] = useState('')

  useEffect(() => {
    api('/filter-options.php').then(setOptions)
  }, [])

  function loadRows() {
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
    api('/sub-activities.php?' + new URLSearchParams(activeFilters))
      .then((res) => setRows(res.data))
      .catch((err) => setError(err.message))
  }

  useEffect(loadRows, [filters])

  function startEdit(row) {
    setEditingId(row.id)
    // Copy the row so we can change it without touching the table until Save
    setDraft({
      engineer_required: Number(row.engineer_required),
      qcs_required: Number(row.qcs_required),
      qaqc_required: Number(row.qaqc_required),
      random_inspection_count: row.random_inspection_count ?? '',
    })
  }

  function toggleLevel(level) {
    const key = `${level}_required`
    setDraft({ ...draft, [key]: draft[key] ? 0 : 1 })
  }

  async function save() {
    setError('')
    try {
      await api(`/sub-activities.php?id=${editingId}`, { method: 'PUT', body: draft })
      setEditingId(null)
      loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <h1 className="page-title">Inspection Configuration</h1>

      <div className="card">
        {options && (
          <div className="filters">
            <strong>Filter By</strong>
            {[
              ['division', 'Division', options.divisions],
              ['sub_division', 'Sub-Division', options.sub_divisions],
              ['activity', 'Activity', options.activities],
            ].map(([name, label, values]) => (
              <select key={name} value={filters[name]} onChange={(e) => setFilters({ ...filters, [name]: e.target.value })}>
                <option value="">{label}</option>
                {values.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            ))}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <table className="table">
          <thead>
            <tr>
              <th className="left">Sub Activity Name</th>
              <th>Level - Engineer</th>
              <th>Level - QCS</th>
              <th>Level - QAQC</th>
              <th>Random Inspection Count</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isEditing = editingId === row.id

              return (
                <Fragment key={row.id}>
                  <tr>
                    <td className="left">{row.name}</td>

                    {LEVELS.map((level) => (
                      <td key={level}>
                        {isEditing
                          ? <LevelIcon on={draft[`${level}_required`]} onClick={() => toggleLevel(level)} />
                          : <LevelIcon on={Number(row[`${level}_required`])} />}
                      </td>
                    ))}

                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          className="small-input"
                          value={draft.random_inspection_count}
                          onChange={(e) => setDraft({ ...draft, random_inspection_count: e.target.value })}
                        />
                      ) : (
                        row.random_inspection_count ?? '-'
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <>
                          <button className="btn-link dark" onClick={save}>Save</button>
                          {' | '}
                          <button className="btn-link dark" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="icon-link" title="Edit" onClick={() => startEdit(row)}>✏️</button>
                          {' | '}
                          <button className="icon-link" title="View" onClick={() => setViewId(viewId === row.id ? null : row.id)}>👁</button>
                        </>
                      )}
                    </td>
                  </tr>

                  {/* Eye icon -> show where this sub-activity belongs */}
                  {viewId === row.id && (
                    <tr className="view-row">
                      <td colSpan="6">
                        <strong>Division:</strong> {row.division} &nbsp;·&nbsp;
                        <strong>Sub-Division:</strong> {row.sub_division} &nbsp;·&nbsp;
                        <strong>Activity:</strong> {row.activity}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
