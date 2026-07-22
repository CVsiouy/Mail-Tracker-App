# Mail Tracker — Shipping Guide

This document covers building, testing, and deploying Mail Tracker to app stores.

## Prerequisites

- **EAS CLI**: `npm install -g eas-cli`
- **Expo account**: Sign up at https://expo.dev
- **Apple Developer account** (for iOS): Required for iOS builds
- **Google Play Console account** (for Android): Required for Android releases
- **Firebase project** with Realtime Database and FCM enabled

## EAS Build Setup

### 1. Initialize EAS

```bash
cd apps/mobile
eas login
eas build:configure
```

### 2. Create Credentials

For **Android**:
```bash
eas credentials -p android
```
Upload your upload key or let EAS create one.

For **iOS**:
```bash
eas credentials -p ios
```
Ensure you have:
- Apple Developer account enrolled
- Distribution certificate
- Provisioning profiles (Ad Hoc for testing, App Store for production)

### 3. Build Profiles

The `eas.json` defines three profiles:

| Profile | Distribution | Use Case |
|---------|-------------|----------|
| `development` | Internal APK / TestFlight | Local testing, dev builds |
| `preview` | Internal | Staging / beta testing |
| `production` | Store | App Store / Play Store release |

### 4. Build Commands

**Development build (Android APK)**:
```bash
cd apps/mobile
eas build --profile development --platform android
```

**Development build (iOS)**:
```bash
eas build --profile development --platform ios
```
> Note: iOS builds require a Mac or EAS Hosted Builds. From Windows, use EAS cloud builds.

**Production build**:
```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

### 5. Submit to Stores

**Android (Google Play Internal Testing)**:
```bash
eas submit --platform android --path ./app-release.aab
```

**iOS (App Store)**:
```bash
eas submit --platform ios --latest
```

Or configure automatic submission in `eas.json`:
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    },
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "your-app-store-connect-app-id"
    }
  }
}
```

Then run:
```bash
eas submit --platform all
```

## Firebase Setup

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create a new project (or use existing)
3. Enable **Realtime Database**
4. Enable **Cloud Messaging (FCM)**

### 2. Add Android App

1. In Firebase Console > Project Settings > Your apps
2. Add Android app with package: `com.mailtracker.app`
3. Download `google-services.json` and place in `apps/mobile/android/`

### 3. Add iOS App

1. Add iOS app with bundle ID: `com.mailtracker.app`
2. Download `GoogleService-Info.plist` and place in `apps/mobile/ios/`

### 4. Realtime Database Rules

Set up security rules in Firebase Console > Realtime Database > Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid",
        "emails": {
          "$messageId": {
            ".indexOn": ["receivedAtMs", "category", "isUnread"]
          }
        },
        "swipes": {
          "$messageId": {
            ".indexOn": ["atMs"]
          }
        },
        "devices": {
          "$tokenId": {
            ".indexOn": ["lastSeenMs"]
          }
        }
      }
    }
  }
}
```

### 5. Service Account for Backend

1. Firebase Console > Project Settings > Service Accounts
2. Generate new private key
3. Save the JSON file securely
4. Use values in `.env` for `FIREBASE_*` variables

## Environment Configuration

### Development (.env)

```env
MAILTRACKER_API_BASE_URL=http://10.0.2.2:5080
FIREBASE_WEB_API_KEY=your-web-api-key
FIREBASE_APP_ID_ANDROID=your-android-app-id
FIREBASE_APP_ID_IOS=your-ios-app-id
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
```

### Production

For production builds, set environment variables in EAS:
```bash
eas env:push --env production
```

Or configure in `eas.json` under each build profile.

## Testing Checklist

Before submitting to stores:

- [ ] OAuth flow works (Gmail sign-in)
- [ ] Emails load from Gmail API
- [ ] Swipe gestures work (all 4 directions)
- [ ] Email actions persist to Gmail (archive, trash, star, mark read)
- [ ] AI categorization returns results
- [ ] Categories screen shows correct counts
- [ ] Insights screen generates summaries
- [ ] Settings screen allows sign-out
- [ ] Push notifications register correctly
- [ ] Firebase sync works between devices
- [ ] App handles offline state gracefully
- [ ] No console errors or warnings

## App Store Listings

### Google Play Store

**Short description** (80 chars):
> AI-powered email management with swipe gestures for inbox zero.

**Full description**:
> Mail Tracker helps you achieve inbox zero with an intuitive swipe-based interface. Categorize emails with AI, get insights about your email habits, and manage your Gmail directly from your phone.
>
> Features:
> - Swipe left to archive, right to keep, up to star, down to trash
> - AI-powered email categorization
> - Real-time sync across devices
> - Weekly insights about your email patterns
> - Secure OAuth authentication
> - Local data storage for offline access

**Category**: Productivity
**Content rating**: Everyone

### Apple App Store

**Subtitle** (30 chars):
> Swipe your inbox to zero

**Keywords**:
> email,gmail,swipe,inbox,productivity,ai,organize,manage

**Promotional text**:
> Achieve inbox zero with AI-powered email management and satisfying swipe gestures.

## Post-Launch

### Monitoring

- Set up Firebase Crashlytics for crash reporting
- Monitor API usage and rate limits
- Track user engagement with Firebase Analytics

### Updates

```bash
# OTA updates for JS changes (no native code changes)
eas update --branch production --message "Bug fixes"

# Full rebuild for native changes
eas build --profile production --platform all
```

### Support

- Add in-app feedback in Settings screen
- Monitor App Store / Play Store reviews
- Set up support email: support@mailtracker.app