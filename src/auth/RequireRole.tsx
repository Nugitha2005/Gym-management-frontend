import { Navigate, Outlet, useLocation } from "react-router";
import type { RoleName } from "../api/types";
import { useAuth } from "./AuthContext";
import { homePath } from "./roles";
import { FullPageLoader } from "../components/ui/Spinner";

/**
 * Route guard. Not logged in -> /login (and back here afterwards).
 * Logged in with the wrong role -> that role's own home page.
 * The backend still checks every request with @PreAuthorize; this only keeps people on the right screens.
 */
export function RequireRole({ roles }: { roles: RoleName[] }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.roleName)) return <Navigate to={homePath(user.roleName)} replace />;
  return <Outlet />;
}

/** Public pages (landing, login, register) send a logged-in user straight to their home. */
export function RedirectIfLoggedIn({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  if (status === "loading") return <FullPageLoader tone="navy" />;
  if (user) return <Navigate to={homePath(user.roleName)} replace />;
  return <>{children}</>;
}
