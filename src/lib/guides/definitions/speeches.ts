import type { GuideDefinition } from "@/lib/guides/types";

export const speechesGuide: GuideDefinition = {
  slug: "speeches",
  title: "Speeches",
  subtitle:
    "Speeches are one of the most memorable parts of the day — for better or worse. This questionnaire helps eydn track who's speaking, keep things running on time, and make sure your speakers have everything they need well before the wedding day.",
  icon: "mic",
  integrations: ["day-of-timeline", "chat-context"],
  sections: [
    {
      title: "Timing & Structure",
      questions: [
        {
          id: "q1",
          label: "When are speeches happening?",
          field: {
            kind: "select",
            options: [
              { value: "before-dinner", label: "Before dinner" },
              { value: "after-dinner", label: "After dinner" },
              { value: "both", label: "Both" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q2",
          label: "Do you have a total time limit for all speeches?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "checking", label: "Checking with venue or caterer" },
            ],
          },
        },
        {
          id: "q3",
          label: "How many speeches are you planning?",
          field: { kind: "number", min: 0 },
          tip: "eydn will use this to suggest a per-speaker time guide.",
        },
      ],
    },
    {
      title: "Who is Speaking",
      questions: [
        {
          id: "q4",
          label: "Who is giving a speech?",
          field: {
            kind: "multi-select",
            options: [
              { value: "partner-1", label: "Partner 1" },
              { value: "partner-2", label: "Partner 2" },
              { value: "best-man", label: "Best man" },
              { value: "maid-of-honour", label: "Maid of honour" },
              { value: "father-partner-1", label: "Father of Partner 1" },
              { value: "father-partner-2", label: "Father of Partner 2" },
              { value: "mother-partner-1", label: "Mother of Partner 1" },
              { value: "mother-partner-2", label: "Mother of Partner 2" },
              { value: "other", label: "Other" },
            ],
          },
        },
        {
          id: "q5",
          label:
            "For each speaker — have they confirmed they're doing it?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-asked", label: "Not asked yet" },
            ],
          },
        },
        {
          id: "q6",
          label:
            "Does any speaker need help writing or structuring their speech?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ],
          },
          tip: "eydn can help with speech structure, opening lines, and tone — just ask in the chat.",
        },
      ],
    },
    {
      title: "The Tone",
      questions: [
        {
          id: "q7",
          label: "How do you want the speeches to feel overall?",
          field: {
            kind: "multi-select",
            options: [
              { value: "heartfelt-emotional", label: "Heartfelt and emotional" },
              { value: "funny-light", label: "Funny and light" },
              { value: "short-sweet", label: "Short and sweet" },
              { value: "funny-touching", label: "Mix of funny and touching" },
              { value: "formal-traditional", label: "Formal and traditional" },
            ],
            max: 2,
          },
        },
        {
          id: "q8",
          label: "Is there anything you do not want mentioned?",
          field: {
            kind: "textarea",
            placeholder:
              "This is for your reference and eydn's, not shared with speakers unless you choose to",
            rows: 3,
          },
        },
        {
          id: "q9",
          label:
            "Are there any guests who should be acknowledged or thanked in speeches?",
          field: {
            kind: "textarea",
            placeholder: "List names or skip",
            rows: 3,
          },
        },
        {
          id: "q10",
          label:
            "Would you like to review speeches before the wedding day?",
          field: {
            kind: "select",
            options: [
              {
                value: "yes",
                label: "Yes — I'd like to see them in advance",
              },
              {
                value: "no",
                label: "No — I'd rather be surprised",
              },
              { value: "up-to-speaker", label: "Up to the speaker" },
            ],
          },
        },
      ],
    },
    {
      title: "Logistics",
      questions: [
        {
          id: "q11",
          label: "Will there be a microphone?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              {
                value: "not-sure",
                label: "Not sure — need to confirm with venue",
              },
            ],
          },
        },
        {
          id: "q12",
          label:
            "Who is managing the order and timing of speeches on the day?",
          field: {
            kind: "select",
            options: [
              { value: "mc", label: "MC" },
              { value: "venue-coordinator", label: "Venue coordinator" },
              { value: "one-of-us", label: "One of us" },
              { value: "not-decided", label: "Not decided" },
            ],
          },
        },
        {
          id: "q13",
          label:
            "Do any speakers have nerves or accessibility needs — vision issues for reading notes, mobility for standing?",
          field: {
            kind: "textarea",
            placeholder: "Describe or skip",
            rows: 3,
          },
        },
      ],
    },
    {
      title: "Outreach Summary",
      description:
        "eydn adds your speeches lineup to the day-of timeline and sends confirmed speakers a reminder as the wedding approaches.",
      questions: [],
    },
  ],
  outcome:
    "Adds each confirmed speaker to your day-of timeline with their allocated time slot. Flags any speakers who haven't confirmed yet. If anyone needs help with their speech, eydn's chat is ready to assist with structure, tone, and ideas.",
};
