# Zeflash2.0 Android Release Build Guide

## Overview
This guide explains how to build a production-ready Android application that can be published to the Google Play Store.

## Prerequisites

1. **Java 17** installed (via Homebrew: `brew install openjdk@17`)
2. **Node.js** and npm installed
3. **Android SDK** configured
4. **Capacitor** set up in the project

## Build Scripts

### 1. Build Release APK (build-release-apk.sh)
This script creates a signed release APK for distribution outside the Play Store (direct download, testing, etc.).

**Usage:**
```bash
chmod +x build-release-apk.sh
./build-release-apk.sh
```

**What it does:**
- Generates a keystore (first time only)
- Builds the web application
- Syncs Capacitor
- Creates a signed release APK
- Output: `android/app/build/outputs/apk/release/app-release.apk`

### 2. Build App Bundle (build-app-bundle.sh)
This script creates an Android App Bundle (AAB) for Google Play Store submission.

**Usage:**
```bash
chmod +x build-app-bundle.sh
./build-app-bundle.sh
```

**What it does:**
- Builds the web application
- Syncs Capacitor
- Creates a signed release AAB
- Output: `android/app/build/outputs/bundle/release/app-release.aab`

## First-Time Setup

### Step 1: Generate Keystore
When you run `build-release-apk.sh` for the first time, you'll be prompted to create a keystore:

```
Enter keystore password: ********
Confirm keystore password: ********
Enter your name: John Doe
Enter your organization: Zipbolt Technologies
Enter your city: Gurgaon
Enter your state/province: Haryana
Enter your country code: IN
```

**IMPORTANT:** 
- Keep this password safe! You'll need it for all future app updates.
- The keystore file will be saved to: `android/app/zeflash-release-key.keystore`
- A `key.properties` file will be created with signing credentials
- **NEVER commit these files to Git** (already in .gitignore)

### Step 2: Backup Your Keystore
```bash
# Create a secure backup
cp android/app/zeflash-release-key.keystore ~/secure-backup/
cp android/key.properties ~/secure-backup/
```

**⚠️ WARNING:** If you lose your keystore, you cannot update your app on Play Store!

## Building for Production

### For Direct Distribution (APK)
```bash
./build-release-apk.sh
```
The signed APK will be at:
- `android/app/build/outputs/apk/release/app-release.apk`
- Also copied to: `public/apk/zeflash-release.apk`

### For Google Play Store (AAB)
```bash
./build-app-bundle.sh
```
The signed AAB will be at:
- `android/app/build/outputs/bundle/release/app-release.aab`
- Also copied to: `zeflash-release.aab`

## Version Management

Update version before each release in `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.1"    // User-visible version
}
```

## Google Play Store Submission

### 1. Prepare Store Listing
Before uploading, prepare:
- **App name:** Zeflash
- **Short description:** 50 characters
- **Full description:** Up to 4000 characters
- **Screenshots:** At least 2 (phone), 1-8 (tablet)
- **Feature graphic:** 1024 x 500 px
- **App icon:** 512 x 512 px

### 2. Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create or select your app
3. Navigate to **Production** → **Create new release**
4. Upload `zeflash-release.aab`
5. Fill in release notes
6. Review and rollout

### 3. Required Configurations

#### Privacy Policy
- URL: Your deployed privacy policy page
- Example: `https://zeflash.app/privacy-policy`

#### Content Rating
Complete the content rating questionnaire in Play Console

#### Target Audience
- Select appropriate age groups
- Choose if your app has ads

#### App Category
- Category: Tools or Auto & Vehicles
- Tags: EV, Battery, Diagnostics

## Testing Release Builds

### Install Release APK on Device
```bash
# Via ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or use the install script
./install-apk.sh
```

### Test Checklist
- [ ] App launches successfully
- [ ] All features work as expected
- [ ] No debug logs/toast messages
- [ ] Performance is optimized
- [ ] Proper app name and icon
- [ ] Permissions work correctly
- [ ] Network requests succeed
- [ ] App doesn't crash on any screen

## Build Configuration

### Release Build Features
The release build includes:
- **Code minification** (ProGuard/R8)
- **Resource shrinking** (removes unused resources)
- **No debugging** (debuggable = false)
- **Optimized** (proguard-android-optimize.txt)
- **Signed** with release keystore

### ProGuard Rules
Edit `android/app/proguard-rules.pro` if you need to keep specific classes from being obfuscated.

## Troubleshooting

### Build Fails: "key.properties not found"
Run `build-release-apk.sh` first to generate the keystore and properties file.

### Build Fails: "Java version"
Ensure Java 17 is active:
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
java -version
```

### Signing Fails: "Keystore was tampered with"
Your keystore password is incorrect. If you forgot it, you'll need to create a new keystore (and publish as a new app).

### APK Too Large
- Enable app bundle (AAB) for Play Store
- Check for large assets that can be optimized
- Review dependencies for size

### App Crashes on Release but Not Debug
- Check ProGuard rules
- Review native library configurations
- Test on actual devices, not just emulators

## Security Best Practices

1. **Never commit:**
   - `key.properties`
   - `*.keystore` files
   - `*.jks` files

2. **Backup securely:**
   - Store keystore in multiple secure locations
   - Use password manager for credentials

3. **Team access:**
   - Share keystore securely (encrypted)
   - Document password recovery process

4. **Version control:**
   - Tag releases in Git: `git tag v1.0.0`
   - Keep release notes updated

## Automated Builds (Optional)

### GitHub Actions Example
Create `.github/workflows/android-release.yml`:

```yaml
name: Android Release Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Build AAB
        run: ./build-app-bundle.sh
      - name: Upload AAB
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: zeflash-release.aab
```

## Support

For issues or questions:
- Email: support@zeflash.app
- Documentation: This file

## Changelog

### Version 1.0 (Initial Release)
- First production-ready build
- Privacy policy integration
- Release signing configuration
