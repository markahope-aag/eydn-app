/**
 * Static Unsplash picks used as decorative imagery in empty states and a few
 * intro surfaces. Picked once via scripts/fetch-empty-state-images.mjs, which
 * also fired Unsplash's required download_location ping. Re-run that script if
 * you want to swap a slot — don't hand-pick URLs into this file.
 *
 * Attribution rendered inline by the EmptyState component (or the consumer
 * surface) per Unsplash's referral guidelines.
 */
export type EmptyStateImage = {
  url: string;
  thumb: string;
  alt: string;
  unsplash_id: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
};

export const EMPTY_STATE_IMAGES = {
  tasks_empty: {
    url: "https://images.unsplash.com/photo-1727812100174-eeb12d758494?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHxvcGVuJTIwbm90ZWJvb2slMjBkZXNrJTIwcGVuJTIwY2FsbXxlbnwxfDB8fHwxNzc4MDE4OTIwfDA&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1727812100174-eeb12d758494?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHxvcGVuJTIwbm90ZWJvb2slMjBkZXNrJTIwcGVuJTIwY2FsbXxlbnwxfDB8fHwxNzc4MDE4OTIwfDA&ixlib=rb-4.1.0&q=80&w=400",
    alt: "An open notebook on a desk",
    unsplash_id: "gc3MKGke_9g",
    photographer: "Amanda Lawrence",
    photographerUrl: "https://unsplash.com/@aklawrence?utm_source=eydn-app&utm_medium=referral",
    unsplashUrl: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
  },
  guests_empty: {
    url: "https://images.unsplash.com/photo-1542617270-b0feb83555eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcGxhY2UlMjBjYXJkJTIwY2FsbGlncmFwaHl8ZW58MXwwfHx8MTc3ODAxODkyMHww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1542617270-b0feb83555eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwcGxhY2UlMjBjYXJkJTIwY2FsbGlncmFwaHl8ZW58MXwwfHx8MTc3ODAxODkyMHww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "Soft pink and white ceramic place settings",
    unsplash_id: "XZf961nqw-w",
    photographer: "micheile henderson",
    photographerUrl: "https://unsplash.com/@micheile?utm_source=eydn-app&utm_medium=referral",
    unsplashUrl: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
  },
  vendors_empty: {
    url: "https://images.unsplash.com/photo-1708519655503-f8b8a08bdf35?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmxvcmlzdCUyMGhhbmRzJTIwYXJyYW5nZW1lbnR8ZW58MXwwfHx8MTc3ODAxODkyMXww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1708519655503-f8b8a08bdf35?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZmxvcmlzdCUyMGhhbmRzJTIwYXJyYW5nZW1lbnR8ZW58MXwwfHx8MTc3ODAxODkyMXww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "Florists arranging flowers by hand",
    unsplash_id: "-S5dWY4w_ho",
    photographer: "Viktoriia Yatsentiuk",
    photographerUrl: "https://unsplash.com/@gloriaviktoriia?utm_source=eydn-app&utm_medium=referral",
    unsplashUrl: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
  },
  party_empty: {
    url: "https://images.unsplash.com/photo-1680968421548-7f1f8cd95210?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwbGF1Z2hpbmclMjBzb2Z0JTIwbGlnaHR8ZW58MXwwfHx8MTc3ODAxODkyMXww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1680968421548-7f1f8cd95210?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwbGF1Z2hpbmclMjBzb2Z0JTIwbGlnaHR8ZW58MXwwfHx8MTc3ODAxODkyMXww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "Friends standing together in soft light",
    unsplash_id: "EEELIPJtXrU",
    photographer: "Abbat",
    photographerUrl: "https://unsplash.com/@abbat?utm_source=eydn-app&utm_medium=referral",
    unsplashUrl: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
  },
  moodboard_intro: {
    url: "https://images.unsplash.com/photo-1664638413302-d1ca29ac885b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHxmYWJyaWMlMjBzd2F0Y2hlcyUyMGNvbG9yJTIwcGFsZXR0ZSUyMGZsYXRsYXl8ZW58MXwwfHx8MTc3ODAxODkyMnww&ixlib=rb-4.1.0&q=80&w=1080",
    thumb: "https://images.unsplash.com/photo-1664638413302-d1ca29ac885b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MzQyMDF8MHwxfHNlYXJjaHwxfHxmYWJyaWMlMjBzd2F0Y2hlcyUyMGNvbG9yJTIwcGFsZXR0ZSUyMGZsYXRsYXl8ZW58MXwwfHx8MTc3ODAxODkyMnww&ixlib=rb-4.1.0&q=80&w=400",
    alt: "Inspiration palette flatlay",
    unsplash_id: "D6mlvnGbAVg",
    photographer: "Mohammad Lotfian",
    photographerUrl: "https://unsplash.com/@mohalotfi?utm_source=eydn-app&utm_medium=referral",
    unsplashUrl: "https://unsplash.com/?utm_source=eydn-app&utm_medium=referral",
  },
} as const satisfies Record<string, EmptyStateImage>;

export type EmptyStateImageKey = keyof typeof EMPTY_STATE_IMAGES;
