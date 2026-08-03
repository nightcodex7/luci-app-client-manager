# luci-app-client-manager

[![OpenWrt Version](https://img.shields.io/badge/OpenWrt-21.02%20%7C%2022.03%20%7C%2023.05%20%7C%2024.10%20%7C%2025.12%2B-blue.svg)](https://openwrt.org)
[![Backend](https://img.shields.io/badge/Backend-POSIX%20Shell-green.svg)](https://www.gnu.org/software/bash/)
[![Dependencies](https://img.shields.io/badge/Dependencies-Zero%20External%20Runtimes-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](Makefile)
[![Status](https://img.shields.io/badge/Production-Ready-success.svg)]()

Centralized, high-performance client management application for OpenWrt routers. Monitor connected devices, organize custom metadata, control Wi-Fi access, block internet connectivity, track bandwidth usage, and view connection history.

---

## 🌟 Key Features

- 📱 **Unified Device Dashboard**: Merges DHCP leases (`/tmp/dhcp.leases`), ARP table (`/proc/net/arp`), neighbor table (`ip neighbor`), and wireless associations into a single responsive table.
- 🌐 **Dual IPv4 & IPv6 Support**: Automatically detects and displays both IPv4 and IPv6 addresses for connected devices.
- ⚡ **Interactive Column Filtering**:
  - **IP Filter**: Toggle between **IP Address (v4 & v6)**, **IPv4 Only**, and **IPv6 Only**.
  - **Interface Filter**: Filter by **Wireless Only**, **Wired Only**, or specific interfaces (`br-lan`, `wlan0`, `br-guest`, etc.).
  - **Lease Filter**: Filter by **Static Only** or **Dynamic Only**.
  - **Status Filter**: Filter by **Online / Allowed** or **Blocked Only**.
- 📶 **Multi-Engine Wireless Monitoring**: Queries `iwinfo`, `hostapd` ubus daemons, and Linux kernel `iw` station dump to guarantee signal strength (`dBm`) and wireless interface detection across all OpenWrt Wi-Fi hardware.
- 🏷️ **Custom Metadata Management**: Assign custom display names, owners, notes, and icons (Laptop, Phone, TV, Desktop, Tablet, IoT, Printer, Camera, Gaming, Server).
- 📶 **Wi-Fi Access Control**: Per-device MAC filtering across wireless radios using native OpenWrt UCI wireless settings.
- 🛡️ **One-Click Firewall Blocking**: Instantly block or allow internet access per client using OpenWrt `fw4` UCI firewall rules.
- 📊 **Bandwidth Consumption Tracking**: Real-time upload and download byte counters via `conntrack`.
- 📈 **Traffic Statistics Integration**: Visual daily and monthly bandwidth reports powered by `vnstat` / `vnstat2`.
- 📜 **Live Connection History**: Real-time DHCP join and leave event log powered by a lightweight `dnsmasq` hook.
- 👥 **Client Grouping**: Categorize clients into groups with bulk access management.

---

## ⚡ Quick Installation

### Method 1: CLI One-Liner (Recommended via SSH)

Connect to your router via SSH and run:

```bash
wget -qO- https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/install.sh | sh
```

*(Or using curl if `wget` is not installed)*:

```bash
curl -sL https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/install.sh | sh
```

> **Note:** The installer automatically detects whether your system uses **`apk`** (OpenWrt 25.12+) or **`opkg`** (OpenWrt 24.10 and earlier) and installs missing system dependencies (`conntrack`) cleanly.

---

## 📦 Alternative Installation Methods

### Method 2: LuCI Web GUI Installation

If you prefer installing via the router's web interface:

1. Download the package file from the [Releases](https://github.com/nightcodex7/luci-app-client-manager/releases) page:
   - For **OpenWrt 24.10 and earlier**: Download `luci-app-client-manager_0.1.0-1_all.ipk`
   - For **OpenWrt 25.12 and newer**: Download `luci-app-client-manager-0.1.0-r1.apk`
2. Open your router's LuCI Web Interface (`http://192.168.1.1`).
3. Navigate to **System ➔ Software**.
4. Click **Upload Package...**.
5. Select the downloaded `.ipk` or `.apk` file and click **Upload**.
6. Click **Install**.
7. Refresh your browser page. **Clients** menu will now appear in the top navigation bar.

---

### Method 3: Command Line Package Installation (OPKG & APK)

#### OPKG (OpenWrt 24.10 and earlier)
```bash
opkg update
opkg install luci-app-client-manager_0.1.0-1_all.ipk
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
```

#### APK (OpenWrt 25.12 and newer)
```bash
apk --update-cache add luci-app-client-manager-0.1.0-r1.apk
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
```

---

### Method 4: Manual Installation from Source (Git Clone)

```bash
# 1. Clone repository
git clone https://github.com/nightcodex7/luci-app-client-manager.git
cd luci-app-client-manager

# 2. Copy files to your router via SCP
scp -r root/* root@192.168.1.1:/
scp -r htdocs/* root@192.168.1.1:/www/

# 3. Set executable permissions and run initial configuration via SSH
ssh root@192.168.1.1 "chmod +x /usr/libexec/rpcd/luci.clientmanager /usr/libexec/clientmanager-dhcp-hook /etc/uci-defaults/luci-app-client-manager && /etc/uci-defaults/luci-app-client-manager"

# 4. Flush LuCI cache and restart services
ssh root@192.168.1.1 "rm -f /tmp/luci-indexcache /tmp/luci-modulecache* && /etc/init.d/rpcd restart && sleep 1 && /etc/init.d/uhttpd restart"
```

---

### Method 5: Building Package from Source (OpenWrt SDK)

To build `.ipk` or `.apk` packages using the OpenWrt SDK or Image Builder:

```bash
# Add package to your OpenWrt SDK package directory
git clone https://github.com/nightcodex7/luci-app-client-manager.git package/luci-app-client-manager

# Select package in menuconfig
make menuconfig
# LuCI -> 3. Applications -> luci-app-client-manager

# Compile package
make package/luci-app-client-manager/compile
```

---

## 🗑️ Quick Uninstallation

To completely remove the application, clean configuration hooks, and clear system caches:

```bash
wget -qO- https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/uninstall.sh | sh
```

---

## ⚙️ Technology & Zero-Dependency Architecture

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Vanilla JS (ES6) | Client-side LuCI JavaScript views (`/www/luci-static/resources/view/clientmanager/`) |
| **Backend** | Pure POSIX Shell | `/usr/libexec/rpcd/luci.clientmanager` (Zero Lua/Python overhead) |
| **ACL Security** | `rpcd` ACL | Access control definitions (`/usr/share/rpcd/acl.d/luci-app-client-manager.json`) |
| **Menu Registration** | LuCI Menu JSON | Sub-menu mapping (`/usr/share/luci/menu.d/luci-app-client-manager.json`) |
| **Storage** | OpenWrt UCI | Central configuration saved in `/etc/config/clientmanager` |
| **Data Sources** | POSIX / ubus | `ubus` (`iwinfo`, `hostapd`), `iw`, `/proc/net/arp`, `ip neighbor`, `/tmp/dhcp.leases`, `conntrack` |

---

## 📋 System Requirements & Compatibility

- **Supported Firmware**: OpenWrt 21.02, 22.03, 23.05, 24.10, 25.12+ (and derivative builds like ImmortalWrt).
- **Package Managers**: Fully compatible with both **`opkg`** and **`apk`**.
- **Architecture**: Architecture independent (`LUCI_PKGARCH:=all`).
- **Dependencies**: `luci-base`, `rpcd`, `rpcd-mod-luci`, `conntrack` *(Optional: `vnstat` / `vnstat2` for bandwidth statistics)*.

---

## 📄 UCI Configuration Reference

User-defined device metadata, notes, custom icons, and group definitions are cleanly stored in `/etc/config/clientmanager`:

```text
config client
	option mac 'AA:BB:CC:DD:EE:FF'
	option name 'Living Room TV'
	option owner 'Alice'
	option icon 'tv'
	option notes 'Connected via Ethernet'
	list groups 'media'

config group
	option id 'media'
	option name 'Streaming Media'
	option description 'Smart TVs and Streaming Devices'
	option block_internet '0'
```

---

## 📂 Project Directory Layout

```text
luci-app-client-manager/
├── Makefile
├── README.md
├── DEVELOPMENT.md
├── install.sh
├── uninstall.sh
├── root/
│   ├── etc/
│   │   ├── config/
│   │   │   └── clientmanager
│   │   └── uci-defaults/
│   │       └── luci-app-client-manager
│   └── usr/
│       ├── libexec/
│       │   ├── clientmanager-dhcp-hook
│       │   └── rpcd/
│       │       └── luci.clientmanager
│       └── share/
│           ├── luci/
│           │   └── menu.d/
│           │       └── luci-app-client-manager.json
│           └── rpcd/
│               └── acl.d/
│                   └── luci-app-client-manager.json
└── htdocs/
    └── luci-static/
        └── resources/
            └── view/
                └── clientmanager/
                    ├── bandwidth.js
                    ├── dashboard.js
                    ├── details.js
                    ├── firewall.js
                    ├── groups.js
                    ├── history.js
                    ├── statistics.js
                    └── wifi.js
```

---

## 📜 License

This project is open-source and licensed under the **Apache License 2.0**.
