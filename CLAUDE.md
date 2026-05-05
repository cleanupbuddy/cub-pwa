# CUB PWA — Claude Code Context

## What is this repo?
React 19 PWA frontend for CUB — a BC PIPA-compliant communication platform for health practitioners. Installable on iOS/Android. Talks to the Vercel bridge API and Supabase directly.

**Live URL:** https://app.getcubsuite.com  
**Bridge API:** https://cub-bridge-api.vercel.app  
**Solo founder:** Jamie (jameson@juniperrmt.com)

---

## Tech Stack
- **Framework:** React 19, Create React App 5
- **Routing:** react-router-dom v7 — only two routes: `/` and `/login`
- **Database:** Supabase JS v2 (direct from browser)
- **Auth:** Supabase Google OAuth only — no magic links, no password
- **Monitoring:** Sentry (`@sentry/react`) — initialised in `index.js`
- **Push:** Web Push API via VAPID, service worker at `public/sw.js`
- **Styling:** All inline styles — no CSS framework, no styled-components
- **Font:** Outfit (Google Fonts, loaded in `public/index.html`)

---

## Dev Commands
```bash
# Dev server
npm start

# Deploy with health-check gate (preferred — runs build + backend ping)
npm run deploy        # scripts/check-health.sh then vercel --prod --build-env CI=false

# Deploy directly
vercel --prod --build-env CI=false    # CI=false suppresses lint-as-error

# Build only
npm run build
```

---

## Environment Variables
All `REACT_APP_` prefixed (CRA requirement). Set in `.env` and Vercel project settings.

```
REACT_APP_SUPABASE_URL       # Supabase project URL
REACT_APP_SUPABASE_KEY       # Supabase anon/publishable key
REACT_APP_VAPID_PUBLIC_KEY   # VAPID public key for push subscriptions
REACT_APP_SENTRY_DSN         # Sentry DSN
```

> **Note:** `src/lib/supabase.js` currently has hardcoded fallback values for `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY`. These should be set as env vars; the hardcoded fallbacks should eventually be removed.

---

## Source Structure

```
src/
  App.js               # Bootstrap, auth gate, access routing
  index.js             # Entry point, Sentry init
  pages/
    Login.jsx          # Google OAuth sign-in
    Onboarding.jsx     # 3-step new practitioner setup
    Paywall.jsx        # Subscription gate
    Dashboard.jsx      # Main app shell
    Settings.jsx       # Profile, auto-replies, billing, push
  components/
    ChatWindow.jsx     # Message thread + send + archive
    ContactsList.jsx   # Patient list, search, new contact
    VoiceCall.jsx      # In-app voice bridge UI
    WelcomeSurvey.jsx  # One-time post-onboarding survey
    OnboardingTour.jsx # First-use feature walkthrough
    FeedbackPrompt.jsx # NPS prompt at day 3 / 14 / 25 of trial
    ReportIssue.jsx    # Bug report form (Sentry + Supabase)
    ShareFeedback.jsx  # Free-text feedback form (Supabase)
    ExportMessages.jsx # CSV export of patient message history
  lib/
    supabase.js        # Supabase client singleton
    config.js          # VERCEL_URL, SUPABASE_URL, APP_URL constants
    notifications.js   # VAPID push subscription registration
    badge.js           # App badge (unread count) via navigator.setAppBadge
  constants/
    professions.js     # PROFESSIONS array — { value, label } — short codes
public/
  sw.js                # Service worker — handles push events, sets badge
  manifest.json        # PWA manifest
  icon192.png          # PWA icons
  icon512.png
```

---

## Page Reference

### `App.js` — bootstrap and routing
- Guards the whole app behind `isBootstrapping` (pulsing "Opening CUB Line..." screen)
- `resolveAppAccess()` is mutex-guarded via `isResolvingRef` — prevents double-execution from concurrent `bootstrap()` + `onAuthStateChange` calls
- Bootstrap timeout: **8 seconds**, then force-exits bootstrap
- On catch: **silent retry once after 2 seconds** before showing the error screen
- `!hasResolvedAccess` route fallback renders `null` (no "reconnecting" flash)
- Wake handler removed — iOS cold-open handled entirely by the bootstrap path
- Access flow: `session` → `checkSubscription` → subscribed? → onboarding needed? → Dashboard

### `Login.jsx`
- Google OAuth via `supabase.auth.signInWithOAuth`
- `?switch=true` query param forces account picker (`prompt: 'select_account'`)
- Redirect target: `https://app.getcubsuite.com`

### `Onboarding.jsx`
- 3 steps: (1) profile — name, clinic, profession; (2) personal mobile; (3) claim BC number
- Imports `PROFESSIONS` from `constants/professions.js` — dropdown values are short codes
- Saves `profession_type` (short code or raw OTHER text) and `profession_abbreviation` (always a short code)
- Calls `/api/claim-number` then does a local Supabase update for `clinic_number`

### `Dashboard.jsx`
- Profile is seeded from `localStorage` (`cub_profile_cache`) as initial state to avoid flash on mount
- `loadProfile()` re-fetches from Supabase and updates cache
- Auto-selects last contact from `localStorage` (`cub_last_contact`) once `currentUserId` is set
- Sign out clears both localStorage keys before calling `supabase.auth.signOut()`
- Shows `WelcomeSurvey` once (`survey_completed` flag), `OnboardingTour` once (`tour_completed` flag)
- Shows `FeedbackPrompt` at day 3 / 14 / 25 based on `trial_start_date`
- Push notifications registered after `clinic_number` is confirmed present
- Install banner shown when app is not running in standalone mode

### `Settings.jsx`
- Imports `PROFESSIONS` from `constants/professions.js`
- `LONG_FORM_TO_CODE` mapping migrates legacy long-form values (e.g. `'Physiotherapist'`) to short codes on load
- "Other" profession format is **raw text** — no `"Other: "` prefix (legacy prefix stripped on load)
- `saveSettings` always writes both `profession_type` and `profession_abbreviation`

---

## Component Reference

### `ChatWindow.jsx`
**Props:** `contact`, `clinicNumber`, `therapistName`, `clinicName`, `practitionerNumber`, `isArchivedView`, `onArchived`, `onRead`, `onBack`, `currentUserId`

Key behaviours:
- `loadMessages` retries up to 3× with backoff — always filters by both `practitioner_id` and phone number
- `archiveConversation` and its undo button filter by **both** `practitioner_id` and phone number on both `messages` and `contacts` tables
- Outbound SMS goes via `/api/send-sms` (bridge API), not directly through Twilio

### `ContactsList.jsx`
**Props:** `currentUserId`, `clinicNumber`, `onSelectContact`, `selectedContact`, `archived`, `onRefresh`

Filters all `contacts` queries by `practitioner_id`.

### `VoiceCall.jsx`
**Props:** `contact`, `clinicNumber`, `practitionerNumber`, `therapistName`, `clinicName`, `onClose`

Calls `/api/make-call` on the bridge API.

### `OnboardingTour.jsx`
**Props:** `onComplete`, `userEmail`

Multi-step feature walkthrough. Marks `tour_completed = true` on the practitioners row when dismissed.

### `FeedbackPrompt.jsx`
**Props:** `day`, `onComplete`, `onDismiss`, `userEmail`

NPS-style prompt. `day` is `3`, `14`, or `25`. Marks `feedback_day{N}_completed = true` on completion.

### `ReportIssue.jsx`
**Props:** `onClose`, `userEmail`

Submits via Sentry (`captureMessage`) and writes to Supabase.

### `ShareFeedback.jsx`
**Props:** `onClose`, `userEmail`

Free-text feedback. Writes to Supabase.

### `ExportMessages.jsx`
**Props:** `onClose`, `clinicNumber`

Generates and downloads a CSV of message history keyed by `clinic_number`.

### `WelcomeSurvey.jsx`
**Props:** `onComplete`

---

## localStorage Keys

| Key | Shape | Purpose |
|---|---|---|
| `cub_last_contact` | `{ phone, name, isArchived }` | Auto-selected on cold open when `currentUserId` loads |
| `cub_profile_cache` | `{ therapist_name, clinic_name, profession_abbreviation, profession_type }` | Seeds Dashboard initial state to prevent name/title flash |

Both are cleared on sign out.

---

## Supabase Schema (tables the PWA touches)

### `practitioners`
| Column | Notes |
|---|---|
| `user_email` | unique; used as conflict key |
| `therapist_name`, `clinic_name` | display fields |
| `profession_type` | short code (`RMT`, `PT`) or raw OTHER text |
| `profession_abbreviation` | always a short code — displayed in header |
| `practitioner_phone` | personal mobile for voice bridge |
| `clinic_number` | purchased Twilio number |
| `stripe_status` | `active`, `past_due`, `inactive` |
| `trial_status` | `active`, `trial` |
| `trial_start_date` | used for feedback prompt scheduling |
| `current_status` | `active`, `session`, `off` |
| `survey_completed`, `tour_completed` | boolean one-time UI gates |
| `feedback_day3_completed`, `feedback_day14_completed`, `feedback_day25_completed` | boolean |
| `registration_number` | optional, shown in Settings |
| `auto_reply_msg`, `enable_auto` | Off Duty auto-reply |
| `in_session_msg`, `enable_in_session_auto` | In Session auto-reply |
| `days_off` | int array (0=Sun … 6=Sat) |
| `push_subscription` | VAPID subscription JSON |

### `messages`
`body`, `direction` (`outbound`/`system`), `to_number`, `from_number`, `practitioner_id`, `status`, `is_archived`, `created_at`

### `contacts`
`practitioner_id`, `phone_number`, `display_name`, `is_archived`

**Rule:** always filter `messages` and `contacts` by `practitioner_id`. Never filter by phone number alone.

---

## Profession Type Rules
- `PROFESSIONS` in `src/constants/professions.js` is the single source of truth — values are short codes (`RMT`, `PT`, `OT`, etc.)
- Both `Onboarding` and `Settings` import from this file
- `profession_type` = short code, or raw free text if OTHER (e.g. `'Speech Therapist'`)
- `profession_abbreviation` = always the short code (e.g. `'RMT'`, `'ST'`) — used in header
- Legacy long-form values from old Settings saves (e.g. `'Physiotherapist'`) are mapped to short codes via `LONG_FORM_TO_CODE` in `Settings.jsx` on load

---

## Service Worker (`public/sw.js`)
- Handles `push` events: shows notification, sets app badge via `navigator.setAppBadge`
- Registered in `src/lib/notifications.js` — registration only happens after `clinic_number` is confirmed
- Push subscription stored on `practitioners.push_subscription`

---

## Sentry
- Initialised in `index.js` with `REACT_APP_SENTRY_DSN`
- `tracesSampleRate: 0.1` (10%)
- `beforeSend` strips `event.request.data` — **never send patient data to Sentry**
- `ReportIssue.jsx` uses `Sentry.captureMessage` directly

---

## Design Conventions
- All UI is **inline styles** — no external CSS classes, no Tailwind
- Colour palette: `#F7F6F2` bg · `#588157` green · `#2F3E46` dark · `#9CAF88` light green · `#EAF3DE` light green bg · `#E2E8E1` border
- Font: `'Outfit', sans-serif` everywhere
- Border radius: `12px` standard, `10px` small
- `100dvh` used for full-height containers (iOS safe area aware)
- iPhone detection: `const isIPhone = /iPhone|iPod/.test(navigator.userAgent)`

---

## Security Rules
- Never log or display patient phone numbers or message content in error states
- PIPA compliance: no patient data leaves Canada — Supabase region is Canada
- Always filter `messages` and `contacts` by `practitioner_id`, not phone number alone
- `beforeSend` in Sentry strips request body — never send patient data to third parties
- Supabase RLS is enforced — do not bypass with service role key from the frontend

---

## Before Making Changes
- [ ] If touching a Supabase query on `messages` or `contacts` — confirm `practitioner_id` filter is present
- [ ] If touching profession fields — keep `profession_type` and `profession_abbreviation` in sync
- [ ] If touching `Dashboard.jsx` localStorage — update both read and clear paths
- [ ] If adding a new component used in Dashboard — check if it needs `currentUserId` or `userEmail` passed down
- [ ] Stripe/subscription changes — verify `checkSubscription` in `App.js` still gates correctly
- [ ] Push notification changes — test on a real iOS device (simulator does not support push)
- [ ] Deploy via `npm run deploy` (health-check gated) not `vercel --prod` directly
