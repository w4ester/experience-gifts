/**
 * Coupon Actions Utility Module
 * Calendar export, sharing, email, and print functionality
 */

function escapeICS(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Generate .ics calendar file content for a coupon
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
    `SUMMARY:${coupon.title} (Experience Gift)`,
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
    text: `${coupon.title} (Experience Gift)`,
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
    subject: `${coupon.title} (Experience Gift)`,
    startdt: date.toISOString(),
    enddt: endDate.toISOString(),
    body: description || coupon.description,
    location: location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Share via native share API or fallback to clipboard
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
    `${coupon.title}\n` +
    `${coupon.description}\n\n` +
    `View your full gift booklet:\n${bookletUrl}\n\n` +
    `Made with love using Experience Gifts`
  );

  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Print a single coupon as a beautiful card
 */
export function printCoupon(coupon, gifterName, bookletTitle, recipient) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const colorMap = {
    amber: { gradient: 'linear-gradient(135deg, #fbbf24, #f97316)', light: '#fef3c7' },
    green: { gradient: 'linear-gradient(135deg, #4ade80, #10b981)', light: '#d1fae5' },
    purple: { gradient: 'linear-gradient(135deg, #c084fc, #8b5cf6)', light: '#ede9fe' },
    blue: { gradient: 'linear-gradient(135deg, #60a5fa, #06b6d4)', light: '#dbeafe' },
    rose: { gradient: 'linear-gradient(135deg, #fb7185, #ec4899)', light: '#fce7f3' },
    indigo: { gradient: 'linear-gradient(135deg, #818cf8, #3b82f6)', light: '#e0e7ff' },
  };

  const colors = colorMap[coupon.color] || colorMap.rose;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${coupon.title} - Experience Gift</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f3f4f6;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        @media print {
          body { background: white; padding: 0; }
          .no-print { display: none !important; }
          .card { box-shadow: none; }
        }
        @page {
          size: 5in 7in;
          margin: 0.25in;
        }
        .card {
          width: 5in;
          background: white;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: ${colors.gradient};
          padding: 32px;
          text-align: center;
          color: white;
        }
        .header-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .header-title {
          font-size: 28px;
          font-weight: bold;
        }
        .body {
          padding: 40px 32px;
          text-align: center;
        }
        .gift-icon {
          font-size: 72px;
          margin-bottom: 20px;
        }
        .description {
          color: #6b7280;
          font-size: 18px;
          margin-bottom: 32px;
          line-height: 1.5;
        }
        .entitlement {
          border-top: 2px dashed #e5e7eb;
          padding-top: 24px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.8;
        }
        .entitlement strong {
          color: #1f2937;
        }
        .footer {
          border-top: 2px solid #f3f4f6;
          padding: 24px 32px;
          text-align: center;
        }
        .footer-label {
          color: #9ca3af;
          font-size: 14px;
        }
        .footer-name {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
          margin-top: 4px;
        }
        .footer-booklet {
          color: #9ca3af;
          font-size: 12px;
          margin-top: 8px;
        }
        .note-area {
          margin: 24px 32px 32px;
          border: 2px dashed #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          min-height: 80px;
        }
        .note-label {
          color: #9ca3af;
          font-size: 12px;
        }
        .print-button {
          margin-top: 24px;
          padding: 12px 32px;
          background: ${colors.gradient};
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .print-button:hover {
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div>
        <div class="card">
          <div class="header">
            <div class="header-label">Experience Gift</div>
            <div class="header-title">${coupon.title}</div>
          </div>
          <div class="body">
            <div class="gift-icon">🎁</div>
            <div class="description">${coupon.description}</div>
            <div class="entitlement">
              This coupon entitles <strong>${recipient}</strong><br>
              to one <strong>${coupon.title}</strong><br>
              redeemable anytime throughout the year.
            </div>
          </div>
          <div class="footer">
            <div class="footer-label">With love from</div>
            <div class="footer-name">${gifterName}</div>
            <div class="footer-booklet">${bookletTitle}</div>
          </div>
          <div class="note-area">
            <div class="note-label">Personal note:</div>
          </div>
        </div>
        <div class="no-print" style="text-align: center;">
          <button class="print-button" onclick="window.print()">Print Coupon</button>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
