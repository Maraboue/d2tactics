import type { Phase } from "./TimedTimeline";

type TimingMap = Record<string, { minute: number; uses: number }>;

type Props = {
    selected: Record<Phase, string[]>;
    getIconUrl: (name: string) => string | undefined;
    onRemove?: (phase: Phase, name: string) => void;

    /** Pass the timings map from the backend/synthetic to show + sort by time */
    timings?: TimingMap;

    /** Sort order: true -> earliest first (default, recommended), false -> latest first */
    sortByMinuteAsc?: boolean;
};

const PHASE_TITLES: Record<Phase, string> = {
    start: "Start game",
    early: "Early game",
    mid: "Mid game",
    late: "Late game",
};

export default function SelectedBuildPanel({
                                               selected,
                                               getIconUrl,
                                               onRemove,
                                               timings = {},
                                               sortByMinuteAsc = true,
                                           }: Props) {
    const phases: Phase[] = ["start", "early", "mid", "late"];

    return (
        <section
            style={{
                width: "100%",
                maxWidth: 1280,
                marginInline: "auto",
                marginTop: 18,
                padding: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid #1f2c46",
                borderRadius: 16,
            }}
        >
            <h3 style={{ margin: "0 0 12px 0" }}>Your Selected Build</h3>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16,
                }}
            >
                {phases.map((p) => {
                    const items = selected[p] || [];

                    // Sort by minute (default: earliest first). Items without timing go last.
                    const itemsSorted = [...items].sort((a, b) => {
                        const ma = timings[a]?.minute ?? Number.POSITIVE_INFINITY;
                        const mb = timings[b]?.minute ?? Number.POSITIVE_INFINITY;
                        return sortByMinuteAsc ? ma - mb : mb - ma;
                    });

                    return (
                        <div
                            key={p}
                            style={{
                                background: "rgba(11,14,18,0.6)",
                                border: "1px solid #263349",
                                borderRadius: 12,
                                padding: 12,
                                minHeight: 90,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                                    {PHASE_TITLES[p]}
                                </div>
                                <div style={{ fontSize: 12, color: "#93a1b5" }}>
                                    (ordered by avg. timing)
                                </div>
                            </div>

                            {itemsSorted.length === 0 ? (
                                <div style={{ color: "#9ca3af", fontSize: 13 }}>
                                    Click items in the timeline to add here.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {itemsSorted.map((name) => {
                                        const icon = getIconUrl(name);
                                        const minute = timings[name]?.minute;
                                        const hasTime = Number.isFinite(minute);

                                        return (
                                            <div
                                                key={p + name}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    border: "1px solid #314564",
                                                    background: "rgba(12,16,22,0.95)",
                                                    borderRadius: 10,
                                                    padding: "8px 10px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: 6,
                                                        overflow: "hidden",
                                                        border: "1px solid #3a526f",
                                                        background: "#0b0e12",
                                                        flex: "0 0 auto",
                                                    }}
                                                >
                                                    {icon ? (
                                                        <img
                                                            src={icon}
                                                            alt={name}
                                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                fontSize: 10,
                                                                color: "#94a3b8",
                                                                padding: 2,
                                                                textAlign: "center",
                                                            }}
                                                        >
                                                            no icon
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: "grid", minWidth: 0, flex: 1 }}>
                          <span
                              style={{
                                  fontSize: 13,
                                  lineHeight: 1.15,
                                  wordBreak: "break-word",
                                  color: "#e8f1ff",
                              }}
                          >
                            {name}
                          </span>
                                                    <span style={{ fontSize: 11, color: "#cfe0ff" }}>
                            {hasTime ? `${minute!.toFixed(1)}m avg.` : "—"}
                          </span>
                                                </div>

                                                {onRemove && (
                                                    <button
                                                        onClick={() => onRemove(p, name)}
                                                        title="Remove"
                                                        style={{
                                                            marginLeft: 6,
                                                            background: "transparent",
                                                            border: "1px solid #475569",
                                                            color: "#e2e8f0",
                                                            padding: "4px 8px",
                                                            borderRadius: 6,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
