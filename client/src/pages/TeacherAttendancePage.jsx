import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api, apiDownload } from "../lib/api";
import { clearAuth, getAuth } from "../lib/authStore";

export default function TeacherAttendancePage() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const token = auth?.token;
  const user = auth?.user;

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeslot, setTimeslot] = useState("Lecture 1");
  const [classroom, setClassroom] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== "teacher") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, classroomId]);

  async function load() {
    try {
      const q = new URLSearchParams({ date, timeslot }).toString();
      const data = await api(`/classrooms/${classroomId}/attendance?${q}`, { token });
      setClassroom(data.classroom);
      const sortedRows = (data.rows || [])
        .slice()
        .sort((a, b) =>
          String(a.prn || "").localeCompare(String(b.prn || ""), undefined, { numeric: true, sensitivity: "base" })
        );
      setRows(sortedRows);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  function setAll(status) {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  }

  function setOne(prn, status) {
    setRows((prev) => prev.map((r) => (r.prn === prn ? { ...r, status } : r)));
  }

  function fillRemainingAbsent() {
    setRows((prev) => prev.map((r) => (r.status === "P" ? r : { ...r, status: "A" })));
  }

  function fillRemainingPresent() {
    setRows((prev) => prev.map((r) => (r.status === "A" ? r : { ...r, status: "P" })));
  }

  async function save() {
    try {
      const statuses = {};
      rows.forEach((r) => {
        if (r.status === "P" || r.status === "A") statuses[r.prn] = r.status;
      });
      await api(`/classrooms/${classroomId}/attendance`, {
        method: "POST",
        token,
        body: { date, timeslot, statuses },
      });
      setError("");
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function exportSheet() {
    const q = new URLSearchParams({ date, timeslot }).toString();
    await apiDownload(`/classrooms/${classroomId}/export?${q}`, {
      token,
      filename: `attendance-${classroomId}-${date}.xls`,
    });
  }

  const navLinks = [{ to: "/teacher/dashboard", label: "Dashboard", active: false }];

  return (
    <AppShell
      title={`Attendance • ${classroom?.subjectName || ""}`}
      user={user}
      navLinks={navLinks}
      onLogout={() => {
        clearAuth();
        navigate("/logout");
      }}
    >
      {error && <div className="message error">{error}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body row" style={{ justifyContent: "space-between" }}>
          <div className="muted">
            Class code: <b>{classroom?.classCode || "-"}</b>
          </div>
          <button className="btn btn-consistent" type="button" onClick={() => navigate(`/teacher/dashboard`)}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input value={timeslot} onChange={(e) => setTimeslot(e.target.value)} placeholder="Time slot" />
          <button className="btn btn-consistent" type="button" onClick={load}>
            Load
          </button>
          <button className="btn btn-consistent" type="button" onClick={exportSheet}>
            Download (Date + Slot)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body row">
          <button className="btn btn-primary btn-consistent" type="button" onClick={() => setAll("P")}>
            Mark All Present
          </button>
          <button className="btn btn-primary btn-consistent" type="button" onClick={() => setAll("A")}>
            Mark All Absent
          </button>
          <button className="btn btn-primary btn-consistent" type="button" onClick={fillRemainingPresent}>
            Fill Others Present
          </button>
          <button className="btn btn-primary btn-consistent" type="button" onClick={fillRemainingAbsent}>
            Fill Others Absent
          </button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Sr</th>
            <th>PRN</th>
            <th>Name</th>
            <th>Email</th>
            <th>Attendance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.prn}>
              <td>{idx + 1}</td>
              <td>{r.prn}</td>
              <td>{r.name}</td>
              <td>{r.email}</td>
              <td>
                <div className="attendance-options">
                  <label>
                    <input
                      type="radio"
                      name={`att-${r.prn}`}
                      checked={r.status === "P"}
                      onChange={() => setOne(r.prn, "P")}
                    />{" "}
                    P
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`att-${r.prn}`}
                      checked={r.status === "A"}
                      onChange={() => setOne(r.prn, "A")}
                    />{" "}
                    A
                  </label>
                </div>
              </td>
              <td>{r.status === "P" ? "Present" : r.status === "A" ? "Absent" : "Not marked"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="muted" colSpan={6}>
                No students enrolled yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn btn-primary btn-consistent" type="button" onClick={save}>
          Save Attendance
        </button>
      </div>

      {showSuccessModal && (
        <div className="modal-wrap">
          <div className="modal-card" style={{ maxWidth: 400, textAlign: "center", padding: "32px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ marginBottom: 16 }}>Attendance Saved</h3>
            <p className="muted" style={{ marginBottom: 24 }}>
              The attendance records have been successfully saved for this class.
            </p>
            <button
              className="btn btn-primary btn-consistent"
              style={{ width: "100%" }}
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/teacher/dashboard");
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

