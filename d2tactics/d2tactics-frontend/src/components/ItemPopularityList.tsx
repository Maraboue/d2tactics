// src/components/ItemPopularityList.tsx
import type { PopularityMap } from "../api/opendota";

interface ItemPopularityListProps {
    title: string;
    items?: PopularityMap;
    highlightNames?: string[];
    getIconUrl: (name: string | undefined) => string | undefined;
}


export default function ItemPopularityList({
                                               title,
                                               items,
                                               highlightNames,
                                               getIconUrl,
                                           }: ItemPopularityListProps) {
    if (!items || Object.keys(items).length === 0) {
        return (
            <section style={{padding: "12px 0", textAlign: "center"}}>
                <h3 style={{margin: "0 0 8px", textAlign: "center"}}>{title}</h3>
                <div style={{color: "#8aa0b6"}}>No data</div>
            </section>
        );
    }

    const rows = Object.entries(items).sort(
        (a, b) => Number(b[1]) - Number(a[1])
    );
    const maxCount = Number(rows[0]?.[1] ?? 1);

    return (
        <section style={{padding: "12px 0", textAlign: "center"}}>
            <h3 style={{margin: "0 0 12px", textAlign: "center"}}>{title}</h3>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    justifyContent: "center",   // ✅ center horizontally
                    alignItems: "flex-start",    // keeps top aligned if rows differ
                    textAlign: "center",         // ✅ ensure inner text centered
                }}
            >
                {rows.map(([name, raw]) => {
                    const count = Number(raw);
                    const pct = Math.round((count / maxCount) * 100);
                    const src = getIconUrl(name); // 👈 use dynamic icon resolver
                    const isTop = highlightNames?.includes(name) ?? false;


                    return (
                        <div
                            key={name}
                            style={{
                                position: "relative",
                                flex: "0 0 180px",
                                background: isTop ? "#0f1d13" : "#101215",
                                borderRadius: 10,
                                padding: 8,
                                border: isTop ? "2px solid #22c55e" : "1px solid #1f2937",
                                boxShadow: isTop ? "0 0 0 3px rgba(34,197,94,0.25)" : "none",
                                transform: isTop ? "translateY(-2px)" : "none",
                                transition: "all .18s ease",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                color: "#e9f0f3",
                            }}
                        >
                            {isTop && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 6,
                                        left: 6,
                                        fontSize: 10,
                                        padding: "2px 6px",
                                        borderRadius: 6,
                                        background: "#22c55e",
                                        color: "#072b14",
                                        fontWeight: 700,
                                    }}
                                >
                                    Top
                                </div>
                            )}

                            <div style={{width: 48, height: 48}}>
                                {src ? (
                                    <img
                                        src={src}
                                        alt={name}
                                        width={48}
                                        height={48}
                                        style={{borderRadius: 8, objectFit: "cover"}}
                                        loading="lazy"
                                        onError={(e) =>
                                            ((e.target as HTMLImageElement).style.visibility = "hidden")
                                        }
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 8,
                                            background: "#1b1f24",
                                            display: "grid",
                                            placeItems: "center",
                                            color: "#7a8794",
                                            fontSize: 10,
                                        }}
                                    >
                                        no icon
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    textAlign: "center",
                                    fontSize: 13,
                                    marginTop: 6,
                                    height: 34,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    fontWeight: isTop ? 700 : 500,
                                    color: isTop ? "#86efac" : "#e9f0f3",
                                }}
                                title={name}
                            >
                                {name}
                            </div>

                            <div
                                style={{
                                    width: "100%",
                                    height: 8,
                                    borderRadius: 6,
                                    background: "rgba(255,255,255,0.08)",
                                    marginTop: 6,
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: `${pct}%`,
                                        background:
                                            "linear-gradient(90deg, #34d399 0%, #22c55e 100%)",
                                        borderRadius: 6,
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    marginTop: 6,
                                    fontVariantNumeric: "tabular-nums",
                                    fontSize: 13,
                                }}
                            >
                                {count}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
