import type { GuideDefinition } from "@/lib/guides/types";

const guestList: GuideDefinition = {
  slug: "guest-list",
  title: "Guest List",
  subtitle:
    "Let's figure out who's going to be there. This questionnaire helps Eydn build your guest list, flag any capacity issues early, and keep track of who's confirmed, who's a maybe, and who shouldn't be seated next to each other.",
  icon: "clipboard",
  integrations: ["guest-list", "chat-context"],
  outcome:
    "Your answers populate the guest list tab with groups and priority tiers. Eydn flags any capacity issues and prompts you to review your maybe list if you're over the limit. Accessibility notes are saved to individual guest profiles.",
  sections: [
    {
      title: "Capacity & Ground Rules",
      questions: [
        {
          id: "q1",
          label: "How many people can your venue hold?",
          field: { kind: "number", min: 1, placeholder: "Venue capacity" },
          required: true,
        },
        {
          id: "q2",
          label: "What is your ideal guest count?",
          field: { kind: "number", min: 1, placeholder: "Ideal guest count" },
          required: true,
        },
        {
          id: "q3",
          label: "Are children invited?",
          field: {
            kind: "select",
            options: [
              { value: "all-children", label: "Yes — all children" },
              { value: "immediate-family-only", label: "Yes — immediate family only" },
              { value: "no", label: "No" },
            ],
          },
        },
        {
          id: "q4",
          label: "Are plus-ones invited?",
          field: {
            kind: "select",
            options: [
              { value: "everyone", label: "Yes — everyone gets one" },
              { value: "couples-only", label: "Couples only" },
              { value: "no", label: "No plus-ones" },
            ],
          },
        },
        {
          id: "q5",
          label: "Will each of your families have input on the guest list?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes — roughly how many names each" },
              { value: "no", label: "No" },
              { value: "tbd", label: "Still to be discussed" },
            ],
          },
        },
        {
          id: "q6",
          label:
            "Is there anyone who will need accessibility accommodations — wheelchair access, hearing loops, seating near exits?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure yet" },
            ],
          },
        },
        {
          id: "q7",
          label:
            "Are you planning a virtual or livestream option for guests who can't attend in person?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "considering", label: "Considering it" },
            ],
          },
        },
      ],
    },
    {
      title: "Build Your List",
      description:
        "Don't worry about exact names yet — just think in groups. Eydn will help you organise them.",
      questions: [
        {
          id: "q8",
          label:
            "Who are your non-negotiables — the people you cannot imagine not being there?",
          field: { kind: "textarea", placeholder: "Names or groups", rows: 4 },
          required: true,
        },
        {
          id: "q9",
          label: "Who are your close friends you definitely want there?",
          field: { kind: "textarea", placeholder: "Names or groups", rows: 4 },
        },
        {
          id: "q10",
          label:
            "Who are you inviting out of obligation but are genuinely unsure about?",
          field: { kind: "textarea", placeholder: "Names or groups", rows: 4 },
        },
        {
          id: "q11",
          label:
            "Who is on your maybe list — people you'd invite if numbers allow?",
          field: { kind: "textarea", placeholder: "Names or groups", rows: 4 },
        },
        {
          id: "q12",
          label: "Is there anyone who cannot be seated near each other?",
          field: {
            kind: "textarea",
            placeholder: "Names or notes (optional)",
            rows: 3,
          },
        },
      ],
    },
    {
      title: "The Count",
      questions: [
        {
          id: "q13",
          label:
            "Based on the above, what is your current estimated total?",
          field: {
            kind: "number",
            min: 0,
            placeholder: "Estimated total guests",
          },
          tip: "Auto-calculated by Eydn where possible.",
        },
        {
          id: "q14",
          label: "Are you over, under, or at your venue capacity?",
          field: {
            kind: "select",
            options: [
              { value: "over", label: "Over" },
              { value: "under", label: "Under" },
              { value: "at", label: "At capacity" },
            ],
          },
          tip: "Auto-flagged by Eydn based on venue capacity and estimated total.",
        },
      ],
    },
  ],
};

export default guestList;
