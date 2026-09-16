import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("cs_token", data.access_token);
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try { await api.post("/auth/logout"); } catch (_) { /* ignore */ }
        localStorage.removeItem("cs_token");
        setUser(false);
    }, []);

    const can = useCallback((perm) => {
        if (!user) return false;
        const r = user.role;
        if (perm === "approve") return r === "approver" || r === "admin";
        if (perm === "decide") return ["reviewer", "approver", "admin"].includes(r);
        if (perm === "admin") return r === "admin";
        return true;
    }, [user]);

    return <AuthContext.Provider value={{ user, login, logout, can }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
