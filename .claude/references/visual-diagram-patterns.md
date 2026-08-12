# Visual Diagram Patterns Reference

Reference for generating self-contained HTML diagram pages. Used by `/explain visual`, `/explain flow`, and `/diff-review`.

**Design language: "Clean Docs"** — light-first, high contrast, editorial typography, progressive disclosure. Content readable without knowing the code.

---

## Output Rules

- **Location:** Save all HTML files to `~/Desktop/`
- **Naming:** `<descriptive-kebab-name>.html` (e.g., `sms-domain-flow.html`, `sprint-7-diff-review.html`)
- **Open:** After saving, run `open <filepath>` to launch in default browser (macOS)
- **Self-contained:** All CSS and JS inline. Only external deps: Mermaid CDN + Google Fonts.

---

## Google Fonts (Required)

Always include this in `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## Mermaid Configuration

Use `theme: 'base'` with a palette that adapts to light/dark. Include the dark-mode detection script:

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: isDark ? {
      primaryColor: '#312e81',
      primaryTextColor: '#e0e7ff',
      primaryBorderColor: '#4338ca',
      lineColor: '#6366f1',
      secondaryColor: '#1e1b4b',
      tertiaryColor: '#312e81',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '14px'
    } : {
      primaryColor: '#eef2ff',
      primaryTextColor: '#1e1b4b',
      primaryBorderColor: '#a5b4fc',
      lineColor: '#4f46e5',
      secondaryColor: '#e0e7ff',
      tertiaryColor: '#eef2ff',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '14px'
    }
  });
</script>
```

### Diagram Types
| Content | Mermaid Type |
|---------|-------------|
| Data/control flow | `flowchart TD` or `flowchart LR` |
| Request lifecycle | `sequenceDiagram` |
| Status transitions | `stateDiagram-v2` |
| Module dependencies | `flowchart LR` with subgraphs |

### Mermaid Node Labels
Use plain language — no function names or code in node labels:
```
Good: "Gather job info"
Bad:  "assembleWorkOrderContext()"
```

### Mermaid Node Styling
Apply these styles at the bottom of every Mermaid diagram:
```
style nodeId fill:#eef2ff,stroke:#4f46e5,color:#1e1b4b,stroke-width:2px
```
- Active/highlight nodes: `stroke:#4f46e5` (indigo)
- Success nodes: `stroke:#059669` (emerald)
- Warning/gate nodes: `stroke:#ea580c` (orange)
- Terminal/END nodes: `fill:#f5f5f4,stroke:#a8a29e,color:#78716c`
- Start nodes: `fill:#4f46e5,stroke:#4f46e5,color:#ffffff`

---

## CSS Theme System

### Light Mode (Default)

```css
:root {
  /* Surfaces — warm white */
  --bg-base: #fafaf9;
  --bg-primary: #ffffff;
  --bg-elevated: #f5f5f4;

  /* Text — high contrast */
  --text-primary: #1c1917;
  --text-secondary: #44403c;
  --text-muted: #78716c;

  /* Borders */
  --border: rgba(28, 25, 23, 0.1);
  --border-strong: rgba(28, 25, 23, 0.2);

  /* Accents — indigo */
  --accent: #4f46e5;
  --accent-hover: #4338ca;
  --accent-dim: rgba(79, 70, 229, 0.08);
  --accent-glow: rgba(79, 70, 229, 0.04);

  /* Semantic */
  --success: #059669;
  --success-dim: rgba(5, 150, 105, 0.08);
  --warning: #ea580c;
  --warning-dim: rgba(234, 88, 12, 0.08);
  --danger: #dc2626;
  --danger-dim: rgba(220, 38, 38, 0.08);
  --info: #0891b2;
  --info-dim: rgba(8, 145, 178, 0.08);

  /* Effects */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03);
  --shadow-elevated: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04);
}
```

### Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-base: #0c0a09;
    --bg-primary: #1c1917;
    --bg-elevated: #292524;

    --text-primary: #fafaf9;
    --text-secondary: #d4d4d4;
    --text-muted: #a8a29e;

    --border: rgba(168, 162, 158, 0.12);
    --border-strong: rgba(168, 162, 158, 0.25);

    --accent: #818cf8;
    --accent-hover: #6366f1;
    --accent-dim: rgba(129, 140, 248, 0.12);
    --accent-glow: rgba(129, 140, 248, 0.06);

    --success: #34d399;
    --success-dim: rgba(52, 211, 153, 0.12);
    --warning: #fb923c;
    --warning-dim: rgba(251, 146, 60, 0.12);
    --danger: #f87171;
    --danger-dim: rgba(248, 113, 113, 0.12);
    --info: #22d3ee;
    --info-dim: rgba(34, 211, 238, 0.12);

    --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2);
    --shadow-elevated: 0 4px 12px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.3);
  }
}
```

---

## Typography

```css
body {
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: var(--text-primary);
  font-optical-sizing: auto;
}

h1 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: 2.5rem;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

h2, h3 {
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  color: var(--text-primary);
}

h2 {
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  margin-top: 3rem;
  margin-bottom: 1rem;
}

h3 {
  font-size: 1.15rem;
  letter-spacing: -0.01em;
}

code, pre, .mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.825em;
}
```

---

## Lead Summary

Larger summary text directly under the title. Used for the one-sentence plain-language summary.

```css
.lead {
  font-size: 1.2rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 2.5rem;
  max-width: 640px;
}
```

---

## Card Patterns

### Solid Card (Primary)

```css
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-card);
}

.card-header {
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.01em;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
```

### Card Grid

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
  margin: 1.5rem 0;
}
```

---

## Steps (Numbered Walkthrough)

Ordered list with counter-reset for numbered prose walkthrough. Replaces card-grid for `/explain visual` walkthroughs.

```css
.steps {
  list-style: none;
  counter-reset: step-counter;
  padding: 0;
  margin: 1.5rem 0;
}

.steps > li {
  counter-increment: step-counter;
  position: relative;
  padding: 1.25rem 1.5rem 1.25rem 4rem;
  margin-bottom: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
}

.steps > li::before {
  content: counter(step-counter);
  position: absolute;
  left: 1.25rem;
  top: 1.25rem;
  width: 1.75rem;
  height: 1.75rem;
  background: var(--accent);
  color: #ffffff;
  font-family: 'DM Sans', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.steps > li > strong {
  display: block;
  font-size: 1.05rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.steps > li > p {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}
```

---

## Progressive Disclosure (Technical Details)

Code references, function names, file paths, and invariant tags go inside `<details>` blocks:

```css
.steps details,
details.technical {
  margin-top: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  font-size: 0.875rem;
}

.steps details summary,
details.technical summary {
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 0.8rem;
  padding: 0.5rem 1rem;
  background: var(--bg-elevated);
  color: var(--text-muted);
  transition: background 0.15s ease;
}

.steps details summary:hover,
details.technical summary:hover {
  background: var(--accent-dim);
  color: var(--accent);
}

.steps details[open] summary,
details.technical[open] summary {
  border-bottom: 1px solid var(--border);
}

.steps details > div,
details.technical > div {
  padding: 0.75rem 1rem;
}
```

---

## Diagram Container

```css
.diagram-container {
  background: var(--bg-primary);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  padding: 2rem;
  margin: 1.5rem 0;
  overflow-x: auto;
}
```

---

## Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.badge-accent { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(79,70,229,0.2); }
.badge-success { background: var(--success-dim); color: var(--success); border: 1px solid rgba(5,150,105,0.2); }
.badge-warning { background: var(--warning-dim); color: var(--warning); border: 1px solid rgba(234,88,12,0.2); }
.badge-danger { background: var(--danger-dim); color: var(--danger); border: 1px solid rgba(220,38,38,0.2); }
.badge-info { background: var(--info-dim); color: var(--info); border: 1px solid rgba(8,145,178,0.2); }
```

---

## Callout

```css
.callout {
  background: var(--accent-dim);
  border: 1px solid rgba(79,70,229,0.15);
  border-left: 3px solid var(--accent);
  border-radius: 0 10px 10px 0;
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
}

.callout-warning {
  background: var(--warning-dim);
  border-color: rgba(234,88,12,0.15);
  border-left-color: var(--warning);
}

.callout-danger {
  background: var(--danger-dim);
  border-color: rgba(220,38,38,0.15);
  border-left-color: var(--danger);
}
```

---

## Tables

```css
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1.5rem 0;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

thead {
  background: var(--bg-elevated);
}

th {
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border-strong);
}

td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

tbody tr:last-child td { border-bottom: none; }

tbody tr:hover td {
  background: var(--accent-glow);
  color: var(--text-primary);
}
```

---

## KPI Dashboard (for /diff-review)

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.kpi-card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  box-shadow: var(--shadow-card);
}

.kpi-value {
  font-family: 'Instrument Serif', serif;
  font-size: 2rem;
  color: var(--accent);
  line-height: 1.2;
}

.kpi-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 0.5rem;
}
```

---

## Diff Panels (for /diff-review)

```css
.diff-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin: 1.5rem 0;
}

.diff-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.diff-panel-header {
  padding: 0.75rem 1.25rem;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
}

.diff-before .diff-panel-header {
  color: var(--danger);
  background: var(--danger-dim);
}

.diff-after .diff-panel-header {
  color: var(--success);
  background: var(--success-dim);
}

.diff-panel pre {
  padding: 1.25rem;
  margin: 0;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.6;
}
```

---

## Code Blocks

```css
code {
  font-family: 'IBM Plex Mono', monospace;
  background: var(--accent-dim);
  padding: 0.15rem 0.45rem;
  border-radius: 5px;
  font-size: 0.825em;
  color: var(--accent);
}

pre {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem;
  overflow-x: auto;
  line-height: 1.6;
}

pre code {
  background: none;
  padding: 0;
  color: var(--text-primary);
}
```

---

## Collapsible Sections

```css
details {
  margin: 1rem 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

details summary {
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.875rem 1.25rem;
  background: var(--bg-elevated);
  color: var(--text-primary);
  transition: background 0.15s ease;
}

details summary:hover {
  background: var(--accent-dim);
  color: var(--accent);
}

details[open] summary {
  border-bottom: 1px solid var(--border);
}

details > div {
  padding: 1.25rem;
}
```

---

## Footer

```css
.footer {
  margin-top: 4rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.75rem;
  text-align: center;
  letter-spacing: 0.03em;
}
```

---

## Quality Checklist

Before delivering any HTML diagram, verify:

- [ ] **Squint test:** Is the visual hierarchy visible when you blur your eyes?
- [ ] **Both themes:** Does it look good in both dark and light mode?
- [ ] **Fonts loaded:** Instrument Serif + DM Sans + IBM Plex Mono all rendering
- [ ] **Mermaid renders:** All diagrams display without errors
- [ ] **No console errors:** Open DevTools, check console is clean
- [ ] **Self-contained:** File works when opened directly (no missing assets beyond CDN)
- [ ] **Responsive:** Content reflows reasonably on narrower windows
- [ ] **File saved:** Written to `~/Desktop/` with descriptive filename
- [ ] **Human-readable:** Every heading and paragraph readable without knowing the code
