import {
  Avatar,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/VerifiedRounded';
import MoreIcon from '@mui/icons-material/MoreVert';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type MouseEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { UserRole, UserStatus, type User } from '@eawlma/shared-types';

import { adminApi } from '@/api/admin.api';
import { usersApi } from '@/api/users.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { ConfirmDialog } from '@/components/global/ConfirmDialog';

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<UserStatus, 'default' | 'success' | 'warning' | 'error'> = {
  [UserStatus.PENDING]: 'warning',
  [UserStatus.ACTIVE]: 'success',
  [UserStatus.SUSPENDED]: 'error',
  [UserStatus.DEACTIVATED]: 'default',
};

const ROLE_COLORS: Record<UserRole, 'primary' | 'secondary' | 'info' | 'success' | 'default'> = {
  [UserRole.USER]: 'default',
  [UserRole.AGENT]: 'primary',
  [UserRole.AGENCY_ADMIN]: 'secondary',
  [UserRole.MODERATOR]: 'info',
  [UserRole.ADMIN]: 'success',
};

export function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [statusFilter, setStatusFilter] = useState<'' | UserStatus>('');
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; user: User } | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: 'role'; user: User; role: UserRole }
    | { kind: 'suspend'; user: User; reason: string }
    | { kind: 'reactivate'; user: User }
    | null
  >(null);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', { page, search, roleFilter, statusFilter }],
    queryFn: () =>
      adminApi.users({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const setRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => adminApi.setRole(id, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setConfirm(null);
    },
  });
  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.suspend(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setConfirm(null);
    },
  });
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.reactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setConfirm(null);
    },
  });
  const verifyRegaMutation = useMutation({
    mutationFn: (id: string) => usersApi.verifyRega(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const items = usersQuery.data?.data ?? [];
  const totalPages = usersQuery.data?.meta.totalPages ?? 1;

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('admin.users')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader title={t('admin.users')} subtitle={t('adminUsers.userCount', { count: usersQuery.data?.meta.total ?? 0 })} />

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('adminUsers.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ maxWidth: { md: 320 } }}
          />
          <TextField
            select size="small" label={t('adminUsers.role')}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserRole | ''); setPage(1); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('adminUsers.all')}</MenuItem>
            {Object.values(UserRole).map((r) => <MenuItem key={r} value={r}>{t(`adminUsers.roles.${r}`, { defaultValue: r })}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label={t('common.status')}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as UserStatus | ''); setPage(1); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('adminUsers.all')}</MenuItem>
            {Object.values(UserStatus).map((s) => <MenuItem key={s} value={s}>{t(`adminUsers.statuses.${s}`, { defaultValue: s })}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>{t('adminUsers.name')}</TableCell>
              <TableCell>{t('auth.email')}</TableCell>
              <TableCell>{t('adminUsers.role')}</TableCell>
              <TableCell>{t('adminUsers.verified')}</TableCell>
              <TableCell>{t('adminUsers.joined')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {usersQuery.isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton /></TableCell></TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>{t('adminUsers.empty')}</TableCell></TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ width: 48 }}>
                    <Avatar src={u.avatarUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                      {u.firstName?.[0]?.toUpperCase()}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.phone}</Typography>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Chip size="small" label={t(`adminUsers.roles.${u.role}`, { defaultValue: u.role })} color={ROLE_COLORS[u.role]} variant="filled" /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {u.emailVerified && <VerifiedIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                      {u.identityVerificationStatus === 'verified' && (
                        <VerifiedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      )}
                      {!u.emailVerified && u.identityVerificationStatus !== 'verified' && (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                      {(u.role === UserRole.AGENT || u.role === UserRole.AGENCY_ADMIN) &&
                        u.licenseNumber && (
                          <Chip
                            size="small"
                            label={
                              u.regaVerified
                                ? t('adminUsers.regaVerified', 'REGA ✓')
                                : t('adminUsers.verifyRega', 'Verify REGA')
                            }
                            color={u.regaVerified ? 'success' : 'warning'}
                            variant={u.regaVerified ? 'filled' : 'outlined'}
                            onClick={
                              u.regaVerified
                                ? undefined
                                : () => verifyRegaMutation.mutate(u.id)
                            }
                            sx={{
                              fontWeight: 700,
                              cursor: u.regaVerified ? 'default' : 'pointer',
                            }}
                          />
                        )}
                    </Stack>
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString(i18n.language)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={t(`adminUsers.statuses.${u.status}`, { defaultValue: u.status })} color={STATUS_COLORS[u.status]} variant="filled" sx={{ textTransform: 'capitalize' }} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e: MouseEvent<HTMLElement>) => setRowMenu({ anchor: e.currentTarget, user: u })}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination page={page} count={totalPages} onChange={(_, p) => setPage(p)} color="primary" />
        </Stack>
      )}

      {/* Row action menu */}
      <Menu open={!!rowMenu} anchorEl={rowMenu?.anchor} onClose={() => setRowMenu(null)}>
        <MenuItem disabled sx={{ opacity: 1, color: 'text.secondary', fontSize: 12 }}>
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adminUsers.changeRole')}</Typography>
          </Box>
        </MenuItem>
        {Object.values(UserRole).map((r) => (
          <MenuItem
            key={r}
            disabled={rowMenu?.user.role === r}
            onClick={() => {
              if (rowMenu) setConfirm({ kind: 'role', user: rowMenu.user, role: r });
              setRowMenu(null);
            }}
            sx={{ pl: 3 }}
          >
            {t(`adminUsers.roles.${r}`, { defaultValue: r })}
          </MenuItem>
        ))}
        <Box sx={{ borderTop: 1, borderColor: 'divider', my: 1 }} />
        {rowMenu?.user.status === UserStatus.SUSPENDED ? (
          <MenuItem
            onClick={() => {
              if (rowMenu) setConfirm({ kind: 'reactivate', user: rowMenu.user });
              setRowMenu(null);
            }}
          >
            {t('adminUsers.reactivateAccount')}
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              if (rowMenu) setConfirm({ kind: 'suspend', user: rowMenu.user, reason: '' });
              setRowMenu(null);
            }}
            sx={{ color: 'error.main' }}
          >
            {t('adminUsers.suspendAccount')}
          </MenuItem>
        )}
      </Menu>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirm?.kind === 'role'}
        title={t('adminUsers.changeRoleTitle', { role: confirm?.kind === 'role' ? t(`adminUsers.roles.${confirm.role}`, { defaultValue: confirm.role }) : '' })}
        description={confirm?.kind === 'role' ? t('adminUsers.changeRoleDescription', { name: `${confirm.user.firstName} ${confirm.user.lastName}` }) : undefined}
        loading={setRoleMutation.isPending}
        onConfirm={() => {
          if (confirm?.kind === 'role') setRoleMutation.mutate({ id: confirm.user.id, role: confirm.role });
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'suspend'}
        title={t('adminUsers.suspendTitle')}
        description={confirm?.kind === 'suspend' ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t('adminUsers.suspendDescription', { name: `${confirm.user.firstName} ${confirm.user.lastName}` })}
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t('adminUsers.suspendReasonLabel')}
              value={confirm.reason}
              onChange={(e) => setConfirm({ ...confirm, reason: e.target.value })}
            />
          </Stack>
        ) : undefined}
        destructive
        confirmLabel={t('admin.suspend')}
        loading={suspendMutation.isPending}
        onConfirm={() => {
          if (confirm?.kind === 'suspend' && confirm.reason.trim().length >= 5) {
            suspendMutation.mutate({ id: confirm.user.id, reason: confirm.reason.trim() });
          }
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'reactivate'}
        title={t('adminUsers.reactivateTitle')}
        description={confirm?.kind === 'reactivate' ? t('adminUsers.reactivateDescription', { name: `${confirm.user.firstName} ${confirm.user.lastName}` }) : undefined}
        loading={reactivateMutation.isPending}
        onConfirm={() => {
          if (confirm?.kind === 'reactivate') reactivateMutation.mutate(confirm.user.id);
        }}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
