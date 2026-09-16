import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Layers, RefreshCw, ChevronRight, AlertTriangle, ShieldAlert, ArrowUpDown } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { SeverityBadge, StatusBadge, ProcessingDot, RightsBadge, ScoreBar } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Queue() {
    const [cases, setCases] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sevFilter, setSevFilter] = useState("all");
    const [groupDuplicates, setGroupDuplicates] = useState(true);
    const [selectedCases, setSelectedCases] = useState([]);

    const fetchCases = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                search: search || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                severity: sevFilter !== "all" ? sevFilter : undefined,
                is_group_primary: groupDuplicates ? true : undefined,
                limit: 100
            };
            if (tab === "high_urgency") {
                params.status = "new";
                params.sort_by = "urgency";
            } else if (tab === "rights_unverified") {
                params.rights_status = "verification_needed";
            } else if (tab === "duplicates") {
                params.status = "all";
                params.is_group_primary = undefined;
            } else if (tab === "needs_evidence") {
                params.status = "needs_evidence";
            }

            const { data } = await api.get("/cases", { params });
            setCases(data.cases || []);
            setTotal(data.total || 0);
        } catch (err) {
            toast.error(errorMessage(err, "Failed to load review queue"));
        } finally {
            setLoading(false);
        }
    }, [search, tab, statusFilter, sevFilter, groupDuplicates]);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    const toggleSelect = (id) => {
        setSelectedCases((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedCases.length === cases.length) {
            setSelectedCases([]);
        } else {
            setSelectedCases(cases.map((c) => c.id));
        }
    };

    return (
        <div className="space-y-4 fade-up" data-testid="review-queue-view">
            {/* Console Header & Eyebrow */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242F46] pb-3">
                <div>
                    <div className="cs-eyebrow">Operational Intelligence · Ingestion Stream</div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-amber-400" /> Transformed-Content Review Queue
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCases} disabled={loading} data-testid="queue-refresh-button">
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
                    </Button>
                </div>
            </div>

            {/* Saved Views Tabs */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-[#242F46] pb-2">
                <div className="flex items-center gap-1">
                    {[
                        { id: "all", label: "All Active Threats" },
                        { id: "high_urgency", label: "High Urgency" },
                        { id: "rights_unverified", label: "Rights Verification Needed" },
                        { id: "duplicates", label: "Duplicate Clusters" },
                        { id: "needs_evidence", label: "Needs Evidence" }
                    ].map((t) => (
                        <button
                            key={t.id}
                            data-testid={`queue-tab-${t.id}`}
                            onClick={() => setTab(t.id)}
                            className={`px-3 py-1.5 text-xs font-mono rounded-sm transition-colors ${
                                tab === t.id
                                    ? "bg-amber-400/15 text-amber-400 border border-amber-400/40"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            data-testid="toggle-duplicate-grouping"
                            checked={groupDuplicates}
                            onChange={(e) => setGroupDuplicates(e.target.checked)}
                            className="rounded bg-[#111620] border-[#242F46] text-amber-400 focus:ring-amber-400"
                        />
                        <Layers className="h-3.5 w-3.5 text-amber-400" /> Group Duplicates
                    </label>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#111620] p-3 rounded-md border border-[#242F46]">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        data-testid="queue-search-input"
                        placeholder="Search by Case ID, protected asset title, candidate title, or owner..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-[#090C10] border-[#242F46] font-mono text-xs"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        data-testid="queue-status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-[#090C10] border border-[#242F46] text-slate-300 text-xs font-mono rounded-sm px-2.5 py-1.5 focus:ring-1 focus:ring-amber-400"
                    >
                        <option value="all">Status: All</option>
                        <option value="new">New</option>
                        <option value="in_review">In Review</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="needs_evidence">Needs Evidence</option>
                    </select>

                    <select
                        data-testid="queue-severity-filter"
                        value={sevFilter}
                        onChange={(e) => setSevFilter(e.target.value)}
                        className="bg-[#090C10] border border-[#242F46] text-slate-300 text-xs font-mono rounded-sm px-2.5 py-1.5 focus:ring-1 focus:ring-amber-400"
                    >
                        <option value="all">Severity: All</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Batch Action Bar */}
            {selectedCases.length > 0 && (
                <div className="flex items-center justify-between bg-amber-400/10 border border-amber-400/40 p-2.5 rounded-md text-xs font-mono text-amber-300" data-testid="batch-action-bar">
                    <div>{selectedCases.length} case(s) selected</div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => toast.info(`Batch review initiated for ${selectedCases.length} cases`)}>
                            Batch Inspect
                        </Button>
                        <Button size="sm" className="text-xs h-7 bg-amber-400 text-slate-950 font-semibold" onClick={() => setSelectedCases([])}>
                            Deselect All
                        </Button>
                    </div>
                </div>
            )}

            {/* Dense Data Table */}
            <div className="cs-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse" data-testid="queue-table">
                        <thead className="bg-[#0B0F16] text-slate-400 border-b border-[#242F46] uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-3 w-8">
                                    <input
                                        type="checkbox"
                                        checked={selectedCases.length === cases.length && cases.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded bg-[#111620] border-[#242F46]"
                                    />
                                </th>
                                <th className="p-3">Case ID</th>
                                <th className="p-3">Protected Asset vs Candidate Title</th>
                                <th className="p-3">Priority</th>
                                <th className="p-3">Confidence</th>
                                <th className="p-3">Coverage</th>
                                <th className="p-3">Severity</th>
                                <th className="p-3">Rights Status</th>
                                <th className="p-3">Source</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#242F46]/60">
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="p-8 text-center text-slate-500 font-mono" data-testid="queue-loading">
                                        Querying CineShield threat matrix…
                                    </td>
                                </tr>
                            ) : cases.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="p-8 text-center text-slate-500 font-mono" data-testid="queue-empty">
                                        No threat cases match the current filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                cases.map((c) => (
                                    <tr
                                        key={c.id}
                                        data-testid={`case-row-${c.id}`}
                                        className={`hover:bg-slate-800/30 transition-colors ${
                                            selectedCases.includes(c.id) ? "bg-amber-400/5" : ""
                                        }`}
                                    >
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedCases.includes(c.id)}
                                                onChange={() => toggleSelect(c.id)}
                                                className="rounded bg-[#111620] border-[#242F46]"
                                            />
                                        </td>
                                        <td className="p-3 font-semibold text-amber-400">
                                            <Link to={`/cases/${c.id}`} className="hover:underline flex items-center gap-1" data-testid={`link-case-${c.id}`}>
                                                {c.id}
                                                {c.duplicate_group_id && (
                                                    <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                                        Cluster
                                                    </span>
                                                )}
                                            </Link>
                                        </td>
                                        <td className="p-3 max-w-xs truncate">
                                            <div className="font-sans font-medium text-slate-200 truncate">{c.asset_title}</div>
                                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                                <span>vs</span> <span className="text-slate-300">{c.candidate_title}</span>
                                            </div>
                                            {c.conflicting_signals && c.conflicting_signals.length > 0 && (
                                                <div className="text-[10px] text-amber-300/90 flex items-center gap-1 mt-0.5">
                                                    <AlertTriangle className="h-3 w-3 shrink-0" /> Signal conflict detected
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span className="font-bold text-slate-100">{c.priority}</span>
                                            <span className="text-[10px] text-slate-500">/100</span>
                                        </td>
                                        <td className="p-3">
                                            <ScoreBar value={c.confidence} testId={`confidence-bar-${c.id}`} />
                                        </td>
                                        <td className="p-3 text-slate-300">
                                            {Math.round(c.coverage * 100)}%
                                        </td>
                                        <td className="p-3">
                                            <SeverityBadge value={c.severity} testId={`severity-badge-${c.id}`} />
                                        </td>
                                        <td className="p-3">
                                            <RightsBadge value={c.rights_status} testId={`rights-badge-${c.id}`} />
                                        </td>
                                        <td className="p-3 text-slate-400">
                                            {c.source}
                                        </td>
                                        <td className="p-3">
                                            <StatusBadge value={c.status} testId={`status-badge-${c.id}`} />
                                        </td>
                                        <td className="p-3 text-right">
                                            <Link to={`/cases/${c.id}`}>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-400 hover:text-amber-300" data-testid={`inspect-button-${c.id}`}>
                                                    Inspect <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count */}
                <div className="p-3 bg-[#0B0F16] border-t border-[#242F46] flex items-center justify-between text-xs font-mono text-slate-500">
                    <div>Showing {cases.length} of {total} items</div>
                    <div>CineShield Threat Vector Engine 2.9.0</div>
                </div>
            </div>
        </div>
    );
}
