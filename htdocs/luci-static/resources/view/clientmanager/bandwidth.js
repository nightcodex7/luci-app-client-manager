'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

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

function ipToLong(ip) {
	if (!ip) return 999999999999;
	var p = ip.split('.');
	if (p.length === 4) {
		return (+p[0] * 16777216) + (+p[1] * 65536) + (+p[2] * 256) + (+p[3]);
	}
	return 999999999999;
}

function buildBandwidthEntries(bandwidth, clients) {
	var bwMap = {};
	bandwidth.forEach(function(b) {
		if (b.ip) bwMap[b.ip] = b;
	});

	var entries = [];
	clients.forEach(function(c) {
		// Priority 1 & 2: Only connected active clients with valid non-loopback IPv4 addresses
		if (!c.ip || c.ip === '127.0.0.1' || c.connected === false) return;

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

	// Priority 1: Connected devices' IPv4 addresses in ascending order
	entries.sort(function(a, b) {
		var numA = ipToLong(a.ip);
		var numB = ipToLong(b.ip);
		if (numA !== numB) {
			return numA - numB;
		}
		return a.ip.localeCompare(b.ip);
	});

	return entries;
}

return view.extend({
	load: function() {
		return Promise.all([
			callGetBandwidth().catch(function() { return []; }),
			callGetClients().catch(function() { return []; })
		]);
	},

	render: function(data) {
		var bandwidth = data[0] || [];
		var clients = data[1] || [];

		var entries = buildBandwidthEntries(bandwidth, clients);
		var tableBody = E('tbody', { 'id': 'cm-bw-tbody' });

		if (entries.length === 0) {
			tableBody.appendChild(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td', 'colspan': '6',
						'style': 'text-align:center;padding:24px;' },
						_('No active connected clients available.')))
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
			return Promise.all([
				callGetBandwidth().catch(function() { return []; }),
				callGetClients().catch(function() { return []; })
			]).then(function(newData) {
				var tbody = document.getElementById('cm-bw-tbody');
				if (!tbody) return;

				var newBw = newData[0] || [];
				var newClients = newData[1] || [];
				var newEntries = buildBandwidthEntries(newBw, newClients);

				var newBody = E('tbody', { 'id': 'cm-bw-tbody' });
				if (newEntries.length === 0) {
					newBody.appendChild(
						E('tr', { 'class': 'tr placeholder' },
							E('td', { 'class': 'td', 'colspan': '6',
								'style': 'text-align:center;padding:24px;' },
								_('No active connected clients available.')))
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

				dom.content(tbody, Array.prototype.slice.call(newBody.children));
			}).catch(function() {
				// Silently handle error
			});
		};

		var refreshBtn = E('button', {
			'class': 'cbi-button cbi-button-action',
			'click': function() { updateData(); }
		}, _('↻ Refresh'));

		var selectStyle = 'font-weight:bold;background-color:var(--background-color-medium, #2b2b2b);color:var(--text-color-high, #ffffff);border:1px solid var(--border-color-medium, #555);border-radius:4px;padding:4px 8px;cursor:pointer;margin-left:8px;';

		var currentTimer = null;

		function startIntervalTimer(ms) {
			if (currentTimer) {
				window.clearInterval(currentTimer);
				currentTimer = null;
			}
			currentTimer = window.setInterval(function() {
				if (!document.getElementById('cm-bw-tbody')) {
					if (currentTimer) window.clearInterval(currentTimer);
					return;
				}
				updateData();
			}, ms);
		}

		var intervalSelect = E('select', {
			'class': 'cbi-input-select',
			'style': selectStyle,
			'change': function(ev) {
				var val = parseInt(ev.target.value, 10);
				startIntervalTimer(val);
			}
		}, [
			E('option', { 'value': '1000' }, _('1 sec')),
			E('option', { 'value': '5000', 'selected': 'selected' }, _('5 sec')),
			E('option', { 'value': '10000' }, _('10 sec'))
		]);

		// Always default to 5 sec (5000 ms) on page visit
		startIntervalTimer(5000);

		var dropdownStyleElem = E('style', {},
			'select.cbi-input-select option { background-color: #2b2b2b !important; color: #ffffff !important; }\n' +
			'body:not([data-theme="dark"]) select.cbi-input-select option { background-color: #ffffff !important; color: #333333 !important; }'
		);

		return E('div', { 'class': 'cbi-map' }, [
			dropdownStyleElem,
			E('h2', {}, _('Bandwidth Monitor')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Current per-device bandwidth usage for active connected clients.')),
			E('div', { 'style': 'margin-bottom:12px;display:flex;align-items:center;' }, [
				refreshBtn,
				E('label', { 'style': 'margin-left:12px;font-size:0.9em;opacity:0.85;' }, _('Refresh Interval:')),
				intervalSelect
			]),

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
