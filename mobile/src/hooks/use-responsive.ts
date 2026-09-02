import { useWindowDimensions } from 'react-native';

/**
 * What size of screen this is, right now.
 *
 * Everything here comes from `useWindowDimensions`, which re-renders on
 * rotation — unlike `Dimensions.get('window')`, which reads once and then lies
 * for the rest of the session. That distinction is the whole reason this hook
 * exists rather than a constant.
 *
 * **A device is classified by its shortest side, not its current width.** A Note
 * 20 turned sideways is about 850dp across, which is wider than a tablet held
 * upright — so keying off `width` would hand a phone the tablet layout every
 * time someone rotated it. The short side does not change when you rotate, so
 * `isTablet` stays true of the device rather than of the moment. It is the same
 * rule Android's own `sw600dp` resource qualifier uses.
 */

/** Shortest-side threshold for a tablet. Android's `sw600dp`, and it holds:
 *  a Xiaomi Pad 6S Pro is ~677dp on its short side, a Note 20 ~412dp. */
const TABLET_SHORT_SIDE = 600;

/** Beyond this, a single column of text is too wide to read comfortably. */
const READABLE_COLUMN = 800;

export interface Responsive {
  width: number;
  height: number;
  /** True for the device, in either orientation. */
  isTablet: boolean;
  landscape: boolean;
  /**
   * Columns for a card grid at this width. Phones stay at 2 in both
   * orientations — a phone in landscape is short, and three rows of cards would
   * leave almost nothing visible above the fold.
   */
  columns: number;
  /**
   * Width cap for a single column of prose or form fields.
   *
   * Phones get the full width. Tablets get the readable cap, which is what a
   * form should still obey — the extra room on a tablet is meant to be spent on
   * *more* content per row, not on stretching one field across the whole
   * screen. Grids ignore this and use `columns` instead.
   */
  readingWidth: number | undefined;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_SHORT_SIDE;
  const landscape = width > height;

  const columns = !isTablet ? 2 : landscape ? 4 : 3;

  return {
    width,
    height,
    isTablet,
    landscape,
    columns,
    readingWidth: isTablet ? READABLE_COLUMN : undefined,
  };
}
