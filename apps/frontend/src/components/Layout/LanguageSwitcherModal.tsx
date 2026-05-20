import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type UiLanguage } from '@/store/ui.store';

export interface LanguageOption {
  code: string;
  flag: string;
  nativeName: string;
  englishName: string;
}

// All 38 locales we ship full UI translations for. Selecting one of these
// switches the i18n locale (and therefore RTL/LTR direction).
export const INTERFACE_LANGUAGES: ReadonlyArray<LanguageOption & { code: UiLanguage }> = [
  { code: 'ar', flag: '🇸🇦', nativeName: 'العربية', englishName: 'Arabic' },
  { code: 'en', flag: '🇬🇧', nativeName: 'English', englishName: 'English' },
  { code: 'ur', flag: '🇵🇰', nativeName: 'اردو', englishName: 'Urdu' },
  { code: 'fr', flag: '🇫🇷', nativeName: 'Français', englishName: 'French' },
  { code: 'es', flag: '🇪🇸', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'de', flag: '🇩🇪', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'it', flag: '🇮🇹', nativeName: 'Italiano', englishName: 'Italian' },
  { code: 'pt', flag: '🇵🇹', nativeName: 'Português', englishName: 'Portuguese' },
  { code: 'nl', flag: '🇳🇱', nativeName: 'Nederlands', englishName: 'Dutch' },
  { code: 'tr', flag: '🇹🇷', nativeName: 'Türkçe', englishName: 'Turkish' },
  { code: 'ru', flag: '🇷🇺', nativeName: 'Русский', englishName: 'Russian' },
  { code: 'pl', flag: '🇵🇱', nativeName: 'Polski', englishName: 'Polish' },
  { code: 'ro', flag: '🇷🇴', nativeName: 'Română', englishName: 'Romanian' },
  { code: 'sv', flag: '🇸🇪', nativeName: 'Svenska', englishName: 'Swedish' },
  { code: 'da', flag: '🇩🇰', nativeName: 'Dansk', englishName: 'Danish' },
  { code: 'fi', flag: '🇫🇮', nativeName: 'Suomi', englishName: 'Finnish' },
  { code: 'no', flag: '🇳🇴', nativeName: 'Norsk', englishName: 'Norwegian' },
  { code: 'af', flag: '🇿🇦', nativeName: 'Afrikaans', englishName: 'Afrikaans' },
  { code: 'id', flag: '🇮🇩', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { code: 'ms', flag: '🇲🇾', nativeName: 'Bahasa Melayu', englishName: 'Malay' },
  { code: 'tl', flag: '🇵🇭', nativeName: 'Tagalog', englishName: 'Filipino' },
  { code: 'vi', flag: '🇻🇳', nativeName: 'Tiếng Việt', englishName: 'Vietnamese' },
  { code: 'th', flag: '🇹🇭', nativeName: 'ภาษาไทย', englishName: 'Thai' },
  { code: 'sw', flag: '🇰🇪', nativeName: 'Kiswahili', englishName: 'Swahili' },
  { code: 'am', flag: '🇪🇹', nativeName: 'አማርኛ', englishName: 'Amharic' },
  { code: 'hi', flag: '🇮🇳', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { code: 'bn', flag: '🇧🇩', nativeName: 'বাংলা', englishName: 'Bengali' },
  { code: 'ne', flag: '🇳🇵', nativeName: 'नेपाली', englishName: 'Nepali' },
  { code: 'ta', flag: '🇮🇳', nativeName: 'தமிழ்', englishName: 'Tamil' },
  { code: 'te', flag: '🇮🇳', nativeName: 'తెలుగు', englishName: 'Telugu' },
  { code: 'gu', flag: '🇮🇳', nativeName: 'ગુજરાતી', englishName: 'Gujarati' },
  { code: 'mr', flag: '🇮🇳', nativeName: 'मराठी', englishName: 'Marathi' },
  { code: 'si', flag: '🇱🇰', nativeName: 'සිංහල', englishName: 'Sinhala' },
  { code: 'zh', flag: '🇨🇳', nativeName: '中文', englishName: 'Chinese' },
  { code: 'ko', flag: '🇰🇷', nativeName: '한국어', englishName: 'Korean' },
  { code: 'ja', flag: '🇯🇵', nativeName: '日本語', englishName: 'Japanese' },
  { code: 'fa', flag: '🇮🇷', nativeName: 'فارسی', englishName: 'Persian' },
  { code: 'he', flag: '🇮🇱', nativeName: 'עברית', englishName: 'Hebrew' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onLanguageChange: (lng: UiLanguage) => void;
}

/**
 * Language picker for the app interface. Selecting a language switches the
 * i18n locale (full UI swap, drives RTL/LTR direction). Incoming chat messages
 * are auto-translated into the reader's language by the backend — there is no
 * manual "translate messages into" setting.
 */
export function LanguageSwitcherModal({ open, onClose, onLanguageChange }: Props) {
  const { t, i18n } = useTranslation();

  const [search, setSearch] = useState('');

  const filterFn = (l: LanguageOption) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.englishName.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  };

  const interfaceFiltered = useMemo(() => INTERFACE_LANGUAGES.filter(filterFn), [search]);

  const handlePickInterface = (code: UiLanguage) => {
    onLanguageChange(code);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '85vh' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {t('language.title', 'Choose your language')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('language.subtitle', 'Switch the language used across the app.')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="close" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('language.searchPlaceholder', 'Search languages…')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            sx: { borderRadius: 2 },
          }}
          sx={{ mb: 2 }}
        />

        {interfaceFiltered.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}
            >
              {t('language.interface', 'Interface language')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('language.interfaceHint', 'Full UI translation.')}
            </Typography>
            <Stack spacing={0.5}>
              {interfaceFiltered.map((l) => (
                <LanguageRow
                  key={l.code}
                  option={l}
                  selected={i18n.language === l.code}
                  onClick={() => handlePickInterface(l.code)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {interfaceFiltered.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {t('language.noMatches', 'No languages match your search.')}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LanguageRow({
  option,
  selected,
  onClick,
}: {
  option: LanguageOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      selected={selected}
      sx={{
        borderRadius: 2,
        py: 1.25,
        px: 2,
        gap: 1.5,
        '&.Mui-selected': {
          bgcolor: 'primary.lighter',
          '&:hover': { bgcolor: 'primary.light' },
        },
      }}
    >
      <Box sx={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{option.flag}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={selected ? 700 : 600} noWrap>
          {option.nativeName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {option.englishName}
        </Typography>
      </Box>
      {selected && <CheckIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />}
    </ListItemButton>
  );
}
