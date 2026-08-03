#!/bin/sh
# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org>

echo "=================================================="
echo " Uninstalling luci-app-client-manager"
echo "=================================================="

echo "[1/3] Removing application files..."
rm -f /etc/config/clientmanager
rm -f /etc/uci-defaults/luci-app-client-manager
rm -f /usr/libexec/clientmanager-dhcp-hook
rm -f /usr/libexec/rpcd/clientmanager
rm -f /usr/libexec/rpcd/luci.clientmanager
rm -f /usr/share/luci/menu.d/luci-app-client-manager.json
rm -f /usr/share/rpcd/acl.d/luci-app-client-manager.json
rm -rf /www/luci-static/resources/view/clientmanager
rm -rf /tmp/clientmanager

echo "[2/3] Cleaning dnsmasq configuration..."
CURRENT_HOOK=$(uci -q get dhcp.@dnsmasq[0].dhcpscript || true)
if [ "$CURRENT_HOOK" = "/usr/libexec/clientmanager-dhcp-hook" ]; then
	uci delete dhcp.@dnsmasq[0].dhcpscript
	uci commit dhcp
fi

echo "[3/3] Flushing LuCI cache and restarting services..."
rm -f /tmp/luci-indexcache /tmp/luci-modulecache* 2>/dev/null || true

/etc/init.d/rpcd restart 2>/dev/null || true
sleep 1
/etc/init.d/uhttpd restart 2>/dev/null || true
/etc/init.d/dnsmasq reload 2>/dev/null || /etc/init.d/dnsmasq restart 2>/dev/null || true

echo "=================================================="
echo " Uninstallation complete!"
echo "=================================================="
