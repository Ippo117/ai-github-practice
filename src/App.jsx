import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProblem } from './lib/arithmetic';

const TIMER_SECONDS = 8;

function buildProblem(level) {
  return createProblem(level);
}

function getStreakMessage(streak) {
  if (streak >= 8) {
    return 'Legendary combo!';
  }

  if (streak >= 5) {
    return 'Hot streak!';
  }

  if (streak >= 3) {
    return 'Combo building!';
  }

  if (streak > 0) {
    return 'Nice combo started.';
  }

  return 'Build a combo by answering quickly and correctly.';
}

export default function App() {
  const [level, setLevel] = useState(0);
  const [problem, setProblem] = useState(() => buildProblem(0));
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('Solve the problem to level up.');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedbackState, setFeedbackState] = useState('idle');
  const [feedbackCycle, setFeedbackCycle] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timeoutHandledRef = useRef(false);

  const displayLevel = useMemo(() => level + 1, [level]);
  const timerPercent = useMemo(() => (timeLeft / TIMER_SECONDS) * 100, [timeLeft]);
  const streakMessage = useMemo(() => getStreakMessage(streak), [streak]);
  const streakBadgeClassName = useMemo(() => {
    if (streak >= 8) {
      return 'streak-badge streak-legend';
    }

    if (streak >= 5) {
      return 'streak-badge streak-hot';
    }

    if (streak >= 3) {
      return 'streak-badge streak-building';
    }

    if (streak > 0) {
      return 'streak-badge streak-warm';
    }

    return 'streak-badge streak-idle';
  }, [streak]);

  const cardClassName = [
    'card',
    streak > 0 ? 'streak-active' : '',
    feedbackState === 'success' ? 'success-pop' : '',
    feedbackState === 'error' ? 'shake' : '',
    feedbackState === 'timeout' ? 'timeout-flash' : '',
    timeLeft <= 3 ? 'timer-urgent' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const playFeedback = useCallback((nextState) => {
    setFeedbackCycle((current) => current + 1);
    setFeedbackState(nextState);
  }, []);

  const startNextProblem = useCallback((nextLevel) => {
    timeoutHandledRef.current = false;
    setLevel(nextLevel);
    setProblem(buildProblem(nextLevel));
    setAnswer('');
    setTimeLeft(TIMER_SECONDS);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((currentTime) => Math.max(0, currentTime - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [problem]);

  useEffect(() => {
    if (timeLeft > 0 || timeoutHandledRef.current) {
      return;
    }

    timeoutHandledRef.current = true;
    const nextLevel = Math.max(0, level - 1);
    startNextProblem(nextLevel);
    setStreak(0);
    playFeedback('timeout');
    setMessage(`Time's up — you dropped back to level ${nextLevel + 1}.`);
  }, [level, playFeedback, startNextProblem, timeLeft]);

  function submitAnswer(event) {
    event.preventDefault();

    if (answer.trim() === '') {
      setMessage('Type an answer before checking.');
      return;
    }

    const numericAnswer = Number(answer);

    if (numericAnswer === problem.answer) {
      const nextLevel = level + 1;
      const nextStreak = streak + 1;

      startNextProblem(nextLevel);
      setStreak(nextStreak);
      setBestStreak((currentBest) => Math.max(currentBest, nextStreak));
      playFeedback('success');
      setMessage(`Correct! ${getStreakMessage(nextStreak)}`);
      return;
    }

    const nextLevel = Math.max(0, level - 1);
    startNextProblem(nextLevel);
    setStreak(0);
    playFeedback('error');
    setMessage(`Wrong answer — you dropped back to level ${nextLevel + 1}.`);
  }

  function resetDifficulty() {
    startNextProblem(0);
    setStreak(0);
    setFeedbackState('idle');
    setMessage('Difficulty reset. Back to level 1.');
  }

  return (
    <main className="app-shell">
      <section
        className={cardClassName}
        data-testid="game-card"
        style={{ animationDelay: `${feedbackCycle % 2}ms` }}
      >
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
            <span className="stat-label">Current streak</span>
            <strong>{streak}</strong>
          </article>
          <article>
            <span className="stat-label">Best streak</span>
            <strong>{bestStreak}</strong>
          </article>
        </div>

        <p className={streakBadgeClassName} aria-live="polite">
          {streakMessage}
        </p>

        <div className="problem-card" aria-live="polite">
          <p className="problem-label">Current problem</p>
          <p className="problem-text">{problem.prompt}</p>
        </div>

        <div className={`timer-card ${timeLeft <= 3 ? 'timer-low' : ''}`} aria-label="Countdown timer">
          <div className="timer-row">
            <span className="stat-label">Countdown</span>
            <strong>{timeLeft}s</strong>
          </div>
          <div
            className="timer-bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax={TIMER_SECONDS}
            aria-valuenow={timeLeft}
            aria-label="Time left before the problem expires"
          >
            <span style={{ width: `${timerPercent}%` }} />
          </div>
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
