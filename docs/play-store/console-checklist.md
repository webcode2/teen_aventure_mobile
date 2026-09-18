# Play Console operator checklist

Complete these outside the repo. The Android project is prepared; Play will still reject the upload if this list is incomplete.

## 1. Confirm package name

`applicationId` is `com.elasctroclud.teen_aventure`. First upload locks this ID forever.

## 2. Upload keystore (never commit)

From `mobile/android/`:

```bat
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Copy `key.properties.example` to `key.properties` and fill passwords. `key.properties` and `*.jks` are gitignored.

## 3. Host legal pages

Publish `docs/legal/privacy-policy.md` and `docs/legal/terms.md` at HTTPS URLs. Paste the privacy URL into Play Console → App content → Privacy policy.

## 4. Content

Paste real YouTube URLs in `mobile/lib/data/youtube_lesson_urls.dart` and `backend/prisma/seed.ts`. Empty URLs look unfinished in review.

## 5. Production API (optional for student sample loop)

```bat
cd mobile
flutter build appbundle --release --dart-define=API_BASE_URL=https://YOUR_HOST
```

Without `API_BASE_URL`, release uses local sample lessons only (no emulator host).

Output: `mobile/build/app/outputs/bundle/release/app-release.aab`

## 6. Play Console forms

- [ ] Developer account registered
- [ ] App created; package matches Gradle
- [ ] Default store listing (copy in `listing.md`) + screenshots + 512 icon + 1024×500 graphic
- [ ] App category: Education
- [ ] Target audience: 13–17 (and 18+ if you also want adults). **Not** “Designed for Families” / under 13
- [ ] IARC content rating questionnaire
- [ ] Data safety (`data-safety.md`)
- [ ] News / political (no)
- [ ] Ads: no
- [ ] Government apps: no
- [ ] Financial features: no
- [ ] Health: no
- [ ] COVID: no
- [ ] Data safety encryption in transit: yes if API is used
- [ ] Countries / pricing: free
- [ ] Upload AAB to internal testing first, then production

## 7. After 31 August 2026

New apps and updates must target API 36. This project sets `targetSdk = 36`.
