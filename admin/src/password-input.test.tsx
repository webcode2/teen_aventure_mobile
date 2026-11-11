import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PasswordInput } from './ui';

it('reveals and hides the password without changing it or submitting the form', () => {
  const submit = vi.fn();
  render(<form onSubmit={submit}><PasswordInput aria-label="Password" defaultValue="sample" /></form>);
  const input = screen.getByLabelText<HTMLInputElement>('Password');
  expect(input.type).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(input.type).toBe('text');
  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(input.type).toBe('password');
  expect(input.value).toBe('sample');
  expect(submit).not.toHaveBeenCalled();
});
