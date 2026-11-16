# NEXUS – Smart Calculator

<div align="center">

![NEXUS Smart Calculator](assets/favicon.svg)

**A premium, fully responsive, feature-complete calculator web app built with pure HTML5, CSS3, and Vanilla JavaScript.**

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![No eval()](https://img.shields.io/badge/eval()-Never%20Used-10b981)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)

</div>

---

## ✨ Features

### 🔢 Calculator Operations
- **Basic arithmetic**: Addition (+), Subtraction (−), Multiplication (×), Division (÷)
- **Advanced operations**: Exponentiation (^), Parentheses `( )` grouping
- **Percentage (%)** – converts the last number to its percentage value
- **Toggle sign (±)** – negate any number instantly
- **Decimal support** – full floating-point input with format guard
- **AC (All Clear)** – reset everything to initial state
- **DEL (Backspace)** – delete the last character
- **Chained calculations** – continue computing after pressing `=`
- **Ans button** – reuse the previous calculation result
- **Live preview** – see the result while you're still typing

### 🎨 UI / UX
- **Premium glassmorphism dark card** with frosted-glass backdrop filter
- **Purple / Blue accent gradient** design language throughout
- **Light ↔ Dark theme toggle** with smooth CSS transition
- **Smooth button animations**: hover lift, press scale, ripple click effect
- **Auto-scaling font size** on the display – never overflows
- **Operator color highlights** in the expression display
- **Status indicator dot** (green = ready, purple = active, red = error)
- **Copy result button** in the display header
- **Responsive design** – desktop, tablet, mobile optimized
- **Toast notifications** for copy, history, sound toggle events

### 📋 Calculation History
- **History panel** shows last 50 calculations with timestamps
- **Click any item** to load its result into the calculator
- **Per-item copy & delete** buttons
- **Clear all** history in one click
- **Persisted to `localStorage`** – survives page refreshes
- **History badge** shows unread/total count on the History button
- **Slide-in drawer** on mobile / persistent side panel on desktop

### ⌨️ Full Keyboard Support

| Key | Action |
|-----|--------|
| `0`–`9` | Input Numbers |
| `+` `-` `*` `/` | Operators |
| `Enter` or `=` | Calculate |
| `Backspace` | Delete Last Character |
| `Escape` or `c` | Clear All (AC) |
| `.` | Decimal Point |
| `%` | Percentage |
| `(` `)` | Parentheses |
| `^` | Exponent |
| `F9` | Toggle Sign (±) |
| `h` | Toggle History |
| `t` | Toggle Theme |
| `m` | Toggle Sound |
| `?` | Keyboard Shortcuts Help |

### ♿ Accessibility
- Full **ARIA labels** on all interactive controls
- **`aria-live` regions** for display updates (screen reader friendly)
- **Keyboard focus states** with visible `outline` on all focusable elements
- **Role attributes**: `grid`, `row`, `region`, `dialog`, `list`, `listitem`
- **Semantic HTML** throughout (`<header>`, `<main>`, `<aside>`, `<footer>`, `<nav>`)
- **Keyboard-navigable history list** (Tab + Enter)

### 🔊 Sound Effects
- Synthesized Web Audio API click tones per key type (num, op, equals, clear, del)
- Toggle on/off with the speaker button or press `M`
- State persisted to localStorage

### 🛡️ Safe Expression Engine — No eval()
> **NEXUS never uses JavaScript's `eval()` or `new Function()`.**

The expression evaluator is a hand-written **three-stage pipeline**:

```
Input String
    │
    ▼
1. Tokenizer         — Converts raw text to typed tokens (NUMBER, OPERATOR, LPAREN, RPAREN)
    │
    ▼
2. Shunting-Yard     — Converts infix token stream to Reverse Polish Notation (RPN)
    │
    ▼
3. RPN Stack Machine — Evaluates the RPN queue using a numeric stack
    │
    ▼
Result Number
```

- **Division by zero** is detected and shown gracefully
- **Floating-point noise** is eliminated with `toPrecision(12)`
- **Invalid expressions** show a friendly error without crashing

---

## 📁 Project Structure

```
calculator/
├── index.html          # Semantic HTML5 markup, full layout
├── css/
│   └── style.css       # CSS3 — Custom Properties, Glassmorphism, Themes, Animations
├── js/
│   └── script.js       # Vanilla JS — Tokenizer, Shunting-Yard, State, UI, Events
├── assets/
│   └── favicon.svg     # Custom SVG favicon with gradient design
└── README.md           # This file
```

---

## 🚀 Quick Start

NEXUS is a **pure static web app** — no build tools, no package manager, no server required.

### Option 1: Open Directly (Simple)
```
1. Download or clone this repository.
2. Open index.html in any modern browser.
```

### Option 2: Local Dev Server (Recommended)

Using Python:
```bash
python -m http.server 8080
# Then visit: http://localhost:8080
```

Using Node.js / npx:
```bash
npx serve .
# or
npx http-server . -p 8080
```

Using VS Code:
- Install the **Live Server** extension and click **Go Live**.

---

## 🛠️ Technologies Used

| Technology | Version | Purpose |
|------------|---------|---------|
| **HTML5** | Latest | Semantic markup, ARIA, form controls |
| **CSS3** | Latest | Custom Properties, Grid, Flexbox, Glassmorphism, Animations |
| **JavaScript** | ES2020+ | No frameworks — pure vanilla JS, Web Audio API |
| **localStorage** | Web API | Theme & history persistence |
| **Clipboard API** | Web API | Copy result to clipboard |
| **Web Audio API** | Web API | Synthesized click sound effects |

---

## 🌐 Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Chrome / Edge | 88+ |
| Firefox | 85+ |
| Safari | 14+ |
| iOS Safari | 14+ |
| Samsung Internet | 14+ |

> **Note**: Web Audio API and `backdrop-filter` (glassmorphism blur) may have limited support on some older mobile browsers, but all calculator functionality works without them.

---

## 🎨 Design System

### Color Palette

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| Accent Primary | `#6366f1` | `#4f46e5` | Operators, equals gradient, focus |
| Accent Secondary | `#8b5cf6` | `#7c3aed` | Gradient midpoint |
| Accent Cyan | `#06b6d4` | — | Status dot, decorative |
| Error Red | `#ef4444` | `#dc2626` | AC button, error state |

### Typography
- **UI Font**: System sans-serif stack (`Inter` preferred via system font cascade)
- **Display Font**: System monospace stack (`JetBrains Mono` preferred) for expression/value

---

## 📝 License

MIT License — free to use, modify, and distribute.

---

<div align="center">
  Built with 💜 as a pure HTML/CSS/JS showcase — zero dependencies, zero eval().
</div>
