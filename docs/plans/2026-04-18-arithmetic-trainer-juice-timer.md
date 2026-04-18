# Arithmetic Trainer Juice + Timer Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: Add more game feel to the arithmetic trainer with a visible countdown timer, stronger streak progression, and richer feedback/juice.

Architecture: Keep the game as a single React component for now, but add a small amount of game state for timing, best streak tracking, and streak milestone feedback. Keep problem generation in the existing arithmetic helper and focus the feature work in App.jsx, App.test.jsx, and styles.css.

Tech Stack: React 18, Vite, Vitest, Testing Library, CSS animations.

---

## Intended feature scope

1. Add a per-problem countdown timer that resets on each new problem.
2. If the timer expires, treat it as a miss: streak resets, level drops by one, and the next problem appears.
3. Add visible timer UI with urgency styling when time is low.
4. Add stronger streak progression:
   - current streak
   - best streak
   - streak milestone messaging / combo feel
5. Add more visual juice:
   - stronger success state
   - stronger error/timeout state
   - combo/streak visual emphasis
   - progress/tension styling for the timer
6. Update tests to cover timer expiry and enhanced streak behavior.

## Files expected

- Modify: src/App.jsx
- Modify: src/App.test.jsx
- Modify: src/styles.css

## Implementation notes for delegating subagent

- Keep the existing user flow simple: answer -> check -> feedback -> next problem.
- Avoid adding external dependencies.
- Keep the game deterministic enough for tests.
- Prefer extracting tiny pure helpers inside App.jsx only if they clearly improve readability.
- Do not change package-lock.json unless absolutely required.
- Do not commit.

## Acceptance criteria

- A timer is visible on screen.
- The timer resets on each new problem.
- Timeout behaves like a wrong answer with its own message/feedback state.
- Best streak is displayed and increases when the current streak beats it.
- A streak milestone feel is visible (message and/or styling) as the streak grows.
- Existing correct/wrong flows still work.
- Tests pass.
- Build passes.
