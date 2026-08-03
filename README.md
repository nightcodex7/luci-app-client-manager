# luci-app-client-manager

Central management interface for all connected clients on OpenWrt.

## Overview

**luci-app-client-manager** provides a single place to view, search, and manage every device connected to your OpenWrt router. It integrates natively with LuCI and the OpenWrt ecosystem.

## Features (Planned)

- **Client Discovery** — Automatic detection via DHCP leases and ARP table
- **Device Details** — Hostname, IP, MAC, vendor, connection type, signal strength
- **Custom Metadata** — Assign names, owners, notes, and icons to devices
- **WiFi Access Control** — Per-device MAC filtering across all SSIDs via UCI
- **Firewall Policies** — Block internet, rate limit, or restrict ports per device
- **Bandwidth Monitoring** — Per-device upload/download tracking
- **Device Groups** — Organize devices and apply group-level policies
- **Connection History** — Track when devices connect and disconnect
- **Statistics** — Historical traffic graphs via collectd/vnstat

## Requirements

- OpenWrt 23.05 or later
- LuCI (luci-base)
- rpcd

## Installation

```bash
# From local build
opkg install luci-app-client-manager_0.1.0-1_all.ipk

# Restart rpcd to load the backend
/etc/init.d/rpcd restart
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend  | LuCI JavaScript (ES6) |
| Backend   | rpcd Lua plugin |
| Config    | UCI (`/etc/config/clientmanager`) |
| Live Data | ubus |
| Firewall  | fw4 (UCI) |
| Wireless  | hostapd via UCI |
| DHCP      | dnsmasq |
| Stats     | collectd, vnstat |

## Project Structure

```
luci-app-client-manager/
├── htdocs/luci-static/resources/view/clientmanager/   # Frontend JS views
├── root/usr/libexec/rpcd/                             # rpcd backend plugin
├── root/usr/share/luci/menu.d/                        # LuCI menu registration
├── root/usr/share/rpcd/acl.d/                         # RPC ACL permissions
├── root/etc/config/                                   # UCI config
├── po/                                                # Translations
├── Makefile                                           # OpenWrt package build
└── README.md
```

## License

Apache-2.0
