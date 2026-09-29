# Slipbird

Receipt and e-invoice scanner with spending analysis, for iOS and Android (Expo, English and Turkish).
Receipt images stay on the device; only OCR text is sent to our parser. See `docs/SPEC.md` for the product spec
and `docs/COMPONENTS.md` for the design-system components.

## App

Needs a development build (native modules don't run in Expo Go).

```bash
npm install
cp .env.example .env.local        # then fill in the Supabase URL and anon key
npx expo run:android               # or: npx expo run:ios
npx expo start --dev-client        # later runs
```

Checks: `npx tsc --noEmit`, `npx expo lint`, `npx jest`.

## Releasing

See `docs/RELEASE.md` for store setup, RevenueCat, EAS builds and the pre-submit checklist.

## Backend (Supabase)

One Edge Function, `parse-receipt`, plus a quota table. `PARSER_PROVIDER` is an ordered fallback chain
(e.g. `groq,gemini`): within one request, a busy or failing provider hands over to the next. Each provider has
its own model and key (`GROQ_MODEL`/`GROQ_API_KEY`, `GEMINI_MODEL`/`GEMINI_API_KEY`), in function secrets only.

### Local

Requires Docker Desktop running. The Supabase CLI runs through `npx`.

```bash
npx supabase start                                   # prints the API URL and anon key
cp supabase/functions/.env.example supabase/functions/.env
# set GROQ_API_KEY (https://console.groq.com/keys) and GEMINI_API_KEY + GEMINI_MODEL (current Flash-Lite id
# from https://ai.google.dev/gemini-api/docs/models)
npx supabase functions serve parse-receipt --env-file supabase/functions/.env
```

Point the app at it in `.env.local` (`EXPO_PUBLIC_SUPABASE_URL=http://<your computer's LAN IP>:54321`,
or `http://10.0.2.2:54321` from the Android emulator), then restart Metro.

To test parsing without the 15-a-month limit, keep `PARSE_QUOTA_DISABLED=true` in `supabase/functions/.env` (hosted: `npx supabase secrets set PARSE_QUOTA_DISABLED=true`, and `secrets unset` before release).

Check the deployed backend end to end (anonymous sign-in, auth guards, a real parse of a synthetic receipt; reads `.env.local`):

```bash
node scripts/smoke-test-backend.js
```

Compare models on the fixtures through the deployed function (development only; the override is off unless you set the flag, and each model uses its own anonymous user):

```bash
npx supabase secrets set ALLOW_PARSER_OVERRIDE=true
cd supabase/functions/parse-receipt
npx deno run --allow-net --allow-read --allow-env --config deno.json bakeoff.ts --runs 2 groq:openai/gpt-oss-120b gemini:gemini-3.5-flash-lite
npx supabase secrets unset ALLOW_PARSER_OVERRIDE     # always, afterwards
```

Function tests (Deno, no install needed):

```bash
cd supabase/functions/parse-receipt && npx deno test --allow-env --config deno.json .
```

### Hosted

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase secrets set PARSER_PROVIDER=groq,gemini GROQ_MODEL=openai/gpt-oss-120b GROQ_API_KEY=<key> \
  GEMINI_MODEL=<model id> GEMINI_API_KEY=<key>
npx supabase functions deploy parse-receipt
```

Enable anonymous sign-ins in the dashboard (Authentication → Providers) for the hosted project.
