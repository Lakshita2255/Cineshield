import { cn } from "@/lib/utils";
import { label } from "@/lib/api";

const SEV = {
    critical: "bg-red-500/15 text-red-300 border-red-500/40", high: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    medium: "bg-yellow-500/15 text-yellow-200 border-yellow-500/40", low: "bg-blue-500/15 text-blue-300 border-blue-500/40"
};

const STATUS = {
    new: "text-slate-300 border-slate-500/50", in_review: "text-amber-300 border-amber-400/50", pending_approval: "text-amber-300 border-amber-400/60 bg-amber-400/10",
    approved: "text-emerald-300 border-emerald-500/50", rejected: "text-slate-400 border-slate-600 line-through", monitoring: "text-sky-300 border-sky-500/50",
    escalated: "text-rose-300 border-rose-500/50 bg-rose-500/10", duplicate: "text-purple-300 border-purple-500/50", needs_evidence: "text-cyan-300 border-cyan-500/50",
    returned: "text-orange-300 border-orange-500/50"
};

const PROC = {
    complete: "text-emerald-400", processing: "text-amber-400 animate-pulse", failed: "text-red-400", partial: "text-orange-400", queued: "text-slate-400",
    fetching: "text-amber-400", fingerprinting: "text-amber-400", matching: "text-amber-400", complete_no_match: "text-slate-400"
};

export const SeverityBadge = ({ value, testId }) => (
    <span data-testid={testId} className={cn("inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded-sm", SEV[value] || SEV.low)}>{value}</span>
);

export const StatusBadge = ({ value, testId }) => (
    <span data-testid={testId} className={cn("inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded-sm whitespace-nowrap", STATUS[value] || "text-slate-300 border-slate-600")}>{label(value)}</span>
);

export const ProcessingDot = ({ value, testId }) => (
    <span data-testid={testId} className={cn("inline-flex items-center gap-1.5 text-xs font-mono", PROC[value] || "text-slate-400")}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />{label(value)}
    </span>
);

export const RightsBadge = ({ value, testId }) => (
    <span data-testid={testId} className={cn("inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded-sm",
        value === "verified" ? "text-emerald-300 border-emerald-500/40" : "text-cyan-300 border-cyan-500/50 bg-cyan-500/10")}>
        {value === "verified" ? "rights verified" : "rights verification needed"}
    </span>
);

export const ScoreBar = ({ value, color = "bg-amber-400", testId }) => (
    <div className="flex items-center gap-2" data-testid={testId}>
        <div className="h-1.5 w-16 bg-slate-800 rounded-sm overflow-hidden"><div className={cn("h-full", color)} style={{ width: `${Math.round(value * 100)}%` }} /></div>
        <span className="font-mono text-xs text-slate-200 w-8">{Math.round(value * 100)}%</span>
    </div>
);

export const Eyebrow = ({ children, className }) => <div className={cn("cs-eyebrow", className)}>{children}</div>;

export const Panel = ({ title, children, className, action, testId }) => (
    <section className={cn("cs-card p-4", className)} data-testid={testId}>
        {(title || action) && <div className="flex items-center justify-between mb-3"><Eyebrow>{title}</Eyebrow>{action}</div>}
        {children}
    </section>
);
