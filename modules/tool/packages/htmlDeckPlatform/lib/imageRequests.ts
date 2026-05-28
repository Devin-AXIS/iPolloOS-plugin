import type { DeckState, SlideSpec } from './types';
import { resolveDeckTheme } from './themes';

type ImageRequest = {
  slide_index: number;
  slide_title: string;
  role: string;
  prompt: string;
  reference_urls: string[];
  size: string;
  target: {
    field: 'image_url';
    layout_id: string;
    position: 'left' | 'right';
  };
};

function normalizeReferenceUrls(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildDeckImageStyleLock(state: DeckState): string {
  const pack = resolveDeckTheme(state.meta.theme_id);
  return [
    `Deck theme: ${pack.label} (${pack.id}).`,
    `Theme intent: ${pack.hint}.`,
    `Use only the deck color family: primary ${pack.colors.brand_primary}, secondary ${pack.colors.brand_secondary}, tertiary ${pack.colors.brand_tertiary}, paper ${pack.colors.page_background}, ink ${pack.colors.text_color}.`,
    'Generate a local visual asset for a professional HTML presentation, not a complete slide.',
    'Leave clean negative space, avoid embedded text, avoid random stock-photo look, avoid clashing colors.'
  ].join(' ');
}

export function buildSlideImagePrompt(args: {
  state: DeckState;
  slide: SlideSpec;
  imagePrompt: string;
  role: string;
}): string {
  const bullets = args.slide.bullets?.length
    ? `Slide points: ${args.slide.bullets.join(' | ')}.`
    : '';
  return [
    buildDeckImageStyleLock(args.state),
    `Image role: ${args.role}.`,
    `Slide title: ${args.slide.title ?? args.state.meta.title}.`,
    bullets,
    `Image brief: ${args.imagePrompt.trim()}`
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseImageReferenceUrls(raw: string | undefined): string[] {
  return normalizeReferenceUrls(raw);
}

export function collectDeckImageRequests(state: DeckState): ImageRequest[] {
  return state.slides.flatMap((slide, index) => {
    if (!slide.image_request || slide.image?.url) return [];
    const position = slide.image_request.role === 'left_illustration' ? 'left' : 'right';
    return [
      {
        slide_index: index + 1,
        slide_title: slide.title ?? '',
        role: slide.image_request.role,
        prompt: slide.image_request.prompt,
        reference_urls: slide.image_request.reference_urls ?? [],
        size: slide.image_request.size ?? '1536x1024',
        target: {
          field: 'image_url',
          layout_id: slide.layout,
          position
        }
      }
    ];
  });
}
