# CUB Line — Deployment Regression Checklist

## Purpose

This checklist is used before any production deployment to make sure CUB Line’s core functionality is still working.

The current goal is not to add features. The goal is to prevent regressions in messaging, calling, notifications, authentication, contact state, and deployment safety.

---

## Deployment rule

Do not deploy directly from an untested local state.

Recommended flow:

```text
dev branch → preview deploy → regression checklist → merge to main → production deploy
```

Production should only be updated after the checklist passes.

---

## Pre-deploy checklist

### 1. Confirm correct repo and branch

Frontend:

```bash
cd ~/Desktop/cub-pwa
git branch
```

Backend:

```bash
cd ~/path/to/bridge-api
git branch
```

Expected:

* Work happens on `dev`
* Production deploy happens from `main`
* Do not deploy from the wrong folder

---

### 2. Confirm Git is clean

Run in both frontend and backend repos:

```bash
git status
```

Expected:

```text
nothing to commit, working tree clean
```

If there are changes, commit them before deploying.

---

### 3. Frontend build check

Run in frontend repo:

```bash
npm run build
```

Expected:

* Build succeeds
* Warnings are acceptable for now
* No compile errors

Known acceptable current warnings:

* React hook dependency warnings
* unused `loading`/`isRefreshing` warnings

These should eventually be cleaned up, but they are not blockers unless build fails.

---

### 4. Backend route availability check

Open these URLs in browser after backend deploy:

```text
https://cub-bridge-api.vercel.app/api/send-sms
```

Expected:

```json
{ "ok": true, "route": "send-sms" }
```

If this does not load, backend deployment or routing is broken.

---

## Core functional regression tests

### 1. Login / startup

Test on desktop browser first.

Expected:

* App loads
* Existing account signs in
* Dashboard appears
* Contacts list appears
* No forced reload screen

Then test on iPhone/iPad PWA.

Expected:

* Cold open works
* App does not hang indefinitely on loading

---

### 2. Contact list

Expected:

* Active conversations appear
* Contact names appear if saved
* Latest message preview appears when available
* Archived toggle works
* No false “No active chats yet” when conversations exist

Known issue:

* On resume, contact list can occasionally fail to populate or previews can be missing. Track frequency.

---

### 3. Send regular SMS

Steps:

1. Open an active patient thread.
2. Send a short test message.
3. Confirm the message appears in the chat.
4. Confirm the recipient device receives the SMS.

Expected:

* Message sends successfully
* No red failed-message state
* Message is logged in Supabase
* Contact preview updates

Fail indicators:

* Browser CORS error
* `Missing auth token`
* `SMS send failed`
* message appears locally but does not arrive

---

### 4. Receive inbound SMS

Steps:

1. From patient phone, send a message to clinic number.
2. Watch CUB Line.

Expected:

* Message appears in correct thread
* Contact list updates
* Unread badge/count updates
* Push notification fires if app is closed/backgrounded

---

### 5. Badge behavior

Steps:

1. Send inbound message while app is closed/killed.
2. Confirm app icon badge appears.
3. Open the matching chat.
4. Confirm badge clears.

Expected:

* Badge increases on unread inbound message
* Badge clears after chat is opened/read

---

### 6. Pre-call text

Steps:

1. Open patient chat.
2. Open call modal.
3. Tap “Pre-call Text.”

Expected:

* Patient receives pre-call SMS
* Countdown appears
* No error state

Fail indicators:

* CORS error
* `Missing auth token`
* pre-call button does nothing

---

### 7. Voice call

Steps:

1. Open patient chat.
2. Tap call.
3. Tap Call Now.

Expected:

* Therapist phone rings first
* Patient sees clinic number
* Call connects
* System call log appears in chat if currently supported

Fail indicators:

* `Missing auth token`
* `Call failed`
* Twilio call does not initiate
* wrong caller ID

---

### 8. Contact name save

Steps:

1. Open patient thread.
2. Tap “Add name.”
3. Save a test name.
4. Go back to contact list.
5. Reopen app.

Expected:

* Name saves
* Name appears in contact list
* Name appears in chat header
* Name persists after reopen

---

### 9. Archive / restore

Steps:

1. Archive a conversation.
2. Confirm it leaves active list.
3. Open archived list.
4. Confirm it appears there.
5. Restore it.
6. Confirm it returns to active list.

Expected:

* Contact and messages stay in sync
* No duplicate thread appears
* Saved name is preserved

Known risk:

* Archive/contact/message state has had edge cases. Watch carefully.

---

### 10. Wrong-thread safety test

Steps:

1. Open contact A.
2. Go back.
3. Open contact B.
4. Repeat quickly after app resume.

Expected:

* Header matches messages
* Messages shown belong only to selected contact
* Sending goes to selected contact

This is a high-priority safety test.

---

## Production deploy checklist

Only deploy production if:

* Build succeeds
* SMS send works
* SMS receive works
* Pre-call text works
* Call works
* Badge set/clear works
* Wrong-thread safety test passes

Deploy frontend:

```bash
cd ~/Desktop/cub-pwa
git checkout main
git merge dev
git push
vercel --prod --build-env CI=false
```

Deploy backend:

```bash
cd ~/path/to/bridge-api
git checkout main
git merge dev
git push
vercel --prod
```

Important:

* Frontend deploy does not deploy backend.
* Backend deploy does not deploy frontend.
* SMS/call changes usually require backend deploy.
* UI changes usually require frontend deploy.

---

## Automation plan

### Phase 1 — Manual checklist

Use this checklist before every production deployment.

Goal:

* Prevent another accidental broken deploy.

---

### Phase 2 — Simple automated checks

Add scripts that check:

* frontend builds
* backend routes respond
* required environment variables exist
* API health endpoints return expected JSON

Suggested scripts:

```bash
npm run build
curl https://cub-bridge-api.vercel.app/api/send-sms
```

---

### Phase 3 — Automated smoke tests

Add Playwright/Cypress tests for:

* login
* contact list renders
* open chat
* send message test path using a controlled test number

Note:

* Real Twilio SMS/calls may cost money, so these should be limited or use test credentials where possible.

---

### Phase 4 — CI/CD pipeline

Desired future deployment pipeline:

```text
push to dev → preview deployment → automated checks → manual approval → merge to main → production deployment
```

Long-term goal:

* no production deploy without passing checks
* no direct editing/deploying from unstable local state

---

## Security items intentionally deferred

Current working state prioritizes functionality.

Known high-priority security work still needed:

1. Reintroduce API auth safely.
2. Verify authenticated practitioner owns clinic number before SMS/call.
3. Restrict CORS properly.
4. Resolve identity consistency between `auth.uid()` and `user_email`.
5. Add webhook signature validation where applicable.
6. Confirm database backup/PITR settings.
7. Confirm encryption posture for compliance documentation.

These should be implemented on `dev` branch only, with regression testing before production.
