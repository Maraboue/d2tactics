
interface ErrorBannerProps {
    title: string;
    message?: string;
    hint?: string;
    action?: () => void;
}

export default function ErrorBanner({ title, message, hint, action }: ErrorBannerProps) {
    return (
        <div
            style={{
                width: "100%",
                maxWidth: 700,
                border: "1px solid #b91c1c",
                background: "#431313",
                color: "#fecaca",
                borderRadius: 12,
                padding: "14px 16px",
                boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
                marginTop: 12,
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>{title}</div>

            {message && (
                <div style={{ opacity: 0.95, lineHeight: "1.4" }}>
                    {message}
                </div>
            )}

            {hint && (
                <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>
                    {hint}
                </div>
            )}

            {action && (
                <div style={{ marginTop: 10 }}>
                    <button
                        onClick={action}
                        style={{
                            background: "#0f1319",
                            border: "1px solid #334155",
                            color: "#e9f0f3",
                            padding: "8px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 14,
                        }}
                    >
                        Try again
                    </button>
                </div>
            )}
        </div>
    );
}
