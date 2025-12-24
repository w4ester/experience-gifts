# Experience Gifts 🎁

A digital coupon booklet app for creating and sharing experience-based family gifts. Perfect for holidays, birthdays, or "just because" — kids (or anyone) can gift meaningful moments like "Breakfast in Bed," "Movie Night Pick," or "Chore Pass."

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The app will open at `http://localhost:3000`

## Requirements

- Node.js 20.19+ or 22.12+ (required by Vite 7)

## Customization

### Change the Gifter Names

Edit `src/App.jsx` and find `DEFAULT_GIFTERS` near the top:

```javascript
const DEFAULT_GIFTERS = [
  { id: 1, name: 'Emma', color: 'bg-pink-400' },
  { id: 2, name: 'Liam', color: 'bg-blue-400' },
  { id: 3, name: 'Noah', color: 'bg-green-400' },
];
```

Change these to your actual kids' names. Available colors:
- `bg-pink-400`, `bg-blue-400`, `bg-green-400`
- `bg-purple-400`, `bg-amber-400`, `bg-cyan-400`
- `bg-rose-400`, `bg-indigo-400`, `bg-teal-400`

### Add More Coupon Templates

Find the `TEMPLATES` array and add new entries:

```javascript
{ 
  id: 11, 
  title: 'Your Custom Coupon', 
  icon: Heart,  // import from lucide-react
  category: 'custom', 
  color: 'rose',  // amber, green, purple, blue, rose, indigo
  description: 'Short description here' 
}
```

## Features

- **Multi-gifter support**: Track which kid gave which coupon
- **Redemption tracking**: Mark coupons as redeemed with date stamps
- **Shareable links**: Generate a URL that contains the entire booklet state
- **Print-friendly**: Clean print layout for physical gift presentation
- **Offline-capable**: Uses localStorage, works without internet
- **Mobile-first**: Designed for phones and tablets

## How It Works

1. **Create a booklet**: Name it, set the recipient, customize gifters
2. **Add coupons**: Select templates or create custom ones
3. **Share**: Generate a link or print a physical copy
4. **Redeem**: Recipient taps coupons to mark them used throughout the year

## Sharing

The "Share" button generates a URL like:
```
https://yoursite.com/#booklet=eyJib29rbGV0Ijp7InR...
```

This URL contains the entire booklet encoded in base64. When someone opens it, they see the full booklet — no account or backend required.

## Deployment

### Cloudflare Pages (recommended, free)

```bash
npm run build
# Upload the `dist` folder to Cloudflare Pages
```

### Netlify

```bash
npm run build
# Drag and drop `dist` folder to Netlify
```

### GitHub Pages

1. Add to `vite.config.js`:
   ```javascript
   base: '/your-repo-name/'
   ```
2. Build and push to `gh-pages` branch

## Project Structure

```
experience-gifts/
├── index.html          # Entry HTML
├── package.json        # Dependencies
├── vite.config.js      # Vite + Tailwind 4 config
├── public/
│   └── gift.svg        # Favicon
└── src/
    ├── main.jsx        # React entry point
    ├── index.css       # Tailwind 4 import + custom styles
    └── App.jsx         # Main application component
```

## Tech Stack (December 2025)

- **React 19.2** — Latest stable with Activity API
- **Vite 7.3** — ESM-only, requires Node 20.19+
- **Tailwind CSS 4.1** — New engine, Vite plugin, no config needed
- **Lucide React 0.469** — Icons
- **localStorage** — Persistence (no backend needed)

## License

MIT — Use it, fork it, gift it.

---

Made with ❤️ for families who value experiences over things.
