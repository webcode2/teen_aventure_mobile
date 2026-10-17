import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './ui';

describe('Button', () => {
  it('renders primary navy styling by default', () => {
    render(<Button>Save</Button>);
    const el = screen.getByRole('button', { name: 'Save' });
    expect(el.className).toContain('bg-navy');
    expect(el.className).toContain('hover:bg-teal');
    expect(el.className).toContain('text-white');
  });

  it('supports outline and danger variants', () => {
    const { rerender } = render(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('border-border');
    rerender(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('text-error');
  });

  it('merges className for full-width CTAs', () => {
    render(
      <Button className="w-full" size="lg">
        Sign in
      </Button>,
    );
    const el = screen.getByRole('button', { name: 'Sign in' });
    expect(el.className).toContain('w-full');
    expect(el.className).toContain('text-sm');
  });
});
