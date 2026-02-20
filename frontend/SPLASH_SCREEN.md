# Splash Screen Implementation Guide

## Overview
The Inventory App now features a professional splash screen displaying the Chicago Booth logo with smooth animations.

## Implementation Details

### Assets Updated
The following image assets have been updated with the company logo:

1. **`assets/images/splash-icon.png`** - Main splash screen logo
2. **`assets/images/icon.png`** - App icon for iOS
3. **`assets/images/adaptive-icon.png`** - Adaptive icon for Android
4. **`assets/images/logo.png`** - General logo for in-app use

### Configuration (`app.json`)

#### Splash Screen Settings
```json
{
  "expo": {
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 300,
          "resizeMode": "contain",
          "backgroundColor": "#FFFFFF"
        }
      ]
    ]
  }
}
```

**Settings Explained:**
- **image**: Path to the splash screen logo
- **imageWidth**: 300px - Large enough to be visible but not overwhelming
- **resizeMode**: "contain" - Maintains aspect ratio
- **backgroundColor**: "#FFFFFF" (white) - Clean, professional background

#### Android Settings
```json
{
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/images/adaptive-icon.png",
      "backgroundColor": "#FFFFFF"
    }
  }
}
```

### Custom Splash Component

A custom `SplashScreenProvider.tsx` component has been created for enhanced control:

**Features:**
- ✨ Smooth fade-out animation (500ms)
- ⏱️ Minimum 2-second display time
- 🔄 Resource preloading support
- 🎨 Professional white background
- 📱 Optimized for both iOS and Android

**Usage (Optional):**
To use the custom splash provider, wrap your app in `_layout.tsx`:

```tsx
import SplashScreenProvider from './SplashScreenProvider';

export default function RootLayout() {
  return (
    <SplashScreenProvider>
      {/* Your app content */}
    </SplashScreenProvider>
  );
}
```

## How It Works

1. **App Launch**: When the app starts, Expo displays the splash screen configured in `app.json`
2. **Logo Display**: The Chicago Booth logo appears centered on a white background at 300px width
3. **Resource Loading**: App loads necessary resources (minimum 2 seconds)
4. **Smooth Transition**: Fade-out animation transitions to the main app (500ms)
5. **Main App**: User sees the home screen

## Testing the Splash Screen

### iOS Simulator
```bash
cd frontend
npx expo start
# Press 'i' to open in iOS simulator
```

### Android Emulator
```bash
cd frontend
npx expo start
# Press 'a' to open in Android emulator
```

### Physical Device (Expo Go)
```bash
cd frontend
npx expo start
# Scan the QR code with Expo Go app
```

### Production Build
For production builds with the custom splash screen:

**iOS:**
```bash
npx expo prebuild
npx expo run:ios
```

**Android:**
```bash
npx expo prebuild
npx expo run:android
```

## Customization Options

### Change Background Color
Edit `app.json`:
```json
"backgroundColor": "#YOUR_HEX_COLOR"
```

### Adjust Logo Size
Edit `app.json`:
```json
"imageWidth": 250  // Smaller
"imageWidth": 350  // Larger
```

### Change Animation Duration
Edit `SplashScreenProvider.tsx`:
```tsx
Animated.timing(fadeAnim, {
  toValue: 0,
  duration: 800,  // Slower fade (milliseconds)
  useNativeDriver: true,
})
```

### Minimum Display Time
Edit `SplashScreenProvider.tsx`:
```tsx
await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds
```

## Design Rationale

### White Background
- Clean, professional appearance
- Matches modern design trends
- Ensures logo visibility
- Creates consistency with branding

### 300px Logo Width
- Large enough to be prominent
- Small enough to avoid overwhelming
- Works well on all device sizes
- Maintains aspect ratio

### Smooth Animations
- Professional feel
- Better user experience
- Reduces perceived loading time
- Modern app standard

## Platform-Specific Behavior

### iOS
- Logo appears centered immediately
- Native splash screen handling
- Smooth transition to app
- StatusBar automatically handled

### Android
- Adaptive icon with white background
- Material Design compliant
- Edge-to-edge display support
- System splash screen optimization

## Troubleshooting

### Splash Screen Not Showing
1. Clear Expo cache: `npx expo start -c`
2. Rebuild app: `npx expo prebuild --clean`
3. Verify image exists at `assets/images/splash-icon.png`

### Logo Appears Stretched
- Ensure `resizeMode: "contain"` in `app.json`
- Check original logo has transparent background
- Verify logo dimensions are appropriate

### Splash Screen Too Long/Short
- Adjust `setTimeout` duration in `SplashScreenProvider.tsx`
- Only affects custom implementation
- Native splash controlled by Expo

### Different Colors on iOS vs Android
- Check `app.json` has same `backgroundColor` in splash config
- Verify Android `adaptiveIcon.backgroundColor` matches
- Clear cache and rebuild

## Files Modified

- ✅ `frontend/app.json` - Updated splash and icon configuration
- ✅ `frontend/assets/images/splash-icon.png` - Added logo
- ✅ `frontend/assets/images/icon.png` - Updated app icon
- ✅ `frontend/assets/images/adaptive-icon.png` - Updated Android icon
- ✅ `frontend/assets/images/logo.png` - Added general logo
- ✅ `frontend/app/SplashScreenProvider.tsx` - Created custom component

## Next Steps

To see the splash screen in action:
1. Start the Expo development server
2. Open the app on a device or emulator
3. The splash screen will display automatically on app launch

For production deployment, build the app using EAS Build or Expo's build service.

---

**Note**: The splash screen will be most visible on cold app starts. During development with hot reload, you may not see it as frequently.
