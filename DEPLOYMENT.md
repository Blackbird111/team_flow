# SAAS-STARTER — Deployment Guide

This guide covers deploying SAAS-STARTER to **Vercel** (recommended) and configuring Stripe webhooks for production.

**Estimated time**: 20–30 minutes

---

## Table of Contents

1. [Before You Deploy](#1-before-you-deploy)
2. [Deploy to Vercel](#2-deploy-to-vercel)
3. [Set Environment Variables on Vercel](#3-set-environment-variables-on-vercel)
4. [Configure Production Stripe Webhook](#4-configure-production-stripe-webhook)
5. [Configure Google OAuth for Production](#5-configure-google-oauth-for-production)
6. [Configure Resend for Production](#6-configure-resend-for-production)
7. [Run Database Migrations in Production](#7-run-database-migrations-in-production)
8. [Verify Production Deployment](#8-verify-production-deployment)
9. [Custom Domain](#9-custom-domain)
10. [Post-Launch Checklist](#10-post-launch-checklist)

---

## 1. Before You Deploy

Complete these steps before deploying:

- [ ] All features work locally (see [SETUP.md](SETUP.md))
- [ ] You have a **live** Stripe account (not just test mode)
- [ ] Your domain is purchased (or you'll use the `.vercel.app` subdomain)
- [ ] Neon database is set up and migrations have been run locally

### Switch to Stripe Live Mode

When you're ready to accept real payments:

1. In Stripe Dashboard, toggle from **Test** to **Live** mode (top-right)
2. Go to **Products** and recreate your plans in Live mode
3. Copy the new **Live** price IDs
4. Update `src/lib/stripe.ts` with the live price IDs
5. Go to **Developers → API Keys** in Live mode
6. Copy the live **Secret Key** (`sk_live_...`) and **Publishable Key** (`pk_live_...`)

---

## 2. Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (easiest)

1. Push your project to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Vercel auto-detects Next.js — leave all build settings as defaults
6. Click **"Deploy"** (it will fail because env vars aren't set yet — that's OK)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: saas-starter (or your name)
# - Root directory: ./
# - Override settings? No
```

---

## 3. Set Environment Variables on Vercel

This is the most important step. All your `.env.local` variables need to be added to Vercel.

### Via Vercel Dashboard

1. Go to your project on [vercel.com](https://vercel.com)
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable below

> Select **"Production"**, **"Preview"**, and **"Development"** environments unless noted otherwise.

### Required Variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Your Neon connection string | Same as local |
| `AUTH_SECRET` | 32-byte random string | Generate new one for production |
| `NEXTAUTH_URL` | `https://yourdomain.com` | Your production URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Update redirect URIs first |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | |
| `RESEND_API_KEY` | `re_...` | |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Must be verified domain |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Use LIVE key in production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Use LIVE key in production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Set up in Step 4 |
| `OPENAI_API_KEY` | `sk-...` | |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | |

### Generate a production AUTH_SECRET

```bash
openssl rand -base64 32
```

Use a **different** secret than your local development one.

### Via Vercel CLI (bulk import)

```bash
# Pull current env vars from Vercel
vercel env pull

# Or add one by one:
vercel env add AUTH_SECRET production
```

---

## 4. Configure Production Stripe Webhook

The local `stripe listen` CLI only works in development. For production, you need to register a real webhook endpoint in Stripe.

### Create the webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) in **Live mode**
2. Navigate to **Developers → Webhooks**
3. Click **"Add endpoint"**
4. Set the endpoint URL:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
5. Under **"Events to listen to"**, click **"Select events"** and add:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **"Add endpoint"**

### Get the webhook signing secret

1. Click on your newly created webhook endpoint
2. Under **"Signing secret"**, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)
4. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

### Redeploy after adding the secret

```bash
vercel --prod
```

Or push a commit to trigger an automatic redeployment.

---

## 5. Configure Google OAuth for Production

You need to add your production domain to the Google OAuth allowed origins.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services → Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add your production URLs:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/api/auth/callback/google`
5. Click **"Save"**

---

## 6. Configure Resend for Production

### Verify your domain

1. Go to [resend.com](https://resend.com) → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records shown to your domain registrar (Cloudflare, Namecheap, etc.)
5. Wait for verification (usually a few minutes)

### Update EMAIL_FROM

Once your domain is verified, update the `EMAIL_FROM` environment variable on Vercel:
```
EMAIL_FROM="noreply@yourdomain.com"
```

---

## 7. Run Database Migrations in Production

Your Neon database should already have the schema from local development (since you connect to the same `DATABASE_URL`). If you're using a separate production database:

### Option A: Run migrations locally against production DB

```bash
# Temporarily set DATABASE_URL to your production database URL
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Option B: Use Prisma Migrate in CI/CD

Add to your Vercel build command (in `package.json`):

```json
{
  "scripts": {
    "build": "prisma migrate deploy && next build"
  }
}
```

> `prisma migrate deploy` (not `dev`) is used in production — it applies pending migrations without creating new ones.

---

## 8. Verify Production Deployment

After deploying, go through this checklist:

### ✅ Basic functionality
- [ ] Visit your production URL — landing page loads
- [ ] Register a new account — receive verification email
- [ ] Log in — redirected to dashboard
- [ ] Password reset email arrives
- [ ] Google OAuth works (if configured)

### ✅ Stripe Live Mode
- [ ] Go to `/pricing` — plans show correct prices
- [ ] Click "Upgrade" — redirected to Stripe Checkout (real one, not test)
- [ ] Complete a purchase with a real card (or use your own card to test)
- [ ] Check Stripe Dashboard → Webhooks — events are delivered (green checkmarks)
- [ ] Your plan updates after successful payment

### ✅ AI Chat
- [ ] Send a message in `/chat` — streaming response works
- [ ] Message count increments correctly

### ✅ Webhook delivery
- [ ] In Stripe Dashboard → Webhooks → your endpoint → check "Recent deliveries"
- [ ] All events should show `200` status

---

## 9. Custom Domain

### Add domain in Vercel

1. Go to your Vercel project → **Settings → Domains**
2. Click **"Add"** and enter your domain
3. Follow Vercel's instructions to update your DNS records

### DNS Records

**Option A: Using Vercel nameservers (recommended)**
Transfer your domain's nameservers to Vercel for automatic configuration.

**Option B: Manual DNS (if using Cloudflare, etc.)**
Add a `CNAME` record:
- Name: `@` (or `www`)
- Value: `cname.vercel-dns.com`

Wait 10–60 minutes for DNS propagation.

### SSL Certificate

Vercel automatically provisions an SSL certificate via Let's Encrypt once DNS is verified. No action required.

---

## 10. Post-Launch Checklist

### Security
- [ ] `AUTH_SECRET` is different from your local development secret
- [ ] Live Stripe keys are used (not test keys)
- [ ] `STRIPE_WEBHOOK_SECRET` is the production webhook secret (not the local CLI one)
- [ ] `.env.local` is in `.gitignore` and never committed
- [ ] Database URL is not publicly exposed anywhere

### Performance
- [ ] Vercel Analytics enabled (optional — in Vercel Dashboard → Analytics)
- [ ] Images are optimized (Next.js handles this automatically)

### Monitoring
- [ ] Stripe webhook delivery is working (check Stripe Dashboard)
- [ ] Set up error monitoring (e.g., Sentry — optional)
- [ ] Set up uptime monitoring (e.g., Better Uptime — optional)

### Business
- [ ] Test a complete payment flow with a real card
- [ ] Verify subscription cancellation works via Customer Portal
- [ ] Confirm welcome/confirmation emails arrive in inbox (not spam)
- [ ] Update Privacy Policy and Terms of Service with your real company info

---

## Redeployment

Every time you push to `main` (or your configured branch), Vercel automatically redeploys.

To manually redeploy:
```bash
vercel --prod
```

Or trigger a redeployment from the Vercel Dashboard.

---

## Rollback

If a deployment breaks something:

1. Go to Vercel Dashboard → **Deployments**
2. Find the last working deployment
3. Click the three-dot menu → **"Promote to Production"**

---

## Troubleshooting Production Issues

### Stripe webhooks returning 400/500
- Double-check `STRIPE_WEBHOOK_SECRET` matches the production webhook (not the CLI secret)
- Check Vercel function logs: Dashboard → **Functions** tab
- Stripe shows the response body in webhook delivery details

### Auth not working after deploy
- Verify `NEXTAUTH_URL` is set to your exact production URL (no trailing slash)
- Verify `AUTH_SECRET` is set
- Check that Google OAuth redirect URIs include the production domain

### Database connection errors
- Verify `DATABASE_URL` is set correctly on Vercel
- Neon databases auto-pause after inactivity — the first request may be slow
- Consider upgrading to Neon's paid plan for always-on databases in production

### Build failures
- Check Vercel build logs for TypeScript errors
- Run `npm run build` locally to catch errors before pushing
- Ensure all environment variables required at build time are set on Vercel