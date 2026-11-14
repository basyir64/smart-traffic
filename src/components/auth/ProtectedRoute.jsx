import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../auth-context";

/**
 * Guards routes based on authentication and role permissions.
 * - Unauthenticated users -> redirected to /login
 * - Authenticated users without required role -> redirected to / (Dashboard Utama)
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-6 text-center text-sm text-[var(--color-text-secondary)]">
        Menyemak kelayakan akses pegawai...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
