# Drip Nation — Admin Panel Guide

## Accessing the Admin Panel

The admin panel is available at:

```
https://www.dripnation.co.in/admin.html
```

For local development:

```
http://localhost:8137/admin.html
```

---

## Authentication & Authorization

The admin panel uses a **two-layer security model**:

1. **Authentication** — Email/password login via Supabase Auth
2. **Authorization** — The signed-in user must exist in the `admins` database table

> **Creating an account does NOT automatically grant admin access.**  
> A user must be explicitly added to the `admins` table via SQL.

---

## Setting Up a New Admin

### Step 1 — Create a User Account

**Option A: Via the Admin Panel sign-up form**

1. Go to `/admin.html`
2. Click **"Create one"** under the sign-in form
3. Fill in: Full name, Email, Phone (optional), Password, Confirm password
4. Click **Create account**
5. If email confirmation is not configured, auto-confirm the user via:  
   [Supabase Dashboard → Auth → Users](https://supabase.com/dashboard/project/ukqcptrbsmdreelgdovl/auth/users) → find the user → **⋮ → Confirm user**

**Option B: Via Supabase Dashboard**

1. Go to [Supabase Dashboard → Auth → Users](https://supabase.com/dashboard/project/ukqcptrbsmdreelgdovl/auth/users)
2. Click **Add user**
3. Enter email and password, check **Auto Confirm User**
4. Click **Create user**

### Step 2 — Grant Admin Access

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/ukqcptrbsmdreelgdovl/sql/new)
2. Run:

```sql
INSERT INTO admins (id)
SELECT id FROM auth.users WHERE email = 'USER_EMAIL_HERE';
```

### Step 3 — Sign In

1. Go to the admin panel URL
2. Enter email and password
3. The dashboard will load with all management tabs

---

## Admin Panel Features

| Tab | Description |
|---|---|
| **Dashboard** | Revenue overview, total orders, recent orders |
| **Categories** | Add/delete product categories |
| **Products** | Full CRUD — add, edit, search, delete products |
| **Orders** | View all orders, update fulfillment status (Processing → Shipped → Delivered) |
| **Promos** | Create/delete promo codes (percentage, fixed, free shipping) |
| **Users** | View registered users and their admin/user role |
| **CMS** | Hero/Marquee configuration (local-only, not DB-backed yet) |
| **Activity** | Local activity log of admin actions |

---

## Checking Existing Admins

Run this in the [SQL Editor](https://supabase.com/dashboard/project/ukqcptrbsmdreelgdovl/sql/new):

```sql
SELECT a.id, u.email, a.created_at
FROM admins a
JOIN auth.users u ON u.id = a.id;
```

---

## Revoking Admin Access

```sql
DELETE FROM admins
WHERE id = (SELECT id FROM auth.users WHERE email = 'USER_EMAIL_HERE');
```

The user's account will remain, but they will see "this account is not an admin" on the next visit.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "This account is not an admin" | User exists but isn't in the `admins` table. Run the INSERT SQL above. |
| Sign-up says "check email to confirm" | SMTP isn't configured. Auto-confirm via Dashboard: **Auth → Users → ⋮ → Confirm user** |
| Panel doesn't load after sign-in | Open DevTools (F12) → Console. Check for Supabase connection errors. |
| "Access check failed" | Supabase project may be paused or the anon key is incorrect. |

---

## Security Notes

- The `admins` table has **no INSERT/UPDATE/DELETE RLS policies** — only the Supabase service role or direct SQL can grant/revoke admin access. This is intentional (fail-closed design).
- UI controls (hiding buttons for non-admins) are for UX only. **Row Level Security (RLS)** is the real enforcement layer — even if someone bypasses the UI, database writes are rejected.
- The admin panel uses the **anon (publishable) key** for reads and the **authenticated session JWT** for writes. The service-role key is never exposed to the browser.
