// One function for every call to the PHP backend.
// It adds the token, turns the response into JSON and throws on errors,
// so pages only need: const data = await api('/capa-requests.php')

const API_URL = 'http://localhost:8000/api'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function api(path, { method = 'GET', body } = {}) {
  // Files are sent as FormData; the browser sets the Content-Type (with the file boundary) itself
  const isFormData = body instanceof FormData

  const response = await fetch(API_URL + path, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeader(),
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  // Token is invalid or expired -> clear it and go back to login
  if (response.status === 401 && path !== '/login.php') {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
}

// Download a file (e.g. a document) as a Blob.
// A normal <a href> can't send our token header, so we fetch it ourselves.
export async function apiFile(path) {
  const response = await fetch(API_URL + path, { headers: authHeader() })
  if (!response.ok) throw new Error('Could not open the file')
  return response.blob()
}

// Upload files to a request. "files" is a list of File objects from an <input type="file">
export function uploadDocuments(requestId, files) {
  const formData = new FormData()
  formData.append('request_id', requestId)
  files.forEach((file) => formData.append('files[]', file))
  return api('/documents.php', { method: 'POST', body: formData })
}
