import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Queue from "@/pages/Queue";
import CaseDetail from "@/pages/CaseDetail";
import Assets from "@/pages/Assets";
import Candidates from "@/pages/Candidates";
import Jobs from "@/pages/Jobs";
import Audit from "@/pages/Audit";

function Protected({ children }) {
    const { user } = useAuth();
    if (user === null) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-mono text-xs" data-testid="auth-loading">Authenticating…</div>;
    if (user === false) return <Navigate to="/login" replace />;
    return <AppShell>{children}</AppShell>;
}

function App() {
    return (
        <div className="App">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<Protected><Queue /></Protected>} />
                        <Route path="/cases/:id" element={<Protected><CaseDetail /></Protected>} />
                        <Route path="/assets" element={<Protected><Assets /></Protected>} />
                        <Route path="/candidates" element={<Protected><Candidates /></Protected>} />
                        <Route path="/jobs" element={<Protected><Jobs /></Protected>} />
                        <Route path="/audit" element={<Protected><Audit /></Protected>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
                <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#111620", border: "1px solid #242F46", color: "#F1F5F9" } }} />
            </AuthProvider>
        </div>
    );
}

export default App;
