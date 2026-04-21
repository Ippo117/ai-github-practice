import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProblem } from './lib/arithmetic';

const BASE_TIME_SECONDS = 10;
const STANDARD_REWARD_SECONDS = 5;
const MAX_COMBO = 8;

function buildProblem(level) {
  return createProblem(level);
}

function getStreakMessage(streak) {
  if (streak >= MAX_COMBO) {
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

function getComboTone(streak) {
  if (streak >= MAX_COMBO) {
    return 'legend';
  }

  if (streak >= 5) {
    return 'hot';
  }

  if (streak >= 3) {
    return 'building';
  }

  if (streak > 0) {
    return 'warm';
  }

  return 'idle';
}

function getTimeReward(maxChain) {
  return Math.max(1, maxChain) * STANDARD_REWARD_SECONDS;
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
  const [timeLeft, setTimeLeft] = useState(BASE_TIME_SECONDS);
  const [timerCap, setTimerCap] = useState(BASE_TIME_SECONDS);
  const [maxComboBurst, setMaxComboBurst] = useState(false);
  const [maxChain, setMaxChain] = useState(0);
  const timeoutHandledRef = useRef(false);

  const displayLevel = useMemo(() => level + 1, [level]);
  const timerPercent = useMemo(() => (timeLeft / timerCap) * 100, [timeLeft, timerCap]);
  const clampedCombo = useMemo(() => Math.min(streak, MAX_COMBO), [streak]);
  const comboPercent = useMemo(() => (clampedCombo / MAX_COMBO) * 100, [clampedCombo]);
  const isMaxCombo = useMemo(() => streak >= MAX_COMBO, [streak]);
  const displayMaxChain = useMemo(() => Math.max(maxChain, 1), [maxChain]);
  const streakMessage = useMemo(() => getStreakMessage(streak), [streak]);
  const comboTone = useMemo(() => getComboTone(streak), [streak]);
  const feedbackVariantClass = useMemo(() => `feedback-variant-${feedbackCycle % 2}`, [feedbackCycle]);
  const comboMeterClassName = useMemo(() => {
    const classes = ['combo-card', `combo-${comboTone}`];

    if (isMaxCombo) {
      classes.push('combo-overdrive');
    }

    if (maxComboBurst) {
      classes.push('max-combo-burst');
    }

    return classes.join(' ');
  }, [comboTone, isMaxCombo, maxComboBurst]);
  const cardClassName = [
    'card',
    feedbackVariantClass,
    streak > 0 ? 'streak-active' : '',
    feedbackState === 'success' ? 'success-pop success-jolt' : '',
    feedbackState === 'error' ? 'shake' : '',
    feedbackState === 'timeout' ? 'timeout-flash' : '',
    isMaxCombo ? 'max-combo-live overdrive-loop' : '',
    feedbackState === 'success' && isMaxCombo ? 'max-overdrive-hit' : '',
    maxComboBurst ? 'max-combo-burst' : '',
    timeLeft <= 3 ? 'timer-urgent' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const playFeedback = useCallback((nextState) => {
    setFeedbackCycle((current) => current + 1);
    setFeedbackState(nextState);
  }, []);

  const triggerMaxComboBurst = useCallback(() => {
    setMaxComboBurst(true);
  }, []);

  const startNextProblem = useCallback((nextLevel, nextTime = BASE_TIME_SECONDS) => {
    timeoutHandledRef.current = false;
    setLevel(nextLevel);
    setProblem(buildProblem(nextLevel));
    setAnswer('');
    setTimeLeft(nextTime);
    setTimerCap(nextTime);
  }, []);

  useEffect(() => {
    if (!maxComboBurst) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMaxComboBurst(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [maxComboBurst]);

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
    startNextProblem(nextLevel, BASE_TIME_SECONDS);
    setStreak(0);
    setMaxChain(0);
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
      const nextMaxChain = nextStreak >= MAX_COMBO ? (streak >= MAX_COMBO ? maxChain + 1 : 1) : 0;
      const rewardSeconds = nextStreak >= MAX_COMBO ? getTimeReward(nextMaxChain) : STANDARD_REWARD_SECONDS;
      const nextTime = timeLeft + rewardSeconds;

      startNextProblem(nextLevel, nextTime);
      setStreak(nextStreak);
      setMaxChain(nextMaxChain);
      setBestStreak((currentBest) => Math.max(currentBest, nextStreak));
      playFeedback('success');

      if (streak < MAX_COMBO && nextStreak >= MAX_COMBO) {
        triggerMaxComboBurst();
        setMessage(`Correct! OVERDRIVE x${nextMaxChain}! +${rewardSeconds}s`);
        return;
      }

      if (nextStreak >= MAX_COMBO) {
        setMessage(`Correct! MAX x${nextMaxChain} rampage! +${rewardSeconds}s`);
        return;
      }

      setMessage(`Correct! ${getStreakMessage(nextStreak)} +${rewardSeconds}s`);
      return;
    }

    const nextLevel = Math.max(0, level - 1);
    const nextStreak = Math.max(0, streak - 1);
    const nextMaxChain = nextStreak >= MAX_COMBO ? 1 : 0;

    startNextProblem(nextLevel, BASE_TIME_SECONDS);
    setStreak(nextStreak);
    setMaxChain(nextMaxChain);
    playFeedback('error');
    setMessage(`Wrong answer — combo down to ${nextStreak}. You dropped back to level ${nextLevel + 1}.`);
  }

  function resetDifficulty() {
    startNextProblem(0, BASE_TIME_SECONDS);
    setStreak(0);
    setFeedbackState('idle');
    setMaxComboBurst(false);
    setMaxChain(0);
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
            <span className="stat-label">Current streak</span>
            <strong>{streak}</strong>
          </article>
          <article>
            <span className="stat-label">Best streak</span>
            <strong>{bestStreak}</strong>
          </article>
        </div>

        <div className={comboMeterClassName}>
          <div className="combo-header">
            <div>
              <p className="problem-label">Combo meter</p>
              <strong>{isMaxCombo ? `MAX x${displayMaxChain}` : 'Build the chain'}</strong>
            </div>
            <p className="combo-value">{isMaxCombo ? `MAX x${displayMaxChain}` : `${clampedCombo} / ${MAX_COMBO}`}</p>
          </div>
          <div
            className="combo-bar"
            role="progressbar"
            aria-label="Combo meter"
            aria-valuemin={0}
            aria-valuemax={MAX_COMBO}
            aria-valuenow={clampedCombo}
            aria-valuetext={isMaxCombo ? `MAX x${displayMaxChain}` : `${clampedCombo} out of ${MAX_COMBO}`}
          >
            <span className="combo-fill" style={{ width: `${comboPercent}%` }} />
            <span className="combo-shimmer" />
            <div className="combo-markers" aria-hidden="true">
              {Array.from({ length: MAX_COMBO - 1 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
          <p className="combo-copy">
            {isMaxCombo
              ? `OVERDRIVE x${displayMaxChain} — the next hit keeps the chain alive.`
              : streakMessage}
          </p>
        </div>

        <div className="problem-card" aria-live="polite">
          <p className="problem-label">Current problem</p>
          <p className="problem-text">{problem.prompt}</p>
        </div>

        <div className={`timer-card ${timeLeft <= 3 ? 'timer-low' : ''}`} aria-label="Countdown timer">
          <div className="timer-row">
            <span className="stat-label">Countdown</span>
            <strong>{timeLeft}s</strong>
          </div>
          <p className="timer-bonus-copy">
            {isMaxCombo ? `Next max hit: +${getTimeReward(displayMaxChain + 1)}s` : `Next correct: +${STANDARD_REWARD_SECONDS}s`}
          </p>
          <div
            className="timer-bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax={timerCap}
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
