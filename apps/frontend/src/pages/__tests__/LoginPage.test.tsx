import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';
import { LoginPage } from '@/pages/auth/LoginPage';

describe('<LoginPage>', () => {
  it('renders both email and password inputs plus the submit button', () => {
    renderWithProviders(<LoginPage />);
    // i18n keys are echoed through; the inputs themselves are reachable by type.
    expect(document.querySelector('input[type="email"]')).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: /auth\.signIn/i })).toBeInTheDocument();
  });

  it('marks the email input invalid when submitted empty', async () => {
    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /auth\.signIn/i }));
    // react-hook-form + zodResolver flips `aria-invalid="true"` on the input
    // when validation fails — checking that attribute is more robust than
    // grepping the helperText, which can sit inside a nested <p>.
    await waitFor(() => {
      const email = document.querySelector('input[type="email"]') as HTMLInputElement;
      expect(email).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
