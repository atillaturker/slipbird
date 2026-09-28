# Slipbird components

Spec for the 13 design-system components in `src/components/`. Build them in React Native with `useTheme()` from `src/theme.ts`; names and props below are the contract. Token names here are kebab-case (`paper-raised`); in `theme.ts` they are camelCase (`paperRaised`).

## Props (TypeScript)

```ts
export type Category = 'groceries' | 'dining' | 'transport' | 'shopping' | 'health' | 'bills' | 'home' | 'entertainment' | 'other';
type Press = { onPress?: () => void };
export function Button(p: Press & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'lg' | 'md'; block?: boolean; disabled?: boolean; children: React.ReactNode }): React.ReactElement;
export function ScanButton(p: Press & { onLongPress?: () => void; label?: string }): React.ReactElement;
export function Chip(p: Press & { selected?: boolean; category?: Category; children: React.ReactNode }): React.ReactElement;
export function Badge(p: { tone?: 'neutral' | 'verified' | 'review' | 'over'; children: React.ReactNode }): React.ReactElement;
export function SegmentedControl(p: { options: string[]; value?: string; onChange?: (v: string) => void }): React.ReactElement;
export function TextField(p: { label: string; value?: string; placeholder?: string; prefix?: string; figure?: boolean; helper?: string; error?: string }): React.ReactElement;
export function ReviewField(p: { label: string; value?: string; figure?: boolean; confidence?: 'high' | 'low'; flag?: string; onChangeText?: (v: string) => void; onPress?: () => void }): React.ReactElement;
export function MonthTotal(p: { label: string; amount: string; delta?: string; deltaDirection?: 'up' | 'down'; deltaLabel?: string }): React.ReactElement;
export function CategoryBreakdown(p: { items: { category: Category; value: number; display: string; label?: string }[]; onPressItem?: (category: Category) => void }): React.ReactElement;
export function BudgetBar(p: { category: Category; label?: string; spent: number; limit: number; spentDisplay: string; limitDisplay: string; leftDisplay?: string; overDisplay?: string }): React.ReactElement;
export function ReceiptRow(p: Press & { merchant: string; category?: Category; categoryLabel?: string; date: string; amount: string; status?: { tone: 'neutral' | 'verified' | 'review' | 'over'; label: string }; processing?: boolean }): React.ReactElement;
export function ReceiptCard(p: { merchant: string; date: string; number?: string; badge?: { tone: 'neutral' | 'verified' | 'review' | 'over'; label: string }; items: { name: string; qty?: string; amount: string }[]; tax?: { label: string; amount: string }[]; total: string; totalLabel?: string }): React.ReactElement;
export function EmptyState(p: { title: string; body: string; action?: React.ReactNode }): React.ReactElement;
```

React Native notes: `onPress` instead of `onClick`; `TextField`/`ReviewField` take `onChangeText`; `ReceiptRow` also takes `thumbnailUri?: string` (real photo, cropped 3:4) and `onDelete?` for swipe; `ReceiptCard` also takes `images?: string[]` rendered below the card.

## Button

Every action except scanning. Props: `variant` (`primary` default, `secondary`, `ghost`, `danger`), `size` (`lg` 52px default, `md` 40px), `block`, `disabled`, `onPress`, label as children.

- One `primary` per screen: "Save receipt" on review, "Set budget" on budgets.
- `secondary` for the alternative path ("Retake photo"), `ghost` for header dismissals ("Cancel").
- `danger` names what is lost: "Delete receipt".
- Verb first, sentence case, in both languages ("Fişi kaydet").

## ScanButton

The round stamp-green camera button centred in the tab bar — the app's primary action on every main screen. Props: `onPress`, `onLongPress` (opens the scan options), `label` (accessibility label, default "Scan receipt").

- Always present on Home, Receipts, Insights and Budgets; hidden on review, detail and settings.
- Opens the camera directly in auto-capture mode; long-press offers "Import from photos" and "Scan QR (e-Arşiv)".
- 64px, raised with `shadow-lift`, sits 18px above the tab bar. Medium haptic on press.
- Scrolling screens leave `space-12` at the bottom so it never covers content.

## Chip

A filter pill above the receipts list. Props: `selected`, `category` (shows the category dot), `onPress`, label as children.

- Horizontal scroll row, single select, "All" first.
- Category chips carry their colour dot so the filter matches the chart.
- Selected: stamp fill, on-stamp text. Unselected: `rule-strong` outline.

## Badge

A short status word on a receipt row or card. Props: `tone` (`neutral`, `verified`, `review`, `over`), text as children.

- `verified`: data came from a GİB QR code or was confirmed by the person.
- `review`: at least one field is low-confidence and was not yet confirmed.
- `over`: budget exceeded (Budgets and Insights only).
- `neutral`: "Manual", "Processing", "Offline — queued".
- Always a word; colour never carries meaning alone. One badge per row.

## SegmentedControl

Switches the period of the same data. Props: `options`, `value`, `onChange`.

- Insights: Week / Month / Year. Review screen: Receipt / Items.
- Two or three options only.

## TextField

A labelled input for manual entry and settings. Props: `label`, `value`, `placeholder`, `prefix` (currency symbol), `figure` (mono font + decimal keyboard), `helper`, `error`.

- Uppercase caption label always visible above the box.
- Amount and date fields set `figure` so they render in IBM Plex Mono like the receipt.
- Errors say how to fix: "Pick a real date".

## ReviewField

One extracted field on the post-scan review screen. Props: `label`, `value`, `figure`, `confidence` (`high` default, `low`), `flag` (the short check message), `onChangeText`, `onPress` (read-only row that opens a picker — date, currency, category).

- Stack them in a `sb-review-group` below the receipt image: Merchant, Date, Total, KDV, Category, Payment method.
- `low` tints the field `check-soft` and shows the flag in `check` ("Check the total"). High shows a green ✓.
- Editing a low field clears its flag. "Save receipt" stays enabled — the person decides.
- Put low-confidence fields' flags in reading order; the screen scrolls to the first one.

## MonthTotal

The headline figure at the top of Home and Insights. Props: `label`, `amount` (formatted), `delta` (formatted), `deltaDirection` (`up` | `down`), `deltaLabel`.

- The only `figure-xl` on the screen, in the home currency.
- Spending up is shown with ↑ and `danger`, down with ↓ and `stamp-ink` — the arrow and the words carry the meaning.
- Compare with the same point last month ("vs same day last month") so partial months are fair.

## CategoryBreakdown

Where the money went: one stacked bar plus a labelled list. Props: `items` — `{category, value, display, label?}` sorted largest first; `onPressItem(category)`.

- Up to 8 categories in the fixed `cat-*` order of colours; everything else folds into Other (`cat-other`), shown last.
- The list is the table view: every segment is named with its share and amount, so colour is never the only cue.
- Tapping a row calls `onPressItem(category)`; screens use it to open that category's receipts. Rows are pressable only when `onPressItem` is set (pressed opacity 0.7, hit area ≥ `hitMin`).

## BudgetBar

A monthly budget for one category. Props: `category`, `label?`, `spent`, `limit` (numbers for the ratio), `spentDisplay`, `limitDisplay`, `leftDisplay`, `overDisplay`.

- Under 80%: stamp bar, "₺2.800,00 left" in muted.
- 80–100%: check (amber) bar and note.
- Over 100%: full danger bar and "Over by ₺250,00". The words always state the state.
- A notification is sent once at 80% and once at 100% per month.

## ReceiptRow

One receipt in a list. Props: `merchant`, `category`, `categoryLabel?`, `date` (relative), `amount` (formatted, receipt's own currency), `status?` `{tone, label}`, `processing`, `onPress`.

- Left: 44px receipt thumbnail (the real photo, cropped 3:4; a paper glyph for manual entries). Middle: merchant (`headline`) over category dot + name + date. Right: amount (`figure-md`) over an optional badge.
- A receipt still being parsed shows a shimmer thumbnail and "Processing"; it becomes tappable when done.
- Grouped by day with caption headers ("TODAY", "12 OCT"). Swipe left: Delete.

## ReceiptCard

The digital receipt on the detail screen — the one place the torn-paper motif appears. Props: `merchant`, `date`, `number?`, `badge?`, `items` `[{name, qty?, amount}]`, `tax?` `[{label, amount}]`, `total`, `totalLabel?`.

- Dashed perforations separate header, items and totals; the bottom edge is torn (`perforation`).
- All figures in mono; the total in `figure-xl` scaled to 30px.
- Below the card: the original photo (tap for full screen), then edit actions.
- Items are optional — many receipts are saved with just the total.

## EmptyState

Fills a screen or section with nothing in it yet. Props: `title`, `body`, `action?` (a Button).

- One calm sentence, the blank-slip glyph, and the screen's main action.
- Filtered-empty says what to change: "No dining receipts this month".

## Shared visual rules

- Focus ring (accessibility focus / keyboard): 2px `focus`, 2px offset. Pressed: opacity 0.7. Disabled: 0.4.
- Lists: `paper-raised` groups with `radius-md`, 1px `rule` border; row hairlines inset to the text column.
- ReceiptCard torn edge: a row of triangles `perforation` (8px) wide at the bottom, drawn with react-native-svg in `paper-raised`; dashed dividers use `rule-strong`, 1.5px, dash 4/3.
- Badge tones: verified = stamp-soft / stamp-ink, review = check-soft / check, over = danger-soft / danger, neutral = paper-sunken / ink-muted.
- BudgetBar: < 80% stamp, 80–100% check, > 100% danger (full width) with the note "Over by …".
- CategoryBreakdown: one 14px stacked bar, 2px gaps between segments, 4px outer radius; list rows 36px: dot, name, percent (figure-sm, muted), amount (figure-md, right-aligned).
- ScanButton: 64px circle, stamp fill, on-stamp scan icon (Phosphor `Scan`), `shadow.lift`, raised 18px above the custom tab bar; medium haptic on press.
