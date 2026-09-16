import { useState, useEffect } from "react";
import { Activity, Server, Cpu, CheckCircle2, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Eyebrow, Panel } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [workersData, setWorkersData] = useState({ workers: [], model: {} });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [jRes, wRes] = await Promise.all([
                api.get("/jobs"),
                api.get("/workers")
            ]);
            setJobs(jRes.data || []);
            setWorkersData(wRes.data || { workers: [], model: {} });
        } catch (err) {
            toast.error(errorMessage(err, "Failed to load worker node health"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="space-y-6 fade-up" data-testid="jobs-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242F46] pb-4">
                <div>
                    <div className="cs-eyebrow">Infrastructure & Processing Pipeline</div>
                    <h1 className="font-heading text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Activity className="h-6 w-6 text-amber-400" /> System Worker Health & Active Jobs
                    </h1>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading} data-testid="jobs-refresh-button">
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Cluster
                </Button>
            </div>

            {/* Model Info Banner */}
            <div className="bg-[#111620] border border-[#242F46] p-4 rounded-md grid md:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                    <div className="text-slate-500 uppercase text-[10px]">Active Matcher Engine</div>
                    <div className="text-amber-400 font-bold text-sm mt-0.5">{workersData.model?.name || "CineShield Matcher"}</div>
                </div>
                <div>
                    <div className="text-slate-500 uppercase text-[10px]">Engine Version</div>
                    <div className="text-slate-200 mt-0.5">v{workersData.model?.version} (fp-{workersData.model?.fingerprint_version})</div>
                </div>
                <div>
                    <div className="text-slate-500 uppercase text-[10px]">Audio Model</div>
                    <div className="text-slate-200 mt-0.5">{workersData.model?.audio_model}</div>
                </div>
                <div>
                    <div className="text-slate-500 uppercase text-[10px]">Frame Extractor Model</div>
                    <div className="text-slate-200 mt-0.5">{workersData.model?.frame_model}</div>
                </div>
            </div>

            {/* Worker Nodes Grid */}
            <div>
                <Eyebrow className="mb-3">Worker Cluster Node Health</Eyebrow>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="worker-nodes-grid">
                    {workersData.workers?.map((w) => (
                        <div key={w.id} className="bg-[#111620] border border-[#242F46] p-3 rounded-md space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                                    <Server className="h-3.5 w-3.5 text-amber-400" /> {w.id}
                                </span>
                                <span className={`h-2 w-2 rounded-full ${
                                    w.status === "healthy" ? "bg-emerald-400" : w.status === "degraded" ? "bg-amber-400" : "bg-red-500"
                                }`} />
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 space-y-1">
                                <div>Role: <span className="text-slate-300">{w.role}</span></div>
                                <div>Version: <span className="text-slate-400">{w.version}</span></div>
                                <div className="pt-1">
                                    <div className="flex justify-between text-slate-500 mb-0.5">
                                        <span>Node Load</span>
                                        <span>{Math.round(w.load * 100)}%</span>
                                    </div>
                                    <div className="h-1 bg-slate-800 rounded overflow-hidden">
                                        <div className={`h-full ${w.load > 0.85 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${Math.round(w.load * 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Active Jobs Table */}
            <div className="cs-card overflow-hidden">
                <div className="p-3 border-b border-[#242F46] bg-[#0B0F16]">
                    <Eyebrow>Background Job Execution Queue</Eyebrow>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse" data-testid="jobs-table">
                        <thead className="bg-[#0B0F16] text-slate-400 border-b border-[#242F46] uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-3">Job ID</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Target Label</th>
                                <th className="p-3">Worker Node</th>
                                <th className="p-3">Progress</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#242F46]/60">
                            {jobs.map((j) => (
                                <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3 font-semibold text-amber-400">{j.id}</td>
                                    <td className="p-3 uppercase text-[10px] text-slate-300">{j.type}</td>
                                    <td className="p-3 text-slate-200 truncate max-w-xs">{j.target_label}</td>
                                    <td className="p-3 text-slate-400">{j.worker}</td>
                                    <td className="p-3 w-36">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 bg-slate-800 rounded overflow-hidden">
                                                <div className="h-full bg-amber-400" style={{ width: `${j.progress}%` }} />
                                            </div>
                                            <span className="text-[10px] text-slate-400">{j.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                            j.status === "complete" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" :
                                            j.status === "failed" ? "bg-red-500/15 text-red-300 border border-red-500/40" :
                                            "bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse"
                                        }`}>
                                            {j.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
