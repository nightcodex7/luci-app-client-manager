# luci-app-client-manager

Central management interface for all connected clients on OpenWrt routers.

## Overview

**luci-app-client-manager** is a comprehensive OpenWrt LuCI application designed for centralized device management. It merges data from DHCP leases, ARP tables, and wireless association lists into a unified interface, allowing network administrators to monitor, organize, and control connected devices.

The application adheres strictly to standard OpenWrt subsystems (UCI, fw4, dnsmasq, ubus, rpcd) without modifying system configurations or requiring invasive daemon changes.

## Features

- **Unified Client Discovery**: Combines data from DHCP leases (`/tmp/dhcp.leases`), ARP entries (`/proc/net/arp`), and wireless associations (`iwinfo`) into a single view sorted by IP address.
- **Custom Device Metadata**: Assign custom display names, device owners, notes, and device icons (Phone, Laptop, Desktop, Tablet, TV, IoT, Printer, Camera, Gaming, Server).
- **WiFi Access Control**: Per-device MAC filter control across wireless AP interfaces using native UCI wireless configuration.
- **Firewall Policies**: Block or allow internet access for individual devices using standard OpenWrt fw4 UCI firewall rules.
- **Bandwidth Monitoring**: Live per-device upload and download byte tracking powered by netfilter connection tracking (`conntrack`).
- **Device Grouping**: Organize clients into custom groups with description fields and bulk access settings.
- **Connection History**: Event-based connection and disconnection log tracked via a lightweight `dnsmasq` DHCP hook script.
- **Traffic Statistics**: Visual daily and monthly bandwidth reports integrated with `vnstat`.

## Quick Installation

Run this one-liner via SSH on your OpenWrt router:

```bash
wget -qO- https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/install.sh | sh
```

### Quick Uninstallation

To completely remove the application and restore original settings:

```bash
wget -qO- https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main/uninstall.sh | sh
```

---

## Alternative Installation Methods

### Package Manager Installation

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

### Manual Installation from Source

```bash
# 1. Copy application files to the target router
scp -r root/* root@192.168.1.1:/
scp -r htdocs/* root@192.168.1.1:/www/

# 2. Set executable permissions on backend scripts
ssh root@192.168.1.1 "chmod +x /usr/libexec/rpcd/luci.clientmanager /usr/libexec/clientmanager-dhcp-hook"

# 3. Execute installation defaults
ssh root@192.168.1.1 "/etc/uci-defaults/luci-app-client-manager"

# 4. Enable DHCP event logging in dnsmasq
ssh root@192.168.1.1 "uci set dhcp.@dnsmasq[0].dhcpscript='/usr/libexec/clientmanager-dhcp-hook' && uci commit dhcp"

# 5. Restart system services
ssh root@192.168.1.1 "/etc/init.d/rpcd restart && /etc/init.d/uhttpd restart && /etc/init.d/dnsmasq restart"
```

## Technology Stack and Architecture

| Layer | Component | Technology |
|---|---|---|
| Frontend | UI Views | Modern LuCI Client-Side JavaScript (ES6) |
| Backend | RPC Engine | `rpcd` Lua plugin (`/usr/libexec/rpcd/luci.clientmanager`) |
| Access Control | Security | `rpcd` ACL definitions (`/usr/share/rpcd/acl.d/`) |
| Metadata Store | Config | Custom UCI config file (`/etc/config/clientmanager`) |
| Data Sources | System Calls | `ubus` (`iwinfo`), `/proc/net/arp`, `/tmp/dhcp.leases`, `conntrack`, `vnstat` |
| Firewall | Filtering | OpenWrt `fw4` via UCI firewall objects (`/etc/config/firewall`) |
| Event Tracking | Hook Script | POSIX shell script called by `dnsmasq` (`/usr/libexec/clientmanager-dhcp-hook`) |

## System Compatibility

- **OpenWrt Versions**: OpenWrt 21.02, 23.05, 24.10, 25.12+
- **Package Managers**: Compatible with both **opkg** (OpenWrt 24.10 and earlier) and **apk** (OpenWrt 25.12+).
- **Architecture**: Architecture independent (`LUCI_PKGARCH:=all`).

### Package Dependencies

- `luci-base`
- `rpcd`
- `rpcd-mod-luci`
- `conntrack`
- `vnstat2` (optional, required for the Statistics view)

## Configuration

Custom metadata and group definitions are stored in `/etc/config/clientmanager`.

### UCI Configuration Example

```text
config client
	option mac 'AA:BB:CC:DD:EE:FF'
	option name 'Living Room TV'
	option owner 'John'
	option icon 'tv'
	option notes 'Connected via Ethernet'
	list groups 'media'

config group
	option id 'media'
	option name 'Streaming Media'
	option description 'Smart TVs and Streaming Sticks'
	option block_internet '0'
```

## Directory Structure

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

## License

This project is licensed under the Apache License 2.0. See the `Makefile` for licensing information.
