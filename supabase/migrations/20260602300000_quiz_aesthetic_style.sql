-- Allow the new aesthetic wedding-style quiz to record completions.
alter table public.quiz_completions
  drop constraint if exists quiz_completions_quiz_id_check;

alter table public.quiz_completions
  add constraint quiz_completions_quiz_id_check
  check (quiz_id in ('planning_style', 'planner_assessment', 'aesthetic_style'));
