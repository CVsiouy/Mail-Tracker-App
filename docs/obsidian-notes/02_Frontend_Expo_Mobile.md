# 📱 Frontend: Mobile App (Expo & React Native)

The folder `apps/mobile` holds the code for the app running on your phone. It is built using **React Native** and **Expo**.

---

## 💡 What are React Native and Expo?
- **React Native**: A framework developed by Meta (Facebook) that allows developers to write code in Javascript and React, but compile it into real, native iOS and Android apps. Instead of writing two separate apps (one in Swift for Apple and one in Kotlin for Android), you write it once!
- **Expo**: A set of tools built on top of React Native. It makes it incredibly easy to run, test, and build mobile apps. It handles push notifications, secure storage, and databases without you having to touch complicated native Android or iOS setup code.

---

## 📂 Mobile Project Layout

Here is the directory structure inside `apps/mobile/src/`:

```text
apps/mobile/src/
├── components/    # Reusable UI parts (e.g. EmailCard.tsx)
├── config/        # Setup files (e.g. loading .env variables)
├── navigation/    # Manages how you move between screens (Tabs, stacks)
├── screens/       # The actual pages (SwipeScreen, OnboardingScreen, etc.)
├── services/      # Code that handles data Input/Output (Gmail, SQLite, API calls)
└── stores/        # Zustand State Management (stores variables and logic)
```

---

## 🛠️ State Management with Zustand (Stores)
In a mobile app, different screens need to access the same data. For example, if you archive an email on the `SwipeScreen`, the count of emails on the `CategoriesScreen` should immediately go down.

We use a library called **Zustand** to manage this. 
- Think of a **Store** as a global bucket of variables and functions that any file can grab.
- Instead of keeping data inside a specific screen, we keep it in a Store.

There are two main stores in your app:
1. `useAuthStore.ts`: Tracks if you are logged in, who the user is (email, name), and keeps the authorization tokens active.
2. `useInboxStore.ts`: Tracks your emails, whether they are loading, your swipe decisions, and contains the functions to fetch fresh emails or undo a swipe.

---

## 👆 How Swipe gestures work (`SwipeScreen.tsx`)
The centerpiece of this app is the **Swipe Deck** (Tinder-style card stack). It is built using React Native's gesture and animation tools:
- **`PanGestureHandler`**: Senses when your finger touches a card, drags it, and releases it.
- **`Animated`**: Translates your finger movements into screen movements, making the card follow your finger smoothly.
- **`rotateValue`**: Interpolates the horizontal movement to rotate the card slightly as you pull it left or right, mimicking a real card stack.

### 4-Direction Swipe Mappings:
1. **Left (Archive)**: Removes the email from your Inbox. Behind the scenes, it calls the Gmail API to remove the `"INBOX"` label from that message.
2. **Right (Keep)**: Marks the email as read (removes the `"UNREAD"` label) and pulls it off the stack.
3. **Up (Star)**: Adds the `"STARRED"` label to the email.
4. **Down (Trash)**: Moves the email to the Trash folder.

### 🔄 Optimistic Updates & Rollbacks
What happens if you swipe an email, but your internet drops halfway through?
- The app uses **Optimistic Updates**: as soon as you release the card, the card immediately flies off the screen and disappears. The app assumes the server call will succeed.
- If the server call actually **fails** due to a network error, the app automatically triggers a **Rollback**: the email is popped back onto your stack, and a small warning toast message is displayed. This makes the app feel lightning fast because the user doesn't have to wait for the internet to catch up!

---

## 💾 SQLite Local Storage (`SqliteEmailStore`)
To make the app run instantly even when you have poor cellular reception, we use **SQLite** (via `expo-sqlite`).
- When you boot the app, it loads the last 50 emails directly from the phone's internal storage (`mailtracker_emails.db`). This happens in milliseconds!
- In the background, the app makes a request to the Gmail API. If there are new emails, it updates the database and refreshes the screen.
- This is called an **Offline-First** architecture.

---

## 🔍 Important Code Discovery: MainTabs vs Screens
If you look at the code in `apps/mobile/src/navigation/MainTabs.tsx`, you'll notice something interesting:
```typescript
// Placeholder screens - to be implemented in subsequent phases
function CategoriesScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Categories</Text>
    </View>
  );
}
```
In the navigation tabs configuration file (`MainTabs.tsx`), the tabs for **Categories**, **Insights**, and **Settings** are currently using *locally defined placeholder components* (just simple text screens).

However, **fully functional screen files** have already been built in `apps/mobile/src/screens/`!
- [CategoriesScreen.tsx](file:///c:/Users/ChiragVerma/OneDrive%20-%20Gentell/Desktop/Mail-Tracker-App/apps/mobile/src/screens/CategoriesScreen.tsx)
- [InsightsScreen.tsx](file:///c:/Users/ChiragVerma/OneDrive%20-%20Gentell/Desktop/Mail-Tracker-App/apps/mobile/src/screens/InsightsScreen.tsx)
- [SettingsScreen.tsx](file:///c:/Users/ChiragVerma/OneDrive%20-%20Gentell/Desktop/Mail-Tracker-App/apps/mobile/src/screens/SettingsScreen.tsx)

To make your app show the real pages instead of placeholders, you simply need to change the imports in `MainTabs.tsx` to point to the files in the `screens/` directory!

---

## 🔗 Next Steps
- Learn how the backend processes your swipe updates in **[[03_Backend_Node_Express]]**.
- See how the phone and backend share types in **[[04_Shared_Codebase]]**.
