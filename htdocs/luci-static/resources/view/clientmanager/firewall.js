/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org> */

'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetClients = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getClients',
	expect: { clients: [] }
});

var callGetFirewallRules = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getFirewallRules',
	expect: { rules: [] }
});

var callSetFirewallRule = rpc.declare({
	object: 'luci.clientmanager',
	method: 'setFirewallRule',
	params: ['mac', 'action']
});

var callDeleteFirewallRule = rpc.declare({
	object: 'luci.clientmanager',
	method: 'deleteFirewallRule',
	params: ['mac']
});

return view.extend({
	load: function() {
		return Promise.all([
			callGetClients(),
			callGetFirewallRules()
		]);
	},

	render: function(data) {
		var clients = data[0] || [];
		var rules = data[1] || [];

		var blockedMacs = {};
		rules.forEach(function(r) {
			if (r.src_mac) blockedMacs[r.src_mac.toUpperCase()] = r;
		});

		var tableBody = E('tbody', {});

		clients.forEach(function(c) {
			var blocked = !!blockedMacs[c.mac];
			var displayName = c.name || c.hostname || c.mac;

			var toggleBtn = E('button', {
				'class': blocked
					? 'cbi-button cbi-button-apply'
					: 'cbi-button cbi-button-negative',
				'data-mac': c.mac,
				'click': function() {
					var action = blocked ? 'unblock' : 'block';
					callSetFirewallRule(c.mac, action).then(function() {
						window.location.reload();
					});
				}
			}, blocked ? _('Unblock') : _('Block'));

			tableBody.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, displayName),
				E('td', { 'class': 'td' }, c.ip || '—'),
				E('td', { 'class': 'td' },
					E('code', { 'style': 'font-size:0.85em' }, c.mac)),
				E('td', { 'class': 'td' },
					blocked
						? E('span', { 'style': 'color:#e74c3c' }, _('Blocked'))
						: E('span', { 'style': 'color:#27ae60' }, _('Allowed'))),
				E('td', { 'class': 'td' }, toggleBtn)
			]));
		});

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Firewall Policies')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Block or allow internet access for individual devices. ' +
				  'Rules are applied via fw4 using UCI firewall objects.')),

			E('table', { 'class': 'table' }, [
				E('thead', {}, E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Device')),
					E('th', { 'class': 'th' }, _('IP')),
					E('th', { 'class': 'th' }, _('MAC')),
					E('th', { 'class': 'th' }, _('Status')),
					E('th', { 'class': 'th' }, _('Action'))
				])),
				tableBody
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
