import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';
import { EmptyState } from '@/components/global/EmptyState';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { CommissionOathModal } from '@/components/global/CommissionOathModal';

/**
 * Smoke tests for the major reusable components. We don't replicate the
 * detailed assertions ListingCard.test.tsx already makes — these just prove
 * each component renders into the DOM without throwing during the initial
 * paint, which is what most regression bugs surface as.
 */

describe('Component smoke tests', () => {
  it('<EmptyState> renders the title and optional CTA', () => {
    renderWithProviders(
      <EmptyState
        title="No listings yet"
        description="Try widening your search."
        ctaLabel="Reset filters"
        onCta={() => {}}
      />,
    );
    expect(screen.getByText('No listings yet')).toBeInTheDocument();
    expect(screen.getByText('Try widening your search.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reset filters' }),
    ).toBeInTheDocument();
  });

  it('<SkeletonCard> renders without crashing', () => {
    const { container } = renderWithProviders(<SkeletonCard />);
    // MUI Skeleton applies a `MuiSkeleton` class to its root element — used
    // here to prove the component mounted.
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('<CommissionOathModal> renders the bilingual oath when open=true', () => {
    renderWithProviders(
      <CommissionOathModal
        open={true}
        oathType="buyer_purchase"
        onAccept={() => {}}
        onClose={() => {}}
      />,
    );
    // The dialog body always contains the Arabic invocation. Match via the
    // first 10 characters so partial-string transforms in MUI don't break.
    expect(screen.getByText(/بسم الله/)).toBeInTheDocument();
  });

  it('<CommissionOathModal> renders nothing when open=false', () => {
    renderWithProviders(
      <CommissionOathModal
        open={false}
        oathType="agent_listing"
        onAccept={() => {}}
        onClose={() => {}}
      />,
    );
    // Dialog content is unmounted (or hidden via portal off-DOM) when closed.
    expect(screen.queryByText(/بسم الله/)).not.toBeInTheDocument();
  });
});
