import axios from "axios";

const backendUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL)
    || (typeof process !== "undefined" && process.env?.REACT_APP_BACKEND_URL)
    || "";

export const api = axios.create({ baseURL: `${backendUrl}/api`, withCredentials: true });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("cs_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export function errorMessage(e, fallback = "Something went wrong") {
    const d = e?.response?.data?.detail;
    if (!d) return e?.message || fallback;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
    return d?.msg || String(d);
}

export const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;
export const fmtTime = (s) => {
    const m = Math.floor((s || 0) / 60);
    const sec = Math.floor((s || 0) % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
export const label = (s) => (s || "").replace(/_/g, " ");
