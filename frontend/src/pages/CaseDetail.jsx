import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
    Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, ShieldAlert, FileText, 
    CheckCircle2, XCircle, Eye, CornerUpRight, Copy, HelpCircle, Lock, ArrowLeft,
    Film, Volume2, Globe, Clock, Sparkles
} from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SeverityBadge, StatusBadge, RightsBadge, Eyebrow, Panel } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CaseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, can } = useAuth();

    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(12);

    // Decision Form State
    const [action, setAction] = useState("accept");
    const [enforcement, setEnforcement] = useState("takedown");
    const [rationale, setRationale] = useState("");
    const [reasonCodes, setReasonCodes] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadCase = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/cases/${id}`);
                setCaseData(data);
                if (data.reason_codes) setReasonCodes(data.reason_codes);
            } catch (err) {
                toast.error(errorMessage(err, "Failed to load case details"));
            } finally {
                setLoading(false);
            }
        };
        loadCase();
    }, [id]);

    // Simulated Video Synchronization Timer
    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentTime((prev) => (prev >= 500 ? 0 : prev + 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-slate-500" data-testid="case-loading">
                Extracting evidence vectors & aligning timeline frames…
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="p-6 text-center text-slate-400 font-mono">
                Case not found. <Link to="/" className="text-amber-400 underline">Return to Queue</Link>
            </div>
        );
    }

    const { evidence, scores } = caseData;
    const isApproverOrAdmin = can("approve");

    const radarData = [
        { subject: 'Visual', A: Math.round((scores?.visual?.value || 0) * 100), fullMark: 100 },
        { subject: 'Audio', A: Math.round((scores?.audio?.value || 0) * 100), fullMark: 100 },
        { subject: 'Structural', A: Math.round((scores?.structural?.value || 0) * 100), fullMark: 100 },
        { subject: 'Temporal', A: Math.round((scores?.temporal?.value || 0) * 100), fullMark: 100 },
        { subject: 'Fingerprint', A: Math.round((scores?.fingerprint?.value || 0) * 100), fullMark: 100 },
    ];

    const toggleReasonCode = (code) => {
        setReasonCodes((prev) =>
            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
        );
    };

    const handleDecision = async (e) => {
        e.preventDefault();
        if (!rationale.trim() || rationale.trim().length < 5) {
            toast.error("Please provide a detailed legal or operational rationale (min 5 characters).");
            return;
        }

        if (enforcement && !isApproverOrAdmin) {
            toast.error("Enforcement execution requires an Approver or Admin role.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                action,
                enforcement: action === "accept" ? enforcement : null,
                rationale,
                reason_codes: reasonCodes
            };
            const { data } = await api.post(`/cases/${id}/decision`, payload);
            setCaseData(data);
            toast.success(`Decision recorded: Case #${id} actioned as ${action.toUpperCase()}`);
        } catch (err) {
            toast.error(errorMessage(err, "Failed to submit decision"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 fade-up" data-testid="case-detail-view">
            {/* Header Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242F46] pb-4">
                <div className="flex items-center gap-3">
                    <Link to="/" className="text-slate-400 hover:text-amber-400 transition-colors" data-testid="back-to-queue-link">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-heading text-xl font-bold text-slate-100" data-testid="case-id-header">
                                Case #{caseData.id}
                            </h1>
                            <SeverityBadge value={caseData.severity} testId="case-detail-severity" />
                            <StatusBadge value={caseData.status} testId="case-detail-status" />
                            <RightsBadge value={caseData.rights_status} testId="case-detail-rights-badge" />
                        </div>
                        <div className="text-xs font-mono text-slate-400 mt-1">
                            Asset: <span className="text-slate-200 font-sans font-medium">{caseData.asset_title}</span> ({caseData.asset_owner})
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                    <div className="bg-[#111620] border border-[#242F46] px-3 py-1.5 rounded-sm">
                        Priority Score: <span className="font-bold text-amber-400 text-sm">{caseData.priority}</span>/100
                    </div>
                    <div className="bg-[#111620] border border-[#242F46] px-3 py-1.5 rounded-sm">
                        Confidence: <span className="font-bold text-slate-100">{Math.round(caseData.confidence * 100)}%</span>
                    </div>
                </div>
            </div>

            {/* Conflicting Signals Warning Banner */}
            {caseData.conflicting_signals && caseData.conflicting_signals.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-md text-amber-200 space-y-2" data-testid="conflicting-signals-banner">
                    {caseData.conflicting_signals.map((cs, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <strong className="font-mono uppercase tracking-wide text-amber-400">{cs.type.replace(/_/g, ' ')}: {cs.summary}</strong>
                                <p className="text-slate-300 mt-0.5">{cs.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Side-by-Side Video Viewer Simulation */}
            <Panel title="Synchronized Evidence Player Simulation" testId="evidence-player-panel">
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Protected Asset Player */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                <Film className="h-3.5 w-3.5" /> Protected Reference Media
                            </span>
                            <span>Duration: 09:56</span>
                        </div>
                        <div className="relative aspect-video bg-[#090C10] border border-[#242F46] rounded-md overflow-hidden flex items-center justify-center group">
                            <img
                                src="https://images.pexels.com/photos/16453343/pexels-photo-16453343.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                                alt="Protected Media"
                                className="w-full h-full object-cover opacity-60"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-slate-300">
                                Protected: {caseData.asset_title}
                            </div>
                        </div>
                    </div>

                    {/* Candidate Media Player */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                <Globe className="h-3.5 w-3.5" /> Candidate Threat Media ({caseData.source})
                            </span>
                            <span>Uploader: {caseData.source_details?.uploader || 'Unknown'}</span>
                        </div>
                        <div className="relative aspect-video bg-[#090C10] border border-[#242F46] rounded-md overflow-hidden flex items-center justify-center group">
                            <img
                                src="https://images.pexels.com/photos/1790556/pexels-photo-1790556.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                                alt="Candidate Media"
                                className="w-full h-full object-cover opacity-60"
                            />
                            <div className="absolute top-2 right-2 bg-amber-400/90 text-slate-950 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                                Transformed (Speed + Crop)
                            </div>
                            <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-slate-300 truncate max-w-[80%]">
                                {caseData.candidate_title}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linked Player Scrubber Bar */}
                <div className="mt-4 bg-[#090C10] p-3 rounded-md border border-[#242F46] space-y-2" data-testid="player-scrubber-bar">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setIsPlaying(!isPlaying)} data-testid="video-play-toggle">
                                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCurrentTime(0)}>
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <span>Timecode: {Math.floor(currentTime / 60).toString().padStart(2, '0')}:{(currentTime % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="text-[10px] text-amber-400/90">
                            Synchronized Playback Linked
                        </div>
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="500"
                        value={currentTime}
                        onChange={(e) => setCurrentTime(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />

                    {/* Matched Timeline Segments Strip */}
                    <div className="h-3 bg-slate-900 rounded relative overflow-hidden border border-slate-800" title="Matched Segment Map">
                        {evidence?.matched_segments?.map((seg, idx) => (
                            <div
                                key={idx}
                                className="absolute h-full bg-amber-400/60 hover:bg-amber-400 border-x border-amber-300"
                                style={{
                                    left: `${(seg.protected_start / (evidence.protected_duration || 600)) * 100}%`,
                                    width: `${((seg.protected_end - seg.protected_start) / (evidence.protected_duration || 600)) * 100}%`
                                }}
                                title={`Matched Segment #${seg.id}: ${seg.protected_start}s - ${seg.protected_end}s (Vis: ${seg.visual_score})`}
                            />
                        ))}
                    </div>
                </div>
            </Panel>

            {/* Representative Frames & Audio Alignment Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Frame Extraction Strip */}
                <Panel title="Representative Frame Extraction Strip" testId="frame-extraction-panel">
                    <div className="grid grid-cols-2 gap-3">
                        {evidence?.frames?.slice(0, 4).map((f, idx) => (
                            <div key={idx} className="bg-[#090C10] border border-[#242F46] p-2 rounded-sm space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                    <span>T={f.t_protected}s</span>
                                    <span className="text-amber-400 font-semibold">Sim: {Math.round(f.similarity * 100)}%</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 aspect-[16/9] bg-black rounded overflow-hidden">
                                    <img src={f.protected_url} alt="Protected Frame" className="w-full h-full object-cover" />
                                    <img src={f.candidate_url} alt="Candidate Frame" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* Score Breakdown Radar & Uncertainty Indicator */}
                <Panel title="Multi-Metric Threat Radar" testId="radar-score-panel">
                    <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="#242F46" />
                                <PolarAngleAxis dataKey="subject" stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                                <Radar name="Match Score" dataKey="A" stroke="#E5A93C" fill="#E5A93C" fillOpacity={0.4} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-[10px] font-mono text-center text-slate-500 mt-2 bg-[#090C10] py-1 px-2 rounded border border-[#242F46]">
                        ⚠️ Algorithmic indicators only; human review required before taking enforcement action.
                    </div>
                </Panel>
            </div>

            {/* Rights & Transformation Metadata Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Rights Declaration */}
                <Panel title="Rights Metadata & Territory Licensing" testId="rights-metadata-panel">
                    <div className="space-y-3 text-xs font-mono">
                        <div className="flex justify-between border-b border-[#242F46] pb-2">
                            <span className="text-slate-400">Owner / Rights Holder:</span>
                            <span className="text-slate-100 font-semibold">{caseData.asset_owner}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#242F46] pb-2">
                            <span className="text-slate-400">Territories Covered:</span>
                            <span className="text-slate-200">{caseData.asset_territories?.join(", ") || "Global"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#242F46] pb-2">
                            <span className="text-slate-400">Exclusive Release Window:</span>
                            <span className="text-amber-400">
                                {caseData.asset_release_window?.start} to {caseData.asset_release_window?.end}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-[#242F46] pb-2">
                            <span className="text-slate-400">Authorized Platforms:</span>
                            <span className="text-slate-200">{caseData.asset_authorized_platforms?.join(", ") || "None"}</span>
                        </div>
                        {caseData.asset_exceptions?.length > 0 && (
                            <div>
                                <span className="text-slate-400 block mb-1">Declared Exceptions / Fair Use Allowances:</span>
                                <ul className="list-disc list-inside text-slate-300 space-y-1">
                                    {caseData.asset_exceptions.map((ex, idx) => (
                                        <li key={idx}>{ex}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Panel>

                {/* Transformations & Reason Codes */}
                <Panel title="Detected Transformations & System Reason Codes" testId="reason-codes-panel">
                    <div className="space-y-4">
                        <div>
                            <Eyebrow className="mb-2">Transformations Applied</Eyebrow>
                            <div className="flex flex-wrap gap-1.5">
                                {evidence?.transformations?.map((t, idx) => (
                                    <span key={idx} className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-amber-300 border border-[#242F46]">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Eyebrow className="mb-2">Reason Code Selector (Included in Decision Audit)</Eyebrow>
                            <div className="flex flex-wrap gap-1.5">
                                {caseData.reason_codes?.map((code) => (
                                    <button
                                        type="button"
                                        key={code}
                                        onClick={() => toggleReasonCode(code)}
                                        className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                                            reasonCodes.includes(code)
                                                ? "bg-amber-400/20 text-amber-300 border-amber-400"
                                                : "bg-[#090C10] text-slate-400 border-[#242F46] hover:text-slate-200"
                                        }`}
                                    >
                                        {code}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>

            {/* Human Review Decision Panel */}
            <Panel title="Human Analyst Decision Engine" className="border-amber-500/30 bg-[#111620]" testId="decision-panel">
                <form onSubmit={handleDecision} className="space-y-4" data-testid="decision-form">
                    {/* Action Selector */}
                    <div>
                        <label className="cs-eyebrow block mb-2">1. Select Case Action</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                            {[
                                { id: "accept", label: "Accept Threat", icon: CheckCircle2, color: "text-emerald-400" },
                                { id: "reject", label: "False Positive", icon: XCircle, color: "text-slate-400" },
                                { id: "monitor", label: "Monitor", icon: Eye, color: "text-sky-400" },
                                { id: "escalate", label: "Escalate Legal", icon: CornerUpRight, color: "text-rose-400" },
                                { id: "duplicate", label: "Mark Duplicate", icon: Copy, color: "text-purple-400" },
                                { id: "request_evidence", label: "More Evidence", icon: HelpCircle, color: "text-cyan-400" },
                            ].map((a) => (
                                <button
                                    type="button"
                                    key={a.id}
                                    data-testid={`decision-action-${a.id}`}
                                    onClick={() => setAction(a.id)}
                                    className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all ${
                                        action === a.id
                                            ? "bg-amber-400/10 border-amber-400 text-slate-100"
                                            : "bg-[#090C10] border-[#242F46] text-slate-400 hover:border-slate-700"
                                    }`}
                                >
                                    <a.icon className={`h-4 w-4 mb-2 ${a.color}`} />
                                    <span className="text-xs font-mono font-medium">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sub-Enforcement Execution Options */}
                    {action === "accept" && (
                        <div className="space-y-2 fade-up">
                            <label className="cs-eyebrow block">2. Select Enforcement Type</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                    { id: "takedown", label: "DMCA Takedown Request" },
                                    { id: "monetize", label: "Monetization Claim" },
                                    { id: "mute", label: "Audio Mute Claim" },
                                    { id: "geoblock", label: "Territorial Geo Block" },
                                ].map((e) => (
                                    <button
                                        type="button"
                                        key={e.id}
                                        data-testid={`enforcement-${e.id}`}
                                        onClick={() => setEnforcement(e.id)}
                                        className={`p-2.5 rounded-sm border text-xs font-mono transition-colors ${
                                            enforcement === e.id
                                                ? "bg-amber-400/20 text-amber-300 border-amber-400 font-semibold"
                                                : "bg-[#090C10] border-[#242F46] text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        {e.label}
                                    </button>
                                ))}
                            </div>

                            {/* Role Enforcement Lock Notice */}
                            {!isApproverOrAdmin && (
                                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/30 p-2.5 rounded-sm" data-testid="role-lock-warning">
                                    <Lock className="h-4 w-4 shrink-0" />
                                    <span>Approver or Admin role required for enforcement execution. Reviewer submissions will enter approval queue.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mandatory Rationale */}
                    <div>
                        <label className="cs-eyebrow block mb-1.5">
                            3. Mandatory Rationale & Legal Basis <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                            data-testid="decision-rationale-input"
                            rows={3}
                            value={rationale}
                            onChange={(e) => setRationale(e.target.value)}
                            placeholder="Provide explicit legal/operational reasoning for this decision..."
                            className="w-full bg-[#090C10] border border-[#242F46] rounded-sm p-3 text-xs font-mono text-slate-100 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={submitting}
                            data-testid="decision-submit-button"
                            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs px-6"
                        >
                            {submitting ? "Recording Decision…" : "Commit Decision to Audit Trail"}
                        </Button>
                    </div>
                </form>
            </Panel>
        </div>
    );
}
