/**
 * Timeline-aware dashboard greeting copy. A pure function so the dashboard
 * server component stays focused on data loading and layout.
 *
 * The message is chosen by phase (days until the wedding, task progress) and
 * varies day-to-day via a day-of-year index so a returning couple sees fresh
 * copy without it changing on every render.
 */

export type GreetingContext = {
  name: string;
  both: string;
  days: number | null;
  totalTasks: number;
  doneTasks: number;
  taskPct: number;
};

export function buildGreeting(ctx: GreetingContext): string {
  const { name, both, days, totalTasks, doneTasks, taskPct } = ctx;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const pick = <T,>(options: T[]): T => options[dayOfYear % options.length];

  if (doneTasks === 0) {
    return pick([
      `Hey ${name} — your planning journey starts now. There's no wrong place to begin 🌿`,
      `Welcome, ${name}. Everything you need is right here. Let's make this fun.`,
      `So excited for you, ${name}! Your timeline is ready whenever you are 💛`,
    ]);
  }

  if (days !== null && days <= 0) {
    return pick([
      `Today is the day, ${both}. Everything you've planned has led to this moment 💍`,
      `It's here. It's real. It's your wedding day. Soak in every second, ${name} ✨`,
      `${both} — go be married. We'll be here when you get back 💛`,
    ]);
  }

  if (days !== null && days <= 7) {
    return pick([
      `${days} days, ${name}. Take a breath. You've done the work — now enjoy the moment ✨`,
      `Almost there. ${doneTasks} tasks done, and the only one left that matters is saying "I do" 💛`,
      `This week changes everything, ${name}. You are so ready for this.`,
      `Single digits, ${name}! Everything is falling into place. Trust the plan you built 🌿`,
    ]);
  }

  if (days !== null && days <= 30) {
    return pick([
      `${days} days to go, ${name}. The final stretch — and you've got this 💪`,
      `One month out. ${totalTasks - doneTasks} things left on the list, but the hardest part (finding each other) is already done 💛`,
      `${days} days, ${name}. This is the home stretch — and you're crushing it.`,
      `Almost time, ${name}. Deep breath. Everything you've planned is about to come to life ✨`,
    ]);
  }

  if (days !== null && days <= 90) {
    return pick([
      `${days} days out, ${name}. The details are coming together beautifully 🌸`,
      `Three months flies, ${name}. But you're ${taskPct}% done — way ahead of most couples.`,
      `The countdown is real now, ${name}. ${days} days and ${taskPct}% of the way there 💛`,
      `${name}, you're in the sweet spot — far enough to breathe, close enough to feel the excitement ✨`,
    ]);
  }

  if (days !== null && days <= 180) {
    return pick([
      `${days} days to go, ${name}. Every decision you make now shapes the day you'll never forget 🌿`,
      `Half a year out — the big pieces are falling into place, ${name}. Keep going 💛`,
      `${days} days might sound like a lot, but your future self will thank you for starting now, ${name}.`,
      `You're building something beautiful, ${name}. ${doneTasks} decisions down, and each one matters ✨`,
    ]);
  }

  if (days !== null && days <= 365) {
    return pick([
      `${days} days feels far away, but your venue search starts now, ${name} 🌿`,
      `A year of planning ahead — and honestly, ${name}, that's the perfect amount of time.`,
      `${days} days to build the wedding of your dreams, ${name}. No rush, but let's get started 💛`,
      `${name}, a year from now you'll look back and be so glad you started today ✨`,
    ]);
  }

  if (days !== null) {
    return pick([
      `${days} days to go — plenty of time to plan the perfect day, ${name} 🌿`,
      `You're early, ${name} — and that's a superpower. Let's use it wisely 💛`,
      `${days} days of possibility ahead. No stress, just excitement, ${name} ✨`,
      `The best weddings start with time on your side, ${name}. You've got this.`,
    ]);
  }

  if (taskPct >= 75) {
    return pick([
      `${taskPct}% done, ${name}! You're almost there — the finish line is in sight ✨`,
      `Look at you, ${name}. ${doneTasks} tasks done. This wedding is going to be incredible 💛`,
    ]);
  }
  if (taskPct >= 50) {
    return pick([
      `Over halfway there, ${name}. Every checkmark is one step closer to the best day of your life 💛`,
      `${doneTasks} tasks done, ${name}. You're making this look easy ✨`,
    ]);
  }
  return pick([
    `${doneTasks} tasks down, ${name}. Every little step brings you closer to the big day 🌿`,
    `Hey ${name} — you're building something amazing. Keep going 💛`,
    `One step at a time, ${name}. You've got ${doneTasks} done already ✨`,
  ]);
}
