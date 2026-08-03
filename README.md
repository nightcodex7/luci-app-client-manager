# luci-app-client-manager

[![OpenWrt Version](https://img.shields.io/badge/OpenWrt-21.02%20to%2025.12%2B-blue.svg)](https://openwrt.org)
[![Backend](https://img.shields.io/badge/Backend-POSIX%20Shell-green.svg)](https://www.gnu.org/software/bash/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](Makefile)

`luci-app-client-manager` is a LuCI application for OpenWrt routers to discover, identify, monitor, and manage devices on your local network. It aggregates data from DHCP leases, ARP entries, IPv6 neighbor tables, and wireless association lists to present a single, responsive device management dashboard.

---

## Features

- **Device Dashboard**: Consolidates DHCP leases (`/tmp/dhcp.leases`), ARP table (`/proc/net/arp`), neighbor table (`ip neighbor`), and wireless associations into a unified device list.
- **Dual-Stack IPv4 & IPv6**: Automatically discovers and displays both IPv4 and IPv6 addresses per device.
- **Column Filtering & Sorting**:
  - Filter by IP type (IPv4 / IPv6 / Both).
  - Filter by Interface (Wired / Wireless / Specific SSIDs & Radios).
  - Filter by Lease type (Static / Dynamic).
  - Filter by Status (Online / Blocked).
  - Sorts connected devices to the top, ordered numerically by IP address.
- **Multi-Engine Wireless Detection**: Combines queries from `ubus iwinfo`, `hostapd` ubus daemons, and `iw station dump` to report signal levels (`dBm`), radio bands (2.4GHz, 5GHz, 6GHz), and SSIDs across various Wi-Fi chipsets.
- **Custom Client Metadata**: Set custom names, owners, notes, and icons (Laptop, Phone, TV, Desktop, Tablet, IoT, Printer, Camera, Gaming, Server).
- **Wi-Fi Access Control**: Toggle per-device MAC filtering on wireless interfaces directly via UCI wireless settings.
- **Firewall Blocking**: Block or unblock internet access per device using OpenWrt `fw4` UCI firewall rules.
- **Bandwidth Monitoring**: Track real-time upload and download byte counters using `conntrack`.
- **Traffic Statistics**: Daily and monthly historical traffic reports integrated with `vnstat` / `vnstat2`.
- **Live Connection Log**: Real-time DHCP join/leave event tracking via a lightweight `dnsmasq` script hook.
- **Device Grouping**: Categorize clients into groups for batch network management.

---

## Installation

### Method 1: SSH One-Liner (Recommended)

Connect to your OpenWrt router via SSH and run:

```bash
wget -qO- https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/install.sh | sh
```

*(Or using curl)*:

```bash
curl -sL https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/install.sh | sh
```

> The script automatically detects whether your system uses `apk` (OpenWrt 25.12+) or `opkg` (OpenWrt 24.10 and earlier) and handles dependencies accordingly.

---

## Installation Methods

### Method 2: Web GUI Installation

1. Download the latest package file from [Releases](https://github.com/nightcodex7/luci-app-client-manager/releases):
   - For **OpenWrt 24.10 and earlier**: Download `luci-app-client-manager_0.1.0-1_all.ipk`
   - For **OpenWrt 25.12 and newer**: Download `luci-app-client-manager-0.1.0-r1.apk`
2. Open LuCI Web Interface (`http://192.168.1.1`).
3. Go to **System ➔ Software**.
4. Click **Upload Package...**.
5. Select the downloaded `.ipk` or `.apk` file and click **Upload**.
6. Click **Install**.
7. Refresh your browser page to see the **Clients** menu in the top bar.

---

### Method 3: Manual Command Line Package Installation

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

### Method 4: Manual Installation from Source

```bash
# Clone repository
git clone https://github.com/nightcodex7/luci-app-client-manager.git
cd luci-app-client-manager

# Copy files to router via SCP
scp -r root/* root@192.168.1.1:/
scp -r htdocs/* root@192.168.1.1:/www/

# Set permissions and run initial setup
ssh root@192.168.1.1 "chmod +x /usr/libexec/rpcd/luci.clientmanager /usr/libexec/clientmanager-dhcp-hook /etc/uci-defaults/luci-app-client-manager && /etc/uci-defaults/luci-app-client-manager"

# Clear LuCI cache and restart services
ssh root@192.168.1.1 "rm -f /tmp/luci-indexcache /tmp/luci-modulecache* && /etc/init.d/rpcd restart && sleep 1 && /etc/init.d/uhttpd restart"
```

---

### Method 5: OpenWrt SDK / ImageBuilder Build

To include the package in a custom build:

```bash
# Clone into SDK package directory
git clone https://github.com/nightcodex7/luci-app-client-manager.git package/luci-app-client-manager

# Select in menuconfig
make menuconfig
# LuCI -> 3. Applications -> luci-app-client-manager

# Compile package
make package/luci-app-client-manager/compile
```

---

## Uninstallation

To remove the application, configuration hooks, and clear LuCI caches:

```bash
wget -qO- https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/uninstall.sh | sh
```

---

## Architecture

| Component | Technology | Role |
|---|---|---|
| **Frontend** | Vanilla JS (ES6) | Client-side views (`/www/luci-static/resources/view/clientmanager/`) |
| **Backend** | POSIX Shell | `/usr/libexec/rpcd/luci.clientmanager` (RPC provider for `rpcd`) |
| **ACL Security** | `rpcd` ACL | Access control rules (`/usr/share/rpcd/acl.d/luci-app-client-manager.json`) |
| **Menu Registration** | LuCI Menu JSON | Navigation entry (`/usr/share/luci/menu.d/luci-app-client-manager.json`) |
| **Storage** | OpenWrt UCI | Persistent metadata stored in `/etc/config/clientmanager` |
| **Data Sources** | System Utilities | `ubus` (`iwinfo`, `hostapd`), `iw`, `/proc/net/arp`, `ip neighbor`, `/tmp/dhcp.leases`, `conntrack` |

---

## Compatibility

- **OpenWrt Versions**: OpenWrt 21.02, 22.03, 23.05, 24.10, 25.12+ (and derivative firmwares like ImmortalWrt).
- **Package Managers**: Works with both `opkg` and `apk`.
- **Architectures**: All architectures (`LUCI_PKGARCH:=all`).
- **Dependencies**: `luci-base`, `rpcd`, `rpcd-mod-luci`, `conntrack` *(Optional: `vnstat` / `vnstat2` for historical traffic graphs)*.

---

## UCI Configuration

Custom device metadata, notes, icons, and group definitions are saved in `/etc/config/clientmanager`:

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

## Project Structure

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

## License

This project is licensed under the **Apache License 2.0**.
