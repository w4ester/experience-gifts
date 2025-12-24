# AI Coder Prompt: Experience Gifts — Cross-Device & Coupon Actions

## Context

You are working on **Experience Gifts**, a React PWA for creating and sharing digital coupon booklets. The app is built with:

- React 19.2
- Vite 7.3
- Tailwind CSS 4.1
- Lucide React icons
- localStorage for persistence
- URL hash encoding for sharing

**Primary use case:** Kids create coupon booklets for parents. Parents redeem coupons throughout the year. Multiple family members may view the booklet on different devices.

**Current state:** Single-device localStorage + shareable URL. Redemptions don't sync across devices.

**Goal:** Make the app bulletproof across all devices and add coupon-level actions (print, share, email, calendar).

---

## Priority Order

### P0 — Ship Tonight (Christmas Eve)
1. PWA manifest + service worker (installable)
2. Cross-device responsive fixes
3. Individual coupon action buttons (UI)
4. Calendar export (.ics) for single coupon
5. Share single coupon (native share API + fallback)

### P1 — Ship This Week
6. Print single coupon (styled card layout)
7. Email coupon (mailto with body)
8. Calendar with attendees/invites
9. "Re-share booklet" button (regenerate URL after changes)
10. Persistence abstraction layer (prep for sync)

### P2 — Future
11. Real-time sync via Cloudflare Workers + KV
12. QR code generation for printed gift cards
13. Memory capture on redemption (photo + note)

---

## Task 1: PWA Setup

### 1.1 Create Web App Manifest

Create `public/manifest.json`:

```json
{
  "name": "Experience Gifts",
  "short_name": "Gifts",
  "description": "Digital coupon booklets for experience-based family gifts",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f43f5e",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 1.2 Add to index.html

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#f43f5e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

### 1.3 Service Worker

Create `public/sw.js`:

```javascript
const CACHE_NAME = 'experience-gifts-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
      return cached || fetched;
    })
  );
});
```

### 1.4 Register Service Worker

In `src/main.jsx`, add after `ReactDOM.createRoot`:

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
```

### 1.5 Generate Icons

Create 192x192 and 512x512 PNG icons from the existing `gift.svg`. Use a gradient background (#f43f5e to #f59e0b) with white gift icon centered.

---

## Task 2: Cross-Device Responsive Fixes

### 2.1 Viewport Meta (already exists, verify)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 2.2 Safe Area Insets (notch phones)

Add to `src/index.css`:

```css
@import "tailwindcss";

/* Safe areas for notch devices */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
}

body {
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
  padding-left: var(--safe-area-inset-left);
  padding-right: var(--safe-area-inset-right);
}

/* Sticky footer buttons need bottom safe area */
.fixed.bottom-0 {
  padding-bottom: calc(1rem + var(--safe-area-inset-bottom));
}
```

### 2.3 Touch Target Sizes

Audit all interactive elements. Minimum 44x44px per Apple HIG:

```jsx
// Bad
<button className="p-2">...</button>

// Good
<button className="p-3 min-h-[44px] min-w-[44px]">...</button>
```

### 2.4 iOS Safari Fixes

```css
/* Prevent text size adjustment */
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* Fix iOS input zoom */
input, select, textarea {
  font-size: 16px; /* Prevents zoom on focus */
}

/* Fix iOS date input styling */
input[type="date"] {
  -webkit-appearance: none;
  appearance: none;
}
```

### 2.5 Prevent Pull-to-Refresh (optional)

```css
body {
  overscroll-behavior-y: contain;
}
```

---

## Task 3: Coupon Actions Component

### 3.1 Data Structure Updates

Extend the coupon object:

```javascript
// Existing
{
  id: 1703000000000,
  title: "Breakfast in Bed",
  icon: Coffee,
  category: "service",
  color: "amber",
  description: "A cozy morning treat",
  gifterId: 1,
  redeemed: false,
  redeemedAt: null
}

// Extended for scheduling
{
  ...existing,
  scheduledDate: null,      // ISO string: "2025-03-15T10:00:00"
  scheduledNote: null,      // "Let's do brunch after!"
  attendeeEmails: []        // ["dad@email.com", "grandma@email.com"]
}
```

### 3.2 CouponActions Utility Module

Create `src/utils/couponActions.js`:

```javascript
/**
 * Generate .ics calendar file for a coupon
 */
export function generateICS(coupon, options = {}) {
  const {
    date = new Date(),
    duration = 60, // minutes
    attendees = [],
    description = '',
    location = ''
  } = options;

  const formatDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const endDate = new Date(date.getTime() + duration * 60000);
  const uid = `coupon-${coupon.id}@experience-gifts.local`;

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Experience Gifts//Coupon//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(date)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:🎁 ${coupon.title} (Experience Gift)`,
    `DESCRIPTION:${escapeICS(description || coupon.description)}`,
  ];

  if (location) {
    ics.push(`LOCATION:${escapeICS(location)}`);
  }

  attendees.forEach(email => {
    if (email && email.includes('@')) {
      ics.push(`ATTENDEE;RSVP=TRUE:mailto:${email}`);
    }
  });

  ics.push('END:VEVENT', 'END:VCALENDAR');

  return ics.join('\r\n');
}

function escapeICS(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Download .ics file
 */
export function downloadICS(coupon, options = {}) {
  const ics = generateICS(coupon, options);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${coupon.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarURL(coupon, options = {}) {
  const {
    date = new Date(),
    duration = 60,
    attendees = [],
    description = '',
    location = ''
  } = options;

  const formatGoogleDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endDate = new Date(date.getTime() + duration * 60000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `🎁 ${coupon.title} (Experience Gift)`,
    dates: `${formatGoogleDate(date)}/${formatGoogleDate(endDate)}`,
    details: description || coupon.description,
    location: location,
  });

  if (attendees.length > 0) {
    params.set('add', attendees.filter(e => e.includes('@')).join(','));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 */
export function getOutlookCalendarURL(coupon, options = {}) {
  const {
    date = new Date(),
    duration = 60,
    description = '',
    location = ''
  } = options;

  const endDate = new Date(date.getTime() + duration * 60000);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: `🎁 ${coupon.title} (Experience Gift)`,
    startdt: date.toISOString(),
    enddt: endDate.toISOString(),
    body: description || coupon.description,
    location: location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Share via native share API or fallback
 */
export async function shareCoupon(coupon, bookletUrl) {
  const shareData = {
    title: `Experience Gift: ${coupon.title}`,
    text: `You have an Experience Gift! "${coupon.title}" - ${coupon.description}`,
    url: bookletUrl
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'native' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return { success: false, method: 'native', error: err };
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false, method: 'clipboard' };
  }
}

/**
 * Generate mailto link for coupon
 */
export function getEmailURL(coupon, options = {}) {
  const { to = '', bookletUrl = '' } = options;
  
  const subject = encodeURIComponent(`Experience Gift: ${coupon.title}`);
  const body = encodeURIComponent(
    `You have an Experience Gift!\n\n` +
    `🎁 ${coupon.title}\n` +
    `${coupon.description}\n\n` +
    `View your full gift booklet:\n${bookletUrl}\n\n` +
    `Made with ❤️ using Experience Gifts`
  );

  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Encode single coupon for sharing
 */
export function encodeCouponURL(coupon, gifterName, bookletTitle) {
  const data = {
    coupon,
    gifterName,
    bookletTitle,
    shared: new Date().toISOString()
  };
  
  try {
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    return `${window.location.origin}${window.location.pathname}#coupon=${encoded}`;
  } catch {
    return null;
  }
}
```

### 3.3 Schedule Modal Component

Create `src/components/ScheduleModal.jsx`:

```jsx
import React, { useState } from 'react';
import { X, Calendar, Mail, Download, ExternalLink } from 'lucide-react';
import { 
  downloadICS, 
  getGoogleCalendarURL, 
  getOutlookCalendarURL 
} from '../utils/couponActions';

export default function ScheduleModal({ coupon, gifterName, onClose, onSchedule }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [note, setNote] = useState('');

  const getDateTime = () => {
    if (!date) return new Date();
    return new Date(`${date}T${time}:00`);
  };

  const getOptions = () => ({
    date: getDateTime(),
    duration,
    location,
    attendees: attendees.split(',').map(e => e.trim()).filter(Boolean),
    description: `Gift from ${gifterName}\n\n${coupon.description}${note ? `\n\nNote: ${note}` : ''}`
  });

  const handleDownloadICS = () => {
    downloadICS(coupon, getOptions());
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarURL(coupon, getOptions()), '_blank');
  };

  const handleOutlookCalendar = () => {
    window.open(getOutlookCalendarURL(coupon, getOptions()), '_blank');
  };

  const handleSaveSchedule = () => {
    onSchedule({
      scheduledDate: getDateTime().toISOString(),
      scheduledNote: note,
      attendeeEmails: attendees.split(',').map(e => e.trim()).filter(Boolean)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-bold text-gray-800">Schedule: {coupon.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>All day</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Home, Restaurant name..."
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base"
            />
          </div>

          {/* Invite Others */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite others (emails, comma-separated)
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="dad@email.com, grandma@email.com"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special plans or requests..."
              rows={2}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none text-base resize-none"
            />
          </div>
        </div>

        {/* Calendar Buttons */}
        <div className="p-4 border-t space-y-3">
          <div className="text-sm font-medium text-gray-500 mb-2">Add to Calendar</div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleCalendar}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Google
            </button>
            <button
              onClick={handleOutlookCalendar}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Outlook
            </button>
          </div>

          <button
            onClick={handleDownloadICS}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Download .ics (Apple, etc.)
          </button>

          <button
            onClick={handleSaveSchedule}
            disabled={!date}
            className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-medium disabled:opacity-50 min-h-[44px]"
          >
            Save & Mark Scheduled
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.4 Print Coupon Component

Create `src/components/PrintableCoupon.jsx`:

```jsx
import React from 'react';

export default function PrintableCoupon({ coupon, gifterName, bookletTitle, recipient }) {
  const colorMap = {
    amber: 'from-amber-400 to-orange-400',
    green: 'from-green-400 to-emerald-400',
    purple: 'from-purple-400 to-violet-400',
    blue: 'from-blue-400 to-cyan-400',
    rose: 'from-rose-400 to-pink-400',
    indigo: 'from-indigo-400 to-blue-400',
  };

  const gradient = colorMap[coupon.color] || colorMap.rose;

  return (
    <div className="print-coupon w-[5in] h-[7in] p-6 bg-white border-4 border-gray-200 rounded-3xl flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white text-center`}>
        <div className="text-sm opacity-80 mb-1">Experience Gift</div>
        <div className="text-2xl font-bold">{coupon.title}</div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🎁</div>
        <div className="text-gray-600 text-lg mb-6">{coupon.description}</div>
        
        <div className="border-t-2 border-dashed border-gray-200 pt-6 w-full">
          <div className="text-sm text-gray-500">
            This coupon entitles <strong className="text-gray-800">{recipient}</strong>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            to one <strong className="text-gray-800">{coupon.title}</strong>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            redeemable anytime throughout the year.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-100 pt-4 text-center">
        <div className="text-sm text-gray-500">With love from</div>
        <div className="text-lg font-bold text-gray-800">{gifterName}</div>
        <div className="text-xs text-gray-400 mt-2">{bookletTitle}</div>
      </div>

      {/* Handwritten note area */}
      <div className="mt-4 border-2 border-dashed border-gray-200 rounded-xl p-4 min-h-[80px]">
        <div className="text-xs text-gray-400">Personal note:</div>
      </div>
    </div>
  );
}

// Print function
export function printCoupon(coupon, gifterName, bookletTitle, recipient) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const colorMap = {
    amber: 'from-amber-400 to-orange-400',
    green: 'from-green-400 to-emerald-400',
    purple: 'from-purple-400 to-violet-400',
    blue: 'from-blue-400 to-cyan-400',
    rose: 'from-rose-400 to-pink-400',
    indigo: 'from-indigo-400 to-blue-400',
  };
  const gradient = colorMap[coupon.color] || colorMap.rose;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${coupon.title} - Experience Gift</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        @page {
          size: 5in 7in;
          margin: 0;
        }
      </style>
    </head>
    <body class="bg-gray-100 p-4 print:p-0 print:bg-white">
      <div class="max-w-[5in] mx-auto bg-white border-4 border-gray-200 rounded-3xl p-6 print:border-0 print:rounded-none">
        <!-- Header -->
        <div class="bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white text-center">
          <div class="text-sm opacity-80 mb-1">Experience Gift</div>
          <div class="text-2xl font-bold">${coupon.title}</div>
        </div>

        <!-- Body -->
        <div class="py-8 text-center">
          <div class="text-6xl mb-4">🎁</div>
          <div class="text-gray-600 text-lg mb-6">${coupon.description}</div>
          
          <div class="border-t-2 border-dashed border-gray-200 pt-6">
            <div class="text-sm text-gray-500">
              This coupon entitles <strong class="text-gray-800">${recipient}</strong>
            </div>
            <div class="text-sm text-gray-500 mt-1">
              to one <strong class="text-gray-800">${coupon.title}</strong>
            </div>
            <div class="text-sm text-gray-500 mt-1">
              redeemable anytime throughout the year.
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t-2 border-gray-100 pt-4 text-center">
          <div class="text-sm text-gray-500">With love from</div>
          <div class="text-lg font-bold text-gray-800">${gifterName}</div>
          <div class="text-xs text-gray-400 mt-2">${bookletTitle}</div>
        </div>

        <!-- Note area -->
        <div class="mt-4 border-2 border-dashed border-gray-200 rounded-xl p-4 min-h-[80px]">
          <div class="text-xs text-gray-400">Personal note:</div>
        </div>
      </div>
      
      <div class="text-center mt-4 no-print">
        <button onclick="window.print()" class="px-6 py-2 bg-rose-500 text-white rounded-full font-medium">
          Print Coupon
        </button>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
```

---

## Task 4: Persistence Abstraction Layer

Create `src/utils/storage.js`:

```javascript
/**
 * Storage abstraction layer
 * Currently uses localStorage, designed for easy swap to cloud sync
 */

const STORAGE_KEY = 'experience_gifts_v1';

// Storage interface
const storage = {
  async load() {
    // Future: fetch from Cloudflare KV or other backend
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async save(data) {
    // Future: POST to Cloudflare Worker
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },

  async clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  // For URL-based sharing
  encodeForURL(data) {
    try {
      return btoa(encodeURIComponent(JSON.stringify(data)));
    } catch {
      return null;
    }
  },

  decodeFromURL(encoded) {
    try {
      return JSON.parse(decodeURIComponent(atob(encoded)));
    } catch {
      return null;
    }
  },

  // Generate shareable URL with current state
  generateShareURL(data) {
    const encoded = this.encodeForURL(data);
    if (!encoded) return null;
    return `${window.location.origin}${window.location.pathname}#booklet=${encoded}`;
  }
};

export default storage;
```

---

## Task 5: Update App.jsx Integration Points

### 5.1 Add coupon action buttons to View Booklet screen

In the coupon card, add action buttons:

```jsx
{/* Coupon Card - Add these buttons */}
<div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
  <button
    onClick={() => handleScheduleCoupon(coupon)}
    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 min-h-[44px]"
  >
    <Calendar className="w-4 h-4" />
    Schedule
  </button>
  <button
    onClick={() => handleShareCoupon(coupon)}
    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 min-h-[44px]"
  >
    <Share2 className="w-4 h-4" />
    Share
  </button>
  <button
    onClick={() => handlePrintCoupon(coupon)}
    className="px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 min-h-[44px]"
  >
    <Printer className="w-4 h-4" />
  </button>
</div>
```

### 5.2 Add state and handlers

```jsx
const [scheduleModalCoupon, setScheduleModalCoupon] = useState(null);

const handleScheduleCoupon = (coupon) => {
  setScheduleModalCoupon(coupon);
};

const handleShareCoupon = async (coupon) => {
  const gifter = gifters.find(g => g.id === coupon.gifterId);
  const url = generateShareURL({ booklet, coupons, gifters });
  
  const result = await shareCoupon(coupon, url);
  
  if (result.success) {
    if (result.method === 'clipboard') {
      toast('Link copied to clipboard!');
    }
  } else {
    toast('Could not share. Try copying the link manually.');
  }
};

const handlePrintCoupon = (coupon) => {
  const gifter = gifters.find(g => g.id === coupon.gifterId);
  printCoupon(coupon, gifter?.name || 'Someone', booklet.title, booklet.recipient);
};

const handleScheduleComplete = (couponId, scheduleData) => {
  setCoupons(coupons.map(c => 
    c.id === couponId 
      ? { ...c, ...scheduleData, redeemed: true, redeemedAt: new Date().toLocaleDateString() }
      : c
  ));
  toast('Scheduled! Added to your calendar.');
};
```

### 5.3 Add "Re-share Booklet" button

In the View Booklet header:

```jsx
<button 
  onClick={() => {
    const url = generateShareURL({ booklet, coupons, gifters });
    setShareUrl(url);
    setShowShareModal(true);
  }}
  className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-full text-sm font-medium"
>
  <Share2 className="w-4 h-4" />
  Share Updated Booklet
</button>
```

---

## Task 6: Testing Checklist

### Device Testing Matrix

| Device | Browser | Test |
|--------|---------|------|
| iPhone 12+ | Safari | Install PWA, safe areas, date inputs |
| iPhone SE | Safari | Small screen, touch targets |
| Android (Pixel) | Chrome | Install PWA, share API |
| Android (Samsung) | Samsung Internet | Fallbacks |
| iPad | Safari | Landscape + portrait |
| Mac | Chrome | Print, keyboard nav |
| Mac | Safari | Print, date inputs |
| Windows | Chrome | Print, keyboard nav |
| Windows | Edge | Print, calendar links |

### Functional Tests

- [ ] PWA installs on iOS (Add to Home Screen)
- [ ] PWA installs on Android (Add to Home Screen)
- [ ] Offline mode shows cached content
- [ ] Share button triggers native share on mobile
- [ ] Share button copies to clipboard on desktop
- [ ] .ics download works and opens in calendar app
- [ ] Google Calendar link opens with pre-filled data
- [ ] Outlook Calendar link opens with pre-filled data
- [ ] Print coupon produces clean single-page output
- [ ] Email link opens mail client with body
- [ ] URL sharing works with emoji in coupon names
- [ ] Safe areas respected on notch phones
- [ ] All touch targets ≥44px
- [ ] No input zoom on iOS when focusing text fields

---

## Summary

**For tonight (P0):**
1. Add manifest.json and service worker
2. Add PWA meta tags to index.html
3. Create couponActions.js utility
4. Create ScheduleModal component
5. Add calendar/share/print buttons to coupon cards
6. Test on at least one iPhone and one Android

**The app should:**
- Install as PWA on any device
- Work offline after first load
- Let recipients schedule coupons to their calendar with invites
- Share individual coupons via native share or clipboard
- Print beautiful single-coupon cards

**NOT required tonight:**
- Real-time sync between devices
- Cloud persistence
- QR codes

Good luck — ship it! 🎁
