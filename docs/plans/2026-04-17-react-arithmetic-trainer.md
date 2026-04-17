# React Arithmetic Trainer Implementation Plan

> For Hermes: implement on a feature branch using TDD for behavior changes and feature logic.

Goal: Build a clean React website where the player solves arithmetic questions that get harder after each correct answer, with a reset button that returns difficulty to the easiest level.

Architecture: Use a small Vite + React app with one main page. Keep arithmetic generation logic in a dedicated utility module so it can be tested independently, and keep the UI in a single App component with minimal styling.

Tech Stack: React, Vite, Vitest, Testing Library, plain CSS.

---

## Tasks

1. Scaffold a minimal Vite React app in the repo root.
2. Add Vitest + Testing Library and a jsdom test config.
3. Write failing tests for arithmetic progression logic.
4. Implement the minimal arithmetic generator to satisfy the tests.
5. Write failing UI tests for answer submission, progression, feedback, and reset.
6. Implement the React UI and styles.
7. Run tests and a production build.
8. Commit on a feature branch and push for review.
