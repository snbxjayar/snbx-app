# SNBX Pro — Pre-Build Checklist

Run through this EVERY TIME before running `eas build`.

## 🚫 Golden Rules

1. **NEVER run `npx expo prebuild --clean`** once native SMS files exist.
   - This wipes the entire `android/` folder including our custom Kotlin files.
   - If you need to regenerate from `app.json` changes, use:
     ```
     npx expo prebuild --platform android
     ```
     (no `--clean` flag)

2. **ALWAYS commit + push to GitHub before building.**
   - EAS Build uses your GitHub commit, NOT your local unsaved files.
   - Run `git status` first — if it says "nothing to commit" but you know you changed files, something is wrong (check `.gitignore`).

3. **Permissions go in `app.json`**, never edited directly in `AndroidManifest.xml`.
   - Path: `app.json` → `expo.android.permissions` array
   - Editing `AndroidManifest.xml` directly gets overwritten on next prebuild.

## ✅ Verify These 6 Things Survived (after any prebuild)

Run these commands and confirm output is NOT empty:

```bash
# 1. All 4 Kotlin files present
ls android/app/src/main/java/com/snbxjayar/snbxapp/sms/

# 2. MainApplication.kt has SmsPackage registered
Select-String -Path "android/app/src/main/java/com/snbxjayar/snbxapp/MainApplication.kt" -Pattern "SmsPackage"

# 3. build.gradle (app) has Firebase
Select-String -Path "android/app/build.gradle" -Pattern "firebase"

# 4. build.gradle (root) has Google Services classpath
Select-String -Path "android/build.gradle" -Pattern "google-services"

# 5. google-services.json exists
cat android/app/google-services.json

# 6. AndroidManifest.xml has all permissions
Select-String -Path "android/app/src/main/AndroidManifest.xml" -Pattern "permission"
```

## 📋 Required Permissions List (in app.json)

```json
"permissions": [
  "android.permission.SEND_SMS",
  "android.permission.RECEIVE_SMS",
  "android.permission.READ_SMS",
  "android.permission.READ_PHONE_STATE",
  "android.permission.READ_PHONE_NUMBERS",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
  "android.permission.POST_NOTIFICATIONS"
]
```

## 🗂️ The 4 Native SMS Files (back them up separately!)

Location: `android/app/src/main/java/com/snbxjayar/snbxapp/sms/`

- `SmsModule.kt` — bridges JS ↔ Android SmsManager
- `SmsPackage.kt` — registers SmsModule with React Native
- `SmsReceiver.kt` — catches incoming SMS, saves to Firestore
- `GatewayService.kt` — background service, sends queued SMS jobs

**TIP:** Keep a copy of these 4 files OUTSIDE the project folder too
(e.g. in a `native-backup/` folder) in case of future prebuild accidents.

## 🔢 Git Sanity Check (before every build)

```bash
git status                    # confirm expected changes show up
cat .gitignore                # confirm NO "/android" or "/ios" lines
git log --oneline -3          # note the commit hash
git add .
git commit -m "describe what changed"
git push
```

After pushing, the commit hash from `git log` should match what shows
on the EAS build page. If it doesn't match, the push didn't register —
do NOT proceed with the build.

## 🏗️ Build Command

```bash
eas build --platform android --profile preview
```

Only add `--clear-cache` if you suspect EAS is using stale code
(rare once the above checks pass). It uses more build quota and time.

## 📅 Build Quota Notes

- Free EAS tier has limited Android builds per month.
- Quota resets monthly (check exact date on expo.dev/accounts/.../billing).
- Each failed build still counts against quota — that's why this
  checklist exists, to avoid wasting builds on preventable errors.