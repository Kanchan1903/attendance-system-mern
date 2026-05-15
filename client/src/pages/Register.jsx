import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setAuth } from "../lib/authStore";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher",
    prn: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...form };
      if (payload.role !== "student") delete payload.prn;
      const data = await api("/auth/register", { method: "POST", body: payload });
      setAuth(data);
      navigate(data.user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-landing-layout">
      <div className="auth-landing-left">
        <div className="landing-header">
          <div className="brand" style={{ margin: 0, padding: 0 }}>
            <div className="brand-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🏫</div>
            <span className="brand-title" style={{ fontSize: "20px" }}>ClassMaster</span>
          </div>
        </div>

        <div className="landing-hero">
          <span className="landing-pill">SMARTER CLASSROOMS</span>
          <h1>Attendance System with <span>Smart Features</span></h1>
          <p>Streamline your classroom, track attendance effortlessly, and focus on what matters most — teaching and inspiring.</p>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon">👥</div>
              <div className="feature-text">
                <h4>Seamless Integration</h4>
                <p>Works perfectly with Google Classroom for a unified experience.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📅</div>
              <div className="feature-text">
                <h4>Smart Attendance</h4>
                <p>Quick, accurate, and easy attendance tracking in just a few clicks.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div className="feature-text">
                <h4>Insightful Reports</h4>
                <p>Get real-time insights and detailed reports to track student performance.</p>
              </div>
            </div>
          </div>
        </div>
        
        <img src="/assets/auth_hero_illustration.png" alt="Dashboard Illustration" className="landing-illustration" />
        
        {/* Empty bottom row to maintain vertical space-between alignment */}
        <div className="landing-bottom-row" style={{ minHeight: "100px" }}></div>
      </div>

      <div className="auth-landing-right">
        <div className="auth-landing-card">
          <div className="auth-landing-card-header">
            <div className="icon">👨‍🏫</div>
            <h2>Join ClassMaster</h2>
            <p>Create an account to get started.</p>
          </div>
          
          <div className="auth-tabs">
            <div className="auth-tab" onClick={() => navigate("/login")}>Login</div>
            <div className="auth-tab active">Register</div>
          </div>

          {error && <div className="message error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label>Name</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="👤 Jane Doe" required />
            
            <label>Email</label>
            <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="✉️ jane@example.com" required />
            
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="🔒 ••••••••" required />
            
            <label>Role</label>
            <select value={form.role} onChange={(e) => update("role", e.target.value)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
            
            {form.role === "student" && (
              <>
                <label>PRN (Student only)</label>
                <input value={form.prn} onChange={(e) => update("prn", e.target.value)} placeholder="🔢 Enter your unique PRN" required />
              </>
            )}

            <button className="full" disabled={loading} type="submit" style={{ marginTop: 8 }}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
