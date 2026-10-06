import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// Sidebar menu. "roles" = who can see the link.
const menu = [
  { to: '/config', label: 'Admin Configuration', roles: ['admin'] },
  { to: '/capa/new', label: 'Defect Logging', roles: ['supervisor'] },
  { to: '/capa', label: 'CAPA Workflow', roles: ['admin', 'supervisor', 'engineer', 'qcs', 'qaqc'] },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">SOBHA</div>
        <p className="menu-title">MAIN MENU</p>

        <nav>
          {menu
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              // NavLink adds the "active" class when the URL matches -> gold highlight
              <NavLink key={item.to} to={item.to} end className="menu-link">
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="user-box">
          <strong>{user.name}</strong>
          <span>{user.role.toUpperCase()}</span>
          <button className="btn-link" onClick={logout}>Logout</button>
        </div>
      </aside>

      {/* The current page renders here */}
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
