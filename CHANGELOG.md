## v1.3.0 — April 2026

### Code Review & Cleanup
- Centralized VERCEL_URL into src/lib/config.js
- Removed all debug console.logs from production code
- Consistent user_email used throughout all Supabase queries
- Removed unused props: subaccountSid from VoiceCall and ChatWindow
- Removed unused profile prop from WelcomeSurvey
- Deleted dead sms-reply.js file
- Removed outdated Chrome extension references from bridge API comments
- Fixed duplicate Content-Type header in search-numbers.js
- Added export const config bodyParser false to stripe-webhook.js

### Fixed
- Phone number formatting — parentheses and dashes now cleaned before saving
- Draft messages filtered from contacts list and chat window
- Undo archive now syncs both messages and contacts tables
- Settings personal mobile field accepts any format

### Added
- ShareFeedback component and hamburger menu item
- Install banner for browser users prompting Add to Home Screen
- trial_start_date now set automatically on Stripe checkout complete
- Draft contact inserted into contacts table when adding new patient

## v1.2.1 — April 2026

### Fixed
- Archive flow fully working — contact disappears from active list immediately
- Archived contact reappears automatically when patient sends new message (WhatsApp model)
- Contact name preserved when unarchiving
- New contact appears in list immediately after adding via + button
- Days off saving correctly
- Profile null from null — onboarding now uses session.user.email
- Pull-to-refresh disabled on iOS Safari
- Settings Edit/Save moved to header — more intuitive
- Quick action chips padding at bottom

### Added
- Install banner for browser users — prompts to add to home screen
- Error toast if archive action fails
- contacts table is_archived column — stays in sync with messages table
- Auto-unarchive both messages and contacts tables on new inbound message

## v1.2.0 — April 2026

### Added
- In Session auto-reply — separate message and toggle from Off Duty
- Export Message History — CSV export with patient and date filters
- Export logs table — tracks all exports for compliance
- Report an Issue — user reported problems sent to Sentry + Supabase
- Share Feedback — general feedback saved to Supabase feedback table
- Onboarding tour — 9 step contextual side panel guide
- Sentry error monitoring — automatic error detection, PIPA-safe
- Switch Account — forces Google account picker on login

### Improved
- Onboarding tour now shows as side panel with greyed background
- Tour copy updated with UI snippets and refined messaging
- Settings — In Session auto-reply above Off Duty
- Settings — Export and Subscription sections styled consistently
- Archive/restore flow — smooth transitions between active and archived
- Unread badge clears immediately on contact open
- Voice call countdown after pre-call text
- Feedback prompts — day specific questions for days 3, 14 and 25
- Back buttons added to all feedback prompt steps

### Fixed
- Sign out on iPad
- Switch Account Google session clearing
- contacts list refresh after archive and restore
- Settings save using user_email instead of id

## v1.1.1 — April 2026

### Improved
- Message input box starts at 1/5 screen height, auto-expands as you type
- Chat header stays fixed when iOS keyboard appears
- Unread badge clears immediately when opening a contact
- Removed unnecessary back button from chat header in PWA split view
- onKeyPress replaced with onKeyDown (deprecated warning resolved)

### Fixed
- Archive/restore flow fully working — contact disappears from active list after toast
- Restored contact returns to active list automatically
- Contacts list refreshes immediately after archive, restore and read actions
- Website CTA buttons now point to app.getcubsuite.com

## v1.1.0 — April 2026

### Added
- Hamburger menu — status, Settings, Help & FAQ, Sign Out
- Settings page — profile, number search/claim, days off, auto-reply, billing portal
- Voice calling — bridge call with pre-call text, success state auto-dismiss
- Push notifications — VAPID, service worker, saves subscription to Supabase
- Welcome survey — 4 questions, saves to Supabase
- Onboarding flow — 3 steps for new users (profile, mobile, claim number)
- Paywall — Founding 50 and Standard plans via Stripe
- Contact name editing — click name in chat header to edit, saves to Supabase
- Message archiving — archive/restore with toast and undo
- Archived conversations view — toggle in contacts list
- Billing portal — Manage Billing button in Settings
- Help & FAQ link in hamburger menu
- "View archived →" toggle at bottom of contacts list
- Restore button in archived chat view (filled green with circular arrow)

### Improved
- Contact list preview updates in real time
- Contact name updates instantly when switching contacts
- Unread badge clears immediately on contact open
- Hamburger menu closes on outside click
- Service worker disabled in development to prevent cache issues
- Stripe automatic tax enabled (GST 5% BC)
- Stripe tax code set to txcd_10103001 (SaaS)

### Fixed
- Sign out button in hamburger menu
- Contact list loading after returning from Settings
- Voice calling field names corrected (practitionerPhone, patientPhone)
- Pre-call text now shows therapist name and clinic name
- Paywall subscription check loading issue
- Cache clearing no longer needed in development

### Website
- FAQ updated — Setup Guide category added (8 steps)
- FAQ updated — Notifications, device guidance, browser recommendations
- FAQ split into two Carrd embeds to avoid character limit
- MacBook mockup hero image updated
- Plausible Analytics installed
- Shield icon added to Trust & Compliance section

## v1.0.0 — April 2026 — PWA Beta Launch

### Added
- React PWA at app.getcubsuite.com
- Google OAuth login
- Split view layout — contacts left, chat right
- Real-time SMS messaging
- Contacts list with search and unread badges
- New chat with + button
- Quick action chips (Intro, Pre-call, Late?, Cancellation)
- Status system — Active, In Session, Off Duty
- Hamburger menu with status, Settings, Help & FAQ, Sign Out
- Settings page — profile, number search/claim, days off, auto-reply
- Voice calling — bridge call with pre-call text
- Push notifications via VAPID and service worker
- Welcome survey — 4 questions, saves to Supabase
- Onboarding flow — 3 steps for new users
- Paywall — Founding 50 and Standard plans via Stripe
- Contact name editing in chat header
- Contact list preview updates in real time
- iPad installable PWA via Safari Add to Home Screen
- Custom domain app.getcubsuite.com
- Outfit font throughout

### Infrastructure
- Vercel hosting for PWA
- Supabase push_subscription column added
- Supabase survey columns added
- Service worker for push notifications
- VAPID keys generated and stored in Vercel env vars
- Stripe automatic tax enabled
- Plausible Analytics on getcubsuite.com
- FAQ updated with Setup Guide, Notifications, device guidance