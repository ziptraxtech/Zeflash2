# Zeflash2.0 Android APK Build Guide

## 📱 Project Overview
This project converts the Zeflash2.0 React website into a native Android app using Capacitor.

## ⚙️ Build Environment Setup

### Java Setup
- **Required**: Java 17 (OpenJDK 17)
- **Installed Location**: `/opt/homebrew/opt/openjdk@17`
- **Set JAVA_HOME** (for current session):
  ```bash
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
  export PATH="$JAVA_HOME/bin:$PATH"
  ```

### Android SDK Setup
1. **Install Android Studio** (recommended) or Android Command Line Tools
2. **SDK Location**: Should be at `/Users/ritvik/Library/Android/sdk`
3. **Required SDK Components**:
   - Android SDK Platform 34 (or latest)
   - Android SDK Build-Tools 34.0.0 (or latest)
   - Android SDK Platform-Tools
   - Android SDK Command-line Tools

## 🔧 Configuration Files

### capacitor.config.ts
- **App ID**: `com.ziptraxtech.zeflash`
- **App Name**: `Zeflash2.0`
- **Server URL**: Update this with your live website URL
- Currently set to: `https://zeflash-landing.vercel.app`

### Important: Update Website URL
Before building, update the `server.url` in `capacitor.config.ts` to your actual deployed website:
```typescript
server: {
  url: 'https://your-actual-website-url.com',
  cleartext: true
}
```

## 🏗️ Building the APK

### Option 1: Using Android Studio (Recommended for First Time)
```bash
# 1. Open the Android project in Android Studio
cd /Users/ritvik/Desktop/zeflash
npx cap open android

# 2. In Android Studio:
#    - Wait for Gradle sync to complete
#    - Click Build > Build Bundle(s) / APK(s) > Build APK(s)
#    - APK will be in: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Using Command Line (Gradle)
```bash
# 1. Set Java 17 environment
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

# 2. Navigate to project root
cd /Users/ritvik/Desktop/zeflash

# 3. Sync Capacitor files
npx cap sync android

# 4. Build the APK
cd android
./gradlew assembleDebug

# 5. Find your APK at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 3: Quick Build Script
```bash
# Make the build script executable
chmod +x build-apk.sh

# Run the build script
./build-apk.sh
```

## 📦 Installing the APK on Android Device

### Via USB (ADB)
```bash
# 1. Enable USB Debugging on your Android device
#    Settings > About Phone > Tap "Build Number" 7 times
#    Settings > Developer Options > Enable USB Debugging

# 2. Connect device via USB

# 3. Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or force reinstall if already installed
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Via File Transfer
1. Copy `app-debug.apk` from your Mac to Android device
2. On Android device, enable "Install from Unknown Sources"
3. Use a file manager to open the APK and install

## 🔄 Making Changes and Rebuilding

### When You Update Your Website
The app loads your live website, so most changes don't require rebuilding:
1. Update your website
2. Deploy the changes
3. Open the app - it will show the latest version automatically!

### When You Need to Rebuild
Rebuild the APK only when you change:
- App name or icon
- Package ID
- Capacitor configuration
- Native Android code

```bash
# Sync changes and rebuild
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 🎨 Customization

### App Icon
Icons are located in:
- `android/app/src/main/res/drawable/ic_launcher_background.xml` (background)
- `android/app/src/main/res/drawable/ic_launcher_foreground.xml` (foreground logo)

### App Colors
Edit: `android/app/src/main/res/values/colors.xml`

### App Name
Edit: `android/app/src/main/res/values/strings.xml`

## 🐛 Troubleshooting

### Gradle Sync Failed
```bash
# Clear Gradle cache
cd android
./gradlew clean

# Try sync again
npx cap sync android
```

### Java Version Issues
```bash
# Check current Java version
java -version

# Should show Java 17.x.x
# If not, set JAVA_HOME:
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
```

### SDK Not Found
1. Install Android Studio
2. Open Android Studio
3. Go to Preferences > Appearance & Behavior > System Settings > Android SDK
4. Note the SDK Location path
5. Update `android/local.properties` with correct path

### ADB Not Found
```bash
# Install Android platform tools
brew install android-platform-tools

# Or add to PATH
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
```

## 📝 Build Output Locations

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK** (signed): `android/app/build/outputs/apk/release/app-release.apk`

## 🚀 Building Release APK (For Production)

### 1. Generate Signing Key
```bash
keytool -genkey -v -keystore zeflash-release-key.keystore -alias zeflash -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Create `android/key.properties`
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=zeflash
storeFile=../zeflash-release-key.keystore
```

### 3. Build Release APK
```bash
cd android
./gradlew assembleRelease
```

## 📱 Features of Your Zeflash App

✅ Loads your live website automatically
✅ Works offline (caches website content)
✅ Native app feel (no browser UI)
✅ Custom branding (Zeflash name and icon)
✅ Fast performance with WebView
✅ Supports authentication (Clerk)
✅ Responsive mobile design
✅ Always shows latest website version

## 🔗 Useful Commands

```bash
# Open in Android Studio
npx cap open android

# Sync web assets
npx cap sync android

# Update Capacitor
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest

# Check Capacitor doctor
npx cap doctor

# List connected devices
adb devices

# View app logs
adb logcat | grep Capacitor
```

## 📞 Support

For issues or questions:
- Capacitor Docs: https://capacitorjs.com/docs
- Android Developers: https://developer.android.com

---

**Next Steps**:
1. Install Android Studio or SDK if not already installed
2. Update the website URL in `capacitor.config.ts`
3. Run the build script or use Android Studio
4. Install APK on your Android device
5. Test the app!