@AGENTS.md

# Project Rules

## Database Migrations
After creating ANY migration file in `supabase/migrations/`, ALWAYS run it immediately:
```
echo "Y" | npx supabase db push
```
Never leave migrations unapplied. Never tell the user to run them manually. The CLI is linked and works.

## Git
Always commit and push after completing work. Tree should be clean when done.

## Testing
Run `npx tsc --noEmit`, `npx eslint src/`, and `npx vitest run` before committing.

## Inclusive Language
Use Partner 1/Partner 2, Attendant, Honor Attendant — not bride/groom/bridesmaids/groomsmen. Mirror the couple's own language if they self-identify.
