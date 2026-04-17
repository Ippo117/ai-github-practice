import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function mockRandomSequence(values) {
  vi.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('shows a new harder problem after a correct answer and resets back to the easiest level', async () => {
    mockRandomSequence([
      0, 0,       // initial problem -> 1 + 1
      0, 0.2,     // after correct answer -> 1 + 2
      0, 0        // after reset -> 1 + 1
    ]);

    render(<App />);
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: /arithmetic trainer/i })).toBeInTheDocument();
    expect(screen.getByText(/level 1/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your answer/i), '2');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText('Correct! Nice work.')).toBeInTheDocument();
    expect(screen.getByText(/level 2/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset difficulty/i }));

    expect(screen.getByText('Difficulty reset. Back to level 1.')).toBeInTheDocument();
    expect(screen.getByText(/level 1/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
  });

  it('keeps the same problem when the answer is wrong', async () => {
    mockRandomSequence([0, 0]);

    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/your answer/i), '99');
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    expect(screen.getByText(/level 1/i)).toBeInTheDocument();
    expect(screen.getByText('1 + 1')).toBeInTheDocument();
  });
});

