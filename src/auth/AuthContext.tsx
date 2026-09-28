import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/endpoints";
import { onUnauthorized } from "../api/client";
import type { RegisterRequest, User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  /** "loading" until GET /api/auth/me has answered once */
  status: "loading" | "ready";
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session-cookie auth against the Spring Boot AuthController.
 * The backend keeps the login in the HTTP session (JSESSIONID), so the browser only needs
 * to know who is logged in — there is no token to store.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  // 1. Ask the backend whether this browser already has a session
  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => {
        if (!controller.signal.aborted) setStatus("ready");
      });
    return () => controller.abort();
  }, []);

  // 2. Any 401 later on means the session expired: forget the user so the guards redirect to /login
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authApi.login(email.trim(), password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  // Register does not start a session, so log straight in with the same details
  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data);
      return login(data.email, data.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For screens that only render behind <RequireRole>, where a user always exists. */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useUser used outside a protected route");
  return user;
}
