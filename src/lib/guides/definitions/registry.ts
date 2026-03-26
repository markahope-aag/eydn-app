import type { GuideDefinition } from "@/lib/guides/types";

const registryGuide: GuideDefinition = {
  slug: "registry",
  title: "Gift Registry",
  subtitle:
    "Let's set up your gift registry. This guide walks you through choosing a registry platform, deciding what to ask for, and getting your links into Eydn so guests can find them easily.",
  icon: "gift",
  integrations: ["chat-context"],
  outcome:
    "Your registry links are saved to your wedding website. Eydn adds them to your day-of binder and guest-facing pages so guests always know where to find them.",
  sections: [
    {
      title: "Choose Your Registry",
      description:
        "Most couples use one or two registries. Pick the one(s) that match what you're looking for.",
      questions: [
        {
          id: "q1",
          label: "Which registry platform(s) are you using or considering?",
          field: {
            kind: "multi-select",
            options: [
              { value: "amazon", label: "Amazon" },
              { value: "zola", label: "Zola" },
              { value: "target", label: "Target" },
              { value: "crate-barrel", label: "Crate & Barrel" },
              { value: "williams-sonoma", label: "Williams Sonoma" },
              { value: "pottery-barn", label: "Pottery Barn" },
              { value: "bed-bath", label: "Bed Bath & Beyond" },
              { value: "etsy", label: "Etsy" },
              { value: "honeyfund", label: "Honeyfund (cash/experiences)" },
              { value: "venmo-cashapp", label: "Venmo / Cash App" },
              { value: "other", label: "Other" },
            ],
          },
          required: true,
        },
        {
          id: "q1b",
          label: "If you selected Other, which platform(s)?",
          field: { kind: "text", placeholder: "e.g. Blueprint Registry, MyRegistry" },
        },
        {
          id: "q2",
          label: "Have you already created your registry, or do you still need to set it up?",
          field: {
            kind: "select",
            options: [
              { value: "created", label: "Already created" },
              { value: "in-progress", label: "Started but not finished" },
              { value: "not-started", label: "Haven't started yet" },
            ],
          },
          required: true,
        },
      ],
    },
    {
      title: "Setting Up on Amazon",
      description:
        "Amazon is the most popular wedding registry. Here's how to get started if you're using it.",
      questions: [
        {
          id: "q3",
          label: "Are you using Amazon for your registry?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No — skip this section" },
            ],
          },
        },
        {
          id: "q4",
          label: "Have you created your Amazon Wedding Registry yet?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes, it's live" },
              { value: "no", label: "Not yet" },
            ],
          },
          tip: "Go to amazon.com/wedding → Create a Registry. Sign in with your Amazon account, enter your wedding date and partner's name, and you're set up in under 2 minutes.",
        },
        {
          id: "q5",
          label: "Did you know Amazon offers a 20% completion discount?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes, I knew" },
              { value: "no", label: "No — tell me more" },
            ],
          },
          tip: "After your wedding date, Amazon gives you a 20% discount on remaining items from your registry. It's valid for 60 days, so add items you want even if no one buys them — you can get them at a discount later.",
        },
        {
          id: "q6",
          label: "Paste your Amazon registry URL here (if you have it)",
          field: { kind: "text", placeholder: "https://www.amazon.com/wedding/..." },
        },
      ],
    },
    {
      title: "What to Register For",
      description:
        "A good registry has a range of price points so every guest can find something in their budget.",
      questions: [
        {
          id: "q7",
          label: "What types of gifts are you most interested in?",
          field: {
            kind: "multi-select",
            options: [
              { value: "kitchen", label: "Kitchen & cooking" },
              { value: "home-decor", label: "Home decor" },
              { value: "bedding-bath", label: "Bedding & bath" },
              { value: "outdoor", label: "Outdoor & garden" },
              { value: "experiences", label: "Experiences & travel" },
              { value: "cash-fund", label: "Cash / honeymoon fund" },
              { value: "charity", label: "Charitable donations" },
              { value: "tech", label: "Tech & electronics" },
            ],
          },
        },
        {
          id: "q8",
          label: "What price range do you want to cover?",
          field: {
            kind: "select",
            options: [
              { value: "budget", label: "Mostly under $50" },
              { value: "mid", label: "Mix of $25–$150" },
              { value: "wide", label: "Full range — $15 to $500+" },
              { value: "high", label: "Mostly higher-end items" },
            ],
          },
          tip: "Aim for about 50% of items under $50, 30% in the $50–150 range, and 20% above $150. This way every guest can find something comfortable.",
        },
        {
          id: "q9",
          label: "How many items are you planning to add?",
          field: {
            kind: "select",
            options: [
              { value: "small", label: "Under 30 items" },
              { value: "medium", label: "30–75 items" },
              { value: "large", label: "75+ items" },
            ],
          },
          tip: "A good rule of thumb is 1.5–2 items per guest. If you're inviting 100 people, aim for 150–200 items across all your registries.",
        },
      ],
    },
    {
      title: "Cash Funds & Experiences",
      questions: [
        {
          id: "q10",
          label: "Are you including a cash fund or honeymoon fund?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "considering", label: "Considering it" },
            ],
          },
        },
        {
          id: "q11",
          label: "If yes, which platform are you using for cash gifts?",
          field: {
            kind: "select",
            options: [
              { value: "zola", label: "Zola cash fund" },
              { value: "honeyfund", label: "Honeyfund" },
              { value: "venmo", label: "Venmo" },
              { value: "registry-cash", label: "Amazon/Target cash fund option" },
              { value: "other", label: "Other" },
              { value: "na", label: "Not applicable" },
            ],
          },
        },
      ],
    },
    {
      title: "Your Registry Links",
      description:
        "Paste your registry URLs below. Eydn will add them to your wedding website so guests can find them easily.",
      questions: [
        {
          id: "q12",
          label: "Registry link #1",
          field: { kind: "text", placeholder: "https://..." },
        },
        {
          id: "q12_name",
          label: "Name for link #1",
          field: { kind: "text", placeholder: "e.g. Amazon Registry, Zola" },
        },
        {
          id: "q13",
          label: "Registry link #2 (optional)",
          field: { kind: "text", placeholder: "https://..." },
        },
        {
          id: "q13_name",
          label: "Name for link #2",
          field: { kind: "text", placeholder: "e.g. Honeyfund, Target" },
        },
        {
          id: "q14",
          label: "Registry link #3 (optional)",
          field: { kind: "text", placeholder: "https://..." },
        },
        {
          id: "q14_name",
          label: "Name for link #3",
          field: { kind: "text", placeholder: "e.g. Etsy, Cash Fund" },
        },
      ],
    },
  ],
};

export default registryGuide;
