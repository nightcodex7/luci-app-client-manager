# Development Log — luci-app-client-manager

---

## Milestone 1 — Project Skeleton

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- OpenWrt package Makefile (luci.mk based)
- Project README with full documentation
- Development log initialized

### Files Created
| File | Purpose |
|------|---------|
| `Makefile` | OpenWrt package build definition |
| `README.md` | Project documentation |
| `DEVELOPMENT.md` | Engineering log (this file) |

---

## Milestone 2 — Menu Entry

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Top-level "Clients" menu entry in LuCI sidebar
- Dashboard sub-page route registered
- ACL dependency configured

### Files Created
| File | Purpose |
|------|---------|
| `root/usr/share/luci/menu.d/luci-app-client-manager.json` | LuCI menu registration |

---

## Milestone 3 — Blank Dashboard

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Dashboard JS view renders inside LuCI chrome

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/dashboard.js` | Main dashboard view |

---

## Milestone 4 — RPC Backend

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- rpcd Lua exec plugin with full method set
- ACL file for authenticated access
- `getStatus` returns version info

### Files Created
| File | Purpose |
|------|---------|
| `root/usr/libexec/rpcd/clientmanager` | rpcd Lua backend |
| `root/usr/share/rpcd/acl.d/luci-app-client-manager.json` | RPC ACL permissions |

---

## Milestone 5 — DHCP Discovery

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- `getClients` merges DHCP leases + ARP table + wireless assoclist
- Unified client list sorted by IP

---

## Milestone 6 — Client List UI

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Sortable client table with hostname, IP, MAC, interface, signal, lease, status
- Device icons (emoji-based)
- Blocked status indicator from firewall rules
- Auto-polling every 30 seconds

---

## Milestone 7 — Search & Filter

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Instant search bar above client table
- Filters by hostname, IP, MAC, owner
- Case-insensitive, client-side filtering

---

## Milestone 8 — Device Details

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Detail page with device info table (MAC, IP, hostname, connection type, signal)
- Back button to client list
- Internet access status display

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/details.js` | Device detail view |

---

## Milestone 9 — Metadata Storage

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- UCI config file `/etc/config/clientmanager`
- `setClientMeta` / `getClientMeta` RPC methods
- Editable name, owner, notes, icon per device
- Custom names shown in client list
- uci-defaults script for first install

### Files Created
| File | Purpose |
|------|---------|
| `root/etc/config/clientmanager` | UCI config |
| `root/etc/uci-defaults/luci-app-client-manager` | First-install setup |

---

## Milestone 10 — WiFi Access

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Lists all radios and SSIDs from /etc/config/wireless
- Checkboxes per SSID to add/remove MAC from macfilter list
- Uses `uci add_list`/`uci del_list`, `uci commit wireless`, `wifi reload`
- Never edits hostapd files directly

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/wifi.js` | WiFi access control view |

---

## Milestone 11 — Firewall Policies

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Block/unblock internet per device
- Uses UCI firewall rules (fw4 compatible)
- Rules prefixed with `cm_` for identification
- Block/unblock from both firewall page and device detail page

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/firewall.js` | Firewall policies view |

---

## Milestone 12 — Bandwidth Monitoring

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Per-device bandwidth from conntrack
- Maps IPs to device names
- Auto-refresh every 15 seconds
- Manual refresh button

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/bandwidth.js` | Bandwidth monitor view |

---

## Milestone 13 — Device Groups

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Create / delete groups
- Group CRUD stored in UCI
- Assign devices to groups from device detail page
- Member listing with device names

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/groups.js` | Device groups view |

---

## Milestone 14 — Connection History

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- DHCP hook script captures connect/disconnect events
- History stored as JSON in /tmp
- Filterable event log
- Relative timestamps with full date tooltip

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/history.js` | History view |
| `root/usr/libexec/clientmanager-dhcp-hook` | DHCP event hook |

---

## Milestone 15 — Statistics

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- vnstat JSON integration
- Bar charts (pure CSS/JS, no external libraries)
- Daily and monthly traffic tables
- Graceful degradation with install instructions when vnstat absent

### Files Created
| File | Purpose |
|------|---------|
| `htdocs/luci-static/resources/view/clientmanager/statistics.js` | Statistics view |

---

## Milestone 16 — Device Icons

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- Emoji-based icons (phone, laptop, desktop, tablet, TV, IoT, printer, camera, gaming, server)
- Auto-detect wireless vs wired
- Manual icon picker in device detail page
- Icons displayed in client list

---

## Milestone 17 — Polish & Finalization

**Status**: ✅ Complete
**Date**: 2026-08-03

### Completed Features
- English translation file (PO)
- All menu entries registered
- Device Details hidden from sidebar (accessed via row click)
- Error handling on RPC calls
- Complete documentation in README

### Files Created
| File | Purpose |
|------|---------|
| `po/en/clientmanager.po` | English translations |

---

## Final Project Structure

```
luci-app-client-manager/
├── htdocs/luci-static/resources/view/clientmanager/
│   ├── dashboard.js       # Main client list with search
│   ├── details.js         # Device detail + metadata editor
│   ├── wifi.js            # WiFi MAC filter management
│   ├── firewall.js        # Per-device firewall rules
│   ├── bandwidth.js       # Bandwidth monitor
│   ├── groups.js          # Device groups CRUD
│   ├── history.js         # Connection history log
│   └── statistics.js      # vnstat traffic graphs
├── root/
│   ├── etc/
│   │   ├── config/clientmanager
│   │   └── uci-defaults/luci-app-client-manager
│   └── usr/
│       ├── libexec/
│       │   ├── rpcd/clientmanager
│       │   └── clientmanager-dhcp-hook
│       └── share/
│           ├── luci/menu.d/luci-app-client-manager.json
│           └── rpcd/acl.d/luci-app-client-manager.json
├── po/en/clientmanager.po
├── Makefile
├── README.md
└── DEVELOPMENT.md
```

## All Milestones Complete ✅

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Project Skeleton | ✅ |
| 2 | Menu Entry | ✅ |
| 3 | Blank Dashboard | ✅ |
| 4 | RPC Backend | ✅ |
| 5 | DHCP Discovery | ✅ |
| 6 | Client List UI | ✅ |
| 7 | Search & Filter | ✅ |
| 8 | Device Details | ✅ |
| 9 | Metadata Storage | ✅ |
| 10 | WiFi Access | ✅ |
| 11 | Firewall Policies | ✅ |
| 12 | Bandwidth | ✅ |
| 13 | Groups | ✅ |
| 14 | History | ✅ |
| 15 | Statistics | ✅ |
| 16 | Icons | ✅ |
| 17 | Polish | ✅ |
