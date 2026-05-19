# Schedule Positions

Small manager-facing web app for importing a Netchex schedule PDF, reviewing parsed shifts, assigning department starting positions, and printing department/day assignment sheets.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

## Hosting

The app is designed for Netlify plus Supabase.

Required Netlify environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SCHEDULE_APP_ACCESS_CODE`

For local API testing without an access code, set `ALLOW_UNAUTHENTICATED_IMPORT_API=true`.

Apply `supabase/migrations/0001_initial_schema.sql` to the Supabase project before using the app against a real database.
