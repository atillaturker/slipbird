# Slipbird — product spec

Slipbird turns paper receipts and e-invoices into a clean spending record: scan, check, done. Data lives on the device. Receipt images never leave it; only the OCR text is sent to our parser. Markets: global (English) and Turkey (Turkish + e-Arşiv/e-Fatura support).

## 1. Scan pipeline

```
Capture ──► image saved locally ──► QR found? ──yes──► GİB QR parser ──► review (verified)
                                         │ no / invalid
                                         ▼
                              ML Kit OCR (on device) ──► text
                                         ▼
                        parse-receipt edge function (LLM) ──► structured JSON
                                         ▼
                        normalize + validate (src/lib) ──► merchant rules ──► review screen ──► save
```

### 1.1 Capture
- Scan button opens `react-native-document-scanner-plugin` (auto edge detection, crop, perspective fix, up to 3 pages for long receipts).
- Long-press the scan button: "Import from photos", "Scan QR code".
- Save each page as JPEG, max 1600px long edge, quality 0.7, to `documentDirectory/receipts/<receiptId>/<n>.jpg`, plus a 200px thumbnail.
- The receipt row appears immediately in the list with status `processing`.

### 1.2 Turkish e-Arşiv / e-Fatura QR (`src/lib/gib-qr.ts`)
- Scan any QR on the captured image (and via "Scan QR code"). GİB invoice QR codes carry a JSON payload. Expected keys (verify against at least 5 real invoices before finalizing, and keep the parser tolerant of missing keys): `vkntckn` (seller tax id), `avkntckn` (buyer), `senaryo`, `tip`, `tarih` (date), `no` (invoice number), `ettn` (UUID), `parabirimi` (currency), `malhizmettoplam`, `kdvmatrah(<rate>)`, `hesaplanankdv(<rate>)`, `vergidahil`, `odenecek` (payable total).
- Map: total = `odenecek` ?? `vergidahil`; date = `tarih`; number = `no`; currency = `parabirimi` (default TRY); tax lines from each `hesaplanankdv(<rate>)`; `ettn` stored for de-duplication.
- A valid QR gives source `gib_qr`, all fields confidence `high`, badge "e-Arşiv ✓". The merchant name is not in the QR: take it from OCR if available, else leave empty and flag it.
- Unit tests with real-shaped fixtures, including decimal commas and missing keys.

### 1.3 OCR (`src/services/ocr.ts`)
- `@react-native-ml-kit/text-recognition` on each page; keep block/line order; join pages with a page marker.
- If OCR text is under 20 characters: mark the scan `failed` with "Couldn't read this receipt — try again with more light" and offer retake or manual entry.

### 1.4 Parser backend (`supabase/functions/parse-receipt`)
- Auth: Supabase anonymous sign-in on first launch; the function requires the user JWT.
- Input: `{ text, locale, deviceCurrency, countryHint }`. Max 12k characters.
- Calls an LLM (model name in env `PARSER_MODEL`, a small fast model; API key in function secrets) with the system prompt in `prompt.ts` and a strict JSON schema in `schema.ts`. Temperature 0.
- Output schema:
  ```json
  {
    "merchant": { "value": "string|null", "confidence": "high|low" },
    "date": { "value": "YYYY-MM-DD|null", "time": "HH:mm|null", "confidence": "high|low" },
    "total": { "value": "string decimal as printed|null", "confidence": "high|low" },
    "currency": { "value": "ISO 4217|null", "confidence": "high|low" },
    "tax": [{ "rate": "number|null", "amount": "string" }],
    "items": [{ "name": "string", "qty": "number|null", "amount": "string" }],
    "paymentMethod": "card|cash|other|null",
    "category": { "value": "groceries|dining|transport|shopping|health|bills|home|entertainment|other", "confidence": "high|low" },
    "documentType": "receipt|invoice|other"
  }
  ```
- The prompt must: return amounts exactly as printed (the app parses them), prefer the line labelled TOTAL / TOPLAM / GENEL TOPLAM / ÖDENECEK, mark `low` when unsure or when items don't sum to the total within 1%, never invent a merchant.
- Stateless: do not log or store receipt text. Log only user id, timestamp, token counts, latency.
- Quota: table `scan_usage(user_id, month, count)`; free users get 15 parses per calendar month (constant in one place). Over quota → 402 with `{ code: "quota_exceeded" }`; the app shows the paywall (M7) and still allows manual entry.
- Errors return `{ code }`; the app maps codes to translated messages.

### 1.5 Normalize and validate (`src/lib/receipt-normalize.ts`)
- Parse amount strings to minor units using the receipt's detected format (`1.234,56` vs `1,234.56`; a single separator followed by exactly 2 digits is decimal).
- Downgrade to `low`: date in the future or > 1 year ago, total ≤ 0, items sum differs from total by > 1%, currency missing.
- Offline or backend error: keep the receipt in `scan-queue` (persisted), retry with exponential backoff when online; the row shows "Offline — queued".

### 1.6 Merchant rules (`src/lib/merchant-rules.ts`)
- Normalize merchant names (case, legal suffixes like "A.Ş.", "Ltd. Şti.", "Inc.", store numbers).
- When the user saves a receipt, store `normalizedMerchant → category`. Next time the rule overrides the LLM category and sets confidence `high`.

### 1.7 Review screen (`app/scan/review.tsx`)
- Top: page image(s), pinch to zoom. Below: a `ReviewField` group: Merchant, Date, Total (+ currency), KDV/VAT lines (collapsed), Category, Payment method, Note. SegmentedControl "Receipt / Items" to see and edit line items.
- Scroll to the first `low` field. "Save receipt" is the primary action and always enabled.
- Duplicate check before saving: same `ettn`, or same merchant + total + date → sheet "This looks like a receipt you already saved" with "Save anyway" / "Discard".

## 2. Data model (sqlite)

`receipts`: id, merchant, merchantNormalized, date (YYYY-MM-DD), time, totalMinor, currency, category, paymentMethod, note, source (`scan | gib_qr | manual | import`), status (`processing | needs_review | saved | failed | queued`), ocrText, ettn, documentNumber, imagePaths (JSON), createdAt, updatedAt.

`receipt_items`: id, receiptId, name, qty, amountMinor, position.

`receipt_taxes`: id, receiptId, rate, amountMinor.

`budgets`: category, limitMinor, currency (home currency), active.

`merchant_rules`: merchantNormalized, category, updatedAt.

Settings (kv): `homeCurrency`, `language` (`system | en | tr`), `onboarded`, `budgetAlerts`.

Exchange rates: Frankfurter (`https://api.frankfurter.app/latest?from=<home>`), cached 24h; receipts in other currencies are converted for totals and shown with their original amount in detail.

## 3. Screens

Tab bar: Home · Receipts · (Scan) · Insights · Budgets. Settings via the gear on Home.

**Onboarding:** 1) Welcome — "Scan it. Check it. Done." 2) Home currency (locale preselected). 3) Camera permission explained, then requested. No account creation.

**Home:** `MonthTotal` (this month, delta vs same day last month) → `CategoryBreakdown` (top categories) → "Needs review" section if any → "Recent" receipts (last 5) → budgets nearing limit (only those ≥ 80%). EmptyState: "No receipts yet" + "Scan a receipt".

**Receipts:** Search (merchant, note, item names), Chip row (All + categories), filter sheet (date range, amount range, source, payment method), list grouped by day. Swipe left: Delete. Header menu: "Add manually".

**Receipt detail:** `ReceiptCard` (items, taxes, total), original amount + converted amount if foreign currency, original image(s), actions Edit / Share image / Delete.

**Manual entry:** same fields as review, without an image.

**Insights:** SegmentedControl Week / Month / Year; `MonthTotal`; `CategoryBreakdown` (all categories); monthly bar chart for the last 6 months (current in `stamp`, others `ruleStrong`, values labelled); top merchants (top 5 with count and total); average receipt.

**Budgets:** list of `BudgetBar`s for this month; "Set budget" per category (amount in home currency); local notifications once at 80% and once at 100% per category per month (only if `budgetAlerts`).

**Settings:** Home currency, Language (System / English / Türkçe), Budget alerts, Export (CSV of receipts + items for a date range; PDF monthly report with category totals and receipt list), Delete all data, Privacy policy, Rate Slipbird, Version, Slipbird Pro (M7).

## 4. Milestones

Each ends with typecheck, lint and tests passing, and a short summary.

- **M1 — Foundation.** Expo project with dev build, Expo Router, i18n (en/tr, device language, `language` setting), fonts loaded before splash hides, `theme.ts` + `useTheme`, all 13 components, `/dev/components` showcase route in both themes and languages, custom tab bar with the centre ScanButton, empty tab screens.
- **M2 — Data and manual entry.** sqlite schema and migrations, repositories, zustand stores, `money.ts` (parse/format, both locales, tests), dates helpers, manual entry screen, Receipts list with search/chips/grouping, receipt detail with `ReceiptCard`, delete.
- **M3 — Capture.** Document scanner, image storage and thumbnails, import from photos, QR scanning, `gib-qr.ts` parser with tests, `processing` rows, retake/failed states.
- **M4 — Parsing.** ML Kit OCR service, Supabase project + anonymous auth, `parse-receipt` function (prompt, schema, quota table), parser client, `receipt-normalize.ts` with tests, offline scan queue, review screen with confidence flags, duplicate check, merchant rules.
- **M5 — Insights, budgets, currency.** Exchange-rate service, conversion everywhere totals appear, Home fully wired, Insights charts, Budgets with alerts.
- **M6 — Export and settings.** Filters sheet, CSV and PDF export (`expo-print` + `expo-sharing`), settings screens, delete all data.
- **M7 — Store readiness.** App icon and splash, `app.json` (bundle ids, names, versions, permission strings in en/tr), EAS build profiles, privacy policy text (states: images stay on device, OCR text is sent to our parser and not stored), RevenueCat Pro (unlimited scans, PDF reports, budgets beyond 3 categories — confirm pricing with the owner first), store listing texts in en/tr.
  - TODO: `parse-receipt` currently uses Gemini's free tier, where Google may use prompts (receipt OCR text) to improve its models. Before launch either enable billing on the Gemini project (paid tier) or disclose this in the privacy policy.
  - TODO: `@react-native-ml-kit/text-recognition` bundles Chinese/Devanagari/Japanese/Korean models on Android; only Latin is needed — strip the others to cut APK size.

## 5. Test receipts

Before M4 is done, test at least: 5 Turkish market receipts (Migros, A101, BİM or similar), 3 restaurant/café receipts, 2 fuel receipts, 3 e-Arşiv invoices with QR, 3 English-language receipts (USD/EUR/GBP), 1 long multi-page receipt, 1 crumpled/low-light photo. Record per receipt which fields were `low` and whether the final values were correct.

## 6. Out of scope for v1

Accounts and cloud sync, bank connections, email receipt forwarding, team/shared expenses, mileage tracking, accounting integrations, languages beyond en/tr.
