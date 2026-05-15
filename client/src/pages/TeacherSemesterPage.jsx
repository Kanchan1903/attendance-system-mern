import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api, apiDownload } from "../lib/api";
import { clearAuth, getAuth } from "../lib/authStore";

export default function TeacherSemesterPage() {
  const { semesterId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const token = auth?.token;
  const user = auth?.user;

  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || user?.role !== "teacher") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId, token]);

  async function load() {
    try {
      const [sem, cls] = await Promise.all([
        api("/semesters", { token }),
        api(`/classrooms?semesterId=${semesterId}`, { token }),
      ]);
      setSemesters(sem.semesters || []);
      setClasses(cls.classrooms || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function createClass(e) {
    e.preventDefault();
    try {
      await api("/classrooms", { method: "POST", token, body: { subjectName, semesterId } });
      setSubjectName("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeClassroom(id) {
    if (!window.confirm("Delete this classroom?")) return;
    await api(`/classrooms/${id}`, { method: "DELETE", token });
    await load();
  }

  async function exportClassroom(id) {
    const date = new Date().toISOString().slice(0, 10);
    const q = new URLSearchParams({ date, timeslot: "Lecture 1" }).toString();
    await apiDownload(`/classrooms/${id}/export?${q}`, {
      token,
      filename: `attendance-${id}-${date}.xls`,
    });
  }

  async function downloadSemesterAssignments(e) {
    if (e) e.preventDefault();
    try {
      await apiDownload(`/semesters/${semesterId}/export-assignments`, {
        token,
        filename: `semester-assignment-report-${semesterId}.pdf`,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedSemester = semesters.find((s) => s._id === semesterId);
  const navLinks = [
    { to: "/teacher/dashboard", label: "Dashboard", active: false },
    ...semesters.map((s) => ({ to: `/teacher/semester/${s._id}`, label: s.semesterName, active: s._id === semesterId })),
  ];

  const totals = useMemo(() => {
    return classes.reduce(
      (acc, c) => {
        acc.classrooms += 1;
        acc.students += c.studentCount || 0;
        acc.assignments += c.assignmentCount || 0;
        return acc;
      },
      { classrooms: 0, students: 0, assignments: 0 }
    );
  }, [classes]);

  return (
    <AppShell
      title={`Semester Dashboard • ${selectedSemester?.semesterName || ""}`}
      user={user}
      navLinks={navLinks}
      onLogout={() => {
        clearAuth();
        navigate("/logout");
      }}
    >
      {error && <div className="message error">{error}</div>}
      <div className="row semester-top-actions" style={{ marginBottom: 12 }}>
        <form className="row" onSubmit={createClass}>
          <input
            placeholder="Subject name"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            required
          />
          <button className="btn btn-primary btn-consistent" type="submit">
            + Create class
          </button>
        </form>
        <Link className="btn btn-primary btn-consistent" to={`/teacher/semester/${semesterId}/report`}>
          Semester report
        </Link>
        <button className="btn btn-primary btn-consistent" type="button" onClick={downloadSemesterAssignments}>
          Semester assignment report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div className="dashboard-kpi-card">
          <div className="kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{totals.classrooms}</div>
            <div className="kpi-label">Classrooms</div>
            <div className="kpi-subtext" style={{ color: '#059669' }}>Active this semester</div>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{totals.students}</div>
            <div className="kpi-label">Students</div>
            <div className="kpi-subtext" style={{ color: '#4f46e5' }}>Total enrolled</div>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{totals.assignments}</div>
            <div className="kpi-label">Assignments</div>
            <div className="kpi-subtext" style={{ color: '#d97706' }}>Tasks created</div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        {classes.map((c) => (
          <div className="card" key={c._id} style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div style={{ background: '#10b981', color: '#fff', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{c.subjectName}</h3>
                <div style={{ padding: '4px 12px', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                  {c.studentCount || 0} students
                </div>
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Code {c.classCode}
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
                {c.assignmentCount || 0} assignments
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button className="btn btn-consistent" type="button" onClick={() => navigate(`/teacher/classroom/${c._id}`)} style={{ width: '100%', minWidth: 0, padding: '10px', fontSize: '13.5px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a' }}>
                  Open
                </button>
                <button className="btn btn-consistent" type="button" onClick={() => navigate(`/teacher/classroom/${c._id}/attendance`)} style={{ width: '100%', minWidth: 0, padding: '10px', fontSize: '13.5px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a' }}>
                  Attendance
                </button>
                <button className="btn btn-consistent" type="button" onClick={() => exportClassroom(c._id)} style={{ width: '100%', minWidth: 0, padding: '10px', fontSize: '13.5px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a' }}>
                  Export CSV
                </button>
                <button className="btn btn-consistent" type="button" onClick={() => navigate(`/teacher/classroom/${c._id}`)} style={{ width: '100%', minWidth: 0, padding: '10px', fontSize: '13.5px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a' }}>
                  Add Task
                </button>
              </div>
              <button className="btn btn-consistent" type="button" onClick={() => removeClassroom(c._id)} style={{ width: '100%', marginTop: '10px', minWidth: 0, padding: '10px', fontSize: '13.5px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444' }}>
                Remove Classroom
              </button>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="card">
            <div className="card-body muted">No classrooms in this semester yet.</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

