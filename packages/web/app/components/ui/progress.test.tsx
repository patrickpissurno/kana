import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from './progress';

describe('Progress', () => {
  it('renders base progress component', () => {
    render(<Progress value={40} data-testid="progress-bar" />);
    const progress = screen.getByTestId('progress-bar');
    expect(progress).toBeInTheDocument();
  });

  it('renders track, indicator, label, and value with custom classNames', () => {
    render(
      <Progress value={75} className="custom-progress">
        <ProgressLabel className="custom-label">Score</ProgressLabel>
        <ProgressValue className="custom-value" />
      </Progress>
    );

    expect(screen.getByText('Score')).toHaveClass('custom-label');
  });

  it('renders standalone track and indicator within primitive root', () => {
    render(
      <Progress value={50} data-testid="custom-root">
        <ProgressTrack className="track-custom" data-testid="track">
          <ProgressIndicator className="indicator-custom" data-testid="indicator" />
        </ProgressTrack>
      </Progress>
    );

    expect(screen.getByTestId('track')).toHaveClass('track-custom');
    expect(screen.getByTestId('indicator')).toHaveClass('indicator-custom');
  });
});
