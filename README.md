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

## Backend (Supabase)

One Edge Function, `parse-receipt`, plus a quota table. The LLM provider is chosen with `PARSER_PROVIDER`
(Gemini today) and `PARSER_MODEL`; the provider key lives only in function secrets.

### Local

Requires Docker Desktop running. The Supabase CLI runs through `npx`.

```bash
npx supabase start                                   # prints the API URL and anon key
cp supabase/functions/.env.example supabase/functions/.env
# set GEMINI_API_KEY (https://aistudio.google.com/apikey) and PARSER_MODEL — the current
# Flash-Lite id from https://ai.google.dev/gemini-api/docs/models
npx supabase functions serve parse-receipt --env-file supabase/functions/.env
```

Point the app at it in `.env.local` (`EXPO_PUBLIC_SUPABASE_URL=http://<your computer's LAN IP>:54321`,
or `http://10.0.2.2:54321` from the Android emulator), then restart Metro.

Function tests (Deno, no install needed):

```bash
cd supabase/functions/parse-receipt && npx deno test --allow-env --config deno.json .
```

### Hosted

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase secrets set PARSER_PROVIDER=gemini PARSER_MODEL=<model id> GEMINI_API_KEY=<key>
npx supabase functions deploy parse-receipt
```

Enable anonymous sign-ins in the dashboard (Authentication → Providers) for the hosted project.
