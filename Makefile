# SPDX-License-Identifier: Apache-2.0
#
# luci-app-client-manager — Connected client management for OpenWrt
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Client Manager
LUCI_DESCRIPTION:=Central management interface for all connected clients. \
 View, search, and manage devices with WiFi access control, firewall policies, \
 bandwidth monitoring, grouping, and connection history.
LUCI_DEPENDS:=+luci-base +rpcd +rpcd-mod-luci +conntrack +lua
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-client-manager
PKG_VERSION:=0.1.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Tuhin Garai

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
$(eval $(call BuildPackage,$(PKG_NAME)))
