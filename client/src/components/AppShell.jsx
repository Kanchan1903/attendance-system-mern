import { Link } from "react-router-dom";

export default function AppShell({
  title,
  user,
  navLinks = [],
  children,
  onLogout,
  sidebarBottom,
  navContent,
}) {
  return (
    <div className="app">
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="brand">
          <div className="brand-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
          </div>
          <div>
            <div className="brand-title">ClassMaster</div>
            <div className="muted small">Student Portal</div>
          </div>
        </div>
        <nav className="nav" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {navLinks.map((link) => {
            const l = link.label.toLowerCase();
            let Icon = null;
            if (l.includes('dashboard')) {
              Icon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>;
            } else if (l.includes('sem') || l.includes('class')) {
              Icon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>;
            } else {
              Icon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>;
            }
            return (
              <Link key={link.to} className={link.active ? "active" : ""} to={link.to} style={{ gap: '12px' }}>
                {Icon}
                {link.label}
              </Link>
            );
          })}
          {navContent}
          <button className="link-btn" onClick={onLogout} type="button" style={{ gap: '12px', marginTop: 'auto' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
        </nav>
        {sidebarBottom && <div style={{ marginTop: 'auto', paddingTop: '24px' }}>{sidebarBottom}</div>}
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-row">
            <h1 className="page-title">{title}</h1>
            <div className="user-chip">
              <span className="avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</span>
              <div className="small-stack">
                <div className="fw">{user?.name || "User"}</div>
                <div className="muted small">{user?.role || ""}</div>
              </div>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

