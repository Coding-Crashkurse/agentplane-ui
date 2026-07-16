import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} aria-label="toggle">
      {theme}
    </button>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.removeItem('agentplane-theme');
    document.documentElement.classList.remove('dark');
  });

  it('defaults to dark and applies the class on <html>', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('toggle')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('toggles to light, removes the class and persists the preference', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByLabelText('toggle'));
    expect(screen.getByLabelText('toggle')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('agentplane-theme')).toBe('light');
  });

  it('restores the persisted preference', () => {
    localStorage.setItem('agentplane-theme', 'light');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('toggle')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
