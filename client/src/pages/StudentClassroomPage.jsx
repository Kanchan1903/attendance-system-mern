import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../lib/api";
import { clearAuth, getAuth } from "../lib/authStore";

export default function StudentClassroomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const token = auth?.token;
  const user = auth?.user;
  
  const [classroom, setClassroom] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState("");
  const [submissionInputs, setSubmissionInputs] = useState({});
  const [submissionFiles, setSubmissionFiles] = useState({});

  useEffect(() => {
    if (!token || user?.role !== "student") {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  async function load() {
    setError("");
    try {
      const data = await api(`/student/class/${id}`, { token });
      setClassroom(data.classroom);
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitAssignment(assignmentId) {
    const content = submissionInputs[assignmentId] || "";
    const file = submissionFiles[assignmentId] || null;
    if (!content.trim() && !file) return;

    try {
      const formData = new FormData();
      if (content.trim()) formData.append("content", content);
      if (file) formData.append("file", file);

      const res = await fetch(`/api/student/class/${id}/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to submit assignment");

      // Reload to show the updated submission
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function unsubmitAssignment(assignmentId) {
    if (!window.confirm("Are you sure you want to unsubmit this assignment? Your current submission will be deleted.")) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/student/class/${id}/assignments/${assignmentId}/submit`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to unsubmit assignment");

      // Reload to show the updated status
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const navLinks = [
    { to: "/student/dashboard", label: "Dashboard", active: false },
  ];

  if (!classroom) return <AppShell user={user} onLogout={() => { clearAuth(); navigate("/logout"); }}>Loading...</AppShell>;

  return (
    <AppShell
      title="Classroom Dashboard"
      user={user}
      navLinks={navLinks}
      onLogout={() => {
        clearAuth();
        navigate("/logout");
      }}
    >
      {error && <div className="message error">{error}</div>}

      <div className="card compact" style={{ marginBottom: "32px", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", padding: "40px 32px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "32px", fontFamily: "'Outfit', sans-serif" }}>{classroom.subjectName}</h1>
        <div style={{ fontSize: "16px", opacity: 0.9 }}>Prof. {classroom.teacherId?.name || "Unassigned"}</div>
      </div>

      <div className="assignments-panel">
        <div className="ap-header">
          <h3>Classwork & Assignments</h3>
        </div>
        
        <div className="ap-list">
          {assignments.map((a) => {
            const isSubmitted = !!a.submission;
            const statusColor = isSubmitted ? "#10b981" : "#f59e0b";
            const statusText = isSubmitted ? "Submitted" : "Pending";

            return (
              <div className="ap-item" key={a._id} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "24px", background: "#fff", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h4 style={{ margin: "0 0 8px", fontSize: "18px", color: "#0f172a" }}>{a.title}</h4>
                    {a.description && <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#64748b" }}>{a.description}</p>}
                    {a.dueDate && (
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>
                        Due: {new Date(a.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    )}
                    {a.filePath && (
                      <div style={{ marginTop: "12px" }}>
                        <a href={a.filePath} target="_blank" rel="noreferrer" className="btn btn-consistent" style={{ display: 'inline-block', padding: '6px 16px', background: '#e0e7ff', color: '#4f46e5', fontWeight: 600, textDecoration: 'none', borderRadius: '6px' }}>
                          Download Material
                        </a>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "6px 12px", borderRadius: "999px", background: statusColor + "15", color: statusColor, fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>
                    {statusText}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                  {isSubmitted ? (
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", marginBottom: "8px" }}>Your Submission:</div>
                      {a.submission.filePath && (
                        <div style={{ marginBottom: "8px" }}>
                          <a href={a.submission.filePath} target="_blank" rel="noreferrer" className="btn btn-consistent" style={{ display: 'inline-block', padding: '4px 12px', textDecoration: 'none', background: '#f1f5f9' }}>
                            View Uploaded File
                          </a>
                        </div>
                      )}
                      {a.submission.content && (
                        <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", color: "#334155" }}>
                          {a.submission.content.startsWith('http') ? (
                            <a href={a.submission.content} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "underline" }}>{a.submission.content}</a>
                          ) : (
                            a.submission.content
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                          Submitted on {new Date(a.submission.updatedAt).toLocaleString()}
                        </div>
                          <button 
                            type="button" 
                            className="btn btn-consistent" 
                            onClick={() => unsubmitAssignment(a._id)} 
                            style={{ padding: '6px 14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', fontSize: '12px', minHeight: 'auto', minWidth: 'auto' }}
                          >
                            Unsubmit
                          </button>
                      </div>
                      
                      {a.submission.remark && (
                        <div style={{ marginTop: "16px", background: "#fef3c7", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
                          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#b45309", marginBottom: "4px" }}>Teacher's Remark:</div>
                          <div style={{ fontSize: "14px", color: "#92400e" }}>{a.submission.remark}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", marginBottom: "12px" }}>Submit your work (Upload a file and/or add text notes):</div>
                      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                        <input
                          type="file"
                          onChange={(e) => setSubmissionFiles(prev => ({ ...prev, [a._id]: e.target.files?.[0] || null }))}
                          style={{ flex: 1, minHeight: "44px", padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <input
                          placeholder="e.g. Google Drive Link or text notes..."
                          value={submissionInputs[a._id] || ""}
                          onChange={(e) => setSubmissionInputs(prev => ({ ...prev, [a._id]: e.target.value }))}
                          style={{ flex: 1, minHeight: "44px" }}
                        />
                        <button 
                          className="btn btn-primary" 
                          onClick={() => submitAssignment(a._id)}
                          disabled={!submissionInputs[a._id]?.trim() && !submissionFiles[a._id]}
                        >
                          Turn In
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {assignments.length === 0 && (
            <div className="muted small" style={{ textAlign: "center", padding: "40px 0" }}>
              No assignments have been posted for this class yet.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
