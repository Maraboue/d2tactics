import { useEffect, useMemo, useRef, useState } from "react";
import { useHeroList, normHeroKey, type Hero } from "../lib/useHeroList";

type HeroSearchProps = {
    value: string;                       // current visible text in the input
    onChange: (v: string) => void;       // updates the visible text
    onSelect: (slug: string) => void;    // returns OpenDota slug (e.g., "nyx_assassin")
    placeholder?: string;
};

export default function HeroSearch({ value, onChange, onSelect, placeholder }: HeroSearchProps) {
    const { heroes, loading } = useHeroList();
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const boxRef = useRef<HTMLDivElement>(null);

    const q = value.trim().toLowerCase();

    const suggestions = useMemo(() => {
        if (!q) return heroes.slice(0, 10);
        const starts = heroes.filter(h =>
            h.display.toLowerCase().startsWith(q) ||
            h.slug.startsWith(q) ||
            h.key.startsWith(normHeroKey(q)) ||
            h.aliases.some(a => a.startsWith(q))
        );
        const includes = heroes.filter(h =>
                !starts.includes(h) && (
                    h.display.toLowerCase().includes(q) ||
                    h.slug.includes(q) ||
                    h.aliases.some(a => a.includes(q))
                )
        );
        return [...starts, ...includes].slice(0, 12);
    }, [q, heroes]);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!boxRef.current) return;
            if (!boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    useEffect(() => { setActive(0); }, [q]);

    return (
        <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
            <input
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
                    if (!open) return;

                    if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActive((i) => Math.min(i + 1, suggestions.length - 1));
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActive((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter") {
                        e.preventDefault();
                        const choice = suggestions[active];
                        if (choice) {
                            // ✅ use slug for API calls
                            onSelect(choice.slug);
                            // Optional: also replace input text with the nice display name
                            onChange(choice.display);
                            setOpen(false);
                        } else if (q) {
                            // Try to map free text to a hero by aliases; pick first best match
                            const best = suggestions[0] ?? heroes.find(h =>
                                h.key === normHeroKey(q) || h.slug === q
                            );
                            if (best) {
                                onSelect(best.slug);
                                onChange(best.display);
                            } else {
                                // fallback: pass normalized input; backend may handle it
                                onSelect(normHeroKey(q));
                            }
                            setOpen(false);
                        }
                    } else if (e.key === "Escape") {
                        setOpen(false);
                    }
                }}
                placeholder={placeholder ?? "Type a hero (e.g., Nyx Assassin, Axe, Queen of Pain)…"}
                spellCheck={false}
                style={{
                    width: "100%",
                    background: "#0f1319",
                    color: "#e9f0f3",
                    border: "1px solid #1a2230",
                    borderRadius: 10,
                    padding: "12px 14px",
                    outline: "none",
                    textAlign: "center",
                }}
            />

            {open && (q.length > 0 || suggestions.length > 0) && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        background: "#0f1319",
                        border: "1px solid #1a2230",
                        borderRadius: 10,
                        overflow: "hidden",
                        zIndex: 20,
                        boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
                        maxHeight: 320,
                        overflowY: "auto",
                    }}
                >
                    {loading && (
                        <div style={{ padding: 10, color: "#9ca3af", textAlign: "center" }}>
                            Loading heroes…
                        </div>
                    )}

                    {!loading && suggestions.length === 0 && (
                        <div style={{ padding: 10, color: "#9ca3af", textAlign: "center" }}>
                            No matches
                        </div>
                    )}

                    {!loading && suggestions.map((h: Hero, i: number) => {
                        const isActive = i === active;
                        return (
                            <button
                                key={h.id}
                                type="button"
                                onMouseEnter={() => setActive(i)}
                                onClick={() => {
                                    onSelect(h.slug);     // ✅ slug with underscores
                                    onChange(h.display);  // show pretty name in the input
                                    setOpen(false);
                                }}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    background: isActive ? "#16202b" : "transparent",
                                    color: "#e9f0f3",
                                    border: "none",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                }}
                            >
                                <span>{h.display}</span>
                                <span style={{ color: "#8aa0b6", fontSize: 12 }}>{h.slug}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
