import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import TeacherDashboardPage from "./pages/TeacherDashboardPage.jsx";
import TeacherSemesterPage from "./pages/TeacherSemesterPage.jsx";
import SemesterReportPage from "./pages/SemesterReportPage.jsx";
import TeacherClassroomPage from "./pages/TeacherClassroomPage.jsx";
import TeacherAttendancePage from "./pages/TeacherAttendancePage.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import StudentClassroomPage from "./pages/StudentClassroomPage.jsx";
import Logout from "./pages/Logout.jsx";
import { getAuth } from "./lib/authStore";

function ProtectedRoute({ roles, children }) {
  const auth = getAuth();
  if (!auth?.token || !auth?.user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(auth.user.role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/logout" element={<Logout />} />
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
      <Route
        path="/teacher/semester/:semesterId"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherSemesterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/semester/:semesterId/report"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <SemesterReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classroom/:classroomId"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherClassroomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classroom/:classroomId/attendance"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
      <Route
        path="/student/class/:id"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentClassroomPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

