'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require poll';

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

function formatExpiry(ts) {
	if (!ts || ts === 0) return _('Static');
	var d = new Date(ts * 1000);
	if (d.getTime() < Date.now()) return _('Expired');
	var mins = Math.round((d.getTime() - Date.now()) / 60000);
	if (mins < 60) return mins + 'm';
	return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
}

function signalIcon(signal) {
	if (!signal && signal !== 0) return '';
	if (signal > -50) return '▂▄▆█';
	if (signal > -60) return '▂▄▆░';
	if (signal > -70) return '▂▄░░';
	return '▂░░░';
}

function deviceIcon(client) {
	var icon = client.icon;
	if (icon === 'phone') return '📱';
	if (icon === 'laptop') return '💻';
	if (icon === 'desktop') return '🖥️';
	if (icon === 'tablet') return '📲';
	if (icon === 'tv') return '📺';
	if (icon === 'iot') return '🔌';
	if (icon === 'printer') return '🖨️';
	if (icon === 'camera') return '📷';
	if (icon === 'gaming') return '🎮';
	if (icon === 'server') return '🖧';
	if (client.wireless) return '📶';
	return '🔗';
}

return view.extend({
	load: function() {
		return Promise.all([
			callGetClients(),
			callGetFirewallRules()
		]);
	},

	pollRegistered: false,

	render: function(data) {
		var clients = data[0] || [];
		var rules = data[1] || [];

		var blockedMacs = {};
		rules.forEach(function(r) {
			if (r.target === 'REJECT' && r.src_mac)
				blockedMacs[r.src_mac.toUpperCase()] = true;
		});

		var searchInput = E('input', {
			'type': 'text',
			'placeholder': _('Search by hostname, IP, MAC, or owner…'),
			'class': 'cbi-input-text',
			'style': 'width:100%;margin-bottom:12px;padding:8px;font-size:14px;',
			'id': 'cm-search'
		});

		var ipFilterSelect = E('select', {
			'class': 'cbi-input-select',
			'style': 'font-weight:bold;background:transparent;border:1px solid rgba(128,128,128,0.3);border-radius:3px;padding:2px 4px;cursor:pointer;',
			'id': 'cm-ip-filter',
			'change': function(ev) {
				ev.stopPropagation();
				applyFilters();
			},
			'click': function(ev) {
				ev.stopPropagation();
			}
		}, [
			E('option', { 'value': 'all', 'selected': 'selected' }, _('IP Address (v4 & v6)')),
			E('option', { 'value': 'v4' }, _('IPv4 Only')),
			E('option', { 'value': 'v6' }, _('IPv6 Only'))
		]);

		var tableHead = E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th' }, ''),
			E('th', { 'class': 'th' }, _('Name / Hostname')),
			E('th', { 'class': 'th', 'style': 'cursor:pointer;' }, ipFilterSelect),
			E('th', { 'class': 'th' }, _('MAC Address')),
			E('th', { 'class': 'th' }, _('Interface')),
			E('th', { 'class': 'th' }, _('Signal')),
			E('th', { 'class': 'th' }, _('Lease')),
			E('th', { 'class': 'th' }, _('Status'))
		]);

		var tableBody = E('tbody', { 'id': 'cm-client-tbody' });

		if (clients.length === 0) {
			tableBody.appendChild(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td', 'colspan': '8',
						'style': 'text-align:center;padding:24px;' },
						_('No connected clients found.')))
			);
		}

		var clientMap = {};

		function renderIpCellContent(c, mode) {
			var ip4 = c.ip || '';
			var ip6 = c.ip6 || '';
			if (mode === 'v4') return ip4 || '—';
			if (mode === 'v6') return ip6 ? E('code', { 'style': 'font-size:0.85em;' }, ip6) : '—';
			if (ip4 && ip6) {
				return E('div', {}, [
					E('span', {}, ip4),
					E('br'),
					E('small', { 'style': 'opacity:0.75;font-family:monospace;' }, ip6)
				]);
			}
			return ip4 || (ip6 ? E('code', { 'style': 'font-size:0.85em;' }, ip6) : '—');
		}

		function applyFilters() {
			var term = (searchInput.value || '').toLowerCase().trim();
			var filter = ipFilterSelect.value || 'all';

			var rows = tableBody.querySelectorAll('tr[data-mac]');
			rows.forEach(function(row) {
				var mac = row.getAttribute('data-mac');
				var c = clientMap[mac];
				if (!c) return;

				var hasV4 = !!c.ip;
				var hasV6 = !!c.ip6;

				var matchesProtocol = true;
				if (filter === 'v4' && !hasV4) matchesProtocol = false;
				if (filter === 'v6' && !hasV6) matchesProtocol = false;

				var searchData = row.getAttribute('data-search') || '';
				var matchesSearch = !term || searchData.indexOf(term) > -1;

				row.style.display = (matchesProtocol && matchesSearch) ? '' : 'none';

				var ipTd = row.querySelector('.cm-ip-td');
				if (ipTd) {
					dom.content(ipTd, renderIpCellContent(c, filter));
				}
			});
		}

		clients.forEach(function(c) {
			clientMap[c.mac] = c;
			var displayName = c.name || c.hostname || _('Unknown');
			var subtitle = c.name ? (c.hostname || '') : '';
			var blocked = blockedMacs[c.mac] || false;

			var nameCell = E('td', { 'class': 'td' }, [
				E('strong', {}, displayName),
				subtitle ? E('br') : '',
				subtitle ? E('small', { 'style': 'opacity:0.6' }, subtitle) : ''
			]);

			var row = E('tr', {
				'class': 'tr',
				'style': 'cursor:pointer;' +
					(blocked ? 'opacity:0.5;' : ''),
				'data-mac': c.mac,
				'data-search': [
					displayName, c.hostname, c.ip, c.ip6, c.mac, c.owner
				].join(' ').toLowerCase(),
				'click': function(ev) {
					window.location.href = L.url('admin/clientmanager/details') + '?mac=' + encodeURIComponent(c.mac);
				}
			}, [
				E('td', { 'class': 'td', 'style': 'font-size:1.3em;text-align:center;width:40px;' },
					deviceIcon(c)),
				nameCell,
				E('td', { 'class': 'td cm-ip-td' }, renderIpCellContent(c, 'all')),
				E('td', { 'class': 'td' },
					E('code', { 'style': 'font-size:0.85em' }, c.mac)),
				E('td', { 'class': 'td' }, c.interface || '—'),
				E('td', { 'class': 'td', 'title': c.signal ? c.signal + ' dBm' : '' },
					c.wireless ? signalIcon(c.signal) : '—'),
				E('td', { 'class': 'td' }, formatExpiry(c.expires)),
				E('td', { 'class': 'td' },
					blocked ?
						E('span', { 'style': 'color:#e74c3c' }, '⛔ ' + _('Blocked')) :
						E('span', { 'style': 'color:#27ae60' }, '✓ ' + _('Online')))
			]);

			tableBody.appendChild(row);
		});

		searchInput.addEventListener('input', applyFilters);

		var tbl = E('table', { 'class': 'table', 'id': 'cm-client-table' }, [
			E('thead', {}, tableHead),
			tableBody
		]);

		var summary = E('div', {
			'style': 'margin-bottom:12px;opacity:0.7;font-size:0.9em;'
		}, [
			clients.length + ' ' + _('client(s) connected'),
			' · ',
			clients.filter(function(c) { return c.wireless; }).length +
				' ' + _('wireless'),
			' · ',
			Object.keys(blockedMacs).length + ' ' + _('blocked')
		]);

		var view = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Client Manager')),
			E('div', { 'class': 'cbi-map-descr' },
				_('View and manage all devices connected to your router.')),
			summary,
			searchInput,
			tbl
		]);

		if (!this.pollRegistered) {
			this.pollRegistered = true;
			poll.add(L.bind(function() {
				return callGetClients().then(function(updated) {
					if (updated && updated.length !== clients.length)
						window.location.reload();
				});
			}, this), 30);
		}

		return view;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
