import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function mockRandomSequence(values) {
  vi.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('keeps the correct answer flow working and resets the timer for the next problem', async () => {
    mockRandomSequence([
      0, 0, // initial problem -> 1 + 1
      0, 0.2 // next problem after a correct answer -> 1 + 2
    ]);

    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByTestId('game-card');

    expect(screen.getByText(/level 1/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(screen.getByText('8s')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText('Correct! Nice combo started.')).toBeInTheDocument();
    expect(screen.getByText(/level 2/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 2')).toBeInTheDocument();
    expect(screen.getByText('8s')).toBeInTheDocument();
    expect(card).toHaveClass('streak-active');
    expect(card).toHaveClass('success-pop');
  });

  it('drops one level and shakes when the answer is wrong', async () => {
    mockRandomSequence([
      0, 0, // initial problem -> 1 + 1
      0, 0.2, // after one correct answer -> 1 + 2
      0, 0 // after wrong answer -> 1 + 1
    ]);

    render(<App />);
    const user = userEvent.setup();
    const card = screen.getByTestId('game-card');

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/level 2/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your answer/i), '99');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/wrong answer/i)).toBeInTheDocument();
    expect(screen.getByText(/level 1/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(card).toHaveClass('shake');
    expect(card).not.toHaveClass('streak-active');
  });

  it('treats timer expiry like a miss and shows timeout feedback', async () => {
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
      vi.advanceTimersByTime(8000);
      await Promise.resolve();
    });

    expect(screen.getByText(/time's up/i)).toBeInTheDocument();
    expect(screen.getByText(/level 1/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
    expect(screen.getByText('8s')).toBeInTheDocument();
    expect(within(screen.getByTestId('game-card')).getByText(/^0$/)).toBeInTheDocument();
  });

  it('increases best streak as the current streak climbs', async () => {
    mockRandomSequence([
      0, 0, // initial problem -> 1 + 1
      0, 0.2, // after first correct answer -> 1 + 2
      0, 0.2 // after second correct answer -> 1 + 2 again
    ]);

    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    await user.type(screen.getByLabelText(/your answer/i), '3');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    const gameCard = screen.getByTestId('game-card');
    const bestStreakCard = screen.getByText(/best streak/i).closest('article');
    const currentStreakCard = screen.getByText(/current streak/i).closest('article');

    expect(within(currentStreakCard).getByText(/^2$/)).toBeInTheDocument();
    expect(within(bestStreakCard).getByText(/^2$/)).toBeInTheDocument();
    expect(screen.getByText('Correct! Nice combo started.')).toBeInTheDocument();
    expect(gameCard).toHaveClass('streak-active');
  });
});
