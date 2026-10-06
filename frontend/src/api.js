// One function for every call to the PHP backend.
// It adds the token, turns the response into JSON and throws on errors,
// so pages only need: const data = await api('/capa-requests.php')

const API_URL = 'http://localhost:8000/api'

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token')

  const response = await fetch(API_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
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
