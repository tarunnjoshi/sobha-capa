import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import SearchBox from '../components/SearchBox'
import { formatDateTime } from '../utils'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function loadProjects() {
    api('/projects.php')
      .then((res) => setProjects(res.data))
      .catch((err) => setError(err.message))
  }

  useEffect(loadProjects, [])

  function openForm() {
    setShowForm(true)
    setName('')
    setCopyFrom(projects[0] ? String(projects[0].id) : '') // copying is the common case
    setError('')
    setMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api('/projects.php', {
        method: 'POST',
        body: { name, copy_from_project_id: copyFrom || null },
      })
      setShowForm(false)
      setMessage(`"${name}" added.`)
      loadProjects()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // The whole list is already loaded (and small), so we filter it here instead of calling the API
  const visibleProjects = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <div className="header-actions">
          <SearchBox value={search} onChange={setSearch} placeholder="Search project..." />
          {!showForm && <button className="btn-primary" onClick={openForm}>+ Add Project</button>}
        </div>
      </div>

      {showForm && (
        <form className="card form-grid add-project" onSubmit={handleSubmit}>
          <div>
            <label>Project Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sobha One" required />
          </div>
          <div>
            <label>Copy rules from</label>
            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">None (start empty)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <p className="hint full">
            {copyFrom
              ? 'The new project starts with the same approval rules. You can change them later in Admin Configuration.'
              : 'All rules start as ❌. Set them in Admin Configuration before supervisors raise requests.'}
          </p>

          {error && <p className="error full">{error}</p>}

          <div className="full form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Project'}</button>
          </div>
        </form>
      )}

      {message && (
        <p className="success">
          {message} <Link to="/config">Review its approval rules →</Link>
        </p>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th className="left">Project Name</th>
              <th>CAPA Requests</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {visibleProjects.map((p) => (
              <tr key={p.id}>
                <td className="left">{p.name}</td>
                <td>{p.request_count}</td>
                <td>{formatDateTime(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
