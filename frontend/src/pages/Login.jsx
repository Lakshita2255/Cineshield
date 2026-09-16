import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO = [
    { role: "Reviewer", email: "reviewer@cineshield.io", password: "Reviewer#2026" },
    { role: "Approver", email: "approver@cineshield.io", password: "Approver#2026" },
    { role: "Admin", email: "lgoyal2006@gmail.com", password: "Admin#2026" },
];

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e?.preventDefault();
        setBusy(true); setError("");
        try { await login(email, password); navigate("/"); }
        catch (err) { setError(errorMessage(err)); }
        finally { setBusy(false); }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[#090C10]">
            <div className="relative hidden lg:block overflow-hidden cs-grain">
                <img src="https://images.pexels.com/photos/1790556/pexels-photo-1790556.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Neon theater sign" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#090C10]/40 via-[#090C10]/60 to-[#090C10]" />
                <div className="absolute inset-0 cs-scanlines opacity-40" />
                <div className="relative h-full flex flex-col justify-end p-12 fade-up">
                    <div className="cs-eyebrow mb-3">Operational review console</div>
                    <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-slate-100 max-w-lg">Prioritize transformed-content threats. Decide with evidence.</h1>
                    <p className="mt-4 text-sm text-slate-400 max-w-md leading-relaxed">Signal-level evidence, explicit uncertainty, reason codes and an auditable human decision trail. No score is a legal conclusion.</p>
                </div>
            </div>
            <div className="flex items-center justify-center p-6">
                <form onSubmit={submit} className="w-full max-w-sm fade-up" data-testid="login-form">
                    <div className="flex items-center gap-2 mb-8"><Shield className="h-6 w-6 text-amber-400" /><span className="font-heading text-xl font-semibold">CineShield 2.0</span></div>
                    <label className="cs-eyebrow block mb-1.5">Email</label>
                    <Input data-testid="login-email-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reviewer@cineshield.io" className="bg-[#111620] border-[#242F46] mb-4 font-mono text-sm" autoComplete="username" />
                    <label className="cs-eyebrow block mb-1.5">Password</label>
                    <Input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#111620] border-[#242F46] mb-4 font-mono text-sm" autoComplete="current-password" />
                    {error && <div data-testid="login-error" className="text-xs text-red-300 border border-red-500/40 bg-red-500/10 rounded-sm px-3 py-2 mb-4">{error}</div>}
                    <Button type="submit" disabled={busy} data-testid="login-submit-button" className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold">{busy ? "Signing in…" : "Sign in"}</Button>
                    <div className="mt-8">
                        <div className="cs-eyebrow mb-2">Demo accounts</div>
                        <div className="grid gap-1.5">
                            {DEMO.map((d) => (
                                <button type="button" key={d.role} data-testid={`demo-login-${d.role.toLowerCase()}`} onClick={() => { setEmail(d.email); setPassword(d.password); }}
                                    className="flex items-center justify-between text-left px-3 py-2 border border-[#242F46] rounded-sm hover:border-amber-400/60 hover:bg-slate-800/40 transition-colors">
                                    <span className="text-sm text-slate-200">{d.role}</span><span className="font-mono text-[10px] text-slate-500">{d.email}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
