import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api, apiDownload } from "../lib/api";
import { clearAuth, getAuth } from "../lib/authStore";

export default function SemesterReportPage() {
  const { semesterId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const token = auth?.token;
  const user = auth?.user;
  const [range, setRange] = useState("15days");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().slice(0, 10);
  }, []);
  const defaultTo = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setFrom(defaultFrom);
    setTo(defaultTo);
  }, [defaultFrom, defaultTo]);

  useEffect(() => {
    if (!token) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range, semesterId, from, to]);

  async function loadReport() {
    if (!from || !to) return;
    try {
      const q = new URLSearchParams({ semesterId, range, from, to }).toString();
      const data = await api(`/semester-report?${q}`, { token });
      setReport(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadReport(format) {
    try {
      const q = new URLSearchParams({
        semesterId,
        range,
        from: from || defaultFrom,
        to: to || defaultTo,
        format,
      }).toString();
      await apiDownload(`/semester-report?${q}`, {
        token,
        filename: `semester-report-${semesterId}.${format === "xls" ? "xls" : "pdf"}`,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendToStudents() {
    try {
      setError("");
      setSuccess("");
      const body = {
        semesterId,
        range,
        from: from || defaultFrom,
        to: to || defaultTo,
      };
      const data = await api(`/semester-report/send`, { token, method: "POST", body });
      if (data.success) {
        setSuccess(data.message || "Report successfully sent to students.");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  const navLinks = [
    { to: "/teacher/dashboard", label: "Dashboard", active: false },
    { to: `/teacher/semester/${semesterId}`, label: "Semester", active: false },
  ];

  return (
    <AppShell
      title="Semester Report"
      user={user}
      navLinks={navLinks}
      onLogout={() => {
        clearAuth();
        navigate("/logout");
      }}
    >
      {error && <div className="message error">{error}</div>}
      {success && <div className="message success" style={{ background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #bbf7d0" }}>{success}</div>}
      <div className="card">
        <div className="card-body">
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="btn btn-consistent" type="button" onClick={() => navigate(-1)}>
              Back
            </button>
            <button className="btn btn-primary btn-consistent" type="button" onClick={() => downloadReport("xls")}>
              Download Excel
            </button>
            <button className="btn btn-primary btn-consistent" type="button" onClick={() => downloadReport("pdf")}>
              Download PDF
            </button>
            <button className="btn btn-primary btn-consistent" style={{ background: "#8b5cf6", borderColor: "#8b5cf6" }} type="button" onClick={sendToStudents}>
              Send to Students
            </button>
          </div>
          <div className="row">
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="15days">Last 15 days</option>
              <option value="1month">Last 1 month</option>
              <option value="custom">Custom</option>
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={range !== "custom"} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={range !== "custom"} />
            <button className="btn btn-primary btn-consistent" type="button" onClick={loadReport}>
              Apply
            </button>
          </div>
        </div>
      </div>

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>PRN</th>
            <th>Student</th>
            {(report?.subjects || []).map((s) => (
              <th key={s.id}>{s.subjectName} %</th>
            ))}
            <th>Cumulative %</th>
            <th>Conducted</th>
            <th>Attended</th>
          </tr>
        </thead>
        <tbody>
          {(report?.rows || []).map((row) => (
            <tr key={row.prn}>
              <td>{row.prn}</td>
              <td>{row.name}</td>
              {(report?.subjects || []).map((s) => (
                <td key={`${row.prn}-${s.id}`}>{row.subjectStats?.[s.id]?.percent ?? 0}%</td>
              ))}
              <td>
                <b>{row.cumulativePercent}%</b>
              </td>
              <td>{row.totalClasses}</td>
              <td>{row.totalAttended}</td>
            </tr>
          ))}
          {(!report || !report.rows || report.rows.length === 0) && (
            <tr>
              <td className="muted" colSpan={5 + (report?.subjects?.length || 0)}>
                No semester attendance data found for selected range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </AppShell>
  );
}

