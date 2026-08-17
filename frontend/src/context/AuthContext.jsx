import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setBusiness(data.business);
    } catch {
      setUser(false);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("vx_token", data.token);
    await refresh();
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("vx_token", data.token);
    await refresh();
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("vx_token");
    setUser(false);
    setBusiness(null);
  };

  return (
    <AuthContext.Provider value={{ user, business, setBusiness, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
