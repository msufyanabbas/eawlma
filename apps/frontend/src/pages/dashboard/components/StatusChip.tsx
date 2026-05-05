import { Chip, ChipProps } from '@mui/material';
import { ListingStatus, InquiryStatus } from '@eawlma/shared-types';

const LISTING_COLOR: Record<ListingStatus, ChipProps['color']> = {
  [ListingStatus.DRAFT]: 'default',
  [ListingStatus.PENDING_REVIEW]: 'warning',
  [ListingStatus.ACTIVE]: 'success',
  [ListingStatus.REJECTED]: 'error',
  [ListingStatus.EXPIRED]: 'warning',
  [ListingStatus.SOLD]: 'info',
  [ListingStatus.RENTED]: 'info',
  [ListingStatus.ARCHIVED]: 'default',
};

const INQUIRY_COLOR: Record<InquiryStatus, ChipProps['color']> = {
  [InquiryStatus.NEW]: 'primary',
  [InquiryStatus.CONTACTED]: 'info',
  [InquiryStatus.QUALIFIED]: 'success',
  [InquiryStatus.UNQUALIFIED]: 'default',
  [InquiryStatus.CLOSED]: 'default',
};

export function ListingStatusChip({ status }: { status: ListingStatus }) {
  return (
    <Chip
      size="small"
      label={status.replace('_', ' ')}
      color={LISTING_COLOR[status] ?? 'default'}
      variant="filled"
      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
    />
  );
}

export function InquiryStatusChip({ status }: { status: InquiryStatus }) {
  return (
    <Chip
      size="small"
      label={status}
      color={INQUIRY_COLOR[status] ?? 'default'}
      variant="filled"
      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
    />
  );
}
