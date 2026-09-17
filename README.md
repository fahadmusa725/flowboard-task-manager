# Flowboard — Focus-Driven Task Manager

> **Auspify Technologies Internship — Task 3 (Dynamic To-Do Application)**

A polished, JavaScript-powered task manager built for **Flowboard**. Goes beyond a basic add/delete list with priority levels, filtering, smooth animations, and full `localStorage` persistence — styled to match the same dark, glassmorphic design system as the rest of the portfolio.

![Status](https://img.shields.io/badge/status-complete-brightgreen) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## Live Demo
[flowboard-todoapp.netlify.app](https://flowboard-todoapp.netlify.app)

## Features

- **Add / Delete / Complete tasks** with smooth enter, exit, and completion animations
- **Priority levels** — Low, Medium, High — with color-coded indicators
- **Filter tabs** — All / Active / Completed — with live count badges
- **Full `localStorage` persistence** — tasks, priorities, and completion state survive page reloads
- **Designed empty states** for every filter view (not a blank screen)
- **Search** to instantly filter tasks by name
- **Drag-and-drop reordering** (desktop)
- **Undo toast** on delete with a short grace period before permanent removal
- **Inline editing** — double-click any task to edit in place
- **Keyboard shortcut** (`Ctrl/⌘ + K`) to jump straight to the input field
- No `alert()`/`confirm()` popups anywhere — all feedback is inline UI

## Design System

Shares the same visual language as [PulseTrack](#) for portfolio consistency:

| Token | Value |
|---|---|
| Background | `#070A0F` |
| Accent Gradient | `#22D3EE` → `#3B82F6` → `#6366F1` |
| Priority Colors | Low `#06B6D4` · Medium `#F59E0B` · High `#EF4444` |
| Font | Plus Jakarta Sans |

## Project Structure

```
Flowboard/
├── index.html    # Semantic HTML5 markup
├── style.css     # Design system, glassmorphism, animations, responsive layout
└── app.js        # Task state management, localStorage, filters, drag-and-drop
```

## Running Locally

No build step or dependencies required.

```bash
python -m http.server 3000
# or
npx serve .
```

Then open `http://localhost:3000` in your browser.

## Built With

- HTML5
- CSS3 (Grid, Flexbox, keyframe animations, `backdrop-filter`)
- Vanilla JavaScript (event delegation, `localStorage`, HTML5 Drag & Drop API)

---

**Part of a 4-project internship submission for Auspify Technologies.**
See also: [PulseTrack](#) · [Skyline](#) · [Cadence](#)
