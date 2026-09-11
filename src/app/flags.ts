/**
 * Runtime flags read once at startup from the query string and media queries.
 *
 *   ?debug=1        mount the audio studio dashboard (lazy chunk)
 *   ?seed=1234      fixed run seed for reproducible play (used from Milestone 5)
 *   ?motion=reduce  force reduced motion regardless of OS setting
 *   ?test=1         install the window.__drunkenRobot hook used by end-to-end tests
 */
export interface AppFlags {
  debug: boolean;
  seed: number | null;
  reducedMotion: boolean;
  coarsePointer: boolean;
  test: boolean;
}

function media(query: string): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches
  );
}

export function readFlags(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): AppFlags {
  const params = new URLSearchParams(search);
  const seedRaw = params.get('seed');
  const seed = seedRaw !== null && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;

  return {
    debug: params.get('debug') === '1',
    seed,
    reducedMotion: params.get('motion') === 'reduce' || media('(prefers-reduced-motion: reduce)'),
    coarsePointer: media('(pointer: coarse)'),
    test: params.get('test') === '1',
  };
}
