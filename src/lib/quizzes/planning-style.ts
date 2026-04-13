import type { ArchetypeQuiz } from "./types";

export const planningStyleQuiz: ArchetypeQuiz = {
  id: "planning_style",
  slug: "wedding-planning-style",
  title: "What's your wedding planning style?",
  subtitle: "Eight questions. Two minutes. We'll send you your archetype and a tip matched to how you actually plan.",
  questions: [
    {
      id: 1,
      prompt: "Your venue deposit is due in two weeks. How do you handle it?",
      options: [
        { label: "Already done — I set a reminder the day we booked.", value: "SC" },
        { label: "I'll deal with it when the reminder pops up.", value: "VP" },
        { label: "My partner is handling that one.", value: "DE" },
        { label: "I know it's coming but I keep putting it off.", value: "VP" },
      ],
    },
    {
      id: 2,
      prompt: "When you think about your wedding budget, what feels most true?",
      options: [
        { label: "I have a spreadsheet with every line item and a contingency column.", value: "SC" },
        { label: "We have a rough number and we're figuring it out as we go.", value: "VP" },
        { label: "Honestly, someone else is more on top of the numbers than I am.", value: "DE" },
        { label: "I know exactly what I want — I just need to make sure we can afford it.", value: "DO" },
      ],
    },
    {
      id: 3,
      prompt: "How do you make decisions under pressure — say, picking between two venues?",
      options: [
        { label: "I make a comparison matrix. Cost, capacity, vibe, parking — all of it.", value: "SC" },
        { label: "I go with my gut. If it feels right, it probably is.", value: "VP" },
        { label: "I ask everyone I trust and take the temperature.", value: "BD" },
        { label: "I research every detail until I'm confident I've made the right call.", value: "DO" },
      ],
    },
    {
      id: 4,
      prompt: "It's 11pm and you just found out your florist double-booked your date. How do you respond?",
      options: [
        { label: "I already have a backup list. I'm making calls tomorrow morning.", value: "SC" },
        { label: "I'd spiral a little, then sleep on it.", value: "VP" },
        { label: "I'd lean on my partner or a family member to sort it out.", value: "DE" },
        { label: "I'd be up until 2am reading every florist review in a 30-mile radius.", value: "DO" },
      ],
    },
    {
      id: 5,
      prompt: "How do you feel about delegating tasks to other people?",
      options: [
        { label: "Hard pass. If I want it done right, I do it myself.", value: "DO" },
        { label: "Love it — I'd rather set the vision and let others execute.", value: "DE" },
        { label: "I delegate some things but keep the important stuff to myself.", value: "BD" },
        { label: "I'm getting better at it, but it stresses me out a little.", value: "VP" },
      ],
    },
    {
      id: 6,
      prompt: "What does your current planning system look like?",
      options: [
        { label: "Color-coded spreadsheet. Maybe two.", value: "SC" },
        { label: "Pinterest boards, a group chat, and vibes.", value: "VP" },
        { label: "My partner runs the system. I show up when needed.", value: "DE" },
        { label: "A detailed folder with contracts, notes, and every email I've sent.", value: "DO" },
      ],
    },
    {
      id: 7,
      prompt: "When stress creeps in, what usually triggers it?",
      options: [
        { label: "Feeling behind on tasks or missing a deadline.", value: "SC" },
        { label: "Having too many decisions to make at once.", value: "VP" },
        { label: "Not being sure if the things I've delegated are actually getting done.", value: "DE" },
        { label: "Worrying I've missed something important in the details.", value: "DO" },
      ],
    },
    {
      id: 8,
      prompt: "How do you and your partner divide up planning responsibilities?",
      options: [
        { label: "I'm the project manager. They execute.", value: "SC" },
        { label: "We go with whoever cares more about any given thing.", value: "BD" },
        { label: "They do most of it, honestly. I'm support.", value: "DE" },
        { label: "We split it evenly — I take the details, they take the logistics.", value: "DO" },
      ],
    },
  ],
  tieBreaker: "BD",
  results: {
    SC: {
      key: "SC",
      label: "The Spreadsheet Commander",
      headline: "The Spreadsheet Commander",
      body:
        "You plan like a project manager — and honestly, your wedding is better for it. Deadlines are sacred. The spreadsheet is probably color-coded. And you're almost certainly the one keeping everyone else on track.\n\nThe risk isn't that you'll miss something. It's that you'll spend 40 hours building systems you could have started with.",
      eydnAngle:
        "Your task timeline, budget tracker, vendor contacts, and day-of binder are already built — and they're all connected to an AI that knows your entire wedding. Stop rebuilding the wheel. Start where most organized planners wish they'd started.",
    },
    VP: {
      key: "VP",
      label: "The Vibes-Only Planner",
      headline: "The Vibes-Only Planner",
      body:
        "You know exactly what you want your wedding to feel like. The mood board is dialed in. The aesthetic is locked. The admin side of planning? That's where things get fuzzy — and that's completely fine.\n\nThe risk isn't that you don't care. It's that the details pile up quietly until they don't.",
      eydnAngle:
        "Tell Eydn what you need and it handles the rest. It generates your task list, flags what's overdue, and tells you what needs attention this week — so you can stay focused on the parts of planning you actually love and let the AI sweat the small stuff.",
    },
    DE: {
      key: "DE",
      label: "The Delegator",
      headline: "The Delegator",
      body:
        "You know how to use the people around you — and that's not laziness, that's how smart planners operate. You set the direction, make the calls that matter, and hand off the rest. Efficient. Effective. Occasionally stressful when you're not sure things are actually getting done.\n\nThat last part is the one worth solving.",
      eydnAngle:
        "Partner collaboration is built in. Shared task lists, shared budget, shared vendor contacts — all updating in real time. Everyone's in the same system, so you always know what's been done and what hasn't. Less \"did you handle that?\" — more \"already done.\"",
    },
    DO: {
      key: "DO",
      label: "The Detail Obsessive",
      headline: "The Detail Obsessive",
      body:
        "Nothing slips through the cracks with you. You've read every contract, you've checked every review, and you already know the questions to ask before the vendor finishes their pitch. You're not anxious — you're thorough. There's a difference, and you know it.\n\nThe risk is that all those details live in too many places at once.",
      eydnAngle:
        "One place where everything actually lives. Contracts, vendor notes, the complete day-of binder, and an AI that knows your full wedding — budget, timeline, guest list, all of it. When you ask it something, it already has the context. You finally have a system that keeps up with how you think.",
    },
    BD: {
      key: "BD",
      label: "The Balanced Duo",
      headline: "The Balanced Duo",
      body:
        "You and your partner are genuinely a team. You each have your strengths, you communicate well, and you've found a rhythm that works. You're not trying to be perfect — you're trying to plan a wedding together without it becoming a second job for one of you.\n\nThat's exactly the right instinct.",
      eydnAngle:
        "Eydn is built for two. Shared task lists, real-time budget updates, and an AI planner that both of you can talk to — from the same account, at the same time, on whatever device you're on. Less \"can you check on that?\" — more \"we've got this.\"",
    },
  },
};
