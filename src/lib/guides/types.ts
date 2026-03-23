/** Field type definitions for guide questions. */
export type FieldType =
  | { kind: "number"; min?: number; max?: number; placeholder?: string; unit?: string }
  | { kind: "text"; placeholder?: string; maxLength?: number }
  | { kind: "textarea"; placeholder?: string; rows?: number }
  | { kind: "date" }
  | { kind: "time" }
  | { kind: "select"; options: { value: string; label: string }[] }
  | { kind: "multi-select"; options: { value: string; label: string }[]; max?: number }
  | { kind: "scale"; min: number; max: number; minLabel?: string; maxLabel?: string };

export type Question = {
  id: string;
  label: string;
  field: FieldType;
  required?: boolean;
  tip?: string;
  pullFrom?: { guide: string; questionId: string };
};

export type Section = {
  title: string;
  description?: string;
  questions: Question[];
};

export type GuideIntegration =
  | "guest-list"
  | "mood-board"
  | "day-of-timeline"
  | "chat-context"
  | "vendor-brief";

export type GuideDefinition = {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  sections: Section[];
  integrations: GuideIntegration[];
  /** What eydn does after the guide is completed */
  outcome: string;
};
