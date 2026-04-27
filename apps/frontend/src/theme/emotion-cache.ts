import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';
import type { StylisPlugin } from '@emotion/cache';
import type { Direction } from './index';

export const createEmotionCache = (direction: Direction) =>
  createCache({
    key: direction === 'rtl' ? 'mui-rtl' : 'mui-ltr',
    stylisPlugins:
      direction === 'rtl'
        ? ([prefixer, rtlPlugin] as unknown as StylisPlugin[])
        : ([prefixer] as unknown as StylisPlugin[]),
  });
