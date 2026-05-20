import { Box, FormControl, MenuItem, Select } from '@mui/material';
import { Language } from '@mui/icons-material';
import i18n from 'i18next';
import { useState } from 'react';

const LANGS = [
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'ur', label: '🇵🇰 اردو' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'tr', label: '🇹🇷 Türkçe' },
  { code: 'ru', label: '🇷🇺 Русский' },
];

/**
 * Compact language picker for the auth pages — lets a visitor switch the UI
 * language before they sign in. Persists the choice to `eawlma.locale` so the
 * rest of the app (and the next visit) honours it.
 */
export function AuthLanguageSwitcher() {
  const [lang, setLang] = useState(i18n.language);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={LANGS.some((l) => l.code === lang) ? lang : 'en'}
          onChange={(e) => {
            const next = e.target.value;
            setLang(next);
            void i18n.changeLanguage(next);
            localStorage.setItem('eawlma.locale', next);
          }}
          startAdornment={<Language sx={{ mr: 1, color: 'text.secondary' }} />}
        >
          {LANGS.map((l) => (
            <MenuItem key={l.code} value={l.code}>
              {l.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
