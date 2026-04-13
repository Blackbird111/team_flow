# SAAS-STARTER — Setup Guide

This guide walks you through setting up all external services and getting SAAS-STARTER running locally from scratch.

**Estimated time**: 30–45 minutes

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Dependencies](#2-install-dependencies)
3. [Neon PostgreSQL Database](#3-neon-postgresql-database)
4. [NextAuth / Auth Secret](#4-nextauth--auth-secret)
5. [Google OAuth (optional)](#5-google-oauth-optional)
6. [Resend (Email)](#6-resend-email)
7. [Stripe (Payments)](#7-stripe-payments)
8. [OpenAI (AI Chat)](#8-openai-ai-chat)
9. [Run Database Migrations](#9-run-database-migrations)
10. [Start Development Server](#10-start-development-server)
11. [Verify Everything Works](#11-verify-everything-works)

---

## 1. Prerequisites

Make sure you have the following installed:

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node) or **pnpm**
- **Git**

Create free accounts on these services:
- [Neon](https://neon.tech) — serverless PostgreSQL
- [Stripe](https://stripe.com) — payments
- [OpenAI](https://platform.openai.com) — AI API
- [Resend](https://resend.com) — transactional email
- [Google Cloud Console](https://console.cloud.google.com) — OAuth (optional)

---

## 2. Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/saas-starter.git
cd saas-starter

# Install packages
npm install

# Copy environment file
cp .env.example .env.local
```

Open `.env.local` in your editor. You will fill it in step by step below.

---

## 3. Neon PostgreSQL Database

Neon provides a free serverless PostgreSQL database — perfect for development and small production workloads.

### Create a database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Click **"New Project"**
3. Name your project (e.g., `saas-starter`)
4. Select the region closest to your users
5. Click **"Create Project"**

### Get the connection string

1. In your Neon project dashboard, click **"Connection Details"**
2. Select **"Connection string"** tab
3. Copy the string — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb
   ```

> ⚠️ **Important**: Do NOT append `?sslmode=require` to the URL. SAAS-STARTER configures SSL programmatically in `src/lib/prisma.ts`.

### Add to .env.local

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb"
```

---

## 4. NextAuth / Auth Secret

NextAuth v5 requires a secret for signing session tokens.

### Generate a secret

```bash
openssl rand -base64 32
```

Or use the online generator at [generate-secret.vercel.app](https://generate-secret.vercel.app/32)

### Add to .env.local

```env
AUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

> In production, `NEXTAUTH_URL` should be your deployed domain, e.g., `https://yoursaas.com`

---

## 5. Google OAuth (optional)

Skip this section if you don't want Google sign-in. The template will still work with Email/Password and Magic Links.

### Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services → Credentials**
4. Click **"Create Credentials" → "OAuth client ID"**
5. Select **"Web application"**
6. Add these URIs:
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
7. Click **"Create"**
8. Copy the **Client ID** and **Client Secret**

### Enable Google+ API

1. Go to **APIs & Services → Library**
2. Search for **"Google+ API"**
3. Click **Enable**

### Add to .env.local

```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

---

## 6. Resend (Email)

Resend is used to send magic links, password reset emails, and verification emails.

### Create API key

1. Go to [resend.com](https://resend.com) and sign up
2. Go to **API Keys** in the sidebar
3. Click **"Create API Key"**
4. Name it (e.g., `saas-starter-dev`) and click **"Add"**
5. Copy the API key (starts with `re_`)

### Configure your sending domain (optional for dev)

For development, Resend lets you send from `onboarding@resend.dev` without domain verification.

For production:
1. Go to **Domains** in Resend sidebar
2. Add your domain and follow the DNS verification steps

### Add to .env.local

```env
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="noreply@yourdomain.com"
```

> For development without a domain, use: `EMAIL_FROM="onboarding@resend.dev"`

---

## 7. Stripe (Payments)

This is the most involved setup step. Take your time.

### Create products in Stripe

1. Go to [stripe.com](https://stripe.com) and sign up
2. Make sure you're in **Test Mode** (toggle in the top-right)
3. Go to **Products → Add Product**

Create 3 products (Free tier uses no Stripe product):

#### Starter Plan — $9/month
- Name: `Starter`
- Price: `$9.00` / `Monthly`
- After creating, copy the **Price ID** (starts with `price_`)

#### Pro Plan — $29/month
- Name: `Pro`
- Price: `$29.00` / `Monthly`
- Copy the **Price ID**

#### Enterprise Plan — $99/month
- Name: `Enterprise`
- Price: `$99.00` / `Monthly`
- Copy the **Price ID**

### Update PLANS in the code

Open `src/lib/stripe.ts` and replace the price IDs:

```typescript
export const PLANS = {
  FREE: {
    name: "Free",
    slug: "FREE",
    price: 0,
    stripePriceId: null,
    limits: { messagesPerMonth: 20 },
  },
  STARTER: {
    name: "Starter",
    slug: "STARTER",
    price: 9,
    stripePriceId: "price_YOUR_STARTER_PRICE_ID", // ← replace
    limits: { messagesPerMonth: 500 },
  },
  PRO: {
    name: "Pro",
    slug: "PRO",
    price: 29,
    stripePriceId: "price_YOUR_PRO_PRICE_ID", // ← replace
    limits: { messagesPerMonth: 2000 },
  },
  ENTERPRISE: {
    name: "Enterprise",
    slug: "ENTERPRISE",
    price: 99,
    stripePriceId: "price_YOUR_ENTERPRISE_PRICE_ID", // ← replace
    limits: { messagesPerMonth: Infinity },
  },
};
```

### Get Stripe API keys

1. In Stripe Dashboard, go to **Developers → API Keys**
2. Copy the **Publishable key** (starts with `pk_test_`)
3. Copy the **Secret key** (starts with `sk_test_`)

### Set up Stripe webhook (for local development)

1. Install the Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

2. Login:
   ```bash
   stripe login
   ```

3. Start webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the **webhook signing secret** printed in the terminal (starts with `whsec_`)

> Keep this terminal window open while developing. Stripe events will be forwarded to your local server.

### Add to .env.local

```env
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_local_webhook_secret"
```

---

## 8. OpenAI (AI Chat)

### Create API key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Click your profile → **"API Keys"**
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-`)

> ⚠️ You'll need to add a credit card and add some credits ($5 minimum). The template uses `gpt-4o-mini` by default which is very inexpensive (~$0.15 per million tokens).

### Add to .env.local

```env
OPENAI_API_KEY="sk-your-openai-api-key"
```

### Change the model (optional)

Open `src/app/api/chat/route.ts` and change the model name:

```typescript
model: "gpt-4o-mini",      // cheap, fast (default)
// model: "gpt-4o",         // smarter, more expensive
// model: "gpt-3.5-turbo",  // alternative
```

---

## 9. Run Database Migrations

With `DATABASE_URL` set in `.env.local`, run:

```bash
# Create all tables from the Prisma schema
npx prisma migrate dev --name init

# Generate the Prisma client
npx prisma generate
```

You should see output like:
```
✔ Your database is now in sync with your schema.
Generated Prisma Client
```

### Verify the database

```bash
npx prisma studio
```

This opens a visual database browser at `http://localhost:5555`. You should see empty tables: `User`, `Account`, `Session`, `Subscription`, `Message`, etc.

---

## 10. Start Development Server

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000) using Turbopack for fast HMR.

In a separate terminal, start the Stripe webhook listener (if not already running):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 11. Verify Everything Works

Go through this checklist to confirm all integrations are working:

### ✅ Auth
- [ ] Register a new account at `/register`
- [ ] Check your email for a verification email (or check Resend logs)
- [ ] Log in at `/login`
- [ ] Click "Forgot Password" and receive a reset email
- [ ] Sign in with Google (if configured)
- [ ] Try "Magic Link" — send a link to your email

### ✅ Dashboard
- [ ] After login, you should be redirected to `/dashboard`
- [ ] Stats card shows "Free" plan
- [ ] Usage bar shows 0/20 messages used

### ✅ AI Chat
- [ ] Go to `/chat`
- [ ] Send a message — you should see a streaming response
- [ ] Send 20+ messages to hit the Free tier limit
- [ ] Verify you get a "limit reached" error

### ✅ Stripe (Test Mode)
- [ ] Go to `/pricing` or click "Upgrade" in the dashboard
- [ ] Click "Upgrade" on the Starter plan
- [ ] You're redirected to Stripe Checkout
- [ ] Use test card: `4242 4242 4242 4242`, any future date, any CVC
- [ ] After payment, you're redirected back and your plan is updated
- [ ] Check the Stripe CLI terminal — you should see webhook events

### ✅ Blog
- [ ] Visit `/blog` — you should see sample posts
- [ ] Click a post to verify MDX rendering works

---

## Troubleshooting

### "PrismaClientInitializationError"
- Check that `DATABASE_URL` is set correctly in `.env.local`
- Make sure there's no `?sslmode=require` at the end of the URL
- Run `npx prisma generate` again

### "AUTH_SECRET is not set"
- Make sure `AUTH_SECRET` is in `.env.local` (not `.env`)
- Restart the dev server after adding it

### Stripe webhooks not triggering
- Make sure `stripe listen` is running in a separate terminal
- Verify `STRIPE_WEBHOOK_SECRET` matches the one printed by the CLI
- Check the Stripe CLI terminal for errors

### Emails not sending
- Check your `RESEND_API_KEY` is correct
- For development, use `EMAIL_FROM="onboarding@resend.dev"`
- Check the Resend dashboard for delivery logs

### Google OAuth "redirect_uri_mismatch"
- The redirect URI in Google Console must exactly match: `http://localhost:3000/api/auth/callback/google`
- No trailing slash

---

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) to deploy to Vercel
- Customize the brand name, colors, and copy
- Add your Stripe price IDs to `src/lib/stripe.ts`
- Write your first blog post in `content/blog/`