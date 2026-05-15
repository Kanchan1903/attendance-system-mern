import { Navigate } from "react-router-dom";
import { clearAuth } from "../lib/authStore";

export default function Logout() {
  clearAuth();
  return <Navigate to="/login" replace />;
}

