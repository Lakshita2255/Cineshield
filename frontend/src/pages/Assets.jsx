import { useState, useEffect } from "react";
import { Film, Plus, Upload, CheckCircle, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Eyebrow, Panel } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Assets() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRegister, setShowRegister] = useState(false);

    // Form
    const [title, setTitle] = useState("");
    const [type, setType] = useState("Feature film");
    const [owner, setOwner] = useState("");
    const [isan, setIsan] = useState("");
    const [territories, setTerritories] = useState("US, CA, UK");
    const [submitting, setSubmitting] = useState(false);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/assets");
            setAssets(data || []);
        } catch (err) {
            toast.error(errorMessage(err, "Failed to load assets"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssets();
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!title || !owner) {
            toast.error("Title and Owner are required fields.");
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                title,
                type,
                owner,
                isan: isan || null,
                territories: territories.split(",").map((t) => t.strip ? t.strip() : t.trim()),
                authorized_platforms: ["YouTube", "Prime Video"],
                exceptions: []
            };
            const { data } = await api.post("/assets/register", payload);
            toast.success(`Asset '${data.title}' registered successfully!`);
            setTitle("");
            setOwner("");
            setIsan("");
            setShowRegister(false);
            loadAssets();
        } catch (err) {
            toast.error(errorMessage(err, "Asset registration failed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 fade-up" data-testid="assets-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242F46] pb-4">
                <div>
                    <div className="cs-eyebrow">Copyright Protection Registry</div>
                    <h1 className="font-heading text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Film className="h-6 w-6 text-amber-400" /> Protected Reference Assets
                    </h1>
                </div>
                <Button onClick={() => setShowRegister(!showRegister)} data-testid="register-asset-button">
                    <Plus className="h-4 w-4 mr-1.5" /> Register Reference Asset
                </Button>
            </div>

            {/* Registration Form Modal/Drawer */}
            {showRegister && (
                <Panel title="Register New Protected Reference Asset" className="border-amber-400/40" testId="asset-registration-form">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="cs-eyebrow block mb-1">Asset Title *</label>
                                <Input data-testid="asset-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ashfall Protocol" required />
                            </div>
                            <div>
                                <label className="cs-eyebrow block mb-1">Rights Holder / Owner *</label>
                                <Input data-testid="asset-owner-input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Meridian Pictures" required />
                            </div>
                            <div>
                                <label className="cs-eyebrow block mb-1">Asset Type</label>
                                <select
                                    data-testid="asset-type-select"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full h-9 bg-[#111620] border border-[#242F46] text-slate-200 text-xs font-mono rounded-sm px-3"
                                >
                                    <option value="Feature film">Feature film</option>
                                    <option value="Episodic">Episodic</option>
                                    <option value="Trailer">Trailer</option>
                                    <option value="Documentary">Documentary</option>
                                    <option value="Short film">Short film</option>
                                </select>
                            </div>
                            <div>
                                <label className="cs-eyebrow block mb-1">ISAN Identifier</label>
                                <Input data-testid="asset-isan-input" value={isan} onChange={(e) => setIsan(e.target.value)} placeholder="0000-0003-9F2A-0000-K" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="cs-eyebrow block mb-1">Territories (Comma separated)</label>
                                <Input data-testid="asset-territories-input" value={territories} onChange={(e) => setTerritories(e.target.value)} placeholder="US, CA, UK, DE, FR" />
                            </div>
                        </div>

                        {/* Drag and Drop Zone */}
                        <div className="border-2 border-dashed border-[#242F46] hover:border-amber-400/50 p-6 rounded-md text-center bg-[#090C10] cursor-pointer">
                            <Upload className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                            <div className="text-xs font-mono text-slate-300 font-medium">Drag & Drop master video/audio file for vector fingerprinting</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1">MP4, MOV, MKV, FLAC up to 5GB supported</div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setShowRegister(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting} data-testid="asset-submit-button">
                                {submitting ? "Fingerprinting Asset…" : "Complete Asset Registration"}
                            </Button>
                        </div>
                    </form>
                </Panel>
            )}

            {/* Assets Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="assets-grid">
                {loading ? (
                    <div className="col-span-full p-8 text-center text-slate-500 font-mono">
                        Loading protected asset catalog…
                    </div>
                ) : (
                    assets.map((ast) => (
                        <div key={ast.id} className="cs-card p-4 space-y-3" data-testid={`asset-card-${ast.id}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[10px] font-mono text-amber-400 font-semibold">{ast.id}</span>
                                    <h3 className="font-heading font-semibold text-slate-100 text-sm">{ast.title}</h3>
                                </div>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                                    ast.validation_state === "valid" ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" : "text-amber-300 border-amber-500/40"
                                }`}>
                                    {ast.validation_state}
                                </span>
                            </div>

                            <div className="text-xs font-mono text-slate-400 space-y-1">
                                <div>Owner: <span className="text-slate-200">{ast.owner}</span></div>
                                <div>Territories: <span className="text-slate-200">{ast.territories?.join(", ")}</span></div>
                                <div>ISAN: <span className="text-slate-300">{ast.isan || "Pending declaration"}</span></div>
                            </div>

                            {/* Fingerprint Progress Bar */}
                            <div className="pt-2 border-t border-[#242F46]/60">
                                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                    <span>Vector Embedding Index</span>
                                    <span className="text-emerald-400 font-semibold">{ast.fingerprint_progress}% Ready</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded overflow-hidden">
                                    <div className="h-full bg-emerald-400" style={{ width: `${ast.fingerprint_progress}%` }} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
