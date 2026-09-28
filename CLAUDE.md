# Slipbird

Receipt and e-invoice scanner with spending analysis, for iOS and Android. React Native + Expo, TypeScript. Bilingual from day one: English and Turkish, following the device language.

The product spec and build order are in `docs/SPEC.md`. Read the relevant section before starting a milestone.

## Stack

- Expo (latest SDK), TypeScript `strict`, Expo Router (`app/` directory)
- **Development build required** (EAS / `npx expo run:ios|android`). Native modules below do not run in Expo Go.
- Capture: `react-native-document-scanner-plugin` (native edge detection + crop), `expo-camera` (QR scanning), `expo-image-picker` (import), `expo-image-manipulator` (resize/compress)
- On-device OCR: `@react-native-ml-kit/text-recognition` (Latin script covers EN + TR)
- Storage: `expo-sqlite` (data), `expo-file-system` (receipt images in the document directory), `expo-sqlite/kv-store` (settings)
- State: Zustand
- i18n: `i18next` + `react-i18next` + `expo-localization`
- Backend: Supabase (anonymous auth + one Edge Function `parse-receipt` in `supabase/functions/`); `@supabase/supabase-js` in the app
- UI: RN core + `react-native-reanimated`, `react-native-gesture-handler`, `phosphor-react-native`, `@expo-google-fonts/instrument-sans`, `@expo-google-fonts/ibm-plex-mono`, `expo-haptics`
- Charts: hand-drawn with `react-native-svg` (stacked bar, monthly bars); no chart library
- Dates: `date-fns` (+ `date-fns/locale/tr`)
- Later (M7): `react-native-purchases` (RevenueCat)

Ask before adding any dependency not listed here.

## Folder structure

```
src/
  app/                     Expo Router routes
    (onboarding)/          welcome, currency, permissions
    (tabs)/                index (Home), receipts, insights, budgets  — custom tab bar with ScanButton in the centre
    scan/                  capture.tsx, review.tsx (modal stack)
    receipt/[id].tsx       detail
    receipt/new.tsx        manual entry
    settings/              index and sub-pages
    dev/components.tsx     component showcase (dev builds only)
  theme.ts                 design tokens (provided — never edit values)
  components/              design-system components
  db/                      schema, migrations, repositories
  store/                   zustand stores
  lib/                     pure logic: money, dates, currency, gib-qr, receipt-normalize, merchant-rules
  services/                ocr.ts, parser-client.ts, scan-queue.ts, images.ts
  i18n/                    index.ts, en.json, tr.json
supabase/
  functions/parse-receipt/ index.ts, prompt.ts, schema.ts
  migrations/              quota table
```

## Design system ("Slipbird")

`src/theme.ts` is the source of truth; read it via `useTheme()`.

Component specs: docs/COMPONENTS.md

- Never hardcode a color, size, spacing, radius or font. Light and dark both follow the system setting.
- Brand color `stamp` = capture and confirmation (scan button, primary button, verified, in-budget). Text on it is `onStamp`; stamp as text is `stampInk`.
- Status is reserved and always paired with a word or icon: `check` (amber) = needs review / budget 80–100%, `danger` = over budget / failure.
- Categories use `categories[key]` in the fixed `categoryOrder`; the colour is never used for text and the category name is always shown beside it.
- Two fonts: Instrument Sans for words (`type.title1 … caption`), IBM Plex Mono for every amount, receipt date and line item (`type.figureXl`, `figureMd`, `figureSm`).
- Receipt motif (torn zigzag edge, dashed perforation) only on things that are receipts (`ReceiptCard`).
- Gutter `space[4]`, sections `space[6]`, cards `radius.md`, controls `radius.sm`, touch targets ≥ `size.hitMin`. Scrolling screens end with `space[12]` so the scan button never covers content.
- Icons: Phosphor, regular weight, 20px in rows, 24px in the tab bar.
- Copy: sentence case, calm, no exclamation marks, no emoji.

Components in `src/components/`, same names and props as the design system:
`Button`, `ScanButton`, `Chip`, `Badge` (neutral | verified | review | over), `SegmentedControl`, `TextField`, `ReviewField` (confidence high | low, flag), `MonthTotal`, `CategoryBreakdown`, `BudgetBar`, `ReceiptRow`, `ReceiptCard`, `EmptyState`.

## Code conventions

- Money is integer minor units + ISO 4217 code. Never floats. Parse and format through `src/lib/money.ts` only.
- Locale-aware number parsing: `1.234,56` (tr) and `1,234.56` (en) must both parse correctly; the receipt's own format wins over the device locale.
- Every user-facing string goes through `t()`; add keys to both `en.json` and `tr.json` in the same change. No string concatenation of translated fragments — use interpolation.
- Business logic lives in `src/lib` as pure functions with Jest tests (`jest-expo`). Screens compose hooks and components only.
- Never send receipt images off the device. Only OCR text (and QR payloads when parsing fails) go to `parse-receipt`.
- Never put API keys in the app. The LLM key lives only in Supabase function secrets.
- Functional components and hooks; no default exports except route files.

## Commands

- `npx expo run:ios` / `npx expo run:android` — dev build
- `npx expo start --dev-client` — run
- `npx tsc --noEmit` — typecheck
- `npx jest` — tests
- `npx expo lint` — lint
- `supabase functions serve parse-receipt` — local backend
- `supabase functions deploy parse-receipt` — deploy

A milestone is done only when typecheck, lint and tests pass.

## How to work

- One milestone from `docs/SPEC.md` at a time: plan briefly, implement, then summarize what changed in a few lines and wait for review.
- Edit in place; don't rewrite whole files for small changes.
- When a spec detail is ambiguous or a native module behaves differently than described, stop and ask instead of guessing.

# DO NOT

- Do not add Co-authored-By to commit messages
