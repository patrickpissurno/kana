import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from './avatar';

describe('Avatar components', () => {
  it('renders avatar root with default, sm, and lg sizes', () => {
    const { rerender } = render(<Avatar data-testid="avatar-root">Fallback</Avatar>);
    const avatar = screen.getByTestId('avatar-root');
    expect(avatar).toHaveAttribute('data-slot', 'avatar');
    expect(avatar).toHaveAttribute('data-size', 'default');

    rerender(
      <Avatar data-testid="avatar-root" size="sm" className="custom-avatar">
        Fallback
      </Avatar>
    );
    expect(avatar).toHaveAttribute('data-size', 'sm');
    expect(avatar).toHaveClass('custom-avatar');

    rerender(
      <Avatar data-testid="avatar-root" size="lg">
        Fallback
      </Avatar>
    );
    expect(avatar).toHaveAttribute('data-size', 'lg');
  });

  it('renders AvatarImage and AvatarFallback inside Avatar', () => {
    render(
      <Avatar>
        <AvatarImage
          src="https://example.com/avatar.png"
          alt="User Avatar"
          className="custom-image"
          data-testid="avatar-image"
        />
        <AvatarFallback className="custom-fallback" data-testid="avatar-fallback">
          JD
        </AvatarFallback>
      </Avatar>
    );

    const fallback = screen.getByTestId('avatar-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveClass('custom-fallback');
    expect(fallback).toHaveTextContent('JD');
  });

  it('renders AvatarBadge, AvatarGroup, and AvatarGroupCount', () => {
    render(
      <AvatarGroup className="custom-group" data-testid="avatar-group">
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
          <AvatarBadge className="custom-badge" data-testid="avatar-badge" />
        </Avatar>
        <AvatarGroupCount className="custom-count" data-testid="avatar-count">
          +3
        </AvatarGroupCount>
      </AvatarGroup>
    );

    expect(screen.getByTestId('avatar-group')).toHaveClass('custom-group');
    expect(screen.getByTestId('avatar-badge')).toHaveClass('custom-badge');
    expect(screen.getByTestId('avatar-count')).toHaveClass('custom-count');
    expect(screen.getByTestId('avatar-count')).toHaveTextContent('+3');
  });
});
