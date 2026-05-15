import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { clearAuth, getAuth } from "../lib/authStore";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const token = auth?.token;
  const user = auth?.user;
  const [classes, setClasses] = useState([]);
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState("");

  const bannerThemes = [
    { bg: "#10b981", icon: "</>" },
    { bg: "#3b82f6", icon: "💻" },
    { bg: "#8b5cf6", icon: "📚" },
    { bg: "#f59e0b", icon: "🔀" },
    { bg: "#ec4899", icon: "🧠" },
    { bg: "#10b981", icon: "🔒" },
  ];

  useEffect(() => {
    if (!token || user?.role !== "student") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    setError("");
    try {
      const data = await api("/student/classes", { token });
      setClasses(data.classrooms || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function joinClass(e) {
    e.preventDefault();
    try {
      await api("/enrollments/join", { method: "POST", token, body: { classCode } });
      setClassCode("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const navLinks = [
    { to: "/student/dashboard", label: "Dashboard", active: true },
  ];

  const joinSidebarForm = (
    <div className="card compact" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '20px 16px' }}>
      <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#0f172a' }}>Join a Class</h4>
      <form onSubmit={joinClass} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input
          placeholder="Class Code"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          required
          style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
        />
        <button className="btn btn-primary" type="submit" style={{ minHeight: '36px', fontSize: '13px' }}>
          Join
        </button>
      </form>
    </div>
  );

  // Simple static calendar component
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const sidebarCalendar = (
    <div className="card compact" style={{ background: '#fff', padding: '16px', marginTop: '20px' }}>
      <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: '#0f172a', textAlign: 'center' }}>{currentMonth}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} style={{ fontWeight: 600, color: '#64748b' }}>{d}</div>)}
        {calendarDays.map((d, i) => (
          <div key={i} style={{ 
            padding: '4px', 
            borderRadius: '4px', 
            background: d === today.getDate() ? '#10b981' : 'transparent',
            color: d === today.getDate() ? '#fff' : (d ? '#334155' : 'transparent'),
            fontWeight: d === today.getDate() ? 'bold' : 'normal'
          }}>
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );

  const upcomingAssignments = classes
    .flatMap((c) => (c.assignments || []).map((a) => ({ ...a, subjectName: c.subjectName, classroomId: c._id })))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, 5);

  const uniqueReports = [];
  const seenSemesters = new Set();
  classes.forEach(c => {
    if (c.semesterId?.sharedReportPath && !seenSemesters.has(c.semesterId._id)) {
      seenSemesters.add(c.semesterId._id);
      uniqueReports.push({
        semesterName: c.semesterId.semesterName,
        sharedReportPath: c.semesterId.sharedReportPath,
        sharedReportDate: c.semesterId.sharedReportDate,
      });
    }
  });

  const sidebarReports = uniqueReports.length > 0 ? (
    <div style={{ marginTop: '32px', marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px', paddingLeft: '12px' }}>
        Attendance Reports
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {uniqueReports.map((r, idx) => (
          <a
            key={idx}
            href={r.sharedReportPath}
            target="_blank"
            rel="noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 12px', 
              borderRadius: '8px', 
              background: '#f8fafc',
              textDecoration: 'none',
              color: '#334155',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = '#f8fafc';
            }}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              📊
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.semesterName}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(r.sharedReportDate).toLocaleDateString()}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </a>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <AppShell
      title="Student Portal"
      user={user}
      navLinks={navLinks}
      navContent={sidebarReports}
      sidebarBottom={<>{joinSidebarForm}{sidebarCalendar}</>}
      onLogout={() => {
        clearAuth();
        navigate("/logout");
      }}
    >
      {error && <div className="message error">{error}</div>}

      <div className="dashboard-header" style={{ marginBottom: "32px" }}>
        <div className="dashboard-greeting">
          <h2 style={{ fontSize: "28px" }}>Good morning, {(user?.name || "Student").split(" ")[0]}! 👋</h2>
          <p>Keep learning and keep growing.</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "18px", margin: 0, color: "#0f172a" }}>My Classes</h3>
        <a href="#" style={{ color: "#10b981", fontWeight: 600, fontSize: "14px" }}>View all</a>
      </div>

      <div className="classroom-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
        {classes.map((c, idx) => {
          const theme = bannerThemes[idx % bannerThemes.length];
          return (
            <div className="student-class-card" key={c._id} onClick={() => navigate(`/student/class/${c._id}`)}>
              <div className="scc-icon" style={{ background: theme.bg }}>
                {theme.icon}
              </div>
              <div className="scc-title" title={c.subjectName}>{c.subjectName}</div>
              <div className="scc-prof">Prof. {c.teacherId?.name || "Unassigned"}</div>
              <div className="scc-meta">
                <span>📅</span> Code: {c.classCode}
              </div>
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="card" style={{ gridColumn: "1 / -1", background: "transparent", border: "1px dashed #cbd5e1", boxShadow: "none" }}>
            <div className="card-body muted" style={{ textAlign: "center", padding: "40px 20px" }}>
              You are not enrolled in any classes yet.
            </div>
          </div>
        )}
      </div>

      <div className="assignments-panel" style={{ marginTop: '32px' }}>
        <div className="ap-header">
          <h3>Upcoming Assignments</h3>
          <a href="#">View all</a>
        </div>
          
        <div className="ap-list">
          {upcomingAssignments.map((a, idx) => {
            const theme = bannerThemes[idx % bannerThemes.length];
            let daysLeft = "";
            let pillBg = "#f1f5f9", pillColor = "#64748b";
            if (a.dueDate) {
              const diffTime = Math.abs(new Date(a.dueDate) - new Date());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              daysLeft = `Due in ${diffDays} days`;
              if (diffDays <= 3) {
                pillBg = "#fef3c7"; pillColor = "#d97706";
              } else if (diffDays <= 7) {
                pillBg = "#f3e8ff"; pillColor = "#7e22ce";
              } else {
                pillBg = "#dcfce7"; pillColor = "#15803d";
              }
            }

            return (
              <div 
                className="ap-item" 
                key={a._id || idx} 
                onClick={() => navigate(`/student/class/${a.classroomId}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="ap-icon" style={{ background: theme.bg + "20", color: theme.bg }}>
                  📄
                </div>
                <div className="ap-info">
                  <div className="ap-title">{a.title}</div>
                  <div className="ap-sub">{a.subjectName}</div>
                </div>
                {a.dueDate ? (
                  <div className="ap-due" style={{ background: pillBg, color: pillColor }}>
                    {daysLeft}
                  </div>
                ) : (
                  <div className="ap-due" style={{ background: "#f1f5f9", color: "#64748b" }}>
                    No due
                  </div>
                )}
                <span style={{ color: "#cbd5e1", marginLeft: 8 }}>›</span>
              </div>
            );
          })}
          
          {upcomingAssignments.length === 0 && (
            <div className="muted small" style={{ textAlign: "center", padding: "40px 0" }}>
              No upcoming assignments. You're all caught up!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

