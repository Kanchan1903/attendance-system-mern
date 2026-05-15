import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api, apiDownload } from "../lib/api";
import { clearAuth, getAuth } from "../lib/authStore";
import { safeResetForm } from "../lib/formUtils";

export default function TeacherClassroomPage() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const token = auth?.token;
  const user = auth?.user;

  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [name, setName] = useState("");
  const [prn, setPrn] = useState("");
  const [email, setEmail] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [downloadDate, setDownloadDate] = useState(new Date().toISOString().slice(0, 10));
  const [downloadTimeslot, setDownloadTimeslot] = useState("Lecture 1");
  const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", dueDate: "", file: null });
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [currentAssignmentTitle, setCurrentAssignmentTitle] = useState("");
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const [remarksInput, setRemarksInput] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [editStudentForm, setEditStudentForm] = useState({ prn: "", name: "", email: "" });

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
      const data = await api(`/classrooms/${classroomId}/details`, { token });
      setClassroom(data.classroom);
      setStudents(data.students || []);
      setAssignments(data.assignments || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function addStudent(e) {
    e.preventDefault();
    try {
      await api(`/enrollments/classrooms/${classroomId}/students`, {
        method: "POST",
        token,
        body: { name, prn, email },
      });
      setName("");
      setPrn("");
      setEmail("");
      setShowAddStudentModal(false);
      setNotice("Student added successfully");
      setTimeout(() => setNotice(""), 3000);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeStudent(targetPrn) {
    if (!window.confirm("Remove this student?")) return;
    try {
      await api(`/enrollments/classrooms/${classroomId}/students`, {
        method: "DELETE",
        token,
        body: { prn: targetPrn },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function openEditStudent(student) {
    setEditStudentForm({
      prn: student.prn || "",
      name: student.name || "",
      email: student.email || "",
    });
    setShowEditStudentModal(true);
  }

  async function updateStudent(e) {
    e.preventDefault();
    try {
      await api(`/enrollments/classrooms/${classroomId}/students`, {
        method: "PATCH",
        token,
        body: editStudentForm,
      });
      setShowEditStudentModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadCsv(e) {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!csvFile) return;
    try {
      const formData = new FormData();
      formData.append("studentsCsv", csvFile);
      const res = await fetch(`/api/enrollments/classrooms/${classroomId}/students/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.details || "Upload failed");
      setCsvFile(null);
      setShowCsvModal(false);
      setNotice(`Students added successfully! CSV uploaded: ${data?.added || 0} added, ${data?.skipped || 0} skipped.`);
      setTimeout(() => setNotice(""), 5000);
      await load();
      safeResetForm(formEl);
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadAttendance(e) {
    e.preventDefault();
    try {
      const q = new URLSearchParams({ date: downloadDate, timeslot: downloadTimeslot }).toString();
      await apiDownload(`/classrooms/${classroomId}/export?${q}`, {
        token,
        filename: `attendance-${classroomId}-${downloadDate}.xls`,
      });
      setShowDownloadModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadAssignments(e) {
    if (e) e.preventDefault();
    try {
      await apiDownload(`/classrooms/${classroomId}/export-assignments`, {
        token,
        filename: `assignment-report-${classroomId}.pdf`,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveAssignment(e) {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", assignmentForm.title);
      if (assignmentForm.description) formData.append("description", assignmentForm.description);
      if (assignmentForm.dueDate) formData.append("dueDate", assignmentForm.dueDate);
      if (assignmentForm.file) formData.append("file", assignmentForm.file);

      const url = editingAssignmentId 
        ? `/api/classrooms/${classroomId}/assignments/${editingAssignmentId}`
        : `/api/classrooms/${classroomId}/assignments`;
      const method = editingAssignmentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save assignment");

      setAssignmentForm({ title: "", description: "", dueDate: "", file: null });
      setEditingAssignmentId(null);
      setShowAssignmentModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function openAddAssignment() {
    setAssignmentForm({ title: "", description: "", dueDate: "", file: null });
    setEditingAssignmentId(null);
    setShowAssignmentModal(true);
  }

  function openEditAssignment(a) {
    setAssignmentForm({
      title: a.title,
      description: a.description || "",
      dueDate: a.dueDate ? a.dueDate.slice(0, 10) : "",
      file: null, // Don't pre-fill file, they must upload a new one to replace
    });
    setEditingAssignmentId(a._id);
    setShowAssignmentModal(true);
  }

  async function deleteAssignment(assignmentId) {
    if (!window.confirm("Delete this assignment?")) return;
    try {
      await api(`/classrooms/${classroomId}/assignments/${assignmentId}`, {
        method: "DELETE",
        token,
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function viewSubmissions(assignment) {
    try {
      const data = await api(`/classrooms/${classroomId}/assignments/${assignment._id}/submissions`, { token });
      setSubmissionsList(data.submissions || []);
      setCurrentAssignmentTitle(assignment.title);
      setCurrentAssignmentId(assignment._id);
      
      const rInput = {};
      (data.submissions || []).forEach(s => {
        rInput[s._id] = s.remark || "";
      });
      setRemarksInput(rInput);
      
      setShowSubmissionsModal(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveRemark(submissionId) {
    try {
      const remark = remarksInput[submissionId] || "";
      const res = await api(`/classrooms/${classroomId}/assignments/${currentAssignmentId}/submissions/${submissionId}/remark`, {
        method: "PUT",
        token,
        body: { remark }
      });
      
      setSubmissionsList(prev => prev.map(s => s._id === submissionId ? { ...s, remark } : s));
      setSuccessMessage("Remark saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  const navLinks = [{ to: "/teacher/dashboard", label: "Dashboard", active: false }];

  return (
    <AppShell
      title={classroom ? classroom.subjectName : "Classroom"}
      user={user}
      navLinks={navLinks}
      onLogout={() => {
        clearAuth();
        navigate("/logout");
      }}
    >
      {error && <div className="message error">{error}</div>}
      {notice && <div className="message">{notice}</div>}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted">
              Join code: <b>{classroom?.classCode || "-"}</b>
            </div>
            <div className="row">
              <button className="btn btn-primary btn-consistent" type="button" onClick={() => navigate(`/teacher/classroom/${classroomId}/attendance`)}>
                Mark attendance
              </button>
              <button className="btn btn-primary btn-consistent" type="button" onClick={() => setShowAddStudentModal(true)}>
                Add student
              </button>
              <button className="btn btn-primary btn-consistent" type="button" onClick={() => setShowCsvModal(true)}>
                Upload CSV
              </button>
              <button className="btn btn-primary btn-consistent" type="button" onClick={openAddAssignment}>
                Add assignment
              </button>
              <button className="btn btn-primary btn-consistent" type="button" onClick={() => setShowDownloadModal(true)}>
                Download
              </button>
              <button className="btn btn-primary btn-consistent" type="button" onClick={downloadAssignments}>
                Assignment Report
              </button>
              <button className="btn btn-consistent" type="button" onClick={() => navigate(-1)}>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="card">
          <div className="card-body">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <div className="card-title">Enrolled students</div>
              <div className="muted">{students.length} total</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>PRN</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Cumulative</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.prn}>
                    <td>{s.prn}</td>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>
                      <span className="fw" style={{ color: s.attendancePercent < 75 ? "#ef4444" : "#059669" }}>
                        {s.attendancePercent}%
                      </span>
                    </td>
                    <td>
                      <div className="row">
                        <button className="btn btn-consistent" type="button" onClick={() => openEditStudent(s)}>
                          Edit
                        </button>
                        <button className="btn btn-consistent" type="button" onClick={() => removeStudent(s.prn)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td className="muted" colSpan={4}>
                      No students yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <div className="card-title">Assignments</div>
              <div className="muted">{assignments.length} total</div>
            </div>
            {assignments.length === 0 && <div className="muted">No assignments uploaded.</div>}
            {assignments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {assignments.map(a => (
                  <details key={a._id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}>
                    <summary style={{ padding: '14px 16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', listStyle: 'none', outline: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '15px', color: '#0f172a' }}>{a.title}</span>
                        {a.dueDate && (
                          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>
                            Due: {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>Click to expand</div>
                    </summary>
                    <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      {a.description && (
                        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                          {a.description}
                        </p>
                      )}
                      
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {a.filePath && (
                          <a href={a.filePath} target="_blank" rel="noopener noreferrer" className="btn btn-consistent" style={{ padding: '8px 16px', fontSize: '13px', background: '#e0e7ff', color: '#4f46e5', borderColor: '#c7d2fe', textDecoration: 'none' }}>
                            View Material
                          </a>
                        )}
                        <button className="btn btn-primary btn-consistent" type="button" onClick={() => viewSubmissions(a)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                          Submissions
                        </button>
                        <button className="btn btn-consistent" type="button" onClick={() => openEditAssignment(a)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                          Edit
                        </button>
                        <button className="btn btn-consistent" type="button" onClick={() => deleteAssignment(a._id)} style={{ padding: '8px 16px', fontSize: '13px', color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddStudentModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowAddStudentModal(false)}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>Add student</h3>
              <button className="btn" type="button" onClick={() => setShowAddStudentModal(false)}>
                Close
              </button>
            </div>
            <form className="modal-body form-grid" onSubmit={addStudent}>
              <label>Student name</label>
              <input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
              <label>Student PRN</label>
              <input placeholder="123456789012345" value={prn} onChange={(e) => setPrn(e.target.value)} required />
              <label>Email (optional)</label>
              <input placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-consistent" type="submit">
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCsvModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowCsvModal(false)}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>Upload students CSV</h3>
              <button className="btn" type="button" onClick={() => setShowCsvModal(false)}>
                Close
              </button>
            </div>
            <form className="modal-body form-grid" onSubmit={uploadCsv}>
              <label>CSV file</label>
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} required />
              <div className="muted small">Format: prn,name,email (header optional)</div>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-consistent" type="submit" disabled={!csvFile}>
                  Upload CSV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDownloadModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowDownloadModal(false)}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>Download attendance</h3>
              <button className="btn" type="button" onClick={() => setShowDownloadModal(false)}>
                Close
              </button>
            </div>
            <form className="modal-body form-grid" onSubmit={downloadAttendance}>
              <label>Date</label>
              <input type="date" value={downloadDate} onChange={(e) => setDownloadDate(e.target.value)} required />
              <label>Time Slot</label>
              <input value={downloadTimeslot} onChange={(e) => setDownloadTimeslot(e.target.value)} required />
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-consistent" type="submit">
                  Download Excel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignmentModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowAssignmentModal(false)}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingAssignmentId ? "Edit assignment" : "Add assignment"}</h3>
              <button className="btn" type="button" onClick={() => setShowAssignmentModal(false)}>
                Close
              </button>
            </div>
            <form className="modal-body form-grid" onSubmit={saveAssignment}>
              <label>Title</label>
              <input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <label>Description</label>
              <textarea
                rows={3}
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, description: e.target.value }))}
              />
              <label>Due date (optional)</label>
              <input
                type="date"
                value={assignmentForm.dueDate}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
              <label>File (optional)</label>
              <input
                type="file"
                onChange={(e) => setAssignmentForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              />
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-consistent" type="submit">
                  Save assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditStudentModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowEditStudentModal(false)}>
          <div className="modal-card">
            <div className="modal-head">
              <h3>Edit student</h3>
              <button className="btn" type="button" onClick={() => setShowEditStudentModal(false)}>
                Close
              </button>
            </div>
            <form className="modal-body form-grid" onSubmit={updateStudent}>
              <label>PRN</label>
              <input value={editStudentForm.prn} disabled />
              <label>Name</label>
              <input
                value={editStudentForm.name}
                onChange={(e) => setEditStudentForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <label>Email</label>
              <input
                value={editStudentForm.email}
                onChange={(e) => setEditStudentForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-consistent" type="submit">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubmissionsModal && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setShowSubmissionsModal(false)}>
          <div className="modal-card" style={{ maxWidth: '900px', width: '90%' }}>
            <div className="modal-head">
              <h3>Submissions for "{currentAssignmentTitle}"</h3>
              <button className="btn" type="button" onClick={() => setShowSubmissionsModal(false)}>
                Close
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {successMessage && (
                <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', fontSize: '13px', fontWeight: 600, textAlign: 'center', margin: '0 0 16px 0', borderRadius: '6px' }}>
                  {successMessage}
                </div>
              )}
              
              {submissionsList.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: '20px' }}>No submissions yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: '14px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>PRN</th>
                        <th>Link/Notes</th>
                        <th>Attachment</th>
                        <th>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionsList.map(sub => (
                        <tr key={sub._id}>
                          <td>{sub.studentName}</td>
                          <td>{sub.prn}</td>
                          <td style={{ maxWidth: '150px', wordBreak: 'break-word' }}>
                            {sub.content ? (
                              sub.content.startsWith('http') ? (
                                <a href={sub.content} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>{sub.content}</a>
                              ) : sub.content
                            ) : '-'}
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            {sub.filePath ? (
                              <a 
                                href={sub.filePath} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fff', boxSizing: 'border-box', whiteSpace: 'nowrap' }}
                              >
                                View File
                              </a>
                            ) : '-'}
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input 
                                placeholder="Add remark..."
                                value={remarksInput[sub._id] || ""}
                                onChange={(e) => setRemarksInput(prev => ({ ...prev, [sub._id]: e.target.value }))}
                                style={{ height: '32px', minHeight: '32px', maxHeight: '32px', padding: '0 10px', fontSize: '13px', width: '130px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', margin: 0 }}
                              />
                              <button 
                                type="button" 
                                onClick={() => saveRemark(sub._id)} 
                                className="btn btn-primary" 
                                style={{ height: '32px', padding: '0 12px', fontSize: '13px', borderRadius: '6px', minHeight: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', whiteSpace: 'nowrap', border: 'none' }}
                              >
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

