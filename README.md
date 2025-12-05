# Rogue Netrunner (Cyberpunk 2077 Stream Integration)

**Rogue Netrunner** is an interactive mod ecosystem for Cyberpunk 2077 that allows stream viewers (Twitch, YouTube, DonationAlerts) to hack the streamer's game in real-time.

This repository contains the source code for the **Companion Desktop Application** (Electron).

---

## 🚀 Features

*   **Multi-Platform Support:**
    *   **DonationAlerts:** Triggers events based on donation amount or message keywords.
    *   **Twitch:** Listens to Chat Commands and Channel Points (via keywords).
    *   **YouTube:** Monitors Live Chat and SuperChats.
*   **Game Integration:**
    *   Hostile Hacks: Overheat, Blindness, Weapon Glitch, EMP.
    *   Support Buffs: Infinite Ammo, God Mode, Speed Boost.
    *   World Events: Spawn Police (Wanted Level), Random Encounters.
*   **Configurable Logic:**
    *   Rule Editor: Map specific amounts or words to game commands.
    *   Queue System: Events can trigger sequentially or chaotically.

---

## 🛠️ Technical Overview (How it works)

This application acts as a bridge between streaming APIs and the Cyberpunk 2077 engine.

1.  **Input:** The app connects to public APIs/WebSockets (Twitch, YouTube, DonationAlerts) using standard libraries:
    *   `socket.io-client` (DonationAlerts)
    *   `tmi.js` (Twitch Chat)
    *   `youtube-chat` (YouTube Live)
2.  **Processing:** When a trigger condition is met (e.g., specific donation amount), the app generates a command string (e.g., `hack:overheat:2`).
3.  **Output:** The app appends this command string to a local text file (`cmd.txt`) located inside the game's mod directory.
4.  **Game Execution:** The Lua mod (running inside Cyber Engine Tweaks) reads this file, executes the function, and clears the file.

**Security Note:** This application does **not** inject code into the game process memory and does **not** modify system files. It relies entirely on local file I/O communication with the game mod.

---

## 📦 Build Instructions

If you want to build the executable yourself from the source code:

### Prerequisites
*   Node.js (v20 or v22 LTS recommended)
*   NPM or PNPM

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/RevengerNick/donation-alerts-cyber.git
    cd donation-alerts-cyber
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run in Developer Mode:**
    ```bash
    npm start
    ```

4.  **Build Executable (Windows):**
    This project uses **Electron Forge** to package the application.
    ```bash
    npm run make
    ```
    The output `.exe` will be located in the `out/make/squirrel.windows/x64/` directory.

---

## 📁 Project Structure

*   `src/` - Application source code.
    *   `main.js` - Electron main process (window creation, IPC handling).
    *   `renderer.js` - UI logic (frontend).
    *   `game_connector.js` - API connections and file I/O logic.
    *   `config_manager.js` - Settings management (saving/loading `config.json`).
    *   `license_manager.js` - License verification logic.

---

## 📄 License

This project is proprietary. The source code is provided for transparency and security verification purposes.
Unauthorized redistribution or commercial use of the compiled application is prohibited without the author's permission.

---

**Created by RevengerNick**