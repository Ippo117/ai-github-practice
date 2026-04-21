import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createProblem } from './lib/arithmetic';

const BASE_TIME_SECONDS = 10;
const MAX_TIME_SECONDS = 30;
const STANDARD_REWARD_SECONDS = 3;
const MISTAKE_PENALTY_SECONDS = 3;
const MAX_COMBO = 8;
const MAX_MULTIPLIER = 5;
const OVERDRIVE_SENTINEL = MAX_MULTIPLIER + 1;
const LEADERBOARD_STORAGE_KEY = 'arithmetic-trainer-leaderboard';
const LEADERBOARD_LIMIT = 5;

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

function clampTime(value) {
  return Math.max(0, Math.min(MAX_TIME_SECONDS, value));
}

function getMultiplierReward(multiplier) {
  if (multiplier >= OVERDRIVE_SENTINEL) {
    return MAX_TIME_SECONDS;
  }

  return STANDARD_REWARD_SECONDS * Math.max(1, multiplier);
}

function getNextMultiplier(streak, multiplier) {
  if (streak < MAX_COMBO) {
    return 0;
  }

  if (multiplier >= MAX_MULTIPLIER) {
    return OVERDRIVE_SENTINEL;
  }

  return Math.max(1, multiplier + 1);
}

function getMultiplierLabel(multiplier) {
  if (multiplier >= OVERDRIVE_SENTINEL) {
    return 'MAX OVERDRIVE';
  }

  return `MAX x${Math.max(1, multiplier)}`;
}

function sortLeaderboard(entries) {
  return [...entries].sort((left, right) => {
    if (right.level !== left.level) {
      return right.level - left.level;
    }

    if (right.streak !== left.streak) {
      return right.streak - left.streak;
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

function loadLeaderboard() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortLeaderboard(parsed).slice(0, LEADERBOARD_LIMIT);
  } catch {
    return [];
  }
}

function persistLeaderboard(entries) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
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
  const [maxComboBurst, setMaxComboBurst] = useState(false);
  const [maxMultiplier, setMaxMultiplier] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [floatText, setFloatText] = useState('');
  const [leaderboard, setLeaderboard] = useState(() => loadLeaderboard());
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [leaderboardName, setLeaderboardName] = useState('');
  const [leaderboardSaved, setLeaderboardSaved] = useState(false);
  const [leaderboardNotice, setLeaderboardNotice] = useState('');
  const timeoutHandledRef = useRef(false);

  const displayLevel = useMemo(() => level + 1, [level]);
  const timerPercent = useMemo(() => (timeLeft / MAX_TIME_SECONDS) * 100, [timeLeft]);
  const clampedCombo = useMemo(() => Math.min(streak, MAX_COMBO), [streak]);
  const comboPercent = useMemo(() => (clampedCombo / MAX_COMBO) * 100, [clampedCombo]);
  const isMaxCombo = useMemo(() => streak >= MAX_COMBO, [streak]);
  const isOverdrive = useMemo(() => maxMultiplier >= OVERDRIVE_SENTINEL, [maxMultiplier]);
  const streakMessage = useMemo(() => getStreakMessage(streak), [streak]);
  const comboTone = useMemo(() => getComboTone(streak), [streak]);
  const feedbackVariantClass = useMemo(() => `feedback-variant-${feedbackCycle % 2}`, [feedbackCycle]);
  const multiplierLabel = useMemo(() => getMultiplierLabel(maxMultiplier), [maxMultiplier]);
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
    feedbackState === 'game-over' ? 'timeout-flash' : '',
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

  const showFloatText = useCallback((nextText) => {
    setFloatText(nextText);
    setFeedbackCycle((current) => current + 1);
  }, []);

  const startNextProblem = useCallback((nextLevel, nextTime) => {
    timeoutHandledRef.current = false;
    setLevel(nextLevel);
    setProblem(buildProblem(nextLevel));
    setAnswer('');
    setTimeLeft(clampTime(nextTime));
  }, []);

  const resetGame = useCallback(() => {
    timeoutHandledRef.current = false;
    setLevel(0);
    setProblem(buildProblem(0));
    setAnswer('');
    setMessage('Fresh run. Build the chain again.');
    setStreak(0);
    setBestStreak(0);
    setFeedbackState('idle');
    setFeedbackCycle(0);
    setTimeLeft(BASE_TIME_SECONDS);
    setMaxComboBurst(false);
    setMaxMultiplier(0);
    setGameOver(false);
    setFloatText('');
    setShowLeaderboard(true);
    setLeaderboardName('');
    setLeaderboardSaved(false);
    setLeaderboardNotice('');
  }, []);

  const saveRunToLeaderboard = useCallback(() => {
    const trimmedName = leaderboardName.trim();

    if (!trimmedName) {
      setLeaderboardNotice('Enter your name if you want to join the leaderboard.');
      return;
    }

    if (leaderboardSaved) {
      setLeaderboardNotice('This run is already saved to the leaderboard.');
      return;
    }

    const nextEntries = sortLeaderboard([
      ...leaderboard,
      {
        name: trimmedName,
        level: displayLevel,
        streak: bestStreak,
        createdAt: new Date().toISOString()
      }
    ]).slice(0, LEADERBOARD_LIMIT);

    setLeaderboard(nextEntries);
    persistLeaderboard(nextEntries);
    setLeaderboardSaved(true);
    setLeaderboardNotice('Saved to leaderboard!');
    setShowLeaderboard(true);
  }, [bestStreak, displayLevel, leaderboard, leaderboardName, leaderboardSaved]);

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
    if (!floatText) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setFloatText('');
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [floatText]);

  useEffect(() => {
    if (gameOver) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((currentTime) => Math.max(0, currentTime - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameOver, problem]);

  useEffect(() => {
    if (timeLeft > 0 || timeoutHandledRef.current || gameOver) {
      return;
    }

    timeoutHandledRef.current = true;
    setGameOver(true);
    setStreak(0);
    setMaxMultiplier(0);
    setShowLeaderboard(true);
    playFeedback('game-over');
    setMessage('Game over — your clock hit zero.');
  }, [gameOver, playFeedback, timeLeft]);

  function submitAnswer(event) {
    event.preventDefault();

    if (gameOver) {
      return;
    }

    if (answer.trim() === '') {
      setMessage('Type an answer before checking.');
      return;
    }

    const numericAnswer = Number(answer);

    if (numericAnswer === problem.answer) {
      const nextLevel = level + 1;
      const nextStreak = streak + 1;
      const nextMultiplier = getNextMultiplier(nextStreak, maxMultiplier);
      const rewardSeconds = getMultiplierReward(nextMultiplier);
      const nextTime = nextMultiplier >= OVERDRIVE_SENTINEL ? MAX_TIME_SECONDS : clampTime(timeLeft + rewardSeconds);

      startNextProblem(nextLevel, nextTime);
      setStreak(nextStreak);
      setMaxMultiplier(nextMultiplier);
      setBestStreak((currentBest) => Math.max(currentBest, nextStreak));
      playFeedback('success');

      if (nextStreak >= MAX_COMBO && maxMultiplier === 0) {
        triggerMaxComboBurst();
      }

      if (nextMultiplier >= OVERDRIVE_SENTINEL) {
        showFloatText('OVERDRIVE!');
        setMessage('Correct! MAX OVERDRIVE engaged! Full time!');
        return;
      }

      if (nextMultiplier > 0) {
        showFloatText(`MAX x${nextMultiplier}`);
        setMessage(`Correct! MAX x${nextMultiplier} rampage! +${rewardSeconds}s`);
        return;
      }

      showFloatText(`+${rewardSeconds}s`);
      setMessage(`Correct! ${getStreakMessage(nextStreak)} +${rewardSeconds}s`);
      return;
    }

    const nextTime = clampTime(timeLeft - MISTAKE_PENALTY_SECONDS);

    setAnswer('');
    setProblem(buildProblem(level));
    setStreak(0);
    setMaxMultiplier(0);
    setTimeLeft(nextTime);
    playFeedback('error');
    showFloatText(`-${MISTAKE_PENALTY_SECONDS}s`);

    if (nextTime === 0) {
      timeoutHandledRef.current = true;
      setGameOver(true);
      setShowLeaderboard(true);
      playFeedback('game-over');
      setMessage('Game over — one last mistake drained the clock.');
      return;
    }

    setMessage(`Wrong answer — chain broken. -${MISTAKE_PENALTY_SECONDS}s`);
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
              <strong>{isMaxCombo ? multiplierLabel : 'Build the chain'}</strong>
            </div>
            <p className="combo-value">{isMaxCombo ? multiplierLabel : `${clampedCombo} / ${MAX_COMBO}`}</p>
          </div>
          <div
            className="combo-bar"
            role="progressbar"
            aria-label="Combo meter"
            aria-valuemin={0}
            aria-valuemax={MAX_COMBO}
            aria-valuenow={clampedCombo}
            aria-valuetext={isMaxCombo ? multiplierLabel : `${clampedCombo} out of ${MAX_COMBO}`}
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
            {isOverdrive
              ? 'MAX OVERDRIVE engaged — every clean hit refills the clock.'
              : isMaxCombo
                ? `${multiplierLabel} — keep the pressure on.`
                : streakMessage}
          </p>
          {floatText ? (
            <span className="combo-float-text" data-testid="combo-float-text" aria-live="polite">
              {floatText}
            </span>
          ) : null}
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
            {isOverdrive
              ? 'Next overdrive hit refills to 30s'
              : isMaxCombo
                ? `Next max hit: +${getMultiplierReward(Math.min(maxMultiplier + 1, MAX_MULTIPLIER))}s`
                : `Next correct: +${STANDARD_REWARD_SECONDS}s`}
          </p>
          <div
            className="timer-bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax={MAX_TIME_SECONDS}
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
            disabled={gameOver}
          />
          <div className="button-row">
            <button type="submit" disabled={gameOver}>Check answer</button>
            <button type="button" className="secondary" onClick={resetGame}>
              Reset difficulty
            </button>
          </div>
        </form>

        <p className={`message message-${feedbackState}`} aria-live="polite">
          {message}
        </p>

        {gameOver ? (
          <div className="game-over-overlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
            <div className="game-over-panel">
              <p className="problem-label">Run ended</p>
              <h2 id="game-over-title">Game Over</h2>
              <p className="game-over-level">Reached Level {displayLevel}</p>
              <p>You lost. The clock ran out before the next answer landed.</p>

              <div className="game-over-actions">
                <button type="button" onClick={resetGame}>Retry</button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setShowLeaderboard((current) => !current)}
                >
                  Leaderboard
                </button>
              </div>

              <div className="leaderboard-form">
                <label htmlFor="leaderboard-name">Your name</label>
                <div className="leaderboard-form-row">
                  <input
                    id="leaderboard-name"
                    value={leaderboardName}
                    onChange={(event) => setLeaderboardName(event.target.value)}
                    placeholder="Add your name"
                    maxLength={18}
                    disabled={leaderboardSaved}
                  />
                  <button type="button" className="secondary-action" onClick={saveRunToLeaderboard} disabled={leaderboardSaved}>
                    Save to leaderboard
                  </button>
                </div>
                <p className="leaderboard-note" aria-live="polite">
                  {leaderboardNotice || 'Want your run remembered? Add your name to the board.'}
                </p>
              </div>

              {showLeaderboard ? (
                <div className="leaderboard-panel">
                  <div className="leaderboard-header">
                    <p className="problem-label">Top runs</p>
                    <strong>Leaderboard</strong>
                  </div>
                  {leaderboard.length > 0 ? (
                    <table aria-label="Leaderboard">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Level</th>
                          <th>Streak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry, index) => (
                          <tr key={`${entry.name}-${entry.createdAt}-${index}`}>
                            <td>{index + 1}</td>
                            <td>{entry.name}</td>
                            <td>{entry.level}</td>
                            <td>{entry.streak}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="leaderboard-empty">No saved runs yet — be the first on the board.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
