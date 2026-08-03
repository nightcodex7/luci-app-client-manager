# SPDX-License-Identifier: Apache-2.0
#
# luci-app-client-manager — Connected client management for OpenWrt
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Client Manager
LUCI_DESCRIPTION:=Central management interface for all connected clients on your local network. \
 View, search, and manage devices with WiFi access control, firewall policies, \
 and per-client bandwidth speed limiting.
LUCI_DEPENDS:=+luci-base +rpcd +rpcd-mod-luci +conntrack
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-client-manager
PKG_VERSION:=0.1.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=Tuhin Garai <tuhin@nightcode.org>

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
$(eval $(call BuildPackage,$(PKG_NAME)))
