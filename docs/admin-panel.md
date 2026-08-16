# Drip Nation — Admin Panel: Access & Security

`admin.html` — the internal control panel (dashboard, category/product/promo CMS,
orders, users).

---

## Part 1 — How to get in (one-time)

Being logged in is **not** enough — your account must be in the `admins` table.
Do this once:

### 1. Create your account
Supabase Dashboard → **Authentication → Users → Add user**
- Email: your email
- Password: your choice
- ✅ **Check "Auto Confirm User"** — required (no email/SMTP is wired up yet, so
  without this you can't sign in)

*(Alternatively, use the "Create account" form on `/admin.html` — but it needs email
confirmation, so enable Auto-Confirm on the Email provider first, or just use the
dashboard method above.)*

### 2. Grant yourself admin
Supabase Dashboard → **SQL Editor**, run:
```sql
insert into admins (id) select id from auth.users where email = 'YOUR_EMAIL';
```
*(Or tell me the email and I'll run the promote for you — that part isn't sensitive.)*

### 3. Sign in
Open `/admin.html` (locally: `http://localhost:8137/admin.html`; live: your Vercel
URL) → sign in with that email/password → the full panel unlocks.

To add more admins later, repeat step 2 with their email (they must sign up first).

---

## Part 2 — How the admin panel is secured

Security is **two independent layers**, and the database — not the UI — is the real gate.

### Authentication (who are you?)
- **Supabase Auth**, email/password. Passwords are bcrypt-hashed by Supabase (never
  stored or seen by us). Sessions are short-lived JWTs managed by the Supabase client.

### Authorization (what may you do?)
- A user is an admin **iff** their `auth.uid()` is in the `admins` table
  (`is_admin()`). **Logging in ≠ admin.** A brand-new signup sees *"this account is
  not an admin."*
- The `admins` table is **fail-closed**: it has *no* insert/update/delete policies,
  so a user **cannot promote themselves** — only trusted server-side SQL / the
  service role can grant admin.

### Row Level Security is the enforcement boundary
- Every catalog/promo/order **write** policy requires `is_admin()`. The database
  rejects a non-admin write **regardless of the UI**.
- **Verified live:** anonymous and non-admin writes return `401` / affect **0 rows**;
  reads of orders/admins/profiles return nothing to non-owners.
- **The UI gate is UX only** — the panel is hidden until an admin session is
  confirmed, but even if someone edited the page in their browser to reveal it,
  RLS still blocks every write. Hiding a button is never the security.

### Other measures in place
- **Service-role key is never in the browser.** The admin panel uses only the
  *public anon key*; RLS does all enforcement. The powerful service-role key lives
  only inside server-side Edge Functions.
- **Stored-XSS protection** — every database value rendered in the admin is
  HTML-escaped, so a malicious product name can't inject script.
- **Least privilege on functions** — payment/promo/rate-limit functions are
  `service_role`-only; the signup trigger function is execute-locked (migration
  `0008`). Verified: anon RPC to these → `404`/`401`.
- **Data isolation** — admins read all profiles/orders for management; a normal user
  can read only their own profile; anon sees none of it.

### Not yet done (recommended before a real production launch)
- **Custom SMTP** so email confirmation / password reset actually send (today it's
  bypassed via dashboard Auto-Confirm).
- **MFA (TOTP)** for admin accounts — Supabase supports it; recommended.
- **Server-side admin audit log** — the current Activity log is per-browser
  (localStorage); a real "who changed what" trail should be a DB table.
- **Defense-in-depth on the URL** — `admin.html` is a public path (safe, because RLS
  gates everything), but you could add Vercel password protection or move it behind
  a separate subdomain.
