# 🇱🇰 LankaCast - Sri Lankan News Extension

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
![Manifest](https://img.shields.io/badge/Manifest-V3-success.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)

> **The ONE AND ONLY browser extension delivering both Sinhala and English news from Sri Lanka directly to your toolbar.**

**LankaCast** is a unique, lightweight Chrome Extension designed for Sri Lankans. It fetches real-time news from **Ada Derana** and keeps you connected with what's happening in the island. It features automatic background updates, smart keyword alerts, dark mode, and one-click WhatsApp sharing.

---

## 📥 Download
Since this is a developer preview, you can download the latest version directly from Google Drive:

[![Download ZIP](https://img.shields.io/badge/Download-Google_Drive-FFD04B?style=for-the-badge&logo=google-drive&logoColor=black)](https://drive.google.com/drive/folders/15PSvn_ayfUBqu-Sr84MCvvwNH_AvtKyt?usp=sharing)

**[📂 Click Here to Access the Project Files](https://drive.google.com/drive/folders/15PSvn_ayfUBqu-Sr84MCvvwNH_AvtKyt?usp=sharing)**

---

## 📸 Screenshots

| **Sinhala Feed** | **English Feed** | **Settings & Alerts** |
|:---:|:---:|:---:|
| ![Sinhala View](images/SS/lightSinhala.png) | ![English View](images/SS/darkEnglish.png) | ![Alerts Tab](images/SS/darkAlert.png) |

| **WhatsApp Sharing** | **Extension Installed** |
|:---:|:---:|
| ![WhatsApp Share](images/SS/WhatsappShare.png) | ![Pinned to Toolbar](images/SS/extensionDashboard.png) |

---

## ✨ Unique Features

* **📰 Dual-Language Hub:** Seamlessly switch between **Sinhala** and **English** news feeds in one popup.
* **⚡ Auto-Refresh:** Background service workers fetch updates every minute to keep you current.
* **🔔 Smart Alerts:** Set custom keywords (e.g., "Cricket", "Election") to receive instant notifications when they appear in the news, even if popup notifications are turned off.
* **🌙 Dark Mode:** Fully optimized dark theme that syncs with your preferences.
* **📲 Quick Share:** Share any news item directly to **WhatsApp** with a single click.
* **🛡️ Reliability:** Built on Manifest V3 for better performance and battery life.

---

## 🚀 Installation Guide (For Beginners)

Since this extension is in "Developer Mode" (not yet on the Chrome Web Store), follow these simple steps to install it:

### **Step 1: Download & Prepare**
1.  Click the **Download** link above.
2.  Download the files (if it's a ZIP file, right-click and select **Extract All** or **Unzip**).
3.  Save the folder somewhere safe (e.g., `Documents/LankaCast`).

### **Step 2: Open Chrome Extensions**
1.  Open Google Chrome.
2.  In the address bar, type `chrome://extensions` and press **Enter**.
3.  **Enable Developer Mode**: Look for a toggle switch in the **top-right corner** and turn it **ON** (Blue).

### **Step 3: Load the Extension**
1.  Click the button that says **"Load unpacked"** (top-left).
2.  Select the **LankaCast folder** you extracted in Step 1 (make sure you select the folder that contains `manifest.json`).
3.  🎉 **Success!** You should now see the **LankaCast** icon (Lion Flag) in your browser toolbar.

> **Tip:** Click the "Puzzle Piece" icon 🧩 in Chrome and **Pin** 📌 LankaCast to keep it visible!

---

## 📖 How to Use

### 1. Reading News
* Click the extension icon to open the popup.
* Use the bottom navigation bar to switch between **Sinhala** and **English** tabs.
* Click any news card to read the full story on the official website.

### 2. Setting Keyword Alerts
* Go to the **Alerts** tab.
* Type a keyword (e.g., `Cricket`) in the input box and click **Add**.
* You will now receive a system notification whenever a news title matches that keyword.

### 3. Dark Mode
* Click the **Sun/Moon Icon** in the top header to toggle between Light and Dark modes instantly.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Native CSS Variables)
* **Logic:** JavaScript (ES6+, Async/Await)
* **Platform:** Chrome Extension Manifest V3
* **Storage:** `chrome.storage.local` for settings and history
* **APIs:** Ada Derana RSS Feeds & Google Analytics 4

---

## 📂 Project Structure

```text
LankaCast/
├── manifest.json       # Extension configuration (Permissions, V3)
├── popup.html          # Main UI structure
├── popup.css           # Styling
├── popup.js            # UI logic & Data rendering
├── background.js       # Background fetcher & Notification logic
├── README.md           # Documentation
└── images/             # Icons
```
## 👨‍💻 Developer
### Developed with ❤️ by *SadeshRaj*.
## 📜 License
### This project is open-source and available under the MIT License.