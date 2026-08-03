#!/bin/sh

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

echo "[0/6] Verifying system dependencies..."
# Only install conntrack — backend is pure POSIX shell, no lua needed
if command -v opkg >/dev/null 2>&1; then
    opkg update >/dev/null 2>&1 || true
    opkg install conntrack >/dev/null 2>&1 || true
elif command -v apk >/dev/null 2>&1; then
    apk add conntrack >/dev/null 2>&1 || true
fi

echo "[1/6] Preparing directory layout..."
mkdir -p /etc/config
mkdir -p /etc/uci-defaults
mkdir -p /usr/libexec/rpcd
mkdir -p /usr/share/luci/menu.d
mkdir -p /usr/share/rpcd/acl.d
mkdir -p /www/luci-static/resources/view/clientmanager
mkdir -p /tmp/clientmanager

# Clean up legacy backend script if present from older versions
rm -f /usr/libexec/rpcd/clientmanager

echo "[2/6] Downloading backend and configuration files..."
# Preserve existing user configuration (/etc/config/clientmanager) if present
if [ ! -f /etc/config/clientmanager ]; then
    $FETCH /etc/config/clientmanager "$REPO_URL/root/etc/config/clientmanager"
fi

$FETCH /etc/uci-defaults/luci-app-client-manager "$REPO_URL/root/etc/uci-defaults/luci-app-client-manager"
$FETCH /usr/libexec/clientmanager-dhcp-hook "$REPO_URL/root/usr/libexec/clientmanager-dhcp-hook"
$FETCH /usr/libexec/rpcd/luci.clientmanager "$REPO_URL/root/usr/libexec/rpcd/luci.clientmanager"
$FETCH /usr/share/luci/menu.d/luci-app-client-manager.json "$REPO_URL/root/usr/share/luci/menu.d/luci-app-client-manager.json"
$FETCH /usr/share/rpcd/acl.d/luci-app-client-manager.json "$REPO_URL/root/usr/share/rpcd/acl.d/luci-app-client-manager.json"

echo "[3/6] Downloading frontend views..."
for view in bandwidth dashboard details firewall groups history statistics wifi; do
    $FETCH "/www/luci-static/resources/view/clientmanager/${view}.js" \
        "$REPO_URL/htdocs/luci-static/resources/view/clientmanager/${view}.js"
done

echo "[4/6] Setting permissions and initial setup..."
# Strip any DOS line endings that might prevent script execution
sed -i 's/\r$//' /usr/libexec/rpcd/luci.clientmanager
sed -i 's/\r$//' /usr/libexec/clientmanager-dhcp-hook
sed -i 's/\r$//' /etc/uci-defaults/luci-app-client-manager

chmod +x /usr/libexec/rpcd/luci.clientmanager /usr/libexec/clientmanager-dhcp-hook /etc/uci-defaults/luci-app-client-manager

# Run initial setup script if present
if [ -f /etc/uci-defaults/luci-app-client-manager ]; then
    /etc/uci-defaults/luci-app-client-manager
fi

echo "[5/6] Configuring DHCP hook..."
NEED_DNSMASQ_RELOAD=0
CURRENT_HOOK=$(uci -q get dhcp.@dnsmasq[0].dhcpscript || true)
if [ "$CURRENT_HOOK" != "/usr/libexec/clientmanager-dhcp-hook" ]; then
    uci set dhcp.@dnsmasq[0].dhcpscript='/usr/libexec/clientmanager-dhcp-hook'
    uci commit dhcp
    NEED_DNSMASQ_RELOAD=1
fi

echo "[6/6] Flushing LuCI cache and restarting services..."
# Clear LuCI index and module caches safely without touching session locks
rm -f /tmp/luci-indexcache /tmp/luci-modulecache* 2>/dev/null || true

# Restart rpcd and uhttpd daemons cleanly — don't abort on failure
/etc/init.d/rpcd restart 2>/dev/null || true
sleep 1
/etc/init.d/uhttpd restart 2>/dev/null || true

if [ "$NEED_DNSMASQ_RELOAD" -eq 1 ]; then
    /etc/init.d/dnsmasq reload 2>/dev/null || /etc/init.d/dnsmasq restart 2>/dev/null || true
fi

if [ -x /etc/init.d/vnstat ]; then
    /etc/init.d/vnstat enable >/dev/null 2>&1 || true
    /etc/init.d/vnstat start >/dev/null 2>&1 || true
fi

echo "=================================================="
echo " Installation complete!"
echo " Access Client Manager in LuCI: Clients"
echo "=================================================="
