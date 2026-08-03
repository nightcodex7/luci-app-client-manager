#!/bin/sh
# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org>

REPO_URL="https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main"

echo "=================================================="
if [ -f /usr/libexec/rpcd/luci.clientmanager ]; then
	echo " Updating luci-app-client-manager"
else
	echo " Installing luci-app-client-manager"
fi
echo "=================================================="

# Check for download tool
if command -v wget >/dev/null 2>&1; then
	FETCH="wget -qO"
elif command -v curl >/dev/null 2>&1; then
	FETCH="curl -sL -o"
else
	echo "Error: Neither wget nor curl is installed on this system."
	exit 1
fi

echo "[0/5] Verifying system dependencies..."
if command -v opkg >/dev/null 2>&1; then
	opkg update >/dev/null 2>&1 || true
	opkg install conntrack >/dev/null 2>&1 || true
elif command -v apk >/dev/null 2>&1; then
	apk add conntrack >/dev/null 2>&1 || true
fi

echo "[1/5] Preparing directory layout..."
mkdir -p /etc/uci-defaults
mkdir -p /usr/libexec/rpcd
mkdir -p /usr/share/luci/menu.d
mkdir -p /usr/share/rpcd/acl.d
mkdir -p /www/luci-static/resources/view/clientmanager
mkdir -p /tmp/clientmanager

# Clean up obsolete files from previous installations
rm -f /usr/libexec/rpcd/clientmanager
rm -f /usr/libexec/clientmanager-dhcp-hook
rm -f /etc/config/clientmanager
rm -f /www/luci-static/resources/view/clientmanager/history.js
rm -f /www/luci-static/resources/view/clientmanager/groups.js
rm -f /www/luci-static/resources/view/clientmanager/statistics.js

echo "[2/5] Downloading backend and configuration files..."
$FETCH /etc/uci-defaults/luci-app-client-manager "$REPO_URL/root/etc/uci-defaults/luci-app-client-manager"
$FETCH /usr/libexec/rpcd/luci.clientmanager "$REPO_URL/root/usr/libexec/rpcd/luci.clientmanager"
$FETCH /usr/share/luci/menu.d/luci-app-client-manager.json "$REPO_URL/root/usr/share/luci/menu.d/luci-app-client-manager.json"
$FETCH /usr/share/rpcd/acl.d/luci-app-client-manager.json "$REPO_URL/root/usr/share/rpcd/acl.d/luci-app-client-manager.json"

echo "[3/5] Downloading frontend views..."
for view in bandwidth dashboard details firewall wifi; do
	$FETCH "/www/luci-static/resources/view/clientmanager/${view}.js" \
		"$REPO_URL/htdocs/luci-static/resources/view/clientmanager/${view}.js"
done

echo "[4/5] Setting permissions and initial setup..."
sed -i 's/\r$//' /usr/libexec/rpcd/luci.clientmanager
sed -i 's/\r$//' /etc/uci-defaults/luci-app-client-manager

chmod +x /usr/libexec/rpcd/luci.clientmanager /etc/uci-defaults/luci-app-client-manager

if [ -f /etc/uci-defaults/luci-app-client-manager ]; then
	/etc/uci-defaults/luci-app-client-manager
fi

CURRENT_HOOK=$(uci -q get dhcp.@dnsmasq[0].dhcpscript || true)
if [ "$CURRENT_HOOK" = "/usr/libexec/clientmanager-dhcp-hook" ]; then
	uci delete dhcp.@dnsmasq[0].dhcpscript
	uci commit dhcp
	/etc/init.d/dnsmasq reload 2>/dev/null || /etc/init.d/dnsmasq restart 2>/dev/null || true
fi

echo "[5/5] Flushing LuCI cache and restarting services..."
rm -f /tmp/luci-indexcache /tmp/luci-modulecache* 2>/dev/null || true

/etc/init.d/rpcd restart 2>/dev/null || true
sleep 1
/etc/init.d/uhttpd restart 2>/dev/null || true

echo "=================================================="
echo " Installation complete!"
echo " Access Client Manager in LuCI: Clients"
echo "=================================================="
