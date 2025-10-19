# BPSR Meter (English Version)

BPSR Meter is a desktop application that acts as a real-time DPS (Damage Per Second) meter for the game. It overlays the game window to provide detailed combat statistics without interrupting your gameplay.

![DPS Meter in action](medidor.png)

## Features

1.  **Player Name:** Your identifier in the meter.
2.  **Current/Max Health:** A visual health bar.
3.  **DPS (Damage Per Second):** Damage dealt per second.
4.  **HPS (Healing Per Second):** Healing done per second.
5.  **DT (Damage Taken):** Total damage received during combat.
6.  **Contribution %:** Your percentage of the group's total damage.
7.  **CRIT ✸:** Your critical hit rate percentage.
8.  **LUCK ☘:** Your lucky hit rate percentage.
9.  **MAX ⚔ (Max DPS):** Your highest damage-per-second peak.
10. **GS (Gear Score):** A score based on your equipment and skills.
11. **🔥 (Total Damage):** Total accumulated damage in the encounter.
12. **⛨ (Total Healing):** Total accumulated healing in the encounter.

---
> ### Responsible Use
> This tool is designed to help you improve your own performance. **Please do not use it to degrade, harass, or discriminate against other players.** The goal is self-improvement and enjoying the game as a community.

## Installation

1.  **Install Npcap:** The application requires Npcap to capture the game's network traffic. If you don't have it installed, go to the "Releases" section of this GitHub repository and download the latest version of the installer (`npcap-1.83.exe`).
2.  **Download the installer:** Go to the "Releases" section of this GitHub repository and download the latest version of the installer (`BPSR Meter Setup X.X.X.exe`).
3.  **Run the installer:** Execute the downloaded `.exe` file and follow the instructions to install the application on your computer.


---

## How to Use

### Video Tutorial
For a visual guide on how to install and set up the meter, you can watch the following video:

[![YouTube Video Tutorial](PORTADA2.jpg)](https://youtu.be/QvGLjNvhKsw)

---

## Usage

Once installed, you can launch the application from the Start Menu or the desktop shortcut.

The application will open as an overlay window. When you start the game, it will automatically begin detecting traffic and displaying combat stats.

### Controls

| ![Imagen DPS](Advanced.png) | ![Imagen DPS](DPS.png) | ![Imagen Sanador](Lite.png) |
| :---: |:---:| :---:|

- **Drag:** Click and drag the arrow indicator to move the window.
- **Lock/Unlock:** Click the lock button to lock or unlock the window's position. When locked, the window will ignore mouse clicks.
- **Zoom:** Use the `+` and `-` buttons to increase or decrease the interface size.
- **Close:** Click the `X` button to close the application.

## Troubleshooting

If the application isn't working correctly, check the `iniciar_log.txt` log file located in the application's data directory. To find this directory, you can search for `%APPDATA%/bpsr-meter` in Windows. You can send me the errors on Discord or get in touch, and I'll try to resolve it.

## Frequently Asked Questions (FAQ)

**Is using this meter a bannable offense?**
> It operates in a "gray area." It doesn't modify game files, inject code, or alter the game's memory. Historically, tools that only read data have an extremely low risk of being banned. However, **use it at your own risk.**

**Does it affect my game's performance (FPS)?**
> No. The impact is virtually zero, as packet capturing is a passive and very lightweight process.

**Why does it need to run as an administrator?**
> To allow the Npcap library to have low-level access to network adapters and monitor the game's packets.

**The meter isn't showing any data. What should I do?**
> 1. Make sure the game is running **before** you launch the meter.
> 2. Confirm that you ran the meter **as an administrator**.
> 3. Check that your firewall or antivirus isn't blocking it.
> 4. If you have multiple network connections (Ethernet, Wi-Fi, VPN), the meter might be listening on the wrong one.

**Can the meter be hidden?**
> Yes, you can hide it by clicking its icon in the taskbar.

**Can more data be hidden?**
> Yes, there are now "Advanced" and "Lite" buttons that allow you to switch between the extended and simplified versions.

**Does it work with other games?**
> No. It's specifically designed to decode the network packets for this game.

**Does it work on the Chinese server?**
> Yes, it works correctly on the Chinese server.

**Is there a version for healers?**
> Yes, when in "Lite" mode, a button will appear on the side that allows you to switch between the DPS and Healer versions. You can now optimize your rotations and see your healing per second (HPS) and total contribution.

---

## Social Media

[![Twitch](https://img.shields.io/badge/Twitch-9146FF?style=for-the-badge&logo=twitch&logoColor=white)](https://www.twitch.tv/mrsnakevt)
[![Kick](https://img.shields.io/badge/Kick-50FF78?style=for-the-badge&logo=kick&logoColor=white)](https://kick.com/mrsnakevt)
[![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/@MrSnake_VT)
[![X (Twitter)](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/MrSnakeVT)
