# Play Store screenshots

You take these; nothing here is generated. Use a device or emulator with the dev build, and fake sample data only (no real merchants, no real amounts you would mind sharing).

## Which screens

Per language (English, Turkish), capture:

| # | Screen | Theme | Notes |
|---|--------|-------|-------|
| 1 | Home with data | light | A month total, the category breakdown, a few recent receipts |
| 2 | Review screen | light | A freshly scanned receipt with at least one field flagged "check" |
| 3 | Receipts list | light | Mix of categories, one still processing if you can |
| 4 | Insights, Month view | light | Breakdown and month-over-month change |
| 5 | Budgets | light | One budget in each state: in budget, near, over |
| 6 | Home with data | dark | Same data as 1 |
| 7 | Insights, Month view | dark | Same data as 4 |

Play accepts 2–8 screenshots per language. Seven per language is 14 images; the minimum useful set is 1–4 in light plus 6 in dark (8–12 in total across both languages).

Set the device language to English or Turkish before capturing, so all UI text, dates and amounts follow that language.

## Where to put them

```
docs/store/screenshots/en/01-home.png
docs/store/screenshots/en/02-review.png
docs/store/screenshots/tr/01-home.png
...
```

Numbered file names set the upload order. Run `npm run check:store-images` afterwards; it checks each file against the rules below.

## Play rules

- PNG or JPEG, 24-bit, **no alpha channel**. Some emulator screenshot tools save RGBA; export as RGB or JPEG if the checker complains.
- Each side between **320 px and 3840 px**.
- The longer side may be at most **2×** the shorter side. Tall phones (20:9, e.g. 1080×2400) exceed that; crop the status bar or navigation bar, or scale the emulator to 16:9 or 9:16 (1080×1920 works).
- 2 to 8 screenshots per language.

Official reference: https://support.google.com/googleplay/android-developer/answer/9866151
