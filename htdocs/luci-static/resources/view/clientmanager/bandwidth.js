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

		// Map bandwidth by IP
		var bwMap = {};
		bandwidth.forEach(function(b) {
			if (b.ip) bwMap[b.ip] = b;
		});

		// Build merged entries list of all connected clients
		var entries = [];
		var seenIps = {};

		clients.forEach(function(c) {
			if (!c.ip) return;
			seenIps[c.ip] = true;
			var bw = bwMap[c.ip] || { tx: 0, rx: 0, bytes: 0 };
			entries.push({
				displayName: c.name || c.hostname || c.ip,
				ip: c.ip,
				mac: c.mac || '—',
				tx: bw.tx || 0,
				rx: bw.rx || 0,
				bytes: bw.bytes || ((bw.tx || 0) + (bw.rx || 0))
			});
		});

		// Add any conntrack IPs not present in active clients list
		bandwidth.forEach(function(b) {
			if (b.ip && !seenIps[b.ip]) {
				entries.push({
					displayName: b.ip,
					ip: b.ip,
					mac: '—',
					tx: b.tx || 0,
					rx: b.rx || 0,
					bytes: b.bytes || ((b.tx || 0) + (b.rx || 0))
				});
			}
		});

		// Sort by total bytes descending
		entries.sort(function(a, b) { return b.bytes - a.bytes; });

		var tableBody = E('tbody', { 'id': 'cm-bw-tbody' });

		if (entries.length === 0) {
			tableBody.appendChild(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td', 'colspan': '6',
						'style': 'text-align:center;padding:24px;' },
						_('No active network clients or bandwidth data available.')))
			);
		} else {
			entries.forEach(function(e) {
				tableBody.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, e.displayName),
					E('td', { 'class': 'td' }, e.ip),
					E('td', { 'class': 'td' },
						E('code', { 'style': 'font-size:0.85em' }, e.mac)),
					E('td', { 'class': 'td' }, formatBytes(e.tx)),
					E('td', { 'class': 'td' }, formatBytes(e.rx)),
					E('td', { 'class': 'td', 'style': 'font-weight:bold' },
						formatBytes(e.bytes))
				]));
			});
		}

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
