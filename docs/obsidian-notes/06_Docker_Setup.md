# 🐳 Docker Setup & Running the Monorepo

We have added Docker support to run **both** the backend API and the mobile frontend application in containerized environments.

Here are the files at the root of your project:
- `[[Dockerfile]]`: Builds a container image running Node 20 for your backend API and shared contracts.
- `[[Dockerfile.mobile]]`: Builds a container image running Node 20 with the `@expo/ngrok` package to run your Expo mobile application.
- `[[docker-compose.yml]]`: Allows you to build and start both applications simultaneously with one command.
- `[[.dockerignore]]`: Excludes local files from the container context to keep builds fast.

---

## 📱 Running the Mobile App in Docker: Expo Tunnel Mode

Normally, running mobile apps inside Docker is tricky because:
1. **Device Emulators**: Emulators running on your host machine (Windows) cannot easily connect to local IP addresses inside Docker's virtual network.
2. **Physical Devices**: A phone on your local Wi-Fi cannot connect to Expo's local IP inside the container.

### 💡 The Solution: Expo Tunnel Mode
To solve this, we configure Expo to start with the `--tunnel` flag inside the Docker container.
- **How it works**: Expo automatically uses `ngrok` to create a secure, public HTTPS tunnel pointing directly to the Metro bundler running inside your container.
- **Scanning the QR Code**: When Docker starts, it prints a QR code in the terminal. When you scan this QR code with your phone, the request routes through the public tunnel address, bypassing all local Wi-Fi, routing, and Docker network walls! It works flawlessly regardless of your local configuration.

---

## 🛠️ Step-by-Step: How to Run the Entire App

Make sure **Docker Desktop** is open and running on your computer.

### Step 1: Start everything with Docker Compose
Open your terminal in the project root folder and run:
```powershell
docker compose up --build
```
Docker will pull down the Node 20 images, configure both packages, install all dependencies, and spin up both containers:
- **`api`** (Backend Server): Runs on `http://localhost:5080`.
- **`mobile`** (Expo Mobile App): Starts the Metro bundler, spins up the Ngrok tunnel, and prints a QR code in your terminal.

### Step 2: Open the Mobile App
1. Look at the terminal output for the `mail-tracker-mobile` container. You will see a large QR code printed.
2. Open the **Expo Go** app on your Android phone, or open the default **Camera** app on your iPhone.
3. Scan the QR code. The app will bundle and load your Mail Tracker interface directly onto your phone!

---

## 🚨 IMPORTANT: The Editor Red Lines vs Docker

As a new programmer, remember:
- **Docker runs your code in virtual containers.**
- **Your text editor (VS Code/Cursor) runs on Windows.**
- The editor does *not* read code inside the running Docker container to resolve imports. 
- However, because we successfully ran `npm install` inside the `apps/mobile/` directory earlier, your editor now has all the packages on Windows to understand the imports. Your red squiggly lines will clear up once you restart your editor or the TypeScript server, even though you are running the actual code inside Docker!

