import { useEffect, useState } from 'react'

// Small helpers shared by many pages

// Nice names for the approval levels
export const LEVEL_LABELS = {
  engineer: 'Engineer',
  qcs: 'QCS',
  qaqc: 'QAQC',
}

// "2023-12-01 23:00:00" (from MySQL) -> "1 Dec 2023 | 11:00 PM"
export function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value.replace(' ', 'T'))
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${day} | ${time}`
}

// "open" -> "Open"
export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Returns "value", but only after it has stopped changing for "delay" ms.
// Used for search: typing "leak" makes 1 API call instead of 4.
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer) // a new keystroke cancels the previous timer
  }, [value, delay])

  return debounced
}

// Same rules as the backend, checked early so the user gets instant feedback.
// (The backend still checks again: never trust only the browser.)
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
export const MAX_FILE_SIZE = 2 * 1024 * 1024
export const MAX_FILES = 5

export function checkFiles(files) {
  if (files.length > MAX_FILES) return `You can upload up to ${MAX_FILES} files`
  for (const file of files) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) return `${file.name}: only JPG, PNG and PDF files are allowed`
    if (file.size > MAX_FILE_SIZE) return `${file.name} is larger than 2 MB`
  }
  return ''
}

// 76118 -> "74 KB"
export function formatSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}
