import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DocumentList from '../components/DocumentList'
import SearchBox from '../components/SearchBox'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { LEVEL_LABELS, capitalize, formatDateTime } from '../utils'

// "Ankita Bhat" -> "AB" (used for the round avatar)
function initials(name) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2)
}

export default function CapaDetail() {
  const { id } = useParams() // the :id from the URL /capa/:id
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [request, setRequest] = useState(null)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  function loadRequest() {
    api(`/capa-request.php?id=${id}`)
      .then((res) => setRequest(res.data))
      .catch((err) => setError(err.message))
  }

  useEffect(loadRequest, [id])

  async function takeAction(action) {
    setError('')
    setSaving(true)
    try {
      await api('/capa-action.php', {
        method: 'POST',
        body: { request_id: id, action, comment },
      })
      setComment('')
      loadRequest() // reload so the timeline shows the new status
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!request) {
    return error ? <p className="error">{error}</p> : <p>Loading...</p>
  }

  // Left side "label: value" pairs
  const details = [
    ['Tower', request.tower],
    ['Floor', request.floor],
    ['Unit', request.unit],
    ['Division', request.division],
    ['Sub Division', request.sub_division],
    ['Activity', request.activity],
    ['Sub Activity', request.sub_activity],
    ['Defect Type', request.defect_type],
    ['Defect Count', request.defect_count],
    ['Technician', request.technician],
    ['Raised By', request.created_by_name],
  ]

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Inspection Request Detail</h1>
        <div className="header-actions">
          {/* Searching from a detail page takes you to the full list with results */}
          <SearchBox
            value={search}
            onChange={setSearch}
            onSubmit={(text) => navigate(`/inspections?search=${encodeURIComponent(text)}`)}
            placeholder="Search requests... (Enter)"
          />
          <Link to="/capa" className="btn-secondary">← Back to list</Link>
        </div>
      </div>

      <div className="card">
        {/* Top bar: project, date, status */}
        <div className="detail-top">
          <h3>{request.project}</h3>
          <span className="muted-text">📅 {formatDateTime(request.created_at)}</span>
          <div className="status-cell">
            {request.approvals.map((a) => <span key={a.id} className={`dot ${a.status}`} />)}
            <span>{capitalize(request.status)}</span>
          </div>
        </div>

        <div className="detail-grid">
          {/* Left: request details */}
          <div>
            <h4>Request Details</h4>
            <div className="info-grid">
              {details.map(([label, value]) => (
                <div key={label}>
                  <p className="info-label">{label}</p>
                  <p className="info-value">{value}</p>
                </div>
              ))}
            </div>

            <DocumentList
              requestId={request.id}
              documents={request.documents}
              canUpload={Number(request.created_by) === Number(user.id)}
              onUploaded={loadRequest}
            />
          </div>

          {/* Right: approval timeline */}
          <div>
            <h4>Approval Status</h4>
            <div className="timeline">
              {request.approvals.map((a) => (
                <div key={a.id} className="timeline-item">
                  <span className={`timeline-dot ${a.status}`} />

                  <div className="step-card">
                    <div className="step-head">
                      <div className="avatar">{a.approver_name ? initials(a.approver_name) : '?'}</div>
                      <div>
                        <p className="info-label">{LEVEL_LABELS[a.level]} - Approver</p>
                        <strong>{a.approver_name || 'Waiting...'}</strong>
                      </div>
                      <span className={`step-badge ${a.status}`}>{capitalize(a.status)}</span>
                    </div>

                    {a.acted_at && <p className="muted-text">📅 {formatDateTime(a.acted_at)}</p>}
                    {a.comment && (
                      <>
                        <p className="step-comment-title">Comment</p>
                        <p className="muted-text">{a.comment}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Approve / Reject box: only when it's the logged-in user's turn */}
            {request.my_turn && (
              <div className="action-box">
                <h4>Your decision ({LEVEL_LABELS[request.current_level]})</h4>
                <textarea
                  rows="3"
                  placeholder="Add a comment (required for rejection)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                {error && <p className="error">{error}</p>}
                <div className="form-actions">
                  <button className="btn-reject" disabled={saving} onClick={() => takeAction('reject')}>Reject</button>
                  <button className="btn-approve" disabled={saving} onClick={() => takeAction('approve')}>Approve</button>
                </div>
              </div>
            )}

            {/* Explain why there are no buttons */}
            {!request.my_turn && request.current_level && (
              <p className="hint">Waiting for {LEVEL_LABELS[request.current_level]} approval.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
