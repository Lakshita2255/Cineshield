import { NavLink, useNavigate } from "react-router-dom";
import { ListOrdered, Film, Inbox, Activity, ScrollText, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV = [
    { to: "/", label: "Review Queue", icon: ListOrdered, id: "nav-queue" },
    { to: "/assets", label: "Protected Assets", icon: Film, id: "nav-assets" },
    { to: "/candidates", label: "Candidate Intake", icon: Inbox, id: "nav-candidates" },
    { to: "/jobs", label: "Processing & Status", icon: Activity, id: "nav-jobs" },
    { to: "/audit", label: "Audit Log", icon: ScrollText, id: "nav-audit" },
];

const ROLE_STYLE = { admin: "text-rose-300 border-rose-400/40 bg-rose-500/10", approver: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10", reviewer: "text-sky-300 border-sky-400/40 bg-sky-500/10" };

export function AppShell({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    return (
        <div className="flex h-screen overflow-hidden bg-[#090C10]">
            <aside className="w-56 shrink-0 border-r border-[#242F46] bg-[#0B0F16] hidden md:flex flex-col" data-testid="sidebar">
                <div className="h-14 flex items-center gap-2 px-4 border-b border-[#242F46]">
                    <Shield className="h-5 w-5 text-amber-400" />
                    <div className="leading-tight">
                        <div className="font-heading font-semibold text-slate-100 tracking-tight">CineShield</div>
                        <div className="cs-eyebrow">2.0 · console</div>
                    </div>
                </div>
                <nav className="flex-1 py-3 space-y-0.5">
                    {NAV.map((n) => (
                        <NavLink key={n.to} to={n.to} end={n.to === "/"} data-testid={n.id}
                            className={({ isActive }) => cn("flex items-center gap-2.5 px-4 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition-colors border-l-2 border-transparent",
                                isActive && "text-slate-100 border-l-amber-400 bg-slate-800/40")}>
                            <n.icon className="h-4 w-4" /> {n.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-3 border-t border-[#242F46] text-[10px] font-mono text-slate-500 leading-relaxed">
                    Matcher 2.9.0 · fp-3.4.1<br />Scores are algorithmic indicators, not legal conclusions.
                </div>
            </aside>
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 shrink-0 border-b border-[#242F46] bg-[#090C10]/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-40" data-testid="header">
                    <div className="flex items-center gap-2 md:hidden">
                        <Shield className="h-5 w-5 text-amber-400" /><span className="font-heading font-semibold">CineShield</span>
                    </div>
                    <div className="hidden md:block text-xs font-mono text-slate-500">Human review required · no automatic enforcement</div>
                    <div className="flex items-center gap-3">
                        <div className="text-right leading-tight">
                            <div className="text-sm text-slate-200" data-testid="header-user-name">{user?.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{user?.email}</div>
                        </div>
                        <span className={cn("text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded-sm", ROLE_STYLE[user?.role])} data-testid="header-role-badge">{user?.role}</span>
                        <button onClick={async () => { await logout(); navigate("/login"); }} data-testid="logout-button"
                            className="text-slate-400 hover:text-amber-400 transition-colors" title="Sign out"><LogOut className="h-4 w-4" /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}
