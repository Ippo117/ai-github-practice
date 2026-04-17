import { useMemo, useState } from 'react';
import { createProblem } from './lib/arithmetic';

function buildProblem(level) {
  return createProblem(level);
}

export default function App() {
  const [level, setLevel] = useState(0);
  const [problem, setProblem] = useState(() => buildProblem(0));
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('Solve the problem to level up.');
  const [streak, setStreak] = useState(0);
  const [feedbackState, setFeedbackState] = useState('idle');

  const displayLevel = useMemo(() => level + 1, [level]);
  const cardClassName = [
    'card',
    streak > 0 ? 'streak-active' : '',
    feedbackState === 'success' ? 'success-pop' : '',
    feedbackState === 'error' ? 'shake' : ''
  ]
    .filter(Boolean)
    .join(' ');

  function submitAnswer(event) {
    event.preventDefault();

    const numericAnswer = Number(answer);

    if (numericAnswer === problem.answer) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setProblem(buildProblem(nextLevel));
      setAnswer('');
      setStreak((current) => current + 1);
      setFeedbackState('success');
      setMessage('Correct! Nice work.');
      return;
    }

    const nextLevel = Math.max(0, level - 1);
    setLevel(nextLevel);
    setProblem(buildProblem(nextLevel));
    setAnswer('');
    setStreak(0);
    setFeedbackState('error');
    setMessage(`Wrong answer — you dropped back to level ${nextLevel + 1}.`);
  }

  function resetDifficulty() {
    setLevel(0);
    setProblem(buildProblem(0));
    setAnswer('');
    setStreak(0);
    setFeedbackState('idle');
    setMessage('Difficulty reset. Back to level 1.');
  }

  return (
    <main className="app-shell">
      <section className={cardClassName} data-testid="game-card">
        <p className="eyebrow">React practice project</p>
        <h1>Arithmetic Trainer</h1>
        <p className="intro">
          Answer correctly to unlock larger numbers and harder operations.
        </p>

        <div className="stats-grid" aria-label="Game stats">
          <article>
            <span className="stat-label">Level</span>
            <strong>Level {displayLevel}</strong>
          </article>
          <article>
            <span className="stat-label">Correct in a row</span>
            <strong>{streak}</strong>
          </article>
        </div>

        <div className="problem-card" aria-live="polite">
          <p className="problem-label">Current problem</p>
          <p className="problem-text">{problem.prompt}</p>
        </div>

        <form className="answer-form" onSubmit={submitAnswer}>
          <label htmlFor="answer-input">Your answer</label>
          <input
            id="answer-input"
            inputMode="numeric"
            autoComplete="off"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Type a number"
          />
          <div className="button-row">
            <button type="submit">Check answer</button>
            <button type="button" className="secondary" onClick={resetDifficulty}>
              Reset difficulty
            </button>
          </div>
        </form>

        <p className={`message message-${feedbackState}`} aria-live="polite">
          {message}
        </p>
      </section>
    </main>
  );
}
