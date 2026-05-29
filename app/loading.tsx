import "./loader.css";

export default function Loading() {
    return (
        <div className="loader-shell">
            <div className="loader-header">
                <div className="loader-logo" />
                <div className="loader-title">
                    <div className="loader-line loader-line-short" />
                    <div className="loader-line loader-line-tiny" />
                </div>
                <div className="loader-tabs">
                    <div className="loader-pill loader-pill-active" />
                    <div className="loader-pill" />
                    <div className="loader-pill" />
                    <div className="loader-pill" />
                </div>
                <div className="loader-actions">
                    <div className="loader-button" />
                    <div className="loader-button" />
                    <div className="loader-icon-button" />
                </div>
            </div>
            <div className="loader-toolbar">
                <div className="loader-search" />
                <div className="loader-toolbar-actions">
                    <div className="loader-tool" />
                    <div className="loader-tool" />
                    <div className="loader-tool" />
                    <div className="loader-tool" />
                </div>
            </div>
            <div className="loader-editor">
                <div className="loader-code">
                    <div className="loader-code-line loader-code-line-lg" />
                    <div className="loader-code-line loader-code-line-md" />
                    <div className="loader-code-line loader-code-line-sm" />
                    <div className="loader-code-line loader-code-line-md" />
                    <div className="loader-code-line loader-code-line-xs" />
                </div>
            </div>
        </div>
    );
}
