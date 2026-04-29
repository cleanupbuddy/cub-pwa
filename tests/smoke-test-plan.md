# CUB Line Smoke Test Plan

## Purpose
Verify the app’s most critical user flows before production deploy.

## Critical flows

### 1. App opens
- [ ] Login page loads
- [ ] Existing user can sign in
- [ ] Dashboard loads
- [ ] Contacts appear

### 2. SMS
- [ ] Open patient thread
- [ ] Send test SMS
- [ ] Message appears in chat
- [ ] Patient device receives SMS

### 3. Inbound SMS
- [ ] Patient sends SMS to clinic number
- [ ] Message appears in correct thread
- [ ] Badge/unread count updates

### 4. Calling
- [ ] Pre-call text sends
- [ ] Call button rings therapist phone
- [ ] Patient sees clinic number

### 5. Safety
- [ ] Switch between contacts
- [ ] Messages match selected contact
- [ ] No wrong-thread display

### 6. Archive
- [ ] Archive thread
- [ ] Thread leaves active list
- [ ] Restore thread
- [ ] Thread returns to active list