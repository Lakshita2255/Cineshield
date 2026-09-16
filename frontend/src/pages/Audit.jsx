import { useState, useEffect } from "react";
import { ScrollText, ShieldAlert, User, ShieldCheck, AlertCircle, Info, RefreshCw } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Eyebrow, Panel } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Audit() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadAuditLogs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/audit");
            setEvents(data || []);
        } catch (err) {
            toast.error(errorMessage(err, "Failed to load audit logs"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const severityIcon = (sev) => {
        if (sev === "warning") return <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />;
        if (sev === "error") return <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />;
        return <Info className="h-4 w-4 text-sky-400 shrink-0" />;
    };

    return (
        <div className="space-y-6 fade-up" data-testid="audit-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242F46] pb-4">
                <div>
                    <div className="cs-eyebrow">Compliance & Traceability Log</div>
                    <h1 className="font-heading text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <ScrollText className="h-6 w-6 text-amber-400" /> Auditable Human & System Decision Trail
                    </h1>
                </div>
                <Button variant="outline" size="sm" onClick={loadAuditLogs} disabled={loading} data-testid="audit-refresh-button">
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Audit Trail
                </Button>
            </div>

            {/* Audit Log Timeline */}
            <div className="cs-card p-4 space-y-4" data-testid="audit-log-container">
                <div className="border-b border-[#242F46] pb-2 flex justify-between items-center text-xs font-mono text-slate-400">
                    <span>Tamper-Evident Decision Events ({events.length} records)</span>
                    <span>Preserved Disagreement & Role Enforcement History</span>
                </div>

                <div className="space-y-3 divide-y divide-[#242F46]/60">
                    {loading ? (
                        <div className="py-8 text-center text-slate-500 font-mono">
                            Querying immutable audit log...
                        </div>
                    ) : events.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 font-mono">
                            No audit events logged yet.
                        </div>
                    ) : (
                        events.map((ev) => (
                            <div key={ev.id} className="pt-3 flex items-start justify-between gap-4 text-xs font-mono" data-testid={`audit-event-${ev.id}`}>
                                <div className="flex items-start gap-3">
                                    {severityIcon(ev.severity)}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-100">{ev.actor}</span>
                                            <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#242F46] text-slate-400 uppercase">{ev.role}</span>
                                            {ev.case_id && (
                                                <span className="text-amber-400 font-semibold">{ev.case_id}</span>
                                            )}
                                        </div>
                                        <div className="text-slate-300 mt-1 leading-relaxed">{ev.detail}</div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 text-[10px] text-slate-500">
                                    {new Date(ev.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
