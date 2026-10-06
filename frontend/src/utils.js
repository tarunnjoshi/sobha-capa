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
