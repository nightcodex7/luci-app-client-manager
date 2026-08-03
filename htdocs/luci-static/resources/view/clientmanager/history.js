'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetHistory = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getHistory',
	expect: { events: [] }
});

var callGetClients = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getClients',
	expect: { clients: [] }
});

function formatTimestamp(ts) {
	if (!ts) return '—';
	var d = new Date(ts * 1000);
	return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

function timeSince(ts) {
	if (!ts) return '';
	var secs = Math.floor(Date.now() / 1000) - ts;
	if (secs < 60) return secs + 's ago';
	if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
	if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
	return Math.floor(secs / 86400) + 'd ago';
}

return view.extend({
	load: function() {
		return Promise.all([
			callGetHistory(),
			callGetClients()
		]);
	},

	render: function(data) {
		var events = data[0] || [];
		var clients = data[1] || [];

		var macMap = {};
		clients.forEach(function(c) {
			macMap[c.mac] = c.name || c.hostname || '';
		});

		var filterInput = E('input', {
			'type': 'text',
			'class': 'cbi-input-text',
			'placeholder': _('Filter by device name, MAC, or IP…'),
			'style': 'width:100%;margin-bottom:12px;padding:8px;',
			'id': 'cm-history-filter'
		});

		var tableBody = E('tbody', { 'id': 'cm-history-tbody' });

		if (events.length === 0) {
			tableBody.appendChild(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td', 'colspan': '6',
						'style': 'text-align:center;padding:24px;' },
						_('No history events recorded yet. History is captured via the DHCP hook script.')))
			);
		}

		events.forEach(function(ev) {
			var name = macMap[ev.mac] || ev.hostname || '';
			var actionIcon = ev.action === 'add' ? '🟢' : '🔴';
			var actionText = ev.action === 'add' ? _('Connected') : _('Disconnected');

			var row = E('tr', {
				'class': 'tr',
				'data-search': [
					name, ev.hostname, ev.mac, ev.ip
				].join(' ').toLowerCase()
			}, [
				E('td', { 'class': 'td', 'style': 'text-align:center' },
					actionIcon),
				E('td', { 'class': 'td' }, actionText),
				E('td', { 'class': 'td' }, name || ev.hostname || _('Unknown')),
				E('td', { 'class': 'td' },
					E('code', { 'style': 'font-size:0.85em' }, ev.mac || '—')),
				E('td', { 'class': 'td' }, ev.ip || '—'),
				E('td', { 'class': 'td', 'title': formatTimestamp(ev.timestamp) },
					timeSince(ev.timestamp))
			]);
			tableBody.appendChild(row);
		});

		filterInput.addEventListener('input', function() {
			var term = this.value.toLowerCase().trim();
			var rows = tableBody.querySelectorAll('tr[data-search]');
			rows.forEach(function(row) {
				var d = row.getAttribute('data-search') || '';
				row.style.display = (!term || d.indexOf(term) > -1)
					? '' : 'none';
			});
		});

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Connection History')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Log of device connection and disconnection events from DHCP.')),
			filterInput,

			E('table', { 'class': 'table' }, [
				E('thead', {}, E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th', 'style': 'width:40px' }, ''),
					E('th', { 'class': 'th' }, _('Event')),
					E('th', { 'class': 'th' }, _('Device')),
					E('th', { 'class': 'th' }, _('MAC')),
					E('th', { 'class': 'th' }, _('IP')),
					E('th', { 'class': 'th' }, _('When'))
				])),
				tableBody
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
