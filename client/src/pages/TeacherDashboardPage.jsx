import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { clearAuth, getAuth } from "../lib/authStore";

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const auth = getAuth();
  const token = auth?.token;
  const user = auth?.user;

  const [semesters, setSemesters] = useState([]);
  const [summary, setSummary] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");
  const [semesterForm, setSemesterForm] = useState({ semesterName: "", semesterCode: "", subjectName: "" });
  const [classForm, setClassForm] = useState({ subjectName: "", semesterId: "" });
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== "teacher") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    try {
      const [sem, sum, dash] = await Promise.all([
        api("/semesters", { token }),
        api("/semesters/summary", { token }),
        api("/dashboard/summary", { token }),
      ]);
      setSemesters(sem.semesters || []);
      setSummary(sum.semesters || []);
      setDashboardData(dash);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  const totals = useMemo(() => {
    return (summary || []).reduce(
      (acc, x) => {
        acc.semesters += 1;
        acc.students += x.enrolledStudents || 0;
        acc.assignments += x.assignmentCount || 0;
        return acc;
      },
      { semesters: 0, students: 0, assignments: 0 }
    );
  }, [summary]);

  async function createSemester(e) {
    e.preventDefault();
    try {
      await api("/semesters", { method: "POST", token, body: semesterForm });
      setSemesterForm({ semesterName: "", semesterCode: "", subjectName: "" });
      setShowSemesterModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createClass(e) {
    e.preventDefault();
    try {
      await api("/classrooms", { method: "POST", token, body: classForm });
      setClassForm({ subjectName: "", semesterId: "" });
      setShowClassModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const navLinks = [
    { to: "/teacher/dashboard", label: "Dashboard", active: true },
    ...semesters.map((s) => ({ to: `/teacher/semester/${s._id}`, label: s.semesterName, active: false })),
  ];

  return (
    <AppShell
      title="Faculty Dashboard"
      user={user}
      navLinks={navLinks}
      onLogout={() => {
        clearAuth();
        navigate("/logout");
      }}
    >
      {error && <div className="message error">{error}</div>}

      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        borderRadius: '24px',
        padding: '32px 40px',
        color: '#fff',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800' }}>Good morning, {(user?.name || "Teacher").split(' ')[0]}! 👋</h2>
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>Here's an overview of your classes and attendance today.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }} onClick={() => setShowSemesterModal(true)}>+ Add Semester</button>
            <button className="btn" style={{ background: '#fff', color: '#6366f1', border: 'none', transition: 'all 0.2s' }} onClick={() => setShowClassModal(true)}>+ Add Class</button>
          </div>
        </div>

        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', borderRadius: '50%', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', bottom: '-50%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%', zIndex: 1 }}></div>
      </div>

      <div className="dashboard-kpis">
        <div className="dashboard-kpi-card" style={{ cursor: 'pointer' }}>
          <div className="kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}>👥</div>
          <div className="kpi-content">
            <div className="kpi-value">{dashboardData?.kpis?.totalStudents || 0}</div>
            <div className="kpi-label">Total Students</div>
            <div className="kpi-subtext">Across <strong>{dashboardData?.kpis?.totalClasses || 0} classes</strong></div>
          </div>
        </div>
        <div className="dashboard-kpi-card" style={{ cursor: 'pointer' }}>
          <div className="kpi-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>📅</div>
          <div className="kpi-content">
            <div className="kpi-value">{dashboardData?.kpis?.averageAttendance || 0}%</div>
            <div className="kpi-label">Average Attendance</div>
            <div className="kpi-subtext" style={{ color: '#2563eb' }}>This Month</div>
          </div>
        </div>
        <div className="dashboard-kpi-card" style={{ cursor: 'pointer' }}>
          <div className="kpi-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>📋</div>
          <div className="kpi-content">
            <div className="kpi-value">{dashboardData?.kpis?.totalClasses || 0}</div>
            <div className="kpi-label">Total Classes</div>
            <div className="kpi-subtext" style={{ color: '#9333ea' }}>Active</div>
          </div>
        </div>
        <div className="dashboard-kpi-card" style={{ cursor: 'pointer' }}>
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>📈</div>
          <div className="kpi-content">
            <div className="kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '18px' }}>{(dashboardData?.kpis?.attendanceGrowth || 0) >= 0 ? '↑' : '↓'}</span> 
              {Math.abs(dashboardData?.kpis?.attendanceGrowth || 0)}%
            </div>
            <div className="kpi-label">Attendance Growth</div>
            <div className="kpi-subtext" style={{ color: '#d97706' }}>From Last Month</div>
          </div>
        </div>
      </div>

      <div>
        <div className="dashboard-main-col">
          <div className="card">
            <div className="card-header-flex">
              <h3 className="card-title" style={{ margin: 0, color: '#0f172a' }}>Subject Attendance Overview</h3>
              <select className="kpi-select">
                <option>This Month</option>
                <option>Last Month</option>
              </select>
            </div>
            <div className="card-body">
              <div className="subject-bars">
                {dashboardData?.subjectAttendance?.map((subj, idx) => {
                  const colors = [
                    { bg: '#10b981', color: '#10b981', icon: '🧪' },
                    { bg: '#3b82f6', color: '#3b82f6', icon: '⚛️' },
                    { bg: '#8b5cf6', color: '#8b5cf6', icon: '🧲' },
                    { bg: '#f59e0b', color: '#f59e0b', icon: '📚' }
                  ];
                  const scheme = colors[idx % colors.length];
                  return (
                    <div className="subject-bar-row" key={subj.id}>
                      <div className="subject-bar-label">
                        <div className="subject-icon" style={{ background: scheme.bg }}>{scheme.icon}</div>
                        <div>
                          <div className="fw">{subj.subjectName}</div>
                          <div className="muted small">{subj.studentsCount} Students</div>
                        </div>
                      </div>
                      <div className="subject-progress-container">
                        <div className="subject-progress-bar" style={{ width: `${subj.percent}%`, background: scheme.bg }}></div>
                      </div>
                      <div className="subject-progress-val" style={{ color: scheme.color }}>{subj.percent}%</div>
                    </div>
                  );
                })}
                {(!dashboardData?.subjectAttendance || dashboardData.subjectAttendance.length === 0) && (
                  <div className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>No attendance data for this month yet.</div>
                )}
              </div>
              
              <button 
                className="btn" 
                onClick={() => {
                  if (semesters && semesters.length > 0) {
                    navigate(`/teacher/semester/${semesters[0]._id}/report`);
                  } else {
                    alert("No semester available to view report.");
                  }
                }}
                style={{ width: '100%', marginTop: '24px', color: '#059669', background: '#f0fdf4', borderColor: '#bbf7d0' }}
              >
                View Detailed Report
              </button>
            </div>
          </div>

          <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '18px' }}>Your Semesters</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Semester</th>
                <th>Code</th>
                <th>Classrooms</th>
                <th>Enrolled students</th>
                <th>Assignments</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s._id}>
                  <td>{s.semesterName}</td>
                  <td>{s.semesterCode}</td>
                  <td>{s.classroomCount || 0}</td>
                  <td>{s.enrolledStudents || 0}</td>
                  <td>{s.assignmentCount || 0}</td>
                  <td>
                    <Link className="btn btn-consistent" to={`/teacher/semester/${s._id}`}>
                      Open semester
                    </Link>
                  </td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td className="muted" colSpan={6}>
                    No semesters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


      </div>

      {showSemesterModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowSemesterModal(false)}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>Add Semester</h3>
              <button className="btn" type="button" onClick={() => setShowSemesterModal(false)}>
                Close
              </button>
            </div>
            <form className="modal-body form-grid" onSubmit={createSemester}>
              <label>Semester name</label>
              <input
                placeholder="Semester 1"
                value={semesterForm.semesterName}
                onChange={(e) => setSemesterForm((p) => ({ ...p, semesterName: e.target.value }))}
                required
              />
              <label>Code</label>
              <input
                placeholder="SEM1"
                value={semesterForm.semesterCode}
                onChange={(e) => setSemesterForm((p) => ({ ...p, semesterCode: e.target.value }))}
                required
              />
              <label>Subject track (optional)</label>
              <input
                placeholder="e.g. DBMS — use if you reuse the same semester name"
                value={semesterForm.subjectName}
                onChange={(e) => setSemesterForm((p) => ({ ...p, subjectName: e.target.value }))}
              />
              <div className="muted small">Same name/code can repeat per faculty when this field differs.</div>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-consistent" type="submit">
                  Save Semester
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowClassModal(false)}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>Add Class</h3>
              <button className="btn" type="button" onClick={() => setShowClassModal(false)}>
                Close
              </button>
            </div>
            <form className="modal-body form-grid" onSubmit={createClass}>
              <label>Subject name</label>
              <input
                placeholder="Physics"
                value={classForm.subjectName}
                onChange={(e) => setClassForm((p) => ({ ...p, subjectName: e.target.value }))}
                required
              />
              <label>Semester</label>
              <select
                value={classForm.semesterId}
                onChange={(e) => setClassForm((p) => ({ ...p, semesterId: e.target.value }))}
                required
              >
                <option value="">Select semester</option>
                {semesters.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.semesterName} ({s.semesterCode})
                  </option>
                ))}
              </select>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-consistent" type="submit">
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

