#!/bin/sh
set -e

REPO_URL="https://raw.githubusercontent.com/nightcodex7/luci-app-client-manager/main"

echo "=================================================="
echo " Installing luci-app-client-manager"
echo "=================================================="

# Check for download tool
if command -v wget >/dev/null 2>&1; then
    FETCH="wget -qO"
elif command -v curl >/dev/null 2>&1; then
    FETCH="curl -sL -o"
else
    echo "Error: Neither wget nor curl is installed."
    exit 1
fi

echo "[1/5] Creating directory layout..."
mkdir -p /etc/config
mkdir -p /etc/uci-defaults
mkdir -p /usr/libexec/rpcd
mkdir -p /usr/share/luci/menu.d
mkdir -p /usr/share/rpcd/acl.d
mkdir -p /www/luci-static/resources/view/clientmanager

echo "[2/5] Downloading backend and configuration files..."
$FETCH /etc/config/clientmanager "$REPO_URL/root/etc/config/clientmanager"
$FETCH /etc/uci-defaults/luci-app-client-manager "$REPO_URL/root/etc/uci-defaults/luci-app-client-manager"
$FETCH /usr/libexec/clientmanager-dhcp-hook "$REPO_URL/root/usr/libexec/clientmanager-dhcp-hook"
$FETCH /usr/libexec/rpcd/clientmanager "$REPO_URL/root/usr/libexec/rpcd/clientmanager"
$FETCH /usr/share/luci/menu.d/luci-app-client-manager.json "$REPO_URL/root/usr/share/luci/menu.d/luci-app-client-manager.json"
$FETCH /usr/share/rpcd/acl.d/luci-app-client-manager.json "$REPO_URL/root/usr/share/rpcd/acl.d/luci-app-client-manager.json"

echo "[3/5] Downloading frontend views..."
for view in bandwidth dashboard details firewall groups history statistics wifi; do
    $FETCH "/www/luci-static/resources/view/clientmanager/${view}.js" \
        "$REPO_URL/htdocs/luci-static/resources/view/clientmanager/${view}.js"
done

echo "[4/5] Setting permissions and initial configuration..."
chmod +x /usr/libexec/rpcd/clientmanager /usr/libexec/clientmanager-dhcp-hook /etc/uci-defaults/luci-app-client-manager

# Run initial setup
/etc/uci-defaults/luci-app-client-manager

# Configure dnsmasq DHCP hook
uci set dhcp.@dnsmasq[0].dhcpscript='/usr/libexec/clientmanager-dhcp-hook'
uci commit dhcp

echo "[5/5] Restarting services..."
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
/etc/init.d/dnsmasq restart

echo "=================================================="
echo " Installation complete!"
echo " Access Client Manager in LuCI: Network -> Clients"
echo "=================================================="
