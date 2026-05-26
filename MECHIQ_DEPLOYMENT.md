# MechIQ — Deployment & App Guide

**Stack:** React · Supabase · Vercel · Cloudflare Workers  
**Live URL:** https://www.mechiq.com.au  
**Repo:** mickfazl-ai/MechIQ (GitHub, branch: main)  
**Supabase:** mrnrnlhdjdanchzwafwl.supabase.co

---

## Standard Deploy (Web)

Every code change follows this workflow:

```cmd
cd C:\Users\mickf\Documents\mechiq
git add src/FileName.js
git commit -m "description of change"
git push
```

Vercel auto-deploys on every push to `main`. Live within ~60 seconds.

---

## Windows Desktop App (Electron)

Electron wraps your existing web app in a native Windows `.exe` — no code changes needed, same React codebase.

### One-time setup

```cmd
cd C:\Users\mickf\Documents\mechiq
npm install --save-dev electron electron-builder concurrently wait-on
```

Create `electron.js` in the project root:

```js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, 'public/favicon.ico'),
    title: 'MechIQ',
    autoHideMenuBar: true,
  });

  // In production load the built app, in dev load localhost
  const startUrl = process.env.ELECTRON_START_URL || 
    `file://${path.join(__dirname, 'build/index.html')}`;
  win.loadURL(startUrl);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
```

Add to `package.json` scripts and config:

```json
{
  "main": "electron.js",
  "homepage": "./",
  "scripts": {
    "electron": "electron .",
    "electron-dev": "concurrently \"npm start\" \"wait-on http://localhost:3000 && ELECTRON_START_URL=http://localhost:3000 electron .\"",
    "build-electron": "npm run build && electron-builder --win --x64",
    "dist": "electron-builder --win"
  },
  "build": {
    "appId": "au.com.mechiq",
    "productName": "MechIQ",
    "win": {
      "target": "nsis",
      "icon": "public/favicon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "files": ["build/**/*", "electron.js", "node_modules/**/*"],
    "extraMetadata": { "main": "electron.js" }
  }
}
```

### Build the Windows installer

```cmd
cd C:\Users\mickf\Documents\mechiq
npm run build-electron
```

Output: `dist/MechIQ Setup x.x.x.exe` — double-click to install on any Windows machine.

### Run in dev (live reload)

```cmd
npm run electron-dev
```

---

## Android App (Capacitor)

Capacitor wraps your built React app in a native Android shell. Uses Android Studio to build the APK.

### Prerequisites

1. Install **Android Studio**: https://developer.android.com/studio  
   During install, tick: Android SDK, Android SDK Platform, Android Virtual Device
2. Install **Java JDK 17**: https://adoptium.net/
3. Set environment variables (run once in PowerShell as Admin):

```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:USERPROFILE\AppData\Local\Android\Sdk", "User")
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot", "User")
```

### One-time Capacitor setup

```cmd
cd C:\Users\mickf\Documents\mechiq
npm install @capacitor/core @capacitor/cli @capacitor/android

npx cap init MechIQ au.com.mechiq --web-dir build
npx cap add android
```

Edit `capacitor.config.json` in the project root:

```json
{
  "appId": "au.com.mechiq",
  "appName": "MechIQ",
  "webDir": "build",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#060d17",
      "androidSplashResourceName": "splash",
      "splashFullScreen": true
    }
  }
}
```

### Build & sync Android app

Run this every time you want to update the Android app:

```cmd
cd C:\Users\mickf\Documents\mechiq
npm run build
npx cap sync android
npx cap open android
```

The last command opens Android Studio.

### Build APK in Android Studio

1. Android Studio opens with your project
2. Wait for Gradle sync to finish (progress bar bottom-right)
3. Menu → **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. Click **locate** when the notification appears
5. APK is at: `android\app\build\outputs\apk\debug\app-debug.apk`

### Install on your Android device

**Option A — Direct install (your own device):**
1. On your Android: Settings → Security → Enable "Install from unknown sources"
2. Copy `app-debug.apk` to your phone via USB or email
3. Tap the file to install

**Option B — Using MechIQ itself as the installer:**
Since MechIQ already has a "Download App" button in the sidebar, you can:
1. Upload the APK to a file host (Google Drive, Dropbox, etc.)
2. Update the download link in `Navbar.js` to point to your APK URL
3. Staff tap "Download App" → downloads and installs the APK

### Build a signed release APK (for distribution)

```cmd
cd C:\Users\mickf\Documents\mechiq\android
```

In Android Studio: **Build → Generate Signed Bundle / APK**  
Follow the wizard to create a keystore — keep this file safe, you need it for every future update.

---

## Cloudflare Workers (update/redeploy)

```cmd
cd C:\Users\mickf\Documents\mechiq

# Calendar feed worker
wrangler deploy calendar-feed.js --name mechiq-calendar-feed --account-id a2383736780e9e2a31a3f7d7efc401f7

# Oil email ingest worker  
wrangler deploy oil-email-ingest.js --name mechiq-oil-email --account-id a2383736780e9e2a31a3f7d7efc401f7
```

---

## Supabase SQL — Pending Migrations

Run these in the Supabase SQL Editor if not already applied:

```sql
-- Parts: multi-asset compatibility
ALTER TABLE parts ADD COLUMN IF NOT EXISTS compatible_asset_ids integer[] DEFAULT '{}';

-- Assets: ownership type (owned / dry_hire / wet_hire)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT 'owned';

-- Generated labels
CREATE TABLE IF NOT EXISTS generated_labels (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid REFERENCES companies(id) ON DELETE CASCADE,
  template_id    uuid REFERENCES label_templates(id) ON DELETE SET NULL,
  template_name  text,
  label_number   integer NOT NULL,
  label_code     text NOT NULL,
  qr_url         text NOT NULL,
  asset_id       integer REFERENCES assets(id) ON DELETE SET NULL,
  asset_name     text,
  printed        boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE generated_labels DISABLE ROW LEVEL SECURITY;

-- Contractor portal
CREATE TABLE IF NOT EXISTS contractor_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES companies(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email        text NOT NULL,
  phone        text,
  abn          text,
  pin          text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plant_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id    uuid REFERENCES contractor_accounts(id) ON DELETE CASCADE,
  company_id       uuid REFERENCES companies(id) ON DELETE CASCADE,
  name             text,
  type             text,
  make             text,
  model            text,
  year             integer,
  serial_number    text,
  capacity         text,
  hire_type        text DEFAULT 'dry',
  hours            numeric DEFAULT 0,
  status           text DEFAULT 'pending',
  rejection_reason text,
  approved_by      text,
  approved_at      timestamptz,
  asset_id         integer REFERENCES assets(id) ON DELETE SET NULL,
  label_code       text,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES plant_submissions(id) ON DELETE CASCADE,
  document_type text,
  file_url      text,
  expiry_date   date,
  verified      boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_checklists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  plant_type text,
  site_name  text,
  items      jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_completions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid REFERENCES plant_submissions(id) ON DELETE CASCADE,
  checklist_id    uuid REFERENCES compliance_checklists(id) ON DELETE CASCADE,
  completed_items jsonb DEFAULT '{}',
  completed_by    text,
  completed_at    timestamptz,
  UNIQUE(submission_id, checklist_id)
);

-- Disable RLS on contractor tables (internal tool)
ALTER TABLE contractor_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE plant_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE submission_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_completions DISABLE ROW LEVEL SECURITY;
```

---

## Key IDs & Config

| Item | Value |
|------|-------|
| Supabase URL | https://mrnrnlhdjdanchzwafwl.supabase.co |
| Cloudflare Account ID | a2383736780e9e2a31a3f7d7efc401f7 |
| Live URL | https://www.mechiq.com.au |
| Contractor Portal | https://www.mechiq.com.au/contractor |
| Local source | C:\Users\mickf\Documents\mechiq\src\ |
| GitHub repo | mickfazl-ai/MechIQ |
| Branch | main |

---

## Module Summary

| Module | Status | Notes |
|--------|--------|-------|
| Dashboard | ✅ Live | Drag-drop widgets, fleet health |
| Assets — Units | ✅ Live | Sortable list, Owned/Hired tabs |
| Assets — Depreciation | ✅ Live | 3 methods, AI recommendation |
| Assets — Tracker | ✅ Live | |
| Onboarding — Register Asset | ✅ Live | Inline form |
| Onboarding — Contractor Submissions | ✅ Live | Approval workflow, mailto |
| Onboarding — Contractors | ✅ Live | PIN-based accounts |
| Onboarding — Compliance Checklists | ✅ Live | Per plant type & site |
| Contractor Portal | ✅ Live | mechiq.com.au/contractor |
| Maintenance — Planned | ✅ Live | |
| Maintenance — Work Orders | ✅ Live | |
| Maintenance — Service Schedules | ✅ Live | AI suggest with review |
| Maintenance — Calendar | ✅ Live | Google/Outlook/Apple sync |
| Forms — Prestarts | ✅ Live | AI generated, per-asset |
| Forms — Service Sheets | ✅ Live | Multi-interval AI generation |
| Forms — Assets | ✅ Live | Auto-generate all forms |
| Messages | ✅ Live | Team chat |
| Parts & Inventory | ✅ Live | AI Smart Match, QR labels |
| Oil Sampling | ✅ Live | Email ingestion, AI analysis |
| Reports | ✅ Live | PDF/Excel export |
| Admin — Labels | ✅ Live | Designer, Generator, Print |
| Admin — Settings | ✅ Live | |
| Login / Landing Page | ✅ Live | Dark design, 12 modules |

---

*Last updated: April 2026*
