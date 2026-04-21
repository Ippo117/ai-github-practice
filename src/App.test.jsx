import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const LEADERBOARD_STORAGE_KEY = 'arithmetic-trainer-leaderboard';

function mockRandomSequence(values) {
  vi.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0);
}

function solvePrompt(prompt) {
  const [left, operator, right] = prompt.split(' ');
  const a = Number(left);
  const b = Number(right);

  if (operator === '+') {
    return String(a + b);
  }

  if (operator === '-') {
    return String(a - b);
  }

  return String(a * b);
}

function getStatCard(labelPattern) {
  return screen.getByText(labelPattern).closest('article');
}

function getPromptText() {
  return document.querySelector('.problem-text').textContent;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('starts at 10 seconds and gives +3 seconds for a normal correct answer', async () => {
    mockRandomSequence([0, 0, 0, 0.2]);

    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByTestId('game-card');

    expect(screen.getByText(/level 1/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(screen.getByText(/10\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('0 / 8')).toBeInTheDocument();
    expect(screen.getByText('Next correct: +3s')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText('Correct! Nice combo started. +3s')).toBeInTheDocument();
    expect(screen.getByText(/level 2/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 2')).toBeInTheDocument();
    expect(screen.getByText(/13\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 / 8')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /combo meter/i })).toHaveAttribute('aria-valuenow', '1');
    expect(card).toHaveClass('streak-active');
    expect(card).toHaveClass('success-pop');
    expect(card).toHaveClass('success-jolt');
  });

  it('keeps the level, resets the chain, and removes 3 seconds on a wrong answer', async () => {
    mockRandomSequence([0, 0, 0, 0.2, 0, 0.2, 0, 0]);

    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByTestId('game-card');

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    await user.type(screen.getByLabelText(/your answer/i), '3');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/level 3/i)).toBeInTheDocument();
    expect(screen.getByText('2 / 8')).toBeInTheDocument();
    expect(screen.getByText(/16\s*s/i, { selector: 'strong' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your answer/i), '99');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/wrong answer/i)).toBeInTheDocument();
    expect(screen.getByText(/level 3/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('0 / 8')).toBeInTheDocument();
    expect(within(getStatCard(/current streak/i)).getByText(/^0$/)).toBeInTheDocument();
    expect(screen.getByText(/13\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(card).toHaveClass('shake');
  });

  it('shows level reached plus leaderboard controls on the game over screen and lets the player retry', async () => {
    vi.useFakeTimers();
    mockRandomSequence([0, 0, 0, 0.2]);

    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /game over/i })).toBeInTheDocument();
    expect(screen.getByText(/reached level 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^leaderboard$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/level 1/i)).toBeInTheDocument();
    expect(screen.getByText(/\d+ \+ \d+/)).toBeInTheDocument();
    expect(screen.getByText(/10\s*s/i, { selector: 'strong' })).toBeInTheDocument();
  });

  it('allows the player to save their run to the leaderboard from the end screen', async () => {
    vi.useFakeTimers();
    mockRandomSequence([0, 0]);

    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Ippo' } });
    fireEvent.click(screen.getByRole('button', { name: /save to leaderboard/i }));

    const leaderboard = screen.getByRole('table', { name: /leaderboard/i });
    const savedRow = within(leaderboard).getByText('Ippo').closest('tr');
    expect(savedRow).toBeTruthy();
    expect(within(savedRow).getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getByText(/saved to leaderboard/i)).toBeInTheDocument();

    const savedEntries = JSON.parse(window.localStorage.getItem(LEADERBOARD_STORAGE_KEY));
    expect(savedEntries[0]).toMatchObject({ name: 'Ippo', level: 1 });
  });

  it('builds through max multipliers, then enters MAX OVERDRIVE with floating text and leaderboard preview', async () => {
    mockRandomSequence([
      0, 0,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2
    ]);

    window.localStorage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify([
        { name: 'Ada', level: 22, streak: 11, createdAt: '2026-04-21T00:00:00.000Z' },
        { name: 'Lin', level: 19, streak: 9, createdAt: '2026-04-21T00:00:01.000Z' }
      ])
    );

    render(<App />);
    const user = userEvent.setup();
    const gameCard = screen.getByTestId('game-card');

    for (let count = 0; count < 13; count += 1) {
      await user.type(screen.getByLabelText(/your answer/i), solvePrompt(getPromptText()));
      await user.click(screen.getByRole('button', { name: /check answer/i }));
    }

    const bestStreakCard = getStatCard(/best streak/i);
    const currentStreakCard = getStatCard(/current streak/i);

    expect(within(currentStreakCard).getByText(/^13$/)).toBeInTheDocument();
    expect(within(bestStreakCard).getByText(/^13$/)).toBeInTheDocument();
    expect(screen.getAllByText('MAX OVERDRIVE').length).toBeGreaterThan(0);
    expect(screen.getByText(/next overdrive hit refills to 30s/i)).toBeInTheDocument();
    expect(screen.getByText(/30\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/overdrive!/i)).toBeInTheDocument();
    expect(gameCard).toHaveClass('max-combo-live');
    expect(gameCard).toHaveClass('max-overdrive-hit');
    expect(gameCard).toHaveClass('overdrive-loop');
    expect(screen.getByTestId('combo-float-text')).toHaveTextContent(/overdrive/i);
  });
});
