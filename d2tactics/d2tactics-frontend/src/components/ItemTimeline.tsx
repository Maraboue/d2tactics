import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemPopularityResponse, PhaseKey } from "../lib/inferOrder";
import { inferChains } from "../lib/inferOrder";

type Props = {
    data: ItemPopularityResponse;
    getIconUrl: (name: string) => string | undefined;
    title?: string;
    topPerPhase?: number; // default 6
};

const PHASES: { key: PhaseKey; label: string }[] = [
    { key: "start_game_items", label: "Start" },
    { key: "early_game_items", label: "Early" },
    { key: "mid_game_items", label: "Mid" },
    { key: "late_game_items", label: "Late" },
];

export default function ItemTimeline({ data, getIconUrl, title = "Item Timeline", topPerPhase = 6 }: Props) {
    const [focused, setFocused] = useState<string | null>(null);

    // Pre-sort & crop to top N for a cleaner timeline
    const sortedTop = useMemo(() => {
        const out: Record<PhaseKey, [string, number][]> = {
            start_game_items: [],
            early_game_items: [],
            mid_game_items: [],
            late_game_items: [],
        };
        for (const { key } of PHASES) {
            const entries = Object.entries(data[key] || {});
            entries.sort((a, b) => b[1] - a[1]);
            out[key] = entries.slice(0, topPerPhase);
        }
        return out;
    }, [data, topPerPhase]);

    // Build rank-following chains using the FULL data (so it stays stable if you change topPerPhase)
    const chains = useMemo(() => inferChains(data, topPerPhase), [data, topPerPhase]);

    // Collect item element positions to draw SVG lines
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

    useEffect(() => {
        function getCenter(el: HTMLElement | null) {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY };
        }
        const next: { x1: number; y1: number; x2: number; y2: number }[] = [];

        // For each chain, connect consecutive steps (phase to next phase)
        for (const chain of chains) {
            for (let i = 0; i < chain.length - 1; i++) {
                const a = chain[i];
                const b = chain[i + 1];
                const aKey = keyFor(a.phase, a.name);
                const bKey = keyFor(b.phase, b.name);
                const aEl = itemRefs.current[aKey] || null;
                const bEl = itemRefs.current[bKey] || null;
                const ca = getCenter(aEl as any);
                const cb = getCenter(bEl as any);
                if (ca && cb) {
                    next.push({ x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y });
                }
            }
        }
        setLines(next);
    }, [chains, sortedTop]); // recompute when layout might change

    // For svg overlay sizing
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [svgBox, setSvgBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
    useEffect(() => {
        function updateBox() {
            const el = svgRef.current?.parentElement;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setSvgBox({ left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height });
        }
        updateBox();
        window.addEventListener("resize", updateBox);
        window.addEventListener("scroll", updateBox, { passive: true });
        return () => {
            window.removeEventListener("resize", updateBox);
            window.removeEventListener("scroll", updateBox);
        };
    }, []);

    const maxCount = useMemo(() => {
        const all = [
            ...Object.values(data.start_game_items),
            ...Object.values(data.early_game_items),
            ...Object.values(data.mid_game_items),
            ...Object.values(data.late_game_items),
        ];
        return all.length ? Math.max(...all) : 1;
    }, [data]);

    return (
        <section style={{ width: "100%", maxWidth: 1400, position: "relative" }}>
            <h2 style={{ margin: "0 0 12px 0", fontSize: 20 }}>{title}</h2>

            {/* SVG overlay for path lines */}
            <div style={{ position: "relative" }}>
                <svg
                    ref={svgRef}
                    style={{
                        position: "absolute",
                        zIndex: 0,
                        inset: 0,
                        pointerEvents: "none",
                        overflow: "visible",
                    }}
                    width={svgBox.width}
                    height={svgBox.height}
                >
                    {lines.map((l, i) => (
                        <line
                            key={i}
                            x1={l.x1 - svgBox.left}
                            y1={l.y1 - svgBox.top}
                            x2={l.x2 - svgBox.left}
                            y2={l.y2 - svgBox.top}
                            stroke="rgba(37,99,235,0.35)"
                            strokeWidth={2}
                        />
                    ))}
                </svg>

                {/* Content grid */}
                <div
                    style={{
                        position: "relative",
                        zIndex: 1,
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 16,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid #1a2230",
                        borderRadius: 14,
                        padding: 16,
                    }}
                >
                    {PHASES.map(({ key, label }) => (
                        <div key={key} style={{ display: "flex", flexDirection: "column", minHeight: 140 }}>
                            <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#2563eb" }} />
                                {label}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {sortedTop[key].map(([name, count], idx) => {
                                    const icon = getIconUrl(name);
                                    // find stepIndex for this (phase,name) in the FIRST chain whose rank == idx.
                                    const step = chains.find(ch => ch.some(s => s.phase === key && s.name === name && s.rank === idx))
                                        ?.find(s => s.phase === key && s.name === name);
                                    const stepNum = step ? step.stepIndex + 1 : null;

                                    const isFocused = focused && focused === name;
                                    const scale = 0.85 + 0.25 * (count / Math.max(1, maxCount));
                                    const refKey = keyFor(key, name);

                                    return (
                                        <div
                                            key={name}
                                            ref={(el) => void (itemRefs.current[refKey] = el)}
                                            title={`${name} • ${count}`}
                                            onClick={() => setFocused(prev => (prev === name ? null : name))}
                                            style={{
                                                transform: `scale(${scale.toFixed(3)})`,
                                                transformOrigin: "left center",
                                                transition: "transform 120ms ease, box-shadow 120ms ease, outline-color 120ms ease",
                                                border: 0,
                                                padding: 0,
                                                borderRadius: 10,
                                                background: isFocused ? "rgba(37, 99, 235, 0.25)" : "rgba(255,255,255,0.04)",
                                                outline: isFocused ? "2px solid #2563eb" : "1px solid #1e293b",
                                                boxShadow: isFocused ? "0 0 0 3px rgba(37,99,235,0.25)" : "none",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                            }}
                                        >
                                            {/* Step badge */}
                                            {stepNum !== null ? (
                                                <span
                                                    style={{
                                                        minWidth: 20,
                                                        height: 20,
                                                        borderRadius: 999,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        fontSize: 12,
                                                        background: "#2563eb",
                                                        color: "white",
                                                    }}
                                                >
                          {stepNum}
                        </span>
                                            ) : (
                                                <span style={{ width: 20 }} />
                                            )}

                                            {/* Icon */}
                                            <div
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    background: "#0b0e12",
                                                    borderRadius: 8,
                                                    display: "grid",
                                                    placeItems: "center",
                                                    overflow: "hidden",
                                                    border: "1px solid #1f2937",
                                                }}
                                            >
                                                {icon ? (
                                                    <img
                                                        src={icon}
                                                        alt={name}
                                                        style={{ width: 32, height: 32, objectFit: "cover", display: "block" }}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: 10, color: "#94a3b8", padding: 4 }}>no icon</span>
                                                )}
                                            </div>

                                            {/* Labels */}
                                            <div style={{ display: "grid" }}>
                                                <span style={{ fontSize: 12 }}>{name}</span>
                                                <span style={{ fontSize: 11, color: "#9ca3af" }}>{count}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Focus pill */}
            {focused && (
                <div
                    style={{
                        marginTop: 12,
                        display: "inline-flex",
                        gap: 8,
                        alignItems: "center",
                        background: "rgba(37,99,235,0.15)",
                        border: "1px solid #1f2c46",
                        padding: "6px 10px",
                        borderRadius: 999,
                    }}
                >
                    <span style={{ width: 8, height: 8, background: "#2563eb", borderRadius: 999 }} />
                    <span style={{ fontSize: 12, color: "#e5e7eb" }}>Focused: {focused}</span>
                    <button
                        onClick={() => setFocused(null)}
                        style={{
                            marginLeft: 6,
                            background: "transparent",
                            color: "#9ca3af",
                            border: 0,
                            cursor: "pointer",
                            fontSize: 12,
                        }}
                    >
                        Clear
                    </button>
                </div>
            )}
        </section>
    );
}

function keyFor(phase: PhaseKey, name: string) {
    return `${phase}::${name}`;
}
