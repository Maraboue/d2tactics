import { useMemo } from "react";
import type { ItemPopularityResponse } from "../lib/inferOrder";
import { inferVariants } from "../lib/inferVariants";

type Props = {
    data: ItemPopularityResponse;
    getIconUrl: (name: string) => string | undefined;
    title?: string;
    topPerPhase?: number;
    maxVariants?: number;
};

const PHASE_LABELS: Record<keyof ItemPopularityResponse, string> = {
    start_game_items: "Start",
    early_game_items: "Early",
    mid_game_items: "Mid",
    late_game_items: "Late",
};

export default function BuildVariants({
                                          data,
                                          getIconUrl,
                                          title = "Build Variants",
                                          topPerPhase = 6,
                                          maxVariants = 3,
                                      }: Props) {
    const variants = useMemo(
        () => inferVariants(data, topPerPhase, maxVariants),
        [data, topPerPhase, maxVariants]
    );

    return (
        <section style={{ width: "100%", maxWidth: 1400, marginInline: "auto" }}>
            <h2 style={{ margin: "12px 0", fontSize: 20 }}>{title}</h2>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 16,
                }}
            >
                {variants.map((chain, i) => (
                    <div
                        key={i}
                        style={{
                            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                            border: "1px solid #1f2c46",
                            borderRadius: 14,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                            padding: 14,
                            minHeight: 240,
                            display: "grid",
                            gridTemplateRows: "auto 1fr",
                            overflow: "hidden",
                        }}
                    >
                        <div style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 10 }}>
                            Variant {i + 1}
                        </div>

                        {/* 4-column phase grid */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gap: 12,
                                minHeight: 180,
                            }}
                        >
                            {(["start_game_items", "early_game_items", "mid_game_items", "late_game_items"] as const).map((phase) => {
                                const steps = chain.filter(s => s.phase === phase);
                                return (
                                    <div
                                        key={phase}
                                        style={{
                                            display: "grid",
                                            gridTemplateRows: "auto 1fr",
                                            gap: 8,
                                            minWidth: 0,
                                        }}
                                    >
                                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                            {PHASE_LABELS[phase]}
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gap: 8,
                                                alignContent: "start",
                                                overflowY: "auto",
                                                paddingRight: 4,
                                                maxHeight: 200, // scroll if too long
                                            }}
                                        >
                                            {steps.map((s) => {
                                                const icon = getIconUrl(s.name);
                                                return (
                                                    <div
                                                        key={s.name + s.stepIndex}
                                                        style={{
                                                            display: "grid",
                                                            gridTemplateColumns: "auto 1fr auto",
                                                            gap: 10,
                                                            alignItems: "center",
                                                            background: "rgba(12,16,22,0.95)",
                                                            border: "1px solid #223148",
                                                            borderRadius: 10,
                                                            padding: "8px 10px",
                                                            minHeight: 44,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                minWidth: 24,
                                                                height: 24,
                                                                borderRadius: 999,
                                                                display: "grid",
                                                                placeItems: "center",
                                                                fontSize: 12,
                                                                background: "#2563eb",
                                                                color: "white",
                                                            }}
                                                        >
                                                            {s.stepIndex + 1}
                                                        </div>

                                                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                                            <div
                                                                style={{
                                                                    width: 28,
                                                                    height: 28,
                                                                    borderRadius: 6,
                                                                    overflow: "hidden",
                                                                    border: "1px solid #2a3b57",
                                                                    background: "#0b0e12",
                                                                    flex: "0 0 auto",
                                                                }}
                                                            >
                                                                {icon ? (
                                                                    <img
                                                                        src={icon}
                                                                        alt={s.name}
                                                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                                    />
                                                                ) : (
                                                                    <div style={{ fontSize: 10, color: "#94a3b8", padding: 4, textAlign: "center" }}>
                                                                        no icon
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ display: "grid", minWidth: 0 }}>
                                <span style={{ fontSize: 12, lineHeight: 1.1, wordBreak: "break-word" }}>
                                  {s.name}
                                </span>
                                                                <span style={{ fontSize: 11, color: "#9ca3af" }}>rank {s.rank + 1}</span>
                                                            </div>
                                                        </div>

                                                        <div style={{ fontSize: 11, color: "#9ca3af" }}>#{s.rank + 1}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
