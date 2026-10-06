import { useState } from 'react'
import { apiFile, uploadDocuments } from '../api'
import { checkFiles, formatSize } from '../utils'

// "Documents" section on the request detail page.
// - Everyone can view documents
// - canUpload: the supervisor who raised the request can add more
export default function DocumentList({ requestId, documents, canUpload, onUploaded }) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function view(doc) {
    // Open the tab right away (browsers block pop-ups opened after an await),
    // then point it to the downloaded file
    const tab = window.open('', '_blank')
    try {
      const blob = await apiFile(`/documents.php?id=${doc.id}`)
      tab.location.href = URL.createObjectURL(blob)
    } catch (err) {
      tab.close()
      setError(err.message)
    }
  }

  async function handleFiles(e) {
    const files = [...e.target.files]
    e.target.value = '' // allow choosing the same file again later
    if (!files.length) return

    const problem = checkFiles(files)
    if (problem) {
      setError(problem)
      return
    }

    setError('')
    setUploading(true)
    try {
      await uploadDocuments(requestId, files)
      onUploaded() // parent reloads the request to show the new files
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="documents">
      <h4>Documents</h4>

      {documents.length === 0 && <p className="muted-text">No documents attached.</p>}

      {documents.map((doc, index) => (
        <div key={doc.id} className="document-row">
          <div>
            <p className="info-label">Document {index + 1}</p>
            <p className="document-name">
              {doc.mime_type === 'application/pdf' ? '📄' : '🖼️'} {doc.original_name}
              <span className="muted-text"> · {formatSize(doc.size_bytes)}</span>
            </p>
          </div>
          <button type="button" className="btn-link dark" onClick={() => view(doc)}>View 👁</button>
        </div>
      ))}

      {canUpload && (
        <label className="upload-link">
          {uploading ? 'Uploading...' : '+ Add documents'}
          <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={handleFiles} disabled={uploading} hidden />
        </label>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
