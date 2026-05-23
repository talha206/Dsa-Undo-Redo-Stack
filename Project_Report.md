# University Name
## Department Name
**Course:** Data Structures and Algorithms (DSA)  
**Project Title:** Undo/Redo Text Editor with Syntax Checker  

**Submitted By:**  
Student Name(s) & Registration Number(s)  

**Submitted To:**  
Instructor Name  

**Semester:** _______________  
**Submission Date:** May 23, 2026  

---

# DSA Term Project

## Abstract

This project implements a full-stack **Undo/Redo Text Editor with Syntax Checker** to demonstrate core **stack** data structures in a practical application. The **backend** is written in **C++** using `std::stack` for undo/redo history and bracket validation, exposed through a REST API via **cpp-httplib**. The **frontend** is a **React (Vite)** web application styled with **Tailwind CSS**, communicating with the server over JSON. The user can edit text, undo and redo changes, check bracket balance `()`, `[]`, `{}`, and view a **Stack Visualizer** that shows the contents of the undo and redo stacks in real time. Expected outcomes include correct stack-based undo/redo behavior, accurate bracket checking with error messages, and a clear visual demonstration suitable for DSA coursework and demonstration.

---

## 0.1 Introduction

Text editors are among the most common software tools. Behind familiar features such as **Undo** and **Redo** lie fundamental data structures—especially the **stack** (Last-In, First-Out). Similarly, validating nested brackets in code or expressions is a classic stack application.

This project combines both ideas in a single system: a code-style editor where every edit updates an undo stack, undo/redo move snapshots between two stacks, and a syntax checker uses a third stack to verify bracket balance. A React frontend makes the internal stacks **visible** to the user, which supports learning and grading by showing how push/pop operations affect editor state.

The system is split into a **C++ HTTP server** (port 8080) and a **React client** (port 5173), connected through REST endpoints. No database is used; all state is held in memory on the server using C++ stacks.

---

## 0.2 Problem Statement

Manual tracking of edit history and bracket matching is error-prone. Students need a concrete system that:

1. Stores each previous version of text when the user types, so earlier states can be restored (**undo**).
2. Preserves “undone” states so the user can move forward again (**redo**).
3. Clears the redo history when new typing occurs after an undo (standard editor behavior).
4. Checks whether parentheses, square brackets, and curly braces are properly nested and reports the first error with position information.
5. Presents stack contents visually so the relationship between UI actions and stack operations is clear.

Without a structured approach using stacks, undo/redo and bracket checking become difficult to implement correctly and to explain in a DSA course context.

---

## 0.3 Objectives

- **Objective 1:** Implement `EditorBuffer` using **two `std::stack<std::string>`** objects (`undoStack`, `redoStack`) and a `currentText` string, with `type()`, `undo()`, `redo()`, and size accessors.
- **Objective 2:** Implement `SyntaxChecker` using **one `std::stack<char>`** to verify balanced `()`, `[]`, and `{}`, with detailed error messages and a bracket trace for the UI.
- **Objective 3:** Build an HTTP server in C++ (cpp-httplib) exposing REST endpoints for typing, undo, redo, state, and syntax check, with JSON request/response bodies (nlohmann/json).
- **Objective 4:** Develop a dark-themed React frontend with editor, undo/redo controls, syntax checker panel, and a **Stack Visualizer** showing up to five truncated snapshots per stack.
- **Objective 5:** Integrate frontend and backend via Vite proxy (`/api` → `127.0.0.1:8080`) and verify end-to-end operation on Windows (MSYS2 UCRT64 toolchain).

---

## 0.4 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR1 | User can type in a monospace editor; each change sends full buffer text to the server (`POST /type`). |
| FR2 | **Undo** restores the previous snapshot; **Redo** restores a undone snapshot; buttons disable when the corresponding stack is empty. |
| FR3 | After `type()`, the **redo stack must be cleared** while the previous `currentText` is pushed onto the undo stack. |
| FR4 | User can run **Check syntax**; server returns `balanced` (true/false), `message`, and `brackets[]` for the bracket tracker. |
| FR5 | UI displays character count, line count, undo/redo stack sizes, and status badge (balanced / unbalanced / not checked). |
| FR6 | **Stack Visualizer** shows up to 5 preview boxes per stack (20 characters each), newest at top, with CSS transitions on updates. |
| FR7 | Server listens on **port 8080**; CORS headers allow browser access; Vite dev server proxies `/api` to the backend. |

---

## 0.5 System Architecture

The application follows a **client–server** architecture. The browser runs the React SPA; the C++ process owns all editor and syntax state in RAM.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + Vite, port 5173)                          │
│  • Textarea, Undo/Redo, Syntax panel, Stack Visualizer        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP JSON  (/api → proxy)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  C++ Server (cpp-httplib, port 8080)                        │
│  • EditorBuffer  → undoStack, redoStack (stack<string>)     │
│  • SyntaxChecker → stack<char> for brackets                 │
└─────────────────────────────────────────────────────────────┘
```

**Figure 1 — High-level system architecture**  
*(Insert architecture diagram here if required by instructor.)*

### Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 6, Tailwind CSS 3 |
| Backend | C++17, cpp-httplib, nlohmann/json |
| Build (Windows) | MSYS2 UCRT64, g++, `-lpthread -lws2_32` |
| Communication | REST, JSON |

---

## 0.6 Data Structures and Algorithms Design

### 0.6.1 EditorBuffer — dual stacks for undo/redo

**Data members:**

- `std::stack<std::string> undoStack_` — previous text snapshots  
- `std::stack<std::string> redoStack_` — snapshots available after undo  
- `std::string currentText_` — current editor content  

**Operations:**

| Operation | Stack behavior |
|-----------|----------------|
| `type(newText)` | Push `currentText_` onto **undo**; clear **redo**; set `currentText_ = newText` |
| `undo()` | If undo non-empty: push `currentText_` onto **redo**; pop undo into `currentText_` |
| `redo()` | If redo non-empty: push `currentText_` onto **undo**; pop redo into `currentText_` |

**Time complexity:** Each operation is **O(1)** for stack push/pop; storing full strings uses **O(n)** space per snapshot where *n* is text length.

### 0.6.2 SyntaxChecker — single stack for brackets

For each character in the input string:

- If opening `(`, `[`, `{` → **push** onto `std::stack<char>`.
- If closing `)`, `]`, `}` → if stack empty or top does not match → **invalid**; else **pop**.
- After scan: stack must be **empty** for balanced input.

`getDetailedResult()` returns messages such as:

- `All brackets balanced!`
- `Error at position i: found ']' but expected ')'`
- `Error: unclosed '(' — missing ')'`

### 0.6.3 REST API (replaces database layer)

| Method | Endpoint | Request body | Response |
|--------|----------|--------------|----------|
| POST | `/type` | `{"text":"..."}` | `text`, `undoSize`, `redoSize`, `undoStack[]`, `redoStack[]` |
| POST | `/undo` | — | same |
| POST | `/redo` | — | same |
| GET | `/state` | — | same |
| POST | `/check` | `{"code":"..."}` | `balanced`, `message`, `brackets[]` |

**Example — type request:**

```json
POST /type
{ "text": "hello world" }
```

**Example — type response:**

```json
{
  "text": "hello world",
  "undoSize": 12,
  "redoSize": 0,
  "undoStack": ["hello worl", "hello wor", "hello wo", "hello w", "hello"],
  "redoStack": []
}
```

**Example — syntax check (unbalanced):**

```json
POST /check
{ "code": "(hello wo" }

Response:
{
  "balanced": false,
  "message": "Error: unclosed '(' — missing ')'",
  "brackets": [
    { "bracket": "(", "position": 0, "matched": false, "pairPosition": -1 }
  ]
}
```

---

## 0.7 User Interface Screenshots with Related API Operations

*Insert the screenshots below into your final PDF/Word report. Image files from this project session are in the `assets` folder or use your own `Screenshot_*.png` files.*

---

### Screen 1 — Backend server running

**Description:** C++ server compiled and started in **MSYS2 UCRT64**. The process listens on `http://127.0.0.1:8080`, confirming the backend is ready before starting the frontend.

**Figure 2 — Backend terminal: `./server.exe` listening on port 8080**  
*(Insert: UCRT64 terminal screenshot showing “DSA Editor backend listening on http://127.0.0.1:8080”)*

**Related operation:** Server startup (no HTTP call). Client later uses `GET /state` on load.

---

### Screen 2 — Initial editor UI

**Description:** Main window with empty editor, undo/redo controls (stacks size 0), syntax checker, and empty Stack Visualizer panels.

**Figure 3 — DSA Editor initial state**  
*(Insert: empty editor screenshot, “Syntax: not checked”, both stacks empty)*

**Related API:**

```
GET /api/state
→ { "text": "", "undoSize": 0, "redoSize": 0, "undoStack": [], "redoStack": [] }
```

---

### Screen 3 — Editing and stack visualizer (undo/redo in action)

**Description:** User typed `hello wo` (partial word). **Undo stack: 24**, **Redo stack: 5**. Visualizer shows truncated snapshots (e.g. `hello w`, `hello`, `hell` on undo; `hello wor`, `hello world` on redo). Demonstrates that each keystroke pushes a snapshot and that redo holds states after partial undos.

**Figure 4 — Editor with active undo/redo stacks**  
*(Insert: screenshot with text “hello wo”, Undo stack 24, Redo stack 5, filled stack boxes)*

**Related API:**

```
POST /api/type
Body: { "text": "hello wo" }

POST /api/undo   (when user clicks Undo)
POST /api/redo   (when user clicks Redo)
```

---

### Screen 4 — Syntax checker (unbalanced brackets)

**Description:** Text `(hello wo` has an unclosed `(`. Status badge shows **Unbalanced**. Error: `Error: unclosed '(' — missing ')'`. Bracket tracker shows `( @0` with status **NO**.

**Figure 5 — Syntax checker detecting unclosed parenthesis**  
*(Insert: screenshot with red error box and bracket tracker)*

**Related API:**

```
POST /api/check
Body: { "code": "(hello wo" }

Response:
{
  "balanced": false,
  "message": "Error: unclosed '(' — missing ')'",
  "brackets": [ { "bracket": "(", "position": 0, "matched": false, "pairPosition": -1 } ]
}
```

---

## 0.8 Implementation Details

### Project structure

```
dsa project/
├── backend/
│   ├── main.cpp       # HTTP server, routes, JSON
│   ├── editor.h       # EditorBuffer class
│   ├── syntax.h       # SyntaxChecker class
│   ├── httplib.h      # cpp-httplib (header-only)
│   └── json.hpp       # nlohmann/json
├── frontend/
│   ├── src/App.jsx    # Main UI
│   ├── src/main.jsx
│   └── vite.config.js # Proxy /api → 127.0.0.1:8080
└── README.md
```

### Key backend classes (C++)

- **`EditorBuffer`** (`editor.h`): `type`, `undo`, `redo`, `getText`, `undoSize`, `redoSize`, `undoStackPreviews`, `redoStackPreviews`.
- **`SyntaxChecker`** (`syntax.h`): `checkBrackets`, `getDetailedResult`, `getBracketTrace`.

### Frontend behavior

- On each textarea `onChange`, `POST /type` with full text.
- Undo/Redo buttons call `POST /undo` and `POST /redo` and refresh textarea + stack display.
- **Check syntax** calls `POST /check` and updates badge, message box, and bracket chips.
- Stack Visualizer renders `undoStack` and `redoStack` arrays from server JSON.

### Build and run (Windows)

```bash
# Terminal 1 — MSYS2 UCRT64
cd "/d/talha/dsa project/backend"
g++ -std=c++17 -o server.exe main.cpp -lpthread -lws2_32
./server.exe

# Terminal 2 — PowerShell
cd "D:\talha\dsa project\frontend"
npm install
npm run dev
# Open http://localhost:5173 (or 5174 if port busy)
```

---

## 0.9 Testing and Results

| Test case | Input / action | Expected result | Observed |
|-----------|----------------|-----------------|----------|
| T1 | Empty editor, load page | undo/redo disabled, stacks 0 | Pass |
| T2 | Type characters | undoSize increases, redo cleared | Pass |
| T3 | Undo | Text reverts, redoSize increases | Pass |
| T4 | Redo | Text restored, undoSize increases | Pass |
| T5 | `()` `[]` `{}` balanced | `balanced: true` | Pass |
| T6 | `(hello wo` | Unbalanced, error message, `( @0 NO` | Pass |
| T7 | Backend stopped | Proxy ECONNREFUSED until server restarted | Expected |

---

## 0.10 Conclusion

This project successfully demonstrates **stack** data structures in a full-stack text editor. The **EditorBuffer** uses two stacks to implement industry-standard undo/redo semantics, including clearing the redo stack on new input after an undo. The **SyntaxChecker** uses a single character stack to validate bracket nesting and provide educational feedback. The React frontend highlights stack contents through the **Stack Visualizer**, making abstract push/pop operations tangible for demonstration and assessment.

**Learning outcomes:**

- Practical use of `std::stack` in C++ for non-trivial application logic.  
- Client–server design with REST and JSON.  
- Mapping UI events (keystrokes, buttons) to API calls and stack updates.  
- Debugging integration issues (compiler toolchain, IPv4 proxy, server must stay running).

Future enhancements could include debouncing `/type` requests, persistent file save, or syntax highlighting; the current scope focuses on core DSA requirements.

---

## 0.11 References

- Cormen, T. H., et al. *Introduction to Algorithms* — stack operations (Chapter on elementary data structures).  
- cppreference.com — `std::stack` documentation.  
- [cpp-httplib](https://github.com/yhirose/cpp-httplib) — HTTP server library.  
- [nlohmann/json](https://github.com/nlohmann/json) — JSON for Modern C++.  
- [React documentation](https://react.dev/) — UI components and hooks.  
- [Vite documentation](https://vite.dev/) — dev server and proxy configuration.  
- [Tailwind CSS](https://tailwindcss.com/) — utility-first styling.  
- Course lecture notes on **stacks**, **LIFO**, and **bracket matching**.

---

*End of report*
