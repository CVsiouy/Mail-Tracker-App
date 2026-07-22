# 📂 Welcome to Your Mail Tracker App!

Hello and welcome to your coding journey! 🚀 

It's completely normal to feel a bit overwhelmed when looking at a codebase for the first time, especially one that has multiple folders and connects different systems together. This guide is built specifically for you. We will break down everything in plain, easy-to-understand language. No jargon will be left unexplained.

---

## 🛠️ Let's Start with the Basics (Coding 101)

Before we look at the folders, here are a few simple concepts you should know:

1. **Client / Frontend**: This is the application that runs on the user's device (in this case, your mobile phone). It's what the user sees, taps, and swipes.
2. **Server / Backend**: This is a program running on a computer somewhere else (in development, it runs on your PC). It handles heavy tasks, like talking to databases, running AI models, and keeping secrets safe.
3. **API (Application Programming Interface)**: Think of the API as a waiter in a restaurant. Your frontend (the customer) tells the API (the waiter) what it wants, the API runs to the backend kitchen, gets the food, and brings it back to the customer.
4. **Monorepo**: A "monorepo" (short for monolithic repository) is a single project folder that contains multiple smaller sub-projects that work together. In your project, the frontend mobile app, backend API, and shared logic are all kept in one place.
5. **Database**: A digital filing cabinet. We use two kinds:
   - **SQLite**: A small, lightweight database that sits directly on the user's phone, allowing the app to work offline.
   - **Firebase Realtime Database**: A database in the cloud that synchronizes data instantly across multiple devices.

---

## 🗺️ How to Use These Notes in Obsidian

These notes are formatted to work perfectly with **Obsidian** (a popular markdown-based note-taking application). 

- **Internal Links**: Text surrounded by double brackets, like `[[01_Architecture_Overview]]`, is a clickable link. In Obsidian, you can click it to jump directly to that note!
- **Graph View**: If you open this folder (`docs/obsidian-notes/`) as a vault in Obsidian and click **Graph View** in the sidebar, you'll see a visual map of how these notes connect!

---

## 📑 Table of Contents

Follow the guides in this order to learn how your project works:

1. 🏛️ **[[01_Architecture_Overview]]**
   Understand the high-level design of the app, how the folders are structured, and how they talk to each other.
2. 📱 **[[02_Frontend_Expo_Mobile]]**
   Explore the mobile app codebase, the user screens, state management (Zustand), offline storage (SQLite), and how gestures are tracked.
3. ⚙️ **[[03_Backend_Node_Express]]**
   Explore the server backend, what the API endpoints do, how AI categorization works, and how Firebase is used.
4. 🔗 **[[04_Shared_Codebase]]**
   Learn how the mobile app and server share code using a central package, and how data is verified using "Zod."
5. 🔄 **[[05_Step_by_Step_Workflows]]**
   See exactly what happens line-by-line when a user logs in, and what happens when they swipe an email to archive it.
6. 🐳 **[[06_Docker_Setup]]**
   Learn how to run the backend API server inside a Docker container, how port mapping works, and how to manage your local Node.js environment.

---

> [!TIP]
> **Getting Started Tip:** 
> Don't try to memorize the code. Instead, focus on understanding the **flow of data**—where it starts (a user's swipe), where it goes (the local database and then the server), and what happens as a result.
