import { useEffect, useMemo, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

import ErrorBanner from "./components/ErrorBanner";
import { useItemIcons } from "./lib/useItemIcons";
import HeroSearch from "./components/HeroSearch";
import RecommendedItems from "./components/RecommendedItems";
import TimedTimeline, { type Phase } from "./components/TimedTimeline";
import SelectedBuildPanel from "./components/SelectedBuildPanel";
import { buildSyntheticTimings } from "./lib/buildSyntheticTimings";
import { buildPhaseLookup } from "./lib/buildPhaseLookup";
import { useIsMobile } from "./lib/useIsMobile";

/** ---------- types ---------- */
type PhaseKey = "start_game_items" | "early_game_items" | "mid_game_items" | "late_game_items";
type PopularityMap = Record<string, number>;
type ItemPopularityResponse = Record<PhaseKey, PopularityMap>;

const PHASES = ["start", "early", "mid", "late"] as const;
type PhaseStr = typeof PHASES[number];

type UiError = { title: string; message?: string; hint?: string };

type RecommendResponse = {
    ally: string;
    enemy: string;
    phase: string;
    recommendations: Record<string, number>;
};

/** ---------- api ---------- */
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
        const looksJson = text.trim().startsWith("{") || text.trim().startsWith("[");
        if (!looksJson) throw { title: "Unexpected response format", message: "The server returned non-JSON content.", hint: text.slice(0, 240) } as UiError;
        const obj = JSON.parse(text) as Partial<ItemPopularityResponse>;
        const ok =
            obj && typeof obj === "object" &&
            "start_game_items" in obj &&
            "early_game_items" in obj &&
            "mid_game_items" in obj &&
            "late_game_items" in obj;
        if (!ok) throw { title: "Unexpected JSON shape", message: "Missing expected item popularity sections." } as UiError;
        return obj as ItemPopularityResponse;
    } catch (e: any) {
        clearTimeout(t);
        if (e?.title) throw e as UiError;
        if (e?.name === "AbortError") throw { title: "Request timed out", message: "The server took too long to respond." } as UiError;
        throw toUiError();
    }
}

async function fetchRecommendations(allySlug: string, enemySlug: string, phaseKey: PhaseStr, top = 6): Promise<RecommendResponse> {
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

/** ---------- utils ---------- */
function useDebounced<T>(value: T, delay = 350): T {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return v;
}

/** ---------- App ---------- */
export default function App() {
    type ViewMode = "popularity" | "recommend";
    const isMobile = useIsMobile();

    // ally hero
    const [heroInput, setHeroInput] = useState("Axe");
    const [querySlug, setQuerySlug] = useState("axe");
    const debouncedSlug = useDebounced(querySlug);

    // enemy (recommend only)
    const [enemyInput, setEnemyInput] = useState("");
    const [enemySlug, setEnemySlug] = useState("");

    // view
    const [view, setView] = useState<ViewMode>("popularity");

    // popularity
    const [data, setData] = useState<ItemPopularityResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<UiError | null>(null);

    // timings
    const [timings, setTimings] = useState<Record<string, { minute: number; uses: number }> | null>(null);
    const [timingLoading, setTimingLoading] = useState(false);
    const [timingFrom, setTimingFrom] = useState<"explorer" | "synthetic" | "none">("none");

    // recommendations (all phases)
    const [recLoading, setRecLoading] = useState(false);
    const [recErr, setRecErr] = useState<UiError | null>(null);
    const [recAll, setRecAll] = useState<Partial<Record<PhaseStr, RecommendResponse>>>({});

    // selection (build) state
    const [selected, setSelected] = useState<Record<PhaseStr, string[]>>({
        start: [], early: [], mid: [], late: [],
    });
    const addSelected = (phase: Phase | undefined, name: string) => {
        const p = (phase as PhaseStr) ?? "early";
        setSelected(prev => {
            const has = new Set(prev[p]);
            if (has.has(name)) return prev;
            return { ...prev, [p]: [...prev[p], name] };
        });
    };
    const removeSelected = (phase: Phase, name: string) => {
        const p = phase as PhaseStr;
        setSelected(prev => ({ ...prev, [p]: prev[p].filter(n => n !== name) }));
    };
    const isChosen = (phase: Phase | undefined, name: string) => {
        const p = (phase as PhaseStr) ?? "early";
        return selected[p].includes(name);
    };
    const clearBuild = () => setSelected({ start: [], early: [], mid: [], late: [] });

    // icons
    const { getItemIcon, ready: iconsReady } = useItemIcons();
    const canSearch = useMemo(() => debouncedSlug.trim().length > 0, [debouncedSlug]);

    /** load popularity + timings */
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
            setTimingLoading(true);
            try {
                const real = await fetchTimingsFromBackend(debouncedSlug);
                if (real && Object.keys(real).length) {
                    setTimings(real); setTimingFrom("explorer");
                } else {
                    setTimings(buildSyntheticTimings(json, 10)); setTimingFrom("synthetic");
                }
            } catch {
                setTimings(buildSyntheticTimings(json, 10)); setTimingFrom("synthetic");
            } finally {
                setTimingLoading(false);
            }
        } catch (e) {
            setData(null); setErr(e as UiError); setTimings(null); setTimingFrom("none");
        } finally {
            setLoading(false);
        }
    };

    // auto load popularity view
    useEffect(() => {
        if (view !== "popularity") return;
        if (!canSearch) { setData(null); setErr(null); setTimings(null); setTimingFrom("none"); return; }
        let cancelled = false;
        (async () => {
            setLoading(true); setErr(null);
            try {
                const json = await fetchItemPopularity(debouncedSlug, { timeoutMs: 15000 });
                if (!cancelled) {
                    setData(json);
                    setTimingLoading(true);
                    try {
                        const real = await fetchTimingsFromBackend(debouncedSlug);
                        if (!cancelled) {
                            if (real && Object.keys(real).length) { setTimings(real); setTimingFrom("explorer"); }
                            else { setTimings(buildSyntheticTimings(json, 10)); setTimingFrom("synthetic"); }
                        }
                    } catch {
                        if (!cancelled) { setTimings(buildSyntheticTimings(json, 10)); setTimingFrom("synthetic"); }
                    } finally {
                        if (!cancelled) setTimingLoading(false);
                    }
                }
            } catch (e) {
                if (!cancelled) { setErr(e as UiError); setData(null); setTimings(null); setTimingFrom("none"); }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [debouncedSlug, canSearch, view]);

    // auto load recommend (all phases) when enemy selected
    useEffect(() => {
        if (view !== "recommend" || !enemySlug) return;
        let aborted = false;
        (async () => {
            setRecErr(null); setRecLoading(true); setRecAll({});
            try {
                const results = await Promise.all(
                    PHASES.map(async (p) => {
                        const r = await fetchRecommendations(querySlug, enemySlug, p, 6);
                        return [p, r] as const;
                    })
                );
                if (!aborted) {
                    const next: Partial<Record<PhaseStr, RecommendResponse>> = {};
                    for (const [p, r] of results) next[p] = r;
                    setRecAll(next);
                }
            } catch (e) {
                if (!aborted) { setRecAll({}); setRecErr(e as UiError); }
            } finally {
                if (!aborted) setRecLoading(false);
            }
        })();
        return () => { aborted = true; };
    }, [view, querySlug, enemySlug]);

    return (
        <Container fluid className="py-4" style={{ minHeight: "100vh" }}>
            <Row className="mb-3">
                <Col className="text-center">
                    <h1 className="h4 m-0">D2Tactics — Item Popularity & Matchups</h1>
                </Col>
            </Row>

            {/* controls */}
            <Row className="g-3 justify-content-center mb-2">
                <Col xs={12} md={6} lg={5}>
                    <HeroSearch
                        value={heroInput}
                        onChange={(v) => setHeroInput(v)}
                        onSelect={(heroSlug) => setQuerySlug(heroSlug)}
                        placeholder="Your hero (e.g., Axe, Nyx Assassin)…"
                    />
                </Col>

                <Col xs="auto" className="d-flex gap-2 align-items-stretch">
                    <Button variant="success" disabled={loading} onClick={runPopularity}>
                        {loading ? "Loading…" : "Search Hero"}
                    </Button>
                    <Button variant="danger" onClick={clearBuild} title="Clear your selected items">
                        Clear Build
                    </Button>
                    <Button
                        variant="primary"
                        disabled={recLoading}
                        onClick={() => {
                            setView("recommend");
                            setErr(null); setData(null);
                            setTimings(null); setTimingFrom("none");
                        }}
                    >
                        Recommend vs Enemy
                    </Button>
                </Col>
            </Row>

            {/* enemy picker */}
            {view === "recommend" && (
                <Row className="g-3 justify-content-center mb-3">
                    <Col xs={12} md={6} lg={5}>
                        <HeroSearch
                            value={enemyInput}
                            onChange={(v) => setEnemyInput(v)}
                            onSelect={(slug) => setEnemySlug(slug)}
                            placeholder="Pick enemy hero (e.g., Zeus, Phantom Assassin)…"
                        />
                        {!enemySlug && (
                            <div className="mt-2" style={{ color: "#9ca3af" }}>
                                Select the enemy hero to see recommendations.
                            </div>
                        )}
                    </Col>
                </Row>
            )}

            {/* errors */}
            {view === "popularity" && err && (
                <Row className="justify-content-center">
                    <Col xs={12} md={8} lg={6}>
                        <ErrorBanner title={err.title} message={err.message} hint={err.hint} action={runPopularity} />
                    </Col>
                </Row>
            )}
            {view === "recommend" && recErr && (
                <Row className="justify-content-center">
                    <Col xs={12} md={8} lg={6}>
                        <ErrorBanner title={recErr.title} message={recErr.message} hint={recErr.hint} />
                    </Col>
                </Row>
            )}

            {/* POPULARITY VIEW */}
            {view === "popularity" && !err && (
                <>
                    {data && iconsReady && (
                        <Row className="justify-content-center">
                            <Col xs={12} lg={10}>
                                <Card bg="dark" text="light" className="mb-3" style={{ background: "transparent" }}>
                                    <Card.Body style={{ padding: isMobile ? 0 : 0, overflowX: isMobile ? "auto" : "visible" }}>
                                        {timings && (
                                            <TimedTimeline
                                                title={timingFrom === "explorer" ? "Median Item Timings (public matches)" : "Estimated Timings (phase-based)"}
                                                data={timings}
                                                getIconUrl={getItemIcon}
                                                phaseOf={data ? buildPhaseLookup(data) : undefined}
                                                highlightPhases={["start","early", "mid","late"]}
                                                highlightTopK={8}
                                                pxPerMinute={isMobile ? 42 : 55}
                                                autoFit={!isMobile}
                                                rightPadPx={isMobile ? 96 : 160}
                                                onSelectItem={(phase, name) => addSelected(phase, name)}
                                                isSelected={(phase, name) => isChosen(phase, name)}
                                            />
                                        )}
                                        {!timings && timingLoading && (
                                            <div className="text-center py-3" style={{ color: "#9ca3af" }}>Loading timings…</div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* selected build */}
                    {iconsReady && (
                        <Row className="justify-content-center">
                            <Col xs={12} lg={10}>
                                <SelectedBuildPanel
                                    selected={selected}
                                    getIconUrl={getItemIcon}
                                    onRemove={removeSelected}
                                    timings={timings ?? {}}
                                    sortByMinuteAsc={true}
                                />
                            </Col>
                        </Row>
                    )}

                    {!iconsReady && (
                        <Row className="justify-content-center">
                            <Col xs="auto" className="text-center" style={{ color: "#9ca3af" }}>
                                Loading icons…
                            </Col>
                        </Row>
                    )}
                    {loading && (
                        <Row className="justify-content-center">
                            <Col xs="auto" className="text-center" style={{ color: "#9ca3af" }}>
                                Fetching item popularity…
                            </Col>
                        </Row>
                    )}
                </>
            )}

            {/* RECOMMEND VIEW */}
            {view === "recommend" && !recErr && enemySlug && (
                <>
                    {recLoading && (
                        <Row className="justify-content-center">
                            <Col xs="auto" className="text-center" style={{ color: "#9ca3af" }}>
                                Computing recommendations…
                            </Col>
                        </Row>
                    )}

                    {!recLoading && Object.keys(recAll).length > 0 && (
                        <Row className="g-3 justify-content-center">
                            {PHASES.map((p) => {
                                const d = recAll[p];
                                if (!d) return null;
                                return (
                                    <Col key={p} xs={12} md={6} lg={4}>
                                        <RecommendedItems
                                            title={`${p[0].toUpperCase() + p.slice(1)} game items — ${enemyInput || d.enemy}`}
                                            items={d.recommendations}
                                            getIconUrl={getItemIcon}
                                        />
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </>
            )}
        </Container>
    );
}
