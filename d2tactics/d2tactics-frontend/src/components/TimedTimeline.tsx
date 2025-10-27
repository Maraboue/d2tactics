import { useEffect, useMemo, useRef, useState } from "react";

type Timing = { minute: number; uses: number };
export type Phase = "start" | "early" | "mid" | "late";

type Props = {
    data: Record<string, Timing>;
    getIconUrl: (prettyName: string) => string | undefined;
    title?: string;

    phaseOf?: (itemName: string) => Phase | undefined;
    highlightPhases?: Phase[];

    highlightTopK?: number;
    highlightTopPct?: number;
    topPhaseColor?: string;

    pxPerMinute?: number;        // keep at 55 as you prefer
    autoFit?: boolean;
    rightPadPx?: number;

    // NEW: click handler for selection
    onSelectItem?: (phase: Phase | undefined, itemName: string, minute: number) => void;

    // NEW: selection predicate so the timeline can render a “selected” state
    isSelected?: (phase: Phase | undefined, itemName: string) => boolean;
};

function useContainerWidth<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [w, setW] = useState(0);
    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;
        const ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width));
        ro.observe(el);
        setW(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);
    return { ref, width: w };
}

export default function TimedTimeline({
                                          data,
                                          getIconUrl,
                                          title = "Item Timings",
                                          phaseOf,
                                          highlightPhases,
                                          highlightTopK = 8,
                                          highlightTopPct = 0.25,
                                          topPhaseColor = "#22c55e",
                                          pxPerMinute = 55,
                                          autoFit = true,
                                          rightPadPx = 160,
                                          onSelectItem,               // NEW
                                          isSelected,                 // NEW
                                      }: Props) {
    const rows = useMemo(() => {
        const list = Object.entries(data || {}).map(([name, v]) => ({
            name,
            minute: Number.isFinite(v.minute) ? v.minute : 0,
            uses: Number.isFinite(v.uses as any) ? v.uses : 0,
            phase: phaseOf ? phaseOf(name) : undefined,
        }));
        list.sort((a, b) => (a.minute === b.minute ? b.uses - a.uses : a.minute - b.minute));
        return list;
    }, [data, phaseOf]);

    const maxMin = useMemo(() => {
        const m = Math.max(10, ...rows.map(r => r.minute));
        return Math.ceil(m / 5) * 5;
    }, [rows]);

    const [minUses, maxUses] = useMemo(() => {
        if (!rows.length) return [0, 1] as const;
        const u = rows.map(r => r.uses);
        return [Math.min(...u), Math.max(...u)] as const;
    }, [rows]);

    const globalTop = useMemo(() => {
        if (!rows.length) return new Set<string>();
        const sorted = [...rows].sort((a, b) => b.uses - a.uses);
        let pick: typeof rows = [];
        if (highlightTopK > 0) {
            pick = sorted.slice(0, Math.min(highlightTopK, sorted.length));
        } else {
            const k = Math.max(1, Math.floor(sorted.length * Math.min(1, Math.max(0, highlightTopPct))));
            pick = sorted.slice(0, k);
        }
        return new Set(pick.map(x => x.name));
    }, [rows, highlightTopK, highlightTopPct]);

    const topPerPhase = useMemo(() => {
        if (!phaseOf) return new Set<string>();
        const buckets: Record<Phase, { name: string; uses: number }[]> = {
            start: [], early: [], mid: [], late: [],
        };
        for (const r of rows) {
            const p = r.phase;
            if (p) buckets[p].push({ name: r.name, uses: r.uses });
        }
        const tops = new Set<string>();
        (Object.keys(buckets) as Phase[]).forEach(p => {
            if (!buckets[p].length) return;
            const best = buckets[p].reduce((a, b) => (b.uses > a.uses ? b : a));
            tops.add(best.name);
        });
        return tops;
    }, [rows, phaseOf]);

    const { ref: outerRef, width: outerWidth } = useContainerWidth<HTMLDivElement>();

    const axisTop = 34;
    const laneHeight = 50;
    const laneGap = 10;
    const cardW = 280;
    const minGapPx = 96;
    const sidePad = 18;

    const naturalInnerWidth = sidePad + maxMin * pxPerMinute + rightPadPx + sidePad;

    const placed = useMemo(() => {
        type Placed = {
            name: string;
            minute: number;
            uses: number;
            phase?: Phase;
            leftPx: number;
            lane: number;
            normUses: number;
            isGlobalTop: boolean;
            isPhaseTop: boolean;
            fadedByPhase: boolean;
        };

        const laneLastX: number[] = [];
        const items: Placed[] = [];

        for (const r of rows) {
            const norm = normalize(r.uses, minUses, maxUses);
            const p = r.phase;
            const faded = highlightPhases && p && !highlightPhases.includes(p);
            const x = sidePad + r.minute * pxPerMinute - cardW * 0.35;

            let chosen = -1;
            for (let i = 0; i < laneLastX.length; i++) {
                if (x - laneLastX[i] >= minGapPx) { chosen = i; break; }
            }
            if (chosen === -1) {
                chosen = laneLastX.length;
                laneLastX.push(-Infinity);
            }
            laneLastX[chosen] = x + cardW * 0.76;

            items.push({
                name: r.name,
                minute: r.minute,
                uses: r.uses,
                phase: p,
                leftPx: x,
                lane: chosen,
                normUses: norm,
                isGlobalTop: globalTop.has(r.name),
                isPhaseTop: topPerPhase.has(r.name),
                fadedByPhase: !!faded,
            });
        }

        const laneCount = Math.max(1, laneLastX.length);
        const contentHeight = axisTop + 12 + laneCount * laneHeight + (laneCount - 1) * laneGap;
        const containerHeight = contentHeight + 24;

        return { items, laneCount, containerHeight };
    }, [rows, minUses, maxUses, globalTop, topPerPhase, highlightPhases, pxPerMinute]);

    const scale = useMemo(() => {
        if (!autoFit || !outerWidth || naturalInnerWidth <= 0) return 1;
        return Math.min(1, outerWidth / naturalInnerWidth);
    }, [autoFit, outerWidth, naturalInnerWidth]);

    const ticks = useMemo(() => {
        const ar: number[] = [];
        for (let t = 0; t <= maxMin; t += 5) ar.push(t);
        return ar;
    }, [maxMin]);

    return (
        <section style={{ width: "100%", maxWidth: 1280, marginInline: "auto" }}>
            <h2 style={{ margin: "12px 0", fontSize: 20 }}>{title}</h2>

            <div
                ref={outerRef}
                style={{
                    position: "relative",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                    border: "1px solid #1e2b44",
                    borderRadius: 16,
                    boxShadow: "0 14px 36px rgba(0,0,0,0.45)",
                    padding: 0,
                    minHeight: 220,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: naturalInnerWidth,
                        height: 50,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                    }}
                >
                    {/* Axis */}
                    <div
                        style={{
                            position: "absolute",
                            left: sidePad,
                            right: sidePad,
                            top: axisTop,
                            height: 2,
                            background: "#233145",
                        }}
                    />

                    {/* Ticks */}
                    {ticks.map((t) => {
                        const x = sidePad + t * pxPerMinute;
                        return (
                            <div key={t}>
                                <div
                                    style={{
                                        position: "absolute",
                                        top: axisTop - 10,
                                        left: x,
                                        width: 1,
                                        height: 10,
                                        background: "#2b3e60",
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        top: axisTop - 26,
                                        left: x,
                                        transform: "translateX(-50%)",
                                        fontSize: 11,
                                        color: "#9fb2cf",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {t}m
                                </div>
                            </div>
                        );
                    })}

                    {/* Items */}
                    {placed.items.map((p) => {
                        const iconUrl = getIconUrl(p.name);
                        const top = axisTop + 12 + p.lane * (laneHeight + laneGap);

                        const intensity = 0.35 + 0.65 * p.normUses;
                        const borderColor = p.isPhaseTop
                            ? topPhaseColor
                            : mixColor("#3a4a6b", "#7aa7ff", intensity);

                        const glow = p.isPhaseTop
                            ? `0 0 0 2px ${rgba(topPhaseColor, 0.45)}, 0 12px 28px rgba(0,0,0,0.55)`
                            : p.isGlobalTop
                                ? `0 0 0 2px rgba(122,167,255,0.45), 0 12px 28px rgba(0,0,0,0.55)`
                                : `0 8px 22px rgba(0,0,0,0.4)`;

                        const baseOpacity = (p.fadedByPhase ? 0.35 : 0.8) * (0.85 + 0.15 * p.normUses);

                        // NEW: selected state visuals
                        const selected = isSelected?.(p.phase, p.name) ?? false;
                        const selRing = selected ? `0 0 0 2px rgba(250,204,21,0.65)` : "";
                        const cursor = onSelectItem ? "pointer" : "default";

                        return (
                            <div
                                key={p.name + p.lane + p.leftPx}
                                title={`${prettyPhase(p.phase)} • ${p.name} • ${p.minute.toFixed(1)}m • ${p.uses} uses`}
                                onClick={() => onSelectItem?.(p.phase, p.name, p.minute)}   // NEW
                                style={{
                                    position: "absolute",
                                    left: p.leftPx,
                                    top,
                                    width: cardW,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    background: "rgba(12,16,22,0.96)",
                                    border: `2px solid ${borderColor}`,
                                    boxShadow: selRing || glow,          // NEW: selection ring wins
                                    borderRadius: 12,
                                    padding: "10px 12px",
                                    opacity: baseOpacity,
                                    transition: "opacity 120ms, box-shadow 120ms, border-color 120ms",
                                    cursor,                               // NEW
                                }}
                            >
                                {p.isPhaseTop && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: -8,
                                            right: -8,
                                            background: topPhaseColor,
                                            color: "#0b0f18",
                                            fontSize: 10,
                                            fontWeight: 800,
                                            padding: "2px 6px",
                                            borderRadius: 999,
                                            boxShadow: `0 0 0 1px ${rgba(topPhaseColor, 0.4)}`,
                                        }}
                                    >
                                        TOP
                                    </div>
                                )}

                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 8,
                                        overflow: "hidden",
                                        border: `1px solid ${borderColor}`,
                                        background: "#0b0e12",
                                        flex: "0 0 auto",
                                    }}
                                >
                                    {iconUrl ? (
                                        <img src={iconUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ fontSize: 10, color: "#94a3b8", padding: 4, textAlign: "center" }}>no icon</div>
                                    )}
                                </div>

                                <div style={{ display: "grid", minWidth: 0 }}>
                  <span style={{ fontSize: 18, lineHeight: 1.15, wordBreak: "break-word", color: "#e8f1ff" }}>
                    {p.name}
                  </span>
                                    <span style={{ fontSize: 11, color: p.isPhaseTop ? "#e6ffe8" : "#cfe0ff" }}>
                    {p.minute.toFixed(1)}m • {p.uses} {p.phase ? `• ${prettyPhase(p.phase)}` : ""}
                  </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ height: placed.containerHeight * scale }} />
            </div>
        </section>
    );
}

/* utils */
function normalize(v: number, vmin: number, vmax: number) {
    if (vmax <= vmin) return 0;
    return (v - vmin) / (vmax - vmin);
}
function hexToRgb(hex: string) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function rgba(hexOrRgb: string, a: number) {
    if (hexOrRgb.startsWith("#")) {
        const rgb = hexToRgb(hexOrRgb)!;
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
    }
    return hexOrRgb.replace("rgb(", "rgba(").replace(")", `, ${a})`);
}
function mixColor(a: string, b: string, t: number) {
    const ca = hexToRgb(a), cb = hexToRgb(b);
    if (!ca || !cb) return b;
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const h = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r}, ${g}, ${h})`;
}
function prettyPhase(p?: Phase) {
    if (!p) return "";
    if (p === "start") return "Start";
    return p[0].toUpperCase() + p.slice(1);
}
