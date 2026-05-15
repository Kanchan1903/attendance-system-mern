import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setAuth } from "../lib/authStore";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
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
          {/* Spacer to replace nav links and maintain layout */}
          <div style={{ width: 100 }}></div>
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
            <h2>Welcome Back!</h2>
            <p>Sign in to continue to <strong style={{color:"var(--primary)"}}>ClassMaster</strong></p>
          </div>
          
          <div className="auth-tabs">
            <div className="auth-tab active">Login</div>
            <div className="auth-tab" onClick={() => navigate("/register")}>Register</div>
          </div>

          {error && <div className="message error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label>Email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="✉️ Enter your email" required />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="🔒 Enter your password" required />
            
            <div className="form-options">
              <label><input type="checkbox" /> Remember me</label>
              <a href="#">Forgot password?</a>
            </div>

            <button className="full" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

