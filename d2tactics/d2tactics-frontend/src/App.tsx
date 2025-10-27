// src/App.tsx
import { useEffect, useMemo, useState } from "react";

import ErrorBanner from "./components/ErrorBanner";
import { useItemIcons } from "./lib/useItemIcons";
import HeroSearch from "./components/HeroSearch";
import RecommendedItems from "./components/RecommendedItems";
import { buildSyntheticTimings } from "./lib/buildSyntheticTimings";
import { buildPhaseLookup } from "./lib/buildPhaseLookup";
import TimedTimeline, { type Phase } from "./components/TimedTimeline";
import SelectedBuildPanel from "./components/SelectedBuildPanel";

/* ----------------------------- types ----------------------------- */
type PhaseKey = "start_game_items" | "early_game_items" | "mid_game_items" | "late_game_items";
type PopularityMap = Record<string, number>;
type ItemPopularityResponse = Record<PhaseKey, PopularityMap>;

const PHASES: Phase[] = ["start", "early", "mid", "late"];

type UiError = {
    title: string;
    message?: string;
    hint?: string;
};

type RecommendResponse = {
    ally: string;
    enemy: string;
    phase: string; // backend string; we only display titles
    recommendations: Record<string, number>;
};

/* ----------------------------- api ------------------------------- */
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function toUiError(status?: number): UiError {
    if (status === 404) return { title: "Hero not found", message: "We couldn’t find that hero.", hint: "Try names like axe, antimage, queenofpain." };
    if (status === 400) return { title: "Bad request", message: "The request looked invalid.", hint: "Check the hero name and try again." };
    if (status && status >= 500) return { title: "Service problem", message: "The Dota data service had an issue responding.", hint: "Please try again in a moment." };
    return { title: "Can’t reach the server", message: "We couldn’t connect to the API.", hint: "Ensure the backend is running and CORS/dev proxy is set." };
}

async function fetchItemPopularity(heroSlug: string, opts: { timeoutMs?: number } = {}): Promise<ItemPopularityResponse> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
    const url = `${API_BASE}/opendota/data/heroes/${encodeURIComponent(heroSlug)}/itemPopularity?named=true`;

    try {
        const res = await fetch(url, { signal: controller.signal, credentials: "include" });
        clearTimeout(t);
        if (!res.ok) throw toUiError(res.status);

        const text = await res.text();
        const ct = res.headers.get("content-type") || "";
        const looksJson = ct.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[");
        if (!looksJson) throw { title: "Unexpected response format", message: "The server returned non-JSON content.", hint: text.slice(0, 250) } as UiError;

        let json: unknown;
        try { json = JSON.parse(text); }
        catch { throw { title: "Failed to parse data", message: "The response wasn’t valid JSON.", hint: text.slice(0, 250) } as UiError; }

        const obj = json as Partial<ItemPopularityResponse>;
        const hasKeys =
            obj && typeof obj === "object" &&
            "start_game_items" in obj && "early_game_items" in obj &&
            "mid_game_items" in obj && "late_game_items" in obj;

        if (!hasKeys) throw { title: "Unexpected JSON shape", message: "Missing expected item popularity sections." } as UiError;
        return obj as ItemPopularityResponse;
    } catch (e: any) {
        clearTimeout(t);
        if (e?.title) throw e as UiError;
        if (e?.name === "AbortError") throw { title: "Request timed out", message: "The server took too long to respond." } as UiError;
        throw toUiError();
    }
}

async function fetchRecommendations(allySlug: string, enemySlug: string, phaseKey: Phase, top: number = 6): Promise<RecommendResponse> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const url = `${API_BASE}/opendota/recommendation/recommend?ally=${encodeURIComponent(allySlug)}&enemy=${encodeURIComponent(enemySlug)}&phase=${encodeURIComponent(phaseKey)}&top=${top}`;

    try {
        const res = await fetch(url, { signal: controller.signal, credentials: "include" });
        clearTimeout(t);
        if (!res.ok) throw toUiError(res.status);
        const json = (await res.json()) as RecommendResponse;
        if (!json || typeof json !== "object" || !json.recommendations) {
            throw { title: "Unexpected JSON shape", message: "Recommendations payload missing." } as UiError;
        }
        return json;
    } catch (e: any) {
        clearTimeout(t);
        if (e?.title) throw e as UiError;
        if (e?.name === "AbortError") throw { title: "Request timed out", message: "The server took too long to respond." } as UiError;
        throw toUiError();
    }
}

async function fetchTimingsFromBackend(heroSlug: string): Promise<Record<string, { minute: number; uses: number }>> {
    const url = `${API_BASE}/opendota/heroes/${encodeURIComponent(heroSlug)}/itemTimings?minCount=8&limit=60`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return {};
    return res.json();
}

/* ----------------------- small utilities ------------------------- */
function useDebounced<T>(value: T, delay = 350): T {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return v;
}

/* ------------------------------ app ------------------------------ */
export default function App() {
    type ViewMode = "popularity" | "recommend";

    // Ally hero (pretty input vs slug)
    const [heroInput, setHeroInput] = useState("Axe");
    const [querySlug, setQuerySlug] = useState("axe");
    const debouncedSlug = useDebounced(querySlug);

    // Enemy (only used in Recommend view)
    const [enemyInput, setEnemyInput] = useState("");
    const [enemySlug, setEnemySlug] = useState("");

    // View
    const [view, setView] = useState<ViewMode>("popularity");

    // Popularity state
    const [data, setData] = useState<ItemPopularityResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<UiError | null>(null);

    // Timings state
    const [timings, setTimings] = useState<Record<string, { minute: number; uses: number }> | null>(null);
    const [timingLoading, setTimingLoading] = useState(false);
    const [timingFrom, setTimingFrom] = useState<"explorer" | "synthetic" | "none">("none");

    // Recommendations (all phases)
    const [recLoading, setRecLoading] = useState(false);
    const [recErr, setRecErr] = useState<UiError | null>(null);
    const [recAll, setRecAll] = useState<Partial<Record<Phase, RecommendResponse>>>({});

    // Build selection (per phase)
    const [selected, setSelected] = useState<Record<Phase, string[]>>({
        start: [],
        early: [],
        mid: [],
        late: [],
    });
    const addSelected = (phase: Phase | undefined, name: string) => {
        const p: Phase = phase ?? "early";
        setSelected(prev => {
            if (prev[p].includes(name)) return prev;
            return { ...prev, [p]: [...prev[p], name] };
        });
    };
    const removeSelected = (phase: Phase, name: string) => {
        setSelected(prev => ({ ...prev, [phase]: prev[phase].filter(n => n !== name) }));
    };
    const isChosen = (phase: Phase | undefined, name: string) => {
        const p: Phase = phase ?? "early";
        return selected[p].includes(name);
    };
    const clearBuild = () => setSelected({ start: [], early: [], mid: [], late: [] });

    // Icons
    const { getItemIcon, ready: iconsReady } = useItemIcons();
    const canSearch = useMemo(() => debouncedSlug.trim().length > 0, [debouncedSlug]);

    /** Fetch popularity (and timings with fallback) */
    const runPopularity = async () => {
        if (!canSearch) return;
        setView("popularity");
        setRecErr(null);
        setRecAll({});

        setLoading(true);
        setErr(null);
        try {
            const json = await fetchItemPopularity(debouncedSlug, { timeoutMs: 15000 });
            setData(json);

            // Timings: try real → fallback to synthetic
            setTimingLoading(true);
            try {
                const real = await fetchTimingsFromBackend(debouncedSlug);
                if (real && Object.keys(real).length) {
                    setTimings(real);
                    setTimingFrom("explorer");
                } else {
                    setTimings(buildSyntheticTimings(json, 10));
                    setTimingFrom("synthetic");
                }
            } catch {
                setTimings(buildSyntheticTimings(json, 10));
                setTimingFrom("synthetic");
            } finally {
                setTimingLoading(false);
            }
        } catch (e) {
            setData(null);
            setErr(e as UiError);
            setTimings(null);
            setTimingFrom("none");
        } finally {
            setLoading(false);
        }
    };

    /** Auto-fetch when ally changes (popularity view only) */
    useEffect(() => {
        if (view !== "popularity") return;
        if (!canSearch) { setData(null); setErr(null); setTimings(null); setTimingFrom("none"); return; }

        let cancelled = false;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const json = await fetchItemPopularity(debouncedSlug, { timeoutMs: 15000 });
                if (!cancelled) {
                    setData(json);
                    setTimingLoading(true);
                    try {
                        const real = await fetchTimingsFromBackend(debouncedSlug);
                        if (!cancelled) {
                            if (real && Object.keys(real).length) {
                                setTimings(real);
                                setTimingFrom("explorer");
                            } else {
                                setTimings(buildSyntheticTimings(json, 10));
                                setTimingFrom("synthetic");
                            }
                        }
                    } catch {
                        if (!cancelled) {
                            setTimings(buildSyntheticTimings(json, 10));
                            setTimingFrom("synthetic");
                        }
                    } finally {
                        if (!cancelled) setTimingLoading(false);
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setErr(e as UiError);
                    setData(null);
                    setTimings(null);
                    setTimingFrom("none");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [debouncedSlug, canSearch, view]);

    /** Auto-fetch recommendations when in recommend view AND enemy chosen */
    useEffect(() => {
        if (view !== "recommend") return;
        if (!enemySlug) return;
        let aborted = false;

        (async () => {
            setRecErr(null);
            setRecLoading(true);
            setRecAll({});
            try {
                const results = await Promise.all(
                    PHASES.map(async (p) => {
                        const r = await fetchRecommendations(querySlug, enemySlug, p, 6);
                        return [p, r] as const;
                    })
                );
                if (!aborted) {
                    const next: Partial<Record<Phase, RecommendResponse>> = {};
                    for (const [p, r] of results) next[p] = r;
                    setRecAll(next);
                }
            } catch (e) {
                if (!aborted) {
                    setRecAll({});
                    setRecErr(e as UiError);
                }
            } finally {
                if (!aborted) setRecLoading(false);
            }
        })();

        return () => { aborted = true; };
    }, [view, querySlug, enemySlug]);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#0b0e12",
                color: "#e9f0f3",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "40px 20px",
                gap: 20,
            }}
        >
            <header style={{textAlign: "center"}}>
                <h1 style={{margin: 0, fontSize: 36, letterSpacing: 0.3}}>
                    Dota 2 Tactics
                </h1>
                <h3 style={{margin: 0, fontSize: 16, letterSpacing: 0.3}}>
                    Create builds based on top items for your hero.
                </h3>
            </header>

            {/* Controls row */}
            <div
                style={{
                    display: "flex",
                    gap: 34,
                    justifyContent: "center",
                    width: "100%",
                    maxWidth: 900,
                    flexWrap: "wrap",
                }}
            >
                {/* Ally (your hero) */}
                <div style={{ flex: "1 1 340px", minWidth: 320 }}>
                    <HeroSearch
                        value={heroInput}
                        onChange={(v) => setHeroInput(v)}
                        onSelect={(heroSlug) => setQuerySlug(heroSlug)}
                        placeholder="Your hero (e.g., Axe, Nyx Assassin)…"
                    />
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                        onClick={runPopularity}
                        disabled={loading}
                        style={{
                            background: "#16a34a",
                            color: "white",
                            border: 0,
                            padding: "10px 14px",
                            borderRadius: 10,
                            cursor: !loading ? "pointer" : "not-allowed",
                            opacity: !loading ? 1 : 0.6,
                            whiteSpace: "nowrap",
                            height: 42,
                        }}
                    >
                        {loading ? "Loading…" : "Search hero"}
                    </button>

                    <button
                        onClick={() => {
                            setView("recommend");
                            setErr(null);
                            setData(null);
                            setTimings(null);
                            setTimingFrom("none");
                        }}
                        disabled={recLoading}
                        style={{
                            background: "#2563eb",
                            color: "white",
                            border: 0,
                            padding: "10px 14px",
                            borderRadius: 10,
                            cursor: !recLoading ? "pointer" : "not-allowed",
                            opacity: !recLoading ? 1 : 0.6,
                            whiteSpace: "nowrap",
                            height: 42,
                        }}
                    >
                        Recommend vs Enemy
                    </button>

                    {/* NEW: Clear build button */}
                    <button
                        onClick={clearBuild}
                        style={{
                            background: "#ef4444",
                            color: "white",
                            border: 0,
                            padding: "10px 14px",
                            borderRadius: 10,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            height: 42,
                        }}
                        title="Clear your selected items per phase"
                    >
                        Clear build
                    </button>
                </div>
            </div>

            {/* Enemy search appears ONLY in Recommend view */}
            {view === "recommend" && (
                <div style={{ width: "100%", maxWidth: 900 }}>
                    <HeroSearch
                        value={enemyInput}
                        onChange={(v) => setEnemyInput(v)}
                        onSelect={(slug) => setEnemySlug(slug)}
                        placeholder="Pick enemy hero (e.g., Zeus, Phantom Assassin)…"
                    />
                    {!enemySlug && (
                        <div style={{ color: "#9ca3af", marginTop: 8 }}>
                            Select the enemy hero to see recommendations.
                        </div>
                    )}
                </div>
            )}

            {/* POPULARITY VIEW */}
            {view === "popularity" && (
                <>
                    {err && (
                        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                            <ErrorBanner title={err.title} message={err.message} hint={err.hint} action={runPopularity} />
                        </div>
                    )}

                    {!err && !loading && data && iconsReady && (
                        <div style={{ width: "100%", display: "grid", gap: 24 }}>
                            {timings && (
                                <TimedTimeline
                                    title={timingFrom === "explorer" ? "Median Item Timings (public matches)" : "Estimated Timings (phase-based)"}
                                    data={timings}
                                    getIconUrl={getItemIcon}
                                    phaseOf={data ? buildPhaseLookup(data) : undefined}
                                    highlightPhases={["start","early", "mid","late"]}
                                    highlightTopK={8}
                                    pxPerMinute={55}
                                    autoFit={true}
                                    onSelectItem={(phase, name) => addSelected(phase, name)}
                                    isSelected={(phase, name) => isChosen(phase, name)}
                                />
                            )}

                            <SelectedBuildPanel
                                selected={selected}
                                getIconUrl={getItemIcon}
                                onRemove={removeSelected}
                                timings={timings ?? {}}        // ← gives the panel the minutes
                                sortByMinuteAsc={true}         // ← earliest first (matches your example)
                            />


                            {!timings && timingLoading && (
                                <div style={{ color: "#9ca3af" }}>Loading timings…</div>
                            )}
                        </div>
                    )}

                    {!iconsReady && !err && (
                        <div style={{ color: "#9ca3af", textAlign: "center" }}>Loading icons…</div>
                    )}
                    {loading && (
                        <div style={{ color: "#9ca3af", textAlign: "center" }}>Fetching item popularity…</div>
                    )}
                </>
            )}

            {/* RECOMMEND VIEW */}
            {view === "recommend" && (
                <>
                    {recErr && (
                        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                            <ErrorBanner title={recErr.title} message={recErr.message} hint={recErr.hint} />
                        </div>
                    )}

                    {!recErr && enemySlug && !recLoading && Object.keys(recAll).length > 0 && (
                        <div
                            style={{
                                width: "100%",
                                maxWidth: 1400,
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                                justifyContent: "center",
                                justifyItems: "center",
                                gap: 24,
                                marginTop: 16,
                            }}
                        >
                            {PHASES.map((p) => {
                                const d = recAll[p];
                                if (!d) return null;
                                const title = `${p[0].toUpperCase() + p.slice(1)} game items against — ${enemyInput || d.enemy}`;
                                return (
                                    <RecommendedItems
                                        key={p}
                                        title={title}
                                        items={d.recommendations}
                                        getIconUrl={getItemIcon}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {enemySlug && recLoading && (
                        <div style={{ color: "#9ca3af", textAlign: "center" }}>
                            Computing recommendations…
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
