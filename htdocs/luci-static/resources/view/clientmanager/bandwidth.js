'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require poll';

var callGetBandwidth = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getBandwidth',
	expect: { bandwidth: [] }
});

var callGetClients = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getClients',
	expect: { clients: [] }
});

function formatBytes(bytes) {
	if (!bytes || bytes === 0) return '0 B';
	var units = ['B', 'KB', 'MB', 'GB', 'TB'];
	var i = Math.floor(Math.log(bytes) / Math.log(1024));
	return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

return view.extend({
	load: function() {
		return Promise.all([
			callGetBandwidth(),
			callGetClients()
		]);
	},

	pollRegistered: false,

	render: function(data) {
		var bandwidth = data[0] || [];
		var clients = data[1] || [];

		// Map IPs to client info
		var ipMap = {};
		clients.forEach(function(c) {
			if (c.ip) ipMap[c.ip] = c;
		});

		var tableBody = E('tbody', { 'id': 'cm-bw-tbody' });

		if (bandwidth.length === 0) {
			tableBody.appendChild(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td', 'colspan': '6',
						'style': 'text-align:center;padding:24px;' },
						_('No bandwidth data available. Ensure conntrack is installed.')))
			);
		}

		bandwidth.forEach(function(b) {
			var c = ipMap[b.ip] || {};
			var displayName = c.name || c.hostname || b.ip;

			tableBody.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, displayName),
				E('td', { 'class': 'td' }, b.ip),
				E('td', { 'class': 'td' },
					E('code', { 'style': 'font-size:0.85em' },
						c.mac || '—')),
				E('td', { 'class': 'td' }, formatBytes(b.tx || 0)),
				E('td', { 'class': 'td' }, formatBytes(b.rx || 0)),
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					formatBytes(b.bytes || 0))
			]));
		});

		var refreshBtn = E('button', {
			'class': 'cbi-button cbi-button-action',
			'click': function() { window.location.reload(); }
		}, _('↻ Refresh'));

		var view = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Bandwidth Monitor')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Current per-device bandwidth usage from connection tracking.')),
			E('div', { 'style': 'margin-bottom:12px' }, refreshBtn),

			E('table', { 'class': 'table' }, [
				E('thead', {}, E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Device')),
					E('th', { 'class': 'th' }, _('IP Address')),
					E('th', { 'class': 'th' }, _('MAC')),
					E('th', { 'class': 'th' }, _('Upload')),
					E('th', { 'class': 'th' }, _('Download')),
					E('th', { 'class': 'th' }, _('Total'))
				])),
				tableBody
			])
		]);

		if (!this.pollRegistered) {
			this.pollRegistered = true;
			poll.add(L.bind(function() {
				return callGetBandwidth().then(L.bind(function(updated) {
					this.render([updated, clients]);
				}, this));
			}, this), 15);
		}

		return view;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
