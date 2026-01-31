# JSON Forge

**JSON Forge** is a professional-grade JSON editor, validator, and visualizer built for developers who demand both aesthetics and functionality. It combines the power of the Monaco Editor (VS Code's engine) with an interactive graph visualization tool, all wrapped in a sleek, Vercel-inspired dark mode interface.

![JSON Forge Preview](https://json-forge-rose.vercel.app/json-forge-og-image.png)

## ✨ Features

### 🛠 Professional Editor
*   **Monaco Editor Integration**: Full-featured code editing experience with syntax highlighting, code folding, and line numbers.
*   **Real-time Validation**: Instant error detection with helpful inline error messages overlay.
*   **Custom Indentation**: Switch between 2 spaces, 4 spaces, or Tabs for formatting.

### 🕸 Interactive Graph Visualization
*   **Node-Based View**: Visualize complex nested JSON structures as an interactive tree graph.
*   **Navigation Controls**: Pan, zoom (scroll wheel supported), and "Fit to Screen" capabilities.
*   **Rich Tooltips**: Hover over nodes to see detailed paths, types, and values without cluttering the view.
*   **Collapsible Nodes**: Expand and collapse objects/arrays to focus on specific data sections.

### ⚡ utilities
*   **Format & Minify**: Instantly prettify messy JSON or minify it for production use.
*   **File Handling**: Seamlessly import `.json` files and export your edited work.
*   **Clipboard Integration**: One-click copy functionality.
*   **Live Statistics**: Real-time tracking of line count, character count, and file size (KB/MB).

### 🎨 Design & Experience
*   **Vercel-Inspired UI**: Minimalist, high-contrast dark theme designed for long coding sessions.
*   **ASCII Loader**: distinct, retro-terminal style loading screen.
*   **Offline Capable**: All processing is done client-side. Your data never leaves your browser.

## 🚀 Tech Stack

*   **Framework**: React 18
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Editor Engine**: `@monaco-editor/react`
*   **Icons**: `lucide-react`
*   **Build Tooling**: Vite (Recommended for local dev)

## 📦 Installation

To run this project locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/json-forge.git
    cd json-forge
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

## 🎮 Usage

1.  **Code View**: Paste your JSON or click "Import" to load a file. Use the toolbar to Format (Prettify) or Minify.
2.  **Graph View**: Switch modes using the toggle in the header. Use the mouse wheel to zoom in/out and click-drag to pan around the data structure. Hover over nodes for details.
3.  **Export**: Click "Export JSON" to save your work as a `.json` file.

## 📄 License

MIT License. Free to use for personal and commercial projects.