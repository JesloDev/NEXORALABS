# NEXORALABS mobile app

The mobile apps are thin shells around the live site (Vercel). Same site, same database, same login.
Site updates reach the apps immediately; you only rebuild when the icon, name or package settings change.

Already done in this repo: web manifest (`src/app/manifest.ts`), service worker (`public/sw.js`),
offline page, icons (`public/icons/`), and the Digital Asset Links file (`public/.well-known/assetlinks.json`).

## Before anything: replace `YOUR-DOMAIN.com`
Your production domain, on HTTPS. Do it in `mobile/android/twa-manifest.json`, `mobile/ios/capacitor.config.json`
and, once you know the fingerprint, `public/.well-known/assetlinks.json`.
Check it works: open `https://YOUR-DOMAIN.com/manifest.webmanifest` and `https://YOUR-DOMAIN.com/sw.js` in a browser.
Chrome DevTools → Application → Manifest should show no errors.

---

## Android APK (sideload, no Play Store)

You need: Node 18+, a JDK 17, and the Android command-line tools. Bubblewrap offers to download JDK and SDK on first run.

1. Install and prepare a clean folder:
   ```bash
   npm i -g @bubblewrap/cli
   mkdir nexora-android && cd nexora-android
   cp ../mobile/android/twa-manifest.json .
   # edit twa-manifest.json: replace YOUR-DOMAIN.com
   ```
2. Build (first run asks you to create the signing key, answer the prompts and **remember the passwords**):
   ```bash
   bubblewrap build
   ```
   Output: `app-release-signed.apk` (install this) and `app-release-bundle.aab` (Play Store only).
3. **Back up `nexora-release.keystore` and its passwords somewhere safe.** Every future update must be signed
   with the same key, or phones will refuse to upgrade the app.
4. Get the key fingerprint and publish it, otherwise the app shows a browser address bar:
   ```bash
   bubblewrap fingerprint list
   ```
   Copy the `SHA256` value into `public/.well-known/assetlinks.json`
   (`sha256_cert_fingerprints`), commit, push, wait for the Vercel deploy.
   Verify: `https://YOUR-DOMAIN.com/.well-known/assetlinks.json` returns the JSON.
5. Install: send `app-release-signed.apk` to the phone (WhatsApp, Drive, direct link), open it, and allow
   "Install unknown apps" for that app when Android asks.
6. Updating the app itself: bump `appVersion` / `appVersionCode` in `twa-manifest.json`, run `bubblewrap update`
   then `bubblewrap build`, and share the new APK.

No toolchain on your machine? https://www.pwabuilder.com does the same build online for a URL and gives a signed APK.
Still save the keystore it gives you.

---

## iPhone / iPad

Apple does not allow installing an app file from the internet the way Android does. Three routes:

**A. Install as a web app (free, works today, recommended to start).**
On the iPhone, open `https://YOUR-DOMAIN.com` in **Safari** → Share → **Add to Home Screen**.
It then opens full-screen with the NEXORALABS icon. This is the only free option and needs no Apple account.
It must be Safari; other browsers on iOS can't install it.

**B. Native shell (.ipa) with Capacitor.** Needs a Mac with Xcode and an Apple Developer account (US$99/year).
```bash
mkdir nexora-ios && cd nexora-ios
cp -r ../mobile/ios/* .
npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/ios
# edit capacitor.config.json: replace YOUR-DOMAIN.com
npx cap add ios
npx cap sync ios
npx cap open ios      # opens Xcode
```
In Xcode: set your Team and a unique Bundle Identifier, add the app icon (use `public/icons/icon-512.png`
resized to 1024×1024 with no transparency), then Product → Archive.
Distribute through **TestFlight** (up to 10,000 testers by invite link) or **Ad Hoc** (up to 100 registered devices).
Public App Store release needs Apple review.

**C. App Store.** Same as B, but Apple often rejects apps that are only a website in a frame
(guideline 4.2, "minimum functionality"). Expect to need native features such as push notifications.

---

## Notes
- The app needs internet. Offline, it shows a "You're offline" page.
- Chat needs `NEXT_PUBLIC_CHAT_URL` set to the HTTPS Render URL, and `CORS_ORIGINS` on Render must include your site.
- Android back button / swipe-back steps through the app's screens (the dashboard records history).
- After a deploy that changes `public/sw.js`, bump `VERSION` inside it so old caches are dropped.
