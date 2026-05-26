import "./loader.css"

export default function Loading() {
    return (
        <div className="loader-container">
            <div className="loader-content">
                <div>
                    <span className="loader-text-blue">➜</span>{" "}
                    <span className="loader-text-dim">~</span> json_forge
                    --init
                </div>
                <div>
                    <span className="loader-text-green">✓</span>{" "}
                    <span className="loader-text-dim">core_modules_loaded</span>
                </div>
                <div>
                    [####################]{" "}
                    <span className="loader-text-dim">100%</span>
                </div>
                <div className="loader-text-dim">
                    &gt; waiting_for_react...
                    <span className="loader-blink">_</span>
                </div>
            </div>
        </div>
    )
}
