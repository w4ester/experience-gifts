# README-AI.md — Agent Coder Context

This file provides context for AI coding assistants (Claude, Cursor, Copilot, etc.) to understand and iterate on this project effectively.

## Project Summary

**Experience Gifts** is a React single-page app for creating shareable digital coupon booklets. The app is designed for family gift-giving: kids create coupons for parents, which can be redeemed throughout the year.

**Key design principles:**
- Local-first (no backend, localStorage + URL state)
- Mobile-first UI
- Zero friction sharing (URL contains full state)
- Kid-friendly UX (simple, colorful, forgiving)

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    App.jsx                       │
│  ┌───────────────────────────────────────────┐  │
│  │ State:                                     │  │
│  │  - currentView (home|create|add|view)     │  │
│  │  - booklet {title, recipient, theme}      │  │
│  │  - coupons [{id, title, icon, gifterId}]  │  │
│  │  - gifters [{id, name, color}]            │  │
│  └───────────────────────────────────────────┘  │
│                       │                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ │
│  │ Home   │ │ Create │ │  Add   │ │  View    │ │
│  │ Screen │ │Booklet │ │Coupons │ │ Booklet  │ │
│  └────────┘ └────────┘ └────────┘ └──────────┘ │
│                       │                          │
│  ┌───────────────────────────────────────────┐  │
│  │ Persistence:                               │  │
│  │  - localStorage (STORAGE_KEY)              │  │
│  │  - URL hash (base64 encoded for sharing)   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose | When to modify |
|------|---------|----------------|
| `src/App.jsx` | Main component, all views, all logic | Most changes go here |
| `src/index.css` | Tailwind 4 import + custom styles | Adding custom CSS |
| `vite.config.js` | Vite + Tailwind 4 plugin config | Build customization |
| `public/gift.svg` | Favicon | Branding changes |

**Note:** Tailwind 4 uses `@tailwindcss/vite` plugin and auto-detects content files. No `tailwind.config.js` or `postcss.config.js` needed.

## Data Structures

### Booklet
```javascript
{
  title: "Mom's 2025 Coupon Book",
  recipient: "Mom",
  theme: "🎄 Holiday"  // or "🎂 Birthday" | "💝 Just Because"
}
```

### Coupon
```javascript
{
  id: 1703000000000,        // Date.now() timestamp
  title: "Breakfast in Bed",
  icon: Coffee,              // Lucide React component
  category: "service",       // service|choice|time|adventure|relaxation|love|custom
  color: "amber",            // amber|green|purple|blue|rose|indigo
  description: "A cozy morning treat",
  gifterId: 1,               // References gifter.id
  redeemed: false,
  redeemedAt: null           // or "Jan 15" when redeemed
}
```

### Gifter
```javascript
{
  id: 1,
  name: "Emma",
  color: "bg-pink-400"       // Tailwind class
}
```

## Common Tasks

### Add a new coupon template

1. Find `TEMPLATES` array (line ~15)
2. Add new object with unique id
3. Import icon from lucide-react if needed

```javascript
import { NewIcon } from 'lucide-react';

// In TEMPLATES array:
{ id: 11, title: 'New Template', icon: NewIcon, category: 'custom', color: 'purple', description: 'Description' },
```

### Add a new color option

1. Add to `colorMap` object (line ~25):
```javascript
newcolor: { bg: 'bg-newcolor-50', border: 'border-newcolor-200', icon: 'text-newcolor-500', badge: 'bg-newcolor-100' },
```

### Change default gifters

1. Find `DEFAULT_GIFTERS` (line ~8)
2. Modify names and colors

### Add a new view/screen

1. Add new case to the view conditionals at bottom of App.jsx
2. Add navigation button to reach the view
3. Update `currentView` state as needed

### Add persistent storage for a new field

1. Add to state with `useState`
2. Include in `useEffect` that saves to localStorage
3. Include in `useEffect` that loads from localStorage
4. Include in `encodeBooklet`/`decodeBooklet` if it should be shared

## URL Sharing Mechanism

The share feature encodes the entire app state as base64 in the URL hash:

```javascript
// Encoding (when sharing)
const data = { booklet, coupons, gifters };
const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
const url = `${origin}#booklet=${encoded}`;

// Decoding (on page load)
const hash = window.location.hash; // #booklet=eyJib29...
const encoded = hash.replace('#booklet=', '');
const data = JSON.parse(decodeURIComponent(atob(encoded)));
```

**Limitation:** Very long booklets may exceed URL length limits (~2000 chars safe, ~8000 max in most browsers). For 20+ coupons, consider adding compression or a backend.

## Styling Conventions

- **Tailwind 4** — Uses `@import "tailwindcss"` in CSS, auto-detects content
- **No config file needed** — Tailwind 4 with Vite plugin handles everything
- **Rounded corners** — `rounded-xl` for cards, `rounded-2xl` for larger elements, `rounded-full` for avatars
- **Shadows** — `shadow-sm` for subtle, `shadow-lg` for prominent
- **Gradients** — `from-rose-500 to-amber-500` is the brand gradient
- **Transitions** — always add `transition-all` or `transition-colors` for interactive elements

### Tailwind 4 Customization

If you need to extend Tailwind, use CSS `@theme` directive in `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand: #f43f5e;
  --font-display: "Custom Font", sans-serif;
}
```

## State Management

All state lives in App.jsx using `useState`. No external state library.

**Why:** This is a simple app. Adding Redux/Zustand would be over-engineering. If you need to refactor, consider:
- Context for deeply nested state access
- useReducer if state updates get complex
- Zustand only if multiple components need write access to same state

## Testing Notes

No tests currently. If adding tests:
- Use Vitest (already compatible with Vite)
- Focus on: coupon add/remove, redemption toggle, URL encode/decode
- Don't test: UI rendering (too brittle for this size app)

## Deployment

**Requirement:** Node.js 20.19+ or 22.12+ (Vite 7 requires ESM support)

```bash
npm run build   # Creates dist/ folder
```

Deploy `dist/` to any static host:
- Cloudflare Pages (recommended — free, fast, handles hash routing)
- Netlify
- Vercel
- GitHub Pages (add `base: '/repo-name/'` to vite.config.js)

## Future Enhancements (Backlog)

If asked to extend the app, here are prioritized options:

### High Value / Low Effort
- [ ] QR code generation for printed gift cards
- [ ] "Surprise mode" — hide coupon details until reveal date
- [ ] Monthly unlock pacing (1 coupon unlocks per month)
- [ ] Memory capture on redemption (photo + note)

### Medium Value / Medium Effort
- [ ] PWA manifest + service worker for offline install
- [ ] Export as PDF for printing
- [ ] Multiple booklets per device
- [ ] Animated confetti on redemption

### Lower Priority
- [ ] Cloud sync (would require backend)
- [ ] User accounts (adds friction, not needed for family use)
- [ ] Event API integration (scope creep from core concept)

## Debugging

**App won't load:** Check console for import errors. Usually a missing icon import.

**Styles broken:** Run `npm run dev` — Tailwind needs the dev server to compile.

**URL sharing broken:** Check that `btoa`/`atob` can handle the data. Non-ASCII characters in coupon titles can cause issues. Use `encodeURIComponent` before `btoa`.

**localStorage not persisting:** Check browser privacy settings. Some browsers clear localStorage in private mode.

## Code Style

- Functional components only
- Hooks at top of component
- Event handlers as arrow functions
- Descriptive variable names
- Comments for non-obvious logic
- Keep related code together (state + handlers + render for each view)

---

## Quick Reference: Common Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
```

## Quick Reference: Key Functions

| Function | Purpose |
|----------|---------|
| `addCoupon(template)` | Adds coupon to state |
| `removeCoupon(id)` | Removes coupon by id |
| `toggleRedeem(id)` | Marks coupon redeemed/unredeemed |
| `generateShareUrl()` | Creates shareable URL |
| `encodeBooklet(data)` | Converts state to base64 |
| `decodeBooklet(encoded)` | Parses base64 to state |
| `resetAll()` | Clears all state and storage |

---

*This file is for AI assistants. Keep it updated when making architectural changes.*
