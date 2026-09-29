# Releasing Slipbird

What is built (M7) and what only you can do. Nothing here needs code changes unless a step says so.

## 1. Accounts

| For | You need |
| --- | --- |
| iOS | Apple Developer Program membership, an app record in App Store Connect with bundle id `com.atillaturker.slipbird` |
| Android | Google Play Console account, an app with package `com.atillaturker.slipbird` |
| Builds | An Expo account (EAS) |
| Pro | A RevenueCat account |
| Backend | A hosted Supabase project, and API keys for Groq and Google Gemini |

## 2. One-time setup

**EAS**
```bash
npx eas-cli@latest login
npx eas-cli@latest init                    # links the project (writes the project id into app.json)
npx eas-cli@latest build:configure         # eas.json already has development / preview / production
```

**Supabase (hosted)**
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                       # scan_usage table
npx supabase secrets set PARSER_PROVIDER=groq,gemini GROQ_MODEL=openai/gpt-oss-120b GROQ_API_KEY=<key> \
  GEMINI_MODEL=<model id> GEMINI_API_KEY=<key> REVENUECAT_SECRET_KEY=<sk_...> REVENUECAT_ENTITLEMENT=pro
npx supabase functions deploy parse-receipt
```
Enable anonymous sign-ins (Authentication → Providers). **Make sure `PARSE_QUOTA_DISABLED` is not set** (`npx supabase secrets list`): it lifts the free scan limit and is for development only.

**RevenueCat (Slipbird Pro)** — prices are yours to choose; the app shows whatever the stores return.
1. Create a project and add the iOS and Android apps (same bundle id / package).
2. In App Store Connect and Play Console create two auto-renewing subscriptions in one group, e.g. `slipbird_pro_monthly` and `slipbird_pro_yearly`, and set their prices.
3. In RevenueCat: import the products, create the entitlement **`pro`** (attach both products), and an offering **`default`** with a Monthly package (`$rc_monthly`) and an Annual package (`$rc_annual`).
4. Copy the public SDK keys (iOS, Android) and the secret key (used only as the `REVENUECAT_SECRET_KEY` secret above).

**Privacy policy page (GitHub Pages)**
Repository → Settings → Pages → Deploy from a branch → `master` / `/docs`. It publishes `https://atillaturker.github.io/slipbird/privacy/` (English and Turkish). The app links to it (`src/config.ts`) and the listings use it.

## 3. Environment variables

The app reads public values at build time. Set them as EAS environment variables (never commit them):

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | hosted project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | hosted anon (publishable) key |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat public iOS key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat public Android key |

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment production --visibility plaintext
# repeat for the others; use --environment preview / development for those profiles too
```
Without the RevenueCat keys the app still runs: Pro simply stays off.

## 4. Build and submit

```bash
npx eas-cli@latest build --profile preview --platform android      # installable APK to test purchases with a licence tester
npx eas-cli@latest build --profile production --platform all       # store builds (build numbers auto-increment)
npx eas-cli@latest submit --platform ios
npx eas-cli@latest submit --platform android
```
Test purchases with an Apple sandbox account and a Google Play licence tester before submitting.

## 5. Store listings

Texts (English and Turkish, within the stores' limits, checked by `npx jest`) are in `docs/store/listing.json`: name, subtitle, promotional text, keywords, short and full descriptions, what's new, categories, support and privacy URLs. Paste them into App Store Connect and Play Console. Screenshots are not generated: take them from a build on real devices in both languages, light and dark.

## 6. Before you submit

- [ ] `PARSE_QUOTA_DISABLED` is **not** in the production function secrets.
- [ ] Gemini is on a billed project, **or** keep the disclosure that free-tier Gemini may use text to improve Google's products (it is in the privacy policy; remove the sentence in `docs/privacy/index.html`, `src/i18n/*.json` if billing is enabled).
- [ ] App icon and splash: the current art is a generated placeholder (`scripts/generate-icons.js`). Replace `assets/images/icon.png` (1024×1024), `android-icon-foreground.png`, `android-icon-monochrome.png` and `splash-icon.png` with final artwork.
- [ ] **Confirm the first Android build works with the Latin-only OCR models.** `plugins/withLatinOnlyTextRecognition.js` (listed in `app.json`) drops the Chinese, Devanagari, Japanese and Korean ML Kit models from the packaged app. The library's Java still imports those classes, so they are excluded from the *runtime* classpaths only (`configurations.configureEach { exclude … }` in `android/app/build.gradle`), plus R8 `-dontwarn` rules in `proguard-rules.pro`. What was verified without an Android SDK: `npx expo prebuild --platform android --clean` writes both blocks once, and the same exclusion in a plain Gradle project keeps the module on `compileClasspath` and removes it from `runtimeClasspath`. **Not verified: a real Android build and the APK size.** On the first `eas build --platform android`: (1) the build must succeed; (2) scan a receipt and confirm text is read (English and Turkish letters); (3) compare the size with the plugin off — set `["./plugins/withLatinOnlyTextRecognition", { "latinOnly": false }]` in `app.json` for one comparison build. If the build fails or OCR breaks, turn the plugin off the same way and tell me.
- [ ] Rate Slipbird row in Settings: add it once the store URLs exist (`itms-apps://…?action=write-review`, `market://details?id=com.atillaturker.slipbird`).
- [ ] Privacy policy contact is the GitHub issues page; change it if you prefer an email address.
- [ ] Real receipts tested (docs/SPEC.md §5) and at least 5 real e-Arşiv QR payloads checked against `src/lib/gib-qr.ts`.

## 7. Store privacy questionnaires (draft answers — check them against your own judgement)

**Apple "App Privacy"**: Data used to track you — none. Data collected: *Purchases* (subscription status, via RevenueCat, for app functionality, not linked to identity beyond the anonymous id) and *Identifiers → User ID* (anonymous Supabase id, app functionality). Receipt text is processed in real time to read it and not stored by Slipbird; if you decide the AI providers' handling counts as collection, add *User Content → Other user content*.

**Google Play "Data safety"**: Data shared: receipt text (sent to AI providers to read it; not stored by Slipbird), purchase status (RevenueCat). Data collected: app activity/diagnostics (server log with anonymous id, time and token counts). Encrypted in transit: yes. Users can request deletion: yes (Settings → Delete all data removes everything on the phone; server records are anonymous).
