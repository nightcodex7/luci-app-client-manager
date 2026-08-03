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

	render: function(data) {
		var bandwidth = data[0] || [];
		var clients = data[1] || [];

		var bwMap = {};
		bandwidth.forEach(function(b) {
			if (b.ip) bwMap[b.ip] = b;
		});

		var entries = [];
		var seenIps = {};

		clients.forEach(function(c) {
			if (!c.ip) return;
			seenIps[c.ip] = true;
			var bw = bwMap[c.ip] || { tx: 0, rx: 0, bytes: 0 };
			entries.push({
				displayName: c.hostname || c.ip,
				ip: c.ip,
				mac: c.mac || '—',
				tx: bw.tx || 0,
				rx: bw.rx || 0,
				bytes: bw.bytes || ((bw.tx || 0) + (bw.rx || 0))
			});
		});

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

		var updateData = function() {
			return Promise.all([callGetBandwidth(), callGetClients()]).then(function(newData) {
				var newBw = newData[0] || [];
				var newClients = newData[1] || [];
				var newBwMap = {};
				newBw.forEach(function(b) { if (b.ip) newBwMap[b.ip] = b; });

				var newEntries = [];
				var newSeenIps = {};

				newClients.forEach(function(c) {
					if (!c.ip) return;
					newSeenIps[c.ip] = true;
					var bw = newBwMap[c.ip] || { tx: 0, rx: 0, bytes: 0 };
					newEntries.push({
						displayName: c.hostname || c.ip,
						ip: c.ip,
						mac: c.mac || '—',
						tx: bw.tx || 0,
						rx: bw.rx || 0,
						bytes: bw.bytes || ((bw.tx || 0) + (bw.rx || 0))
					});
				});

				newBw.forEach(function(b) {
					if (b.ip && !newSeenIps[b.ip]) {
						newEntries.push({
							displayName: b.ip,
							ip: b.ip,
							mac: '—',
							tx: b.tx || 0,
							rx: b.rx || 0,
							bytes: b.bytes || ((b.tx || 0) + (b.rx || 0))
						});
					}
				});

				newEntries.sort(function(a, b) { return b.bytes - a.bytes; });

				var newBody = E('tbody', { 'id': 'cm-bw-tbody' });
				if (newEntries.length === 0) {
					newBody.appendChild(
						E('tr', { 'class': 'tr placeholder' },
							E('td', { 'class': 'td', 'colspan': '6',
								'style': 'text-align:center;padding:24px;' },
								_('No active network clients or bandwidth data available.')))
					);
				} else {
					newEntries.forEach(function(e) {
						newBody.appendChild(E('tr', { 'class': 'tr' }, [
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

				dom.content(tableBody, newBody.childNodes);
			});
		};

		var refreshBtn = E('button', {
			'class': 'cbi-button cbi-button-action',
			'click': function() { updateData(); }
		}, _('↻ Refresh'));

		poll.add(L.bind(updateData, this), 10);

		return E('div', { 'class': 'cbi-map' }, [
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
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
