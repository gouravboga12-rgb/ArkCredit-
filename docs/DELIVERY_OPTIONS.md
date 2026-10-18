# AKR Credit Capital - Delivery & Packaging Options

This document outlines the three delivery paths supported by this codebase, enabling CODTECH and downstream developers to package the applications for different platforms.

---

## 1. Prototype Context & Scope Note

> [!NOTE]
> In the CODTECH Scope of Work agreement (Section 1.1 / Exclusions), a "customer-facing website" is listed as an excluded deliverable, with the primary consumer target defined as an **Android App**.
>
> In this prototype repository, **both the Consumer App and the Admin Panel are presented in the same web build purely for customer showcase and testing convenience**.
>
> The codebase has been cleanly separated so that downstream engineers can decouple the applications with zero architectural rework.

---

## 2. Configuration Flag: `VITE_CONSUMER_PRESENTATION`

Control the presentation style in `.env`:

```env
# Values: 'phone-frame' | 'responsive-web'
VITE_CONSUMER_PRESENTATION=phone-frame
```

### Modes:
1. `phone-frame` (Default):
   - On desktop screens ($\ge 768\text{px}$), renders the consumer app inside a simulated mobile handset (420px width, rounded bezel, dynamic notch).
   - On physical mobile devices ($\le 480\text{px}$), the frame automatically removes itself to provide a full-screen, native-feeling experience.
2. `responsive-web`:
   - Removes the phone frame entirely on desktop.
   - The consumer app expands to a full responsive desktop/tablet dashboard layout while maintaining bottom navigation on mobile.

---

## 3. The Three Production Packaging Paths

### Option A: Consumer as React Native App Only (Recommended)
This delivers the exact target specified in the CODTECH contract.

1. **Extract `src/core/`**:
   Copy the `src/core` folder directly into your React Native / Expo repository. It contains all types, domain logic, Indian currency formatters, and API clients with no web dependencies.
2. **Re-implement Screens with NativeWind & React Navigation**:
   Follow `docs/REACT_NATIVE_MIGRATION.md` to map the 12 screens from `src/features/` into Native Views.
3. **Build Android APK / AAB**:
   ```bash
   eas build --platform android
   ```

---

### Option B: Admin Panel as Standalone Website
The Admin Panel is designed from the ground up for business operations on desktop and mobile browsers.

1. **Remove Consumer Routes**:
   In `src/app/router.tsx`, remove `/app/*` and point root `/` directly to `/admin/login`.
2. **Deploy to Cloud Hosting**:
   Deploy the Vite build to Vercel, AWS Amplify, Cloudflare Pages, or Netlify:
   ```bash
   npm run build
   # Upload dist/ folder
   ```
3. **Connect to Real API**:
   Set `VITE_ENABLE_MOCKS=false` and `VITE_API_BASE_URL=https://api.akrcredit.com`.

---

### Option C: Ship Both Consumer Web and Admin Web
If AKR Credit Capital decides to offer a web portal for consumers alongside the mobile app:

1. Keep `src/app/router.tsx` active.
2. Set `VITE_CONSUMER_PRESENTATION=responsive-web`.
3. Provide desktop branding and user settings. Both portals will coexist under separate subpaths (`/app` and `/admin`) with complete identity isolation and separate session cookies.
