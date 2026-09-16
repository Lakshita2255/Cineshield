import { useState, useEffect } from "react";
import { Inbox, Plus, Link as LinkIcon, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Eyebrow, Panel } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Candidates() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [urlsText, setUrlsText] = useState("");
    const [sourceType, setSourceType] = useState("manual_upload");
    const [submitting, setSubmitting] = useState(false);

    const loadCandidates = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/candidates");
            setCandidates(data || []);
        } catch (err) {
            toast.error(errorMessage(err, "Failed to load candidates"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCandidates();
    }, []);

    const handleIntake = async (e) => {
        e.preventDefault();
        const urls = urlsText.split("\n").map((u) => u.trim()).filter(Boolean);
        if (urls.length === 0) {
            toast.error("Please enter at least one candidate URL");
            return;
        }

        setSubmitting(true);
        try {
            const { data } = await api.post("/candidates/intake", {
                urls,
                source_type: sourceType
            });
            toast.success(data.message || "Candidates submitted for ingestion");
            setUrlsText("");
            loadCandidates();
        } catch (err) {
            toast.error(errorMessage(err, "Intake submission failed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 fade-up" data-testid="candidates-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242F46] pb-4">
                <div>
                    <div className="cs-eyebrow">Ingestion Pipeline</div>
                    <h1 className="font-heading text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Inbox className="h-6 w-6 text-amber-400" /> Candidate Media Intake
                    </h1>
                </div>
            </div>

            {/* Batch Intake Form */}
            <Panel title="Batch Candidate Submission & Webhook Crawler Engine" testId="candidate-intake-form">
                <form onSubmit={handleIntake} className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="cs-eyebrow block mb-1.5">Candidate Media URLs (One per line)</label>
                            <textarea
                                data-testid="candidate-urls-input"
                                rows={4}
                                value={urlsText}
                                onChange={(e) => setUrlsText(e.target.value)}
                                placeholder="https://youtube.com/watch?v=...\nhttps://t.me/channel/12345"
                                className="w-full bg-[#090C10] border border-[#242F46] rounded-sm p-3 text-xs font-mono text-slate-100 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="cs-eyebrow block mb-1.5">Intake Source Channel</label>
                            <select
                                data-testid="candidate-source-type-select"
                                value={sourceType}
                                onChange={(e) => setSourceType(e.target.value)}
                                className="w-full h-9 bg-[#090C10] border border-[#242F46] text-slate-200 text-xs font-mono rounded-sm px-3 mb-4"
                            >
                                <option value="manual_upload">Manual Analyst Intake</option>
                                <option value="reference_url">Platform Link</option>
                                <option value="partner_feed">Partner API Feed</option>
                                <option value="crawler">Automated Crawler Pool</option>
                            </select>

                            <Button type="submit" disabled={submitting} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold" data-testid="candidate-submit-button">
                                {submitting ? "Ingesting Links…" : "Submit to Threat Vector Engine"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Panel>

            {/* Candidate Queue Table */}
            <div className="cs-card overflow-hidden" data-testid="candidates-table-container">
                <div className="p-3 border-b border-[#242F46] bg-[#0B0F16]">
                    <Eyebrow>Active Candidate Ingestion Queue</Eyebrow>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse" data-testid="candidates-table">
                        <thead className="bg-[#0B0F16] text-slate-400 border-b border-[#242F46] uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-3">Candidate ID</th>
                                <th className="p-3">Title / URL</th>
                                <th className="p-3">Platform</th>
                                <th className="p-3">Source Type</th>
                                <th className="p-3">Submitted By</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#242F46]/60">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500 font-mono">
                                        Loading candidate stream…
                                    </td>
                                </tr>
                            ) : candidates.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500 font-mono">
                                        No candidates currently processing in queue.
                                    </td>
                                </tr>
                            ) : (
                                candidates.map((cand) => (
                                    <tr key={cand.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-3 font-semibold text-amber-400">{cand.id}</td>
                                        <td className="p-3 max-w-xs truncate">
                                            <div className="font-medium text-slate-200 truncate">{cand.title}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{cand.url}</div>
                                        </td>
                                        <td className="p-3 text-slate-300">{cand.platform}</td>
                                        <td className="p-3 text-slate-400 uppercase text-[10px]">{cand.source_type?.replace('_', ' ')}</td>
                                        <td className="p-3 text-slate-400">{cand.submitted_by}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                cand.ingestion_status === "complete" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse"
                                            }`}>
                                                {cand.ingestion_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
