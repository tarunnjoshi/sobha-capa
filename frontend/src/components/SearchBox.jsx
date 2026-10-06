// The 🔍 search box shown top-right on every page (like the design).
// - value / onChange: controlled input, the page decides what to do with the text
// - onSubmit (optional): called when the user presses Enter
export default function SearchBox({ value, onChange, onSubmit, placeholder = 'Search...' }) {
  function handleSubmit(e) {
    e.preventDefault()
    if (onSubmit) onSubmit(value)
  }

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <span className="search-icon">🔍</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </form>
  )
}
