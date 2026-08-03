#!/bin/sh

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

echo "[3/3] Restarting services..."
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
/etc/init.d/dnsmasq restart

echo "=================================================="
echo " Uninstallation complete!"
echo "=================================================="
