import type { GuideDefinition } from "@/lib/guides/types";

export const musicGuide: GuideDefinition = {
  slug: "music",
  title: "Music",
  subtitle:
    "Music shapes the emotional arc of your whole day — the moment you walk down the aisle, the energy on the dance floor, the last song everyone sings together. This questionnaire helps eydn build a song shortlist, identify what to brief your DJ or band on, and make sure nothing important gets missed.",
  icon: "music",
  integrations: ["vendor-brief", "day-of-timeline", "chat-context"],
  sections: [
    {
      title: "Basics",
      questions: [
        {
          id: "q1",
          label: "What is your music budget?",
          field: { kind: "number", min: 0, unit: "$" },
          required: true,
        },
        {
          id: "q2",
          label:
            "Are you having live music, a DJ, a curated playlist, or a mix?",
          field: {
            kind: "select",
            options: [
              { value: "live-music", label: "Live music" },
              { value: "dj", label: "DJ" },
              { value: "playlist", label: "Playlist" },
              { value: "mix", label: "Mix" },
              { value: "not-sure", label: "Not sure yet" },
            ],
          },
        },
        {
          id: "q3",
          label: "Is your answer the same for both ceremony and reception?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No — specify each" },
            ],
          },
        },
      ],
    },
    {
      title: "Ceremony",
      questions: [
        {
          id: "q4",
          label: "Which moments need music?",
          field: {
            kind: "multi-select",
            options: [
              {
                value: "guests-arriving",
                label: "Guests arriving and being seated",
              },
              {
                value: "wedding-party-entrance",
                label: "Wedding party entrance",
              },
              { value: "couple-entrance", label: "Couple's entrance" },
              {
                value: "signing-register",
                label: "Signing of the register or license",
              },
              {
                value: "recessional",
                label: "Recessional (walking out together)",
              },
            ],
          },
        },
        {
          id: "q5",
          label:
            "Do you have specific songs in mind for any of these moments?",
          field: {
            kind: "textarea",
            placeholder: "List songs and moments, or skip",
            rows: 4,
          },
        },
        {
          id: "q6",
          label: "Are there any songs you absolutely do not want played?",
          field: {
            kind: "textarea",
            placeholder: "List songs to avoid, or skip",
            rows: 3,
          },
        },
      ],
    },
    {
      title: "Reception",
      questions: [
        {
          id: "q7",
          label: "What is the vibe for your reception music?",
          field: {
            kind: "multi-select",
            options: [
              { value: "romantic-classic", label: "Romantic and classic" },
              { value: "fun-high-energy", label: "Fun and high energy" },
              { value: "indie-alternative", label: "Indie and alternative" },
              { value: "rnb-hiphop", label: "R&B and hip hop" },
              { value: "country", label: "Country" },
              { value: "mixed-crowd-pleaser", label: "Mixed crowd pleaser" },
              { value: "let-them-decide", label: "Let the DJ or band decide" },
            ],
            max: 2,
          },
        },
        {
          id: "q8",
          label: "Do you have a first dance song?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "still-deciding", label: "Still deciding" },
            ],
          },
        },
        {
          id: "q9",
          label:
            "Any other key songs — parent dances, last song, cake cut?",
          field: {
            kind: "textarea",
            placeholder: "List songs and moments, or skip",
            rows: 3,
          },
        },
        {
          id: "q10",
          label:
            "Any genres, artists, or specific songs to avoid entirely?",
          field: {
            kind: "textarea",
            placeholder: "List items to avoid, or skip",
            rows: 3,
          },
        },
      ],
    },
    {
      title: "Practicalities",
      questions: [
        {
          id: "q11",
          label:
            "Does your venue have sound restrictions or a noise curfew?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure — need to check" },
            ],
          },
        },
        {
          id: "q12",
          label: "Do you want music during cocktail hour?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q13",
          label: "Will there be a microphone available for speeches?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure — venue to confirm" },
            ],
          },
        },
        {
          id: "q14",
          label:
            "Is there a dedicated area for a DJ setup or band stage at your venue?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
      ],
    },
    {
      title: "Outreach Summary",
      description:
        "eydn compiles your answers into a ready-to-send brief covering budget, vibe, must-play and do-not-play lists, venue restrictions, and curfew.",
      questions: [],
    },
  ],
  outcome:
    "Builds a song shortlist using the specific songs from your answers — a running list in the app you can add to, reorder, and share directly with your DJ or band. Generates a vendor brief you can copy or send straight from eydn — no reformatting needed. Adds a curfew reminder to your planning timeline if you flagged one.",
};
