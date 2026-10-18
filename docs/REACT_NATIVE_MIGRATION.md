# AKR Credit Capital - React Native Migration Guide

This guide is written for the mobile engineer who will convert the Consumer Android App prototype into a production React Native / Expo application.

---

## 1. Zero-Refactor Code: `src/core/`

The entire `src/core` folder has been intentionally architected with **zero DOM, HTML, or React dependencies**. You can copy it directly into your React Native project:

- `src/core/types/`: All TypeScript interfaces (`Consumer`, `DuesPlan`, `Payment`, `CardType`, `PlanType`, `AppNotification`, etc.)
- `src/core/domain/`: Pure business calculation functions (`calculatePlanBreakdown`, `allocatePayAll`, `determineDueStatus`, `calculateNextEmiDate`, `validateCustomAmount`)
- `src/core/formatters/`: Indian currency formatting (`formatCurrency` -> `₹24,850`), account masking (`maskAccount` -> `**** **** 4821`), and date formatters
- `src/core/validation/`: Zod schemas for login, signup, dues updates, and payments
- `src/core/api/`: Typed REST client using native `fetch`

---

## 2. Component & Layout Translation Mapping

| Web Prototype Component | React Native / Expo Equivalent | Migration Notes |
|---|---|---|
| `<div>`, `<section>`, `<header>` | `<View>`, `<SafeAreaView>` | Use `react-native-safe-area-context` for Android status bar and notch handling |
| `<p>`, `<span>`, `<h1>`–`<h6>` | `<Text>` | All text must be wrapped inside `<Text>`. Apply font family (`CormorantGaramond` or `Inter`) |
| `<button>`, `<GoldButton>` | `<Pressable>`, `<TouchableOpacity>` | Wrap in an animated ripple effect for Android |
| `<input>` | `<TextInput>` | Use `keyboardType="phone-pad"` for Indian mobile and `secureTextEntry` for passwords |
| `<img>` | `<Image>` or `expo-image` | Use `expo-image` for high-performance disk caching of card designs |
| `<div className="overflow-x-auto">` | `<FlatList horizontal>` | Replace the "Your Dues" carousel on Home with `FlatList` with `showsHorizontalScrollIndicator={false}` |
| Modals / Bottom Sheets | `@gorhom/bottom-sheet` | Replaces HTML fixed dialogs with native gesture-driven bottom sheets |
| Toast messages | `react-native-toast-message` | Replaces browser fixed position toasts |
| Icons (`lucide-react`) | `lucide-react-native` | Direct 1:1 drop-in replacement with `color` and `size` props |

---

## 3. Styling: Tailwind CSS to NativeWind

The prototype uses Tailwind tokens defined in `tailwind.config.js`. You can use **NativeWind v4** to preserve nearly identical classnames:

```bash
npx expo install nativewind tailwindcss react-native-reanimated
```

### Color Token Mapping in NativeWind
```js
// tailwind.config.js (React Native)
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'akr-black': '#0B0B0C',
        'akr-surface': '#161617',
        'akr-gold': '#D4AF37',
        'akr-gold-light': '#F3D98B',
        'akr-gold-dark': '#C99A2E',
      }
    }
  }
}
```

For gradients (`bg-gold-gradient`), use `expo-linear-gradient`:
```tsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['#F3D98B', '#D4AF37', '#C99A2E']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={{ borderRadius: 12, padding: 14 }}
>
  <Text style={{ color: '#000', fontWeight: 'bold' }}>Pay Now</Text>
</LinearGradient>
```

---

## 4. Routing & Navigation: React Router to React Navigation

In the prototype, navigation uses `react-router-dom` v6. Migrate to **React Navigation v6** or **Expo Router**:

### 1. Root Stack & Tab Navigator
```tsx
// src/navigation/RootNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#121214', borderTopColor: '#27272a' },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#71717a',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Payments" component={PaymentHistoryScreen} />
      <Tab.Screen name="Cards" component={CardsScreen} />
      <Tab.Screen name="Profile" component={ConsumerDetailsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="PayDues" component={PayDuesScreen} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
```

---

## 5. Storage & Device Hardware Migration

| Web Capability | React Native Package | Purpose |
|---|---|---|
| `localStorage` | `expo-secure-store` / `@react-native-async-storage/async-storage` | Session tokens must be stored in SecureStore; cached offline data in AsyncStorage |
| `window.print()` / `jsPDF` | `expo-print` + `expo-sharing` | Generate printable receipt PDF and open native Android share sheet |
| Vibration / Haptics | `expo-haptics` | Trigger subtle haptic buzz on Pay Now tap and celebration checkmark |
| Biometric Unlock | `expo-local-authentication` | Fingerprint / Face recognition for instant app resume |
| Confetti celebration | `lottie-react-native` | High-fps vector animation on successful payment result screen |

---

## 6. What to Delete During React Native Migration

The following web-only prototype assets can be omitted or deleted:
1. `src/app/layouts/PhoneFrame.tsx` (The 420px desktop wrapper is not needed on physical devices).
2. `src/components/dev/DevToolbar.tsx` (Dev quick switches; replace with React Native Developer Menu shake).
3. `src/app/pages/LandingPage.tsx` (Prototype dual-portal portal selector).
4. `src/features/admin/*` (The admin panel stays as a desktop web application).
