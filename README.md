# JSON Forge

**JSON Forge** is a high-performance, professional-grade JSON editor, validator, and visualizer built for developers who handle complex data structures. It combines the power of the Monaco Editor (VS Code's engine) with an interactive, lazy-loaded graph visualization tool, all wrapped in a sleek, Vercel-inspired interface.

![JSON Forge Preview](https://json-forge-rose.vercel.app/json-forge-og-image.png)

## ✨ Key Features

### 🛠 Professional Editor Environment
*   **Monaco Editor Integration**: Full-featured code editing with syntax highlighting, code folding, and smart indentation.
*   **Real-time Validation**: Instant syntax checking with a dedicated status bar indicator and error overlay.
*   **Smart Formatting**: Toggle between 2 spaces, 4 spaces, or Tabs. One-click Prettify and Minify.
*   **Safe Large File Handling**: Implements input debouncing (800ms) to ensure the UI remains responsive even when editing files with 10k+ lines.

### 🕸 High-Performance Graph Visualization
*   **Interactive Tree**: Visualize deeply nested JSON structures as a navigable node graph.
*   **Search & Focus**: Powerful search within the graph view. Matches are highlighted, and navigation controls allow you to cycle through results, automatically panning to and centering the active node.
*   **Smart Navigation**: Smooth Pan & Zoom (0.3x to 3x) with mouse wheel support. Double-click any node to focus and center it, or use the "Fit to Screen" utility.
*   **Lazy Loading & Pagination**: Automatically limits rendering to the first 50 items of large arrays/objects to prevent DOM explosions. Includes "Show More" functionality for massive datasets.
*   **Rich Tooltips**: Hover over nodes to inspect values, types, and full property paths (`data.users[0].id`) without expanding the tree.

### 📊 Live Statistics & Utilities
*   **Real-time Stats**: Always-visible status bar tracking Line Count, Character Count, and Memory Size.
*   **File Operations**: Drag-and-drop import for `.json` files and one-click export.
*   **Clipboard Manager**: Integrated copy functionality with success feedback.

### 🎨 Design System
*   **Theme Support**: Toggle between a sleek Dark Mode and a crisp Light Mode to suit your environment.
*   **Vercel-Inspired UI**: Minimalist, high-contrast interface optimized for focus.
*   **Responsive**: Adaptive layout that works on desktop and tablets.
*   **ASCII Loader**: Retro-terminal style loading sequence for a distinct developer experience.

## 🚀 Performance Strategy

JSON Forge is engineered to handle large datasets that crash typical web-based formatters:

1.  **Debounced Parsing**: Heavy operations (Stats calculation, Graph generation, Validation) are debounced. You can type freely without lag; computations only trigger when you stop typing.
2.  **Graph Virtualization/Pagination**: The Graph View does not attempt to render 10,000 nodes at once. It employs a budget system, expanding only the first ~50 nodes initially and paginating large arrays to keep the DOM light.

## 🛠 Tech Stack

*   **Core**: React 19, TypeScript, Next.js (App Router)
*   **UI**: shadcn/ui (Radix primitives), Tailwind CSS v4
*   **Editor**: `@monaco-editor/react`
*   **Icons**: `@hugeicons/react`
*   **AI**: `@google/genai` (Gemini)
*   **State**: React Hooks (Context, Memo, UseState)

## 📦 Installation

To run JSON Forge locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/phalla-doll/json-forge.git
    cd json-forge
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Start the development server**
    ```bash
    pnpm dev
    ```

4.  **Build for production**
    ```bash
    pnpm build
    ```

## 📂 Project Structure

```
app/
├── layout.tsx           # Root layout (ThemeProvider, Toaster, fonts)
├── page.tsx             # Main application (client component)
├── loading.tsx          # ASCII pre-React loader
├── globals.css          # Tailwind + theme tokens
└── api/ai/              # Server-side Gemini route handlers
components/
├── ui/                  # shadcn/ui primitives (Button, Dialog, etc.)
├── json-editor.tsx      # Monaco Editor wrapper (dynamic import)
├── json-tree-view.tsx   # Tree visualization
├── json-table-view.tsx  # Table visualization
├── toolbar.tsx          # Actions (Format, Minify, etc.)
├── status-bar.tsx       # Footer stats and validation
└── ...
lib/
├── ai.ts                # Gemini AI helpers
└── utils.ts             # Helpers (cn, stats, file I/O)
types.ts                 # TypeScript definitions
```

## 📄 License

MIT License. Open source and free to use for personal and commercial projects.