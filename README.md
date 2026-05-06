# W // SYAHBANII — DIGITAL ARCHIVE

A minimalist digital repository and portfolio built with a focus on brutalist aesthetics, interactive documentation, and technical logic. This project serves as a personal archive for experimental web works and creative sketches.

---

## 🖥️ PREVIEW

| HOME ARCHIVE | USER PROFILE | PLAYLIST INTERFACE |
| :---: | :---: | :---: |
| ![Home](screenshots/Screenshot%202026-05-06%20150722.jpg) | ![Profile](screenshots/Screenshot%202026-05-06%20150806.png) | ![Playlist](screenshots/Screenshot%202026-05-06%20150744.jpg) |

---

## 🛠️ TECHNICAL SPECIFICATIONS

This project is built using a **"Vanilla First"** approach, ensuring high performance (LCP) and clean code architecture without heavy frameworks.

- **Core:** HTML5, CSS3 (Custom Variables), Vanilla JavaScript (ES6+).
- **Tracking:** Google Analytics 4 (GA4) with custom event triggers for user interaction.
- **Interactions:** 
  - **Intersection Observer API** for smooth scroll reveal effects.
  - **Custom Cursor Logic** that reacts to interactive UI elements.
  - **Asynchronous Form Submission** via Formspree API (AJAX).
- **Design:** Monochrome Brutalism, Glitch Effects, Noise Overlay, and Scanline Animations.

---

## 🧪 KEY FEATURES

*   **Interactive Cursor:** A custom-built hardware-style cursor that changes state when hovering over links and frames.
*   **Persistent Cookie System:** A non-intrusive "Got It" cookie policy banner with state management via `document.cookie` (30-day expiry).
*   **Dynamic Gallery:** Image frames with automated hover-fade logic and grayscale-to-color transitions.
*   **Transmission System:** A fully functional contact form with custom success pop-up notifications and input validation.
*   **System Status Indicator:** Real-time clock and "System Ready" indicators to enhance the terminal-like experience.

---

## 📂 PROJECT STRUCTURE

```text
├── assets/
│   ├── about.html      # Personal profile & contact form
│   ├── myspotify.html   # Curated music soundscapes
│   └── myweb.html       # Web project showcase & portfolio.
├── css/
│   ├── index.css       # Core styling for home
│   └── about.css       # Optimized layout for internal pages
├── js/
│   ├── index.js        # Main interaction & GA triggers
│   └── about.js        # Form & Interaction logic for assets
├── img/                # Compressed visual assets & icons
└── index.html          # Main Entry point
