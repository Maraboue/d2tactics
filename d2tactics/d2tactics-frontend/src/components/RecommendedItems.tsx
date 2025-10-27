
type PopularityMap = Record<string, number>;

interface RecommendedItemsProps {
    title: string;
    items: PopularityMap;
    getIconUrl: (name: string) => string | undefined;
}

export default function RecommendedItems({ title, items, getIconUrl }: RecommendedItemsProps) {
    const entries = Object.entries(items);
    const max = entries.length ? Math.max(...entries.map(([, v]) => Number(v))) : 0;

    return (
        <section
            style={{
                width: "100%",
                maxWidth: 700,
                background: "#0f1319",
                border: "1px solid #1a2230",
                borderRadius: 12,
                padding: 16,
            }}
        >
            <h3 style={{ margin: "0 0 10px 0" }}>{title}</h3>

            {entries.length === 0 && (
                <div style={{ color: "#9ca3af" }}>No recommendations yet.</div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
                {entries.map(([name, score]) => {
                    const isTop = Number(score) === max;
                    const icon = getIconUrl(name);
                    return (
                        <div
                            key={name}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "40px 1fr auto",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: isTop ? "#13211a" : "transparent",
                                border: isTop ? "1px solid #1f3b2a" : "1px solid transparent",
                            }}
                            title={String(score)}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 6,
                                    overflow: "hidden",
                                    background: "#111827",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {icon ? (
                                    <img
                                        src={icon}
                                        alt={name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <span style={{ fontSize: 10, color: "#9ca3af" }}>no icon</span>
                                )}
                            </div>

                            <div style={{ fontWeight: 600 }}>{name}</div>

                            <div style={{ minWidth: 50, textAlign: "right", color: "#9ca3af" }}>
                                {score}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
