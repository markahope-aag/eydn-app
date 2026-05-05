/**
 * Static fallback for the Colors & Theme inspiration board. Used when:
 *   - The Unsplash API key is missing in the runtime environment, or
 *   - Unsplash returns no results for the user's dynamic queries.
 *
 * Picked once via scripts/fetch-inspiration-fallback.mjs (which also fired
 * the required download_location ping for each photo). Re-run that script
 * if you want to refresh the set — don't hand-edit URLs here.
 *
 * Each image still includes its `track_url` so we ping again at the moment
 * the user actually saves the image to their mood board.
 */
export type InspirationFallbackImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographer_url: string;
  unsplash_url: string;
  track_url: string;
  query: string;
};

export const INSPIRATION_FALLBACK: InspirationFallbackImage[] = [
  {
    id: "JFyrNJCBc7g",
    url: "https://images.unsplash.com/photo-1768404768678-1597773abd28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1768404768678-1597773abd28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "A dense wall of small, pastel-colored roses.",
    photographer: "atelierbyvineeth",
    photographer_url: "https://unsplash.com/@atelierbyvineeth?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/JFyrNJCBc7g/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww",
    query: "wedding florals soft",
  },
  {
    id: "_GPxOouZI0w",
    url: "https://images.unsplash.com/photo-1767552659473-9a541393de94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1767552659473-9a541393de94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "A collection of soft pink and peach ranunculus flowers.",
    photographer: "Anya Chernykh",
    photographer_url: "https://unsplash.com/@anyachernykh?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/_GPxOouZI0w/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww",
    query: "wedding florals soft",
  },
  {
    id: "KJ4xYp1CgfA",
    url: "https://images.unsplash.com/photo-1625038032128-54ed70feb167?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwzfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1625038032128-54ed70feb167?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwzfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "White rose in bloom during daytime.",
    photographer: "Vitor Monthay",
    photographer_url: "https://unsplash.com/@vitormonthay?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/KJ4xYp1CgfA/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwzfHx3ZWRkaW5nJTIwZmxvcmFscyUyMHNvZnR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww",
    query: "wedding florals soft",
  },
  {
    id: "1d5RwcQFcH4",
    url: "https://images.unsplash.com/photo-1715615728013-67dac0141fe9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1715615728013-67dac0141fe9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "A vase filled with white flowers on top of a table.",
    photographer: "Antreina Stone",
    photographer_url: "https://unsplash.com/@antreinas?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/1d5RwcQFcH4/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww",
    query: "wedding table setting candlelight",
  },
  {
    id: "cNWnN1m-8b4",
    url: "https://images.unsplash.com/photo-1715615728044-71a6eac6c921?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1715615728044-71a6eac6c921?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "A vase filled with white and pink flowers on top of a table.",
    photographer: "Antreina Stone",
    photographer_url: "https://unsplash.com/@antreinas?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/cNWnN1m-8b4/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww",
    query: "wedding table setting candlelight",
  },
  {
    id: "hqCO0TYOeTU",
    url: "https://images.unsplash.com/photo-1637534371564-458a3a29972f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwzfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1637534371564-458a3a29972f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwzfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "A long table is set with candles and place settings.",
    photographer: "Nicole Geri",
    photographer_url: "https://unsplash.com/@nicolegeri?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/hqCO0TYOeTU/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwzfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwY2FuZGxlbGlnaHR8ZW58MXwxfHx8MTc3ODAyMTU1Nnww",
    query: "wedding table setting candlelight",
  },
  {
    id: "jIZNttn2q8w",
    url: "https://images.unsplash.com/photo-1776267887544-63aaed6851ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2VyZW1vbnklMjBhcmNofGVufDF8MXx8fDE3NzgwMjE1NTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1776267887544-63aaed6851ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2VyZW1vbnklMjBhcmNofGVufDF8MXx8fDE3NzgwMjE1NTd8MA&ixlib=rb-4.1.0&q=80&w=400",
    alt: "Wedding ceremony by the water with floral arch.",
    photographer: "Alexander Mass",
    photographer_url: "https://unsplash.com/@alexandermassph?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/jIZNttn2q8w/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY2VyZW1vbnklMjBhcmNofGVufDF8MXx8fDE3NzgwMjE1NTd8MA",
    query: "wedding ceremony arch",
  },
  {
    id: "K7Na4CjAwA0",
    url: "https://images.unsplash.com/photo-1767986012547-3fc29b18339f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwY2VyZW1vbnklMjBhcmNofGVufDF8MXx8fDE3NzgwMjE1NTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1767986012547-3fc29b18339f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwY2VyZW1vbnklMjBhcmNofGVufDF8MXx8fDE3NzgwMjE1NTd8MA&ixlib=rb-4.1.0&q=80&w=400",
    alt: "Two elegant chairs flank a small table with decorations.",
    photographer: "Cansu Hangül",
    photographer_url: "https://unsplash.com/@cansuhangul?utm_source=eydn-app&utm_medium=referral",
    unsplash_url: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
    track_url: "https://api.unsplash.com/photos/K7Na4CjAwA0/download?ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwY2VyZW1vbnklMjBhcmNofGVufDF8MXx8fDE3NzgwMjE1NTd8MA",
    query: "wedding ceremony arch",
  },
];
