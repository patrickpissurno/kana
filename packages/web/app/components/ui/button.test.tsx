import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-slot', 'button');
  });

  it('renders with custom variant, size, and className', () => {
    render(
      <Button variant="secondary" size="lg" className="custom-class">
        Secondary
      </Button>
    );
    const button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toHaveClass('custom-class');
  });
});
