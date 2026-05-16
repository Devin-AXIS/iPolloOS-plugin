import type { DeckState } from './types';
import { resolveDeckTheme, themeToDeckStateTheme, type DeckThemeId } from './themes';

export {
  DECK_THEMES,
  DECK_THEME_IDS,
  ThemeIdEnum,
  resolveDeckTheme,
  themeGuideForAgent,
  themeSelectList,
  themeCssVars
} from './themes';
export type { DeckThemeId, DeckThemePack, ThemeColorGroup } from './themes';

export function createDeckState(args: {
  title: string;
  subtitle?: string;
  themeId?: string;
  logoUrl?: string;
  mastheadRight?: string;
}): DeckState {
  const pack = resolveDeckTheme(args.themeId);
  return {
    v: 2,
    meta: {
      title: args.title,
      subtitle: args.subtitle || undefined,
      theme_id: pack.id,
      logo_url: args.logoUrl || undefined,
      masthead_right: args.mastheadRight || pack.label,
      canvas_w: 1920,
      canvas_h: 1080
    },
    theme: themeToDeckStateTheme(pack),
    slides: []
  };
}
