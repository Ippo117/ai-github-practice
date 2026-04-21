import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('keeps the correct answer flow working, grows the combo meter, and resets the timer for the next problem', async () => {
    mockRandomSequence([
      0, 0, // initial problem -> 1 + 1
      0, 0.2 // next problem after a correct answer -> 1 + 2
    ]);

    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByTestId('game-card');

    expect(screen.getByText(/level 1/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(screen.getByText(/10\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('0 / 8')).toBeInTheDocument();
    expect(screen.getByText('Build a combo by answering quickly and correctly.')).toHaveClass('combo-copy');
    expect(screen.queryByText('Build a combo by answering quickly and correctly.', { selector: '.streak-badge' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText('Correct! Nice combo started. +5s')).toBeInTheDocument();
    expect(screen.getByText(/level 2/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 2')).toBeInTheDocument();
    expect(screen.getByText(/15\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 / 8')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /combo meter/i })).toHaveAttribute('aria-valuenow', '1');
    expect(card).toHaveClass('streak-active');
    expect(card).toHaveClass('success-pop');
    expect(card).toHaveClass('success-jolt');
  });

  it('drops one level and trims the combo by one when the answer is wrong', async () => {
    mockRandomSequence([
      0, 0, // initial problem -> 1 + 1
      0, 0.2, // after first correct answer -> 1 + 2
      0, 0.2, // after second correct answer -> 1 + 2 again
      0, 0 // after wrong answer -> 1 + 1
    ]);

    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByTestId('game-card');

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    await user.type(screen.getByLabelText(/your answer/i), '3');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText('2 / 8')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your answer/i), '99');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/wrong answer/i)).toBeInTheDocument();
    expect(screen.getByText(/level 2/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(screen.getByText('1 / 8')).toBeInTheDocument();
    expect(within(getStatCard(/current streak/i)).getByText(/^1$/)).toBeInTheDocument();
    expect(card).toHaveClass('shake');
    expect(card).toHaveClass('streak-active');
  });

  it('treats timer expiry like a miss and resets the countdown to the base time', async () => {
    vi.useFakeTimers();
    mockRandomSequence([
      0, 0, // initial problem -> 1 + 1
      0, 0.2, // after a correct answer -> 1 + 2
      0, 0 // after timeout -> 1 + 1 again
    ]);

    render(<App />);

    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/level 2/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    expect(screen.getByText(/time's up/i)).toBeInTheDocument();
    expect(screen.getByText(/level 1/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(screen.getByText(/10\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(within(screen.getByTestId('game-card')).getByText(/^0$/)).toBeInTheDocument();
  });

  it('builds a max chain with bigger time rewards and sustained overdrive juice', async () => {
    mockRandomSequence([
      0, 0,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2,
      0, 0.2
    ]);

    render(<App />);
    const user = userEvent.setup();
    const gameCard = screen.getByTestId('game-card');

    for (let count = 0; count < 9; count += 1) {
      const prompt = document.querySelector('.problem-text').textContent;
      await user.type(screen.getByLabelText(/your answer/i), solvePrompt(prompt));
      await user.click(screen.getByRole('button', { name: /check answer/i }));
    }

    const bestStreakCard = getStatCard(/best streak/i);
    const currentStreakCard = getStatCard(/current streak/i);

    expect(within(currentStreakCard).getByText(/^9$/)).toBeInTheDocument();
    expect(within(bestStreakCard).getByText(/^9$/)).toBeInTheDocument();
    expect(screen.getAllByText('MAX x2').length).toBeGreaterThan(0);
    expect(screen.getByText(/60\s*s/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/overdrive x2/i)).toBeInTheDocument();
    expect(screen.getByText(/max x2 rampage/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /combo meter/i })).toHaveAttribute('aria-valuenow', '8');
    expect(gameCard).toHaveClass('max-combo-live');
    expect(gameCard).toHaveClass('max-overdrive-hit');
    expect(gameCard).toHaveClass('overdrive-loop');
  });
});
