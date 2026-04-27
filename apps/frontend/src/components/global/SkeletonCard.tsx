import { Card, CardContent, Skeleton, Stack } from '@mui/material';

/** Loading-state placeholder for a ListingCard. Same shape so the grid doesn't reflow. */
export function SkeletonCard() {
  return (
    <Card>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 3' }} />
      <CardContent>
        <Skeleton width="40%" height={20} />
        <Skeleton width="80%" height={28} sx={{ my: 0.5 }} />
        <Skeleton width="60%" height={18} sx={{ mb: 1.5 }} />
        <Stack direction="row" spacing={2}>
          <Skeleton width={48} height={20} />
          <Skeleton width={48} height={20} />
          <Skeleton width={64} height={20} />
        </Stack>
      </CardContent>
    </Card>
  );
}
