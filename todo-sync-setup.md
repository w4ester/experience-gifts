# Sync Setup Guide

## Overview
Add cloud sync so all family members see the same booklet state. Using **Upstash Redis** (free, privacy-friendly) + **Vercel Serverless Functions**.

---

## Step 1: Deploy to Vercel (You)

1. Go to https://vercel.com/william-s-projects-2fd8a433
2. Click **"Add New Project"**
3. Import **"experience-gifts"** from GitHub
4. Framework: **Vite** (auto-detected)
5. Click **Deploy**
6. Wait for build to complete
7. Note your URL: `https://experience-gifts-xxx.vercel.app`

---

## Step 2: Set Up Upstash Redis (You)

1. Go to https://upstash.com
2. Sign up (use GitHub login for simplicity)
3. Click **"Create Database"**
4. Name: `experience-gifts`
5. Region: Pick closest to you (e.g., `us-east-1`)
6. Click **Create**
7. Copy these values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## Step 3: Add Environment Variables to Vercel (You)

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add:
   - `UPSTASH_REDIS_REST_URL` = (paste from Upstash)
   - `UPSTASH_REDIS_REST_TOKEN` = (paste from Upstash)
4. Click **Save**
5. **Redeploy** (Deployments → ... → Redeploy)

---

## Step 4: Code Changes (Claude does this)

### 4.1 Install Upstash Redis client
```bash
npm install @upstash/redis
```

### 4.2 Create API routes for sync
- `api/booklet/[id].js` — GET/PUT booklet by ID
- `api/booklet/create.js` — Create new booklet, return ID

### 4.3 Update App.jsx
- Generate unique booklet ID on creation
- Save to cloud on every change
- Load from cloud when opening shared link
- Poll for updates (every 5 seconds) or use SSE

---

## How Sync Will Work

1. **Create booklet** → Gets unique ID (e.g., `abc123`)
2. **Share link** → `https://yourapp.vercel.app/?id=abc123`
3. **Anyone with link** → Sees same booklet
4. **Redeem coupon** → Saves to cloud → Everyone sees it
5. **Real-time** → App polls every 5 seconds for changes

---

## Data Structure (Redis)

```json
{
  "booklet:abc123": {
    "booklet": { "title": "Mom's 2025 Coupon Book", "recipient": "Mom", "theme": "🎄 Holiday" },
    "coupons": [...],
    "gifters": [...],
    "updatedAt": "2025-12-24T..."
  }
}
```

---

## Privacy

- Upstash stores your data encrypted
- Only people with the booklet ID can access it
- IDs are random, unguessable (UUID)
- You can delete anytime
- No analytics, no tracking

---

## Estimated Time

- Vercel deploy: 2 min
- Upstash setup: 3 min
- Code changes: 10 min
- Testing: 5 min

**Total: ~20 minutes**
