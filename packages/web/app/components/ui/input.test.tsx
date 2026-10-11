import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders input with default properties', () => {
    render(<Input placeholder="Enter romaji" />);
    const input = screen.getByPlaceholderText('Enter romaji');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('data-slot', 'input');
  });

  it('renders with custom type and className', () => {
    render(<Input type="text" className="custom-input" aria-label="romaji-input" />);
    const input = screen.getByLabelText('romaji-input');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveAttribute('type', 'text');
  });
});
