# Estate Vista Mobile App Setup

This is the React Native Expo mobile app for Estate Vista.

## Prerequisites

- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli` (optional, can use npx)
- iOS Simulator (Mac only) or Android Emulator, or Expo Go app on your phone

## Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   - Copy `.env.example` to `.env`
   - Set `EXPO_PUBLIC_API_URL` to your backend URL

## Running the App

### Development
```bash
# Start Expo development server
npm start

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

### Using Expo Go
1. Install Expo Go app on your phone
2. Run `npm start`
3. Scan the QR code with your phone

## Project Structure

```
mobile/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   └── TourCartContext.tsx
│   ├── lib/               # Utilities and API
│   │   ├── api.ts
│   │   └── queryClient.ts
│   ├── navigation/        # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AgentTabs.tsx
│   │   ├── ClientTabs.tsx
│   │   └── types.ts
│   └── screens/           # App screens
│       ├── LoginScreen.tsx
│       ├── RegisterScreen.tsx
│       ├── PropertyDetailsScreen.tsx
│       ├── TourDetailsScreen.tsx
│       ├── agent/         # Agent role screens
│       └── client/        # Client role screens
```

## Features

### Authentication
- Login/Register with email and password
- JWT token storage using SecureStore
- Role-based navigation (Agent vs Client)

### Client Features
- Browse properties
- Add properties to tour cart
- Request tours
- View upcoming and past tours
- Rate properties after tours

### Agent Features
- Dashboard with stats
- Manage clients
- Schedule and manage tours
- View properties
- Access documents and media

## API Configuration

The app connects to the Estate Vista backend API. Update the API URL in:
- `src/lib/api.ts` - Default API_BASE_URL
- Create `.env` with `EXPO_PUBLIC_API_URL=your-api-url`

## Building for Production

### Using EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Build
```bash
# Create development build
npx expo run:ios
npx expo run:android
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start -c`
2. **Dependency issues**: Delete `node_modules` and reinstall
3. **iOS build issues**: Run `cd ios && pod install`
4. **Android build issues**: Clean gradle with `cd android && ./gradlew clean`

### Debugging

- Use React Native Debugger
- Enable "Debug Remote JS" in Expo DevTools
- Check console logs in Metro bundler
