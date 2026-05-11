import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import {
  ListingFurnishing,
  ListingStatus,
  ListingType,
  PropertyType,
  type Listing,
} from '@eawlma/shared-types';

import { renderWithProviders } from '@/test/render';
import { ListingCard } from '@/components/global/ListingCard';

/** Mock listing matching the real wire shape exactly. */
const mockListing: Listing = {
  id: 'test-123',
  referenceCode: 'EAW-TEST-01',
  type: ListingType.SALE,
  propertyType: PropertyType.VILLA,
  status: ListingStatus.ACTIVE,
  sourceLocale: 'en',
  title: 'Test Villa',
  description: 'A spacious villa for tests.',
  price: 1_500_000,
  currency: 'SAR',
  rentPeriod: null,
  isNegotiable: false,
  bedrooms: 4,
  bathrooms: 3,
  area: 300,
  landArea: null,
  parkingSpaces: 2,
  floors: 2,
  floorNumber: null,
  yearBuilt: 2020,
  furnishing: ListingFurnishing.UNFURNISHED,
  hasElevator: false,
  hasPool: true,
  hasGarden: true,
  hasGym: false,
  hasMaidRoom: false,
  hasDriverRoom: false,
  hasCentralAC: true,
  hasKitchenAppliances: true,
  hasSecurity: true,
  isCornerUnit: false,
  country: 'SA',
  region: 'Riyadh Region',
  city: 'Riyadh',
  district: 'Test District',
  address: {},
  lat: 24.7136,
  lng: 46.6753,
  ownerId: 'owner-1',
  agencyId: null,
  isFeatured: true,
  featuredUntil: null,
  viewCount: 0,
  inquiryCount: 0,
  saveCount: 0,
  publishedAt: new Date().toISOString(),
  expiresAt: null,
  rejectionReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  media: [],
  translations: [],
  amenityIds: [],
  tagIds: [],
};

describe('<ListingCard>', () => {
  it('renders the listing title', () => {
    renderWithProviders(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Test Villa')).toBeInTheDocument();
  });

  it('renders the formatted price', () => {
    renderWithProviders(<ListingCard listing={mockListing} />);
    expect(screen.getByText(/1,500,000/)).toBeInTheDocument();
  });

  it('renders bedroom and bathroom counts', () => {
    renderWithProviders(<ListingCard listing={mockListing} />);
    // Both `4` (bedrooms) and `3` (bathrooms) appear as their own typography nodes.
    expect(screen.getAllByText(/^4$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^3$/).length).toBeGreaterThan(0);
  });

  it('shows the Featured chip when isFeatured=true', () => {
    renderWithProviders(<ListingCard listing={mockListing} />);
    // The chip uses the i18n key `listing.featured` — the setup mock echoes keys.
    expect(screen.getByText('listing.featured')).toBeInTheDocument();
  });

  it('exposes the saved/unsaved heart button by aria-label', () => {
    renderWithProviders(<ListingCard listing={mockListing} />);
    expect(screen.getByLabelText('save listing')).toBeInTheDocument();
  });
});
