import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrnrnlhdjdanchzwafwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybnJubGhkamRhbmNoendhZndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzg0MDQsImV4cCI6MjA4NzY1NDQwNH0.0xgX3kvU57uLHbvXzRfnXT0aF4JKqRLxLWIUTpAU-0M';

// Sessions do NOT persist by default — user must explicitly choose "Stay signed in"
// When they do, we store the session ourselves with a 24hr expiry and device fingerprint
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storage: {
      getItem: (key) => {
        try {
          const stored = JSON.parse(localStorage.getItem('mechiq_session') || 'null');
          if (!stored) return null;
          // Check 24hr expiry
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (Date.now() - (stored.savedAt || 0) > TWENTY_FOUR_HOURS) {
            localStorage.removeItem('mechiq_session');
            localStorage.removeItem('mechiq_saved_user');
            return null;
          }
          // Check device fingerprint matches
          const fp = getDeviceFingerprint();
          if (stored.deviceFp && stored.deviceFp !== fp) {
            // Different device — don't restore
            return null;
          }
          return stored[key] || null;
        } catch { return null; }
      },
      setItem: (key, value) => {
        try {
          const existing = JSON.parse(localStorage.getItem('mechiq_session') || '{}');
          existing[key] = value;
          localStorage.setItem('mechiq_session', JSON.stringify(existing));
        } catch {}
      },
      removeItem: (key) => {
        try {
          const existing = JSON.parse(localStorage.getItem('mechiq_session') || '{}');
          delete existing[key];
          localStorage.setItem('mechiq_session', JSON.stringify(existing));
        } catch {}
      },
    },
  }
});

// Simple device fingerprint — combines screen, timezone, language, platform
// Not perfect but enough to distinguish "this PC" from "another PC"
export function getDeviceFingerprint() {
  try {
    const parts = [
      navigator.platform || '',
      navigator.language || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      `${screen.width}x${screen.height}`,
      `${screen.colorDepth}`,
    ];
    // Simple hash
    const str = parts.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  } catch { return 'unknown'; }
}

// Call this after user says "Yes, keep me signed in"
// Stamps the session with current device fingerprint and timestamp
export function persistSessionForDevice(userName, userEmail) {
  try {
    const existing = JSON.parse(localStorage.getItem('mechiq_session') || '{}');
    existing.savedAt = Date.now();
    existing.deviceFp = getDeviceFingerprint();
    localStorage.setItem('mechiq_session', JSON.stringify(existing));
    // Also save display info for Welcome Back screen
    localStorage.setItem('mechiq_saved_user', JSON.stringify({
      name: userName,
      email: userEmail,
      savedAt: Date.now(),
      deviceFp: getDeviceFingerprint(),
    }));
  } catch {}
}

// Call this on sign out or "No"
export function clearPersistedSession() {
  localStorage.removeItem('mechiq_session');
  localStorage.removeItem('mechiq_saved_user');
}
