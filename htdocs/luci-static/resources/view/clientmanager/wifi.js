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

var callGetWifiInterfaces = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getWifiInterfaces',
	expect: { interfaces: [] }
});

var callSetMacFilter = rpc.declare({
	object: 'luci.clientmanager',
	method: 'setMacFilter',
	params: ['section', 'mac', 'action']
});

return view.extend({
	load: function() {
		return Promise.all([
			callGetClients(),
			callGetWifiInterfaces()
		]);
	},

	render: function(data) {
		var clients = data[0] || [];
		var ifaces = data[1] || [];

		var macSelect = E('select', {
			'class': 'cbi-input-select',
			'id': 'cm-wifi-mac',
			'style': 'min-width:300px;margin-bottom:16px;'
		});

		macSelect.appendChild(E('option', { 'value': '' },
			_('— Select a device —')));
		clients.forEach(function(c) {
			var label = (c.name || c.hostname || _('Unknown')) +
				' (' + c.mac + ')';
			macSelect.appendChild(E('option', { 'value': c.mac }, label));
		});

		// Group interfaces by radio/device
		var byRadio = {};
		ifaces.forEach(function(iface) {
			var radio = iface.device || 'unknown';
			if (!byRadio[radio]) byRadio[radio] = [];
			byRadio[radio].push(iface);
		});

		var ifaceContainer = E('div', { 'id': 'cm-wifi-ifaces' });

		Object.keys(byRadio).sort().forEach(function(radio) {
			var radioDiv = E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, radio)
			]);

			byRadio[radio].forEach(function(iface) {
				if (iface.disabled === '1') return;

				var maclistStr = Array.isArray(iface.maclist)
					? iface.maclist.join(', ') : '';

				var row = E('div', {
					'class': 'cbi-value',
					'data-section': iface.section,
					'data-maclist': JSON.stringify(iface.maclist || [])
				}, [
					E('label', { 'class': 'cbi-value-title' },
						iface.ssid || iface.section),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', {
							'type': 'checkbox',
							'class': 'cm-wifi-cb',
							'data-section': iface.section,
							'disabled': 'disabled',
							'style': 'margin-right:8px;cursor:pointer;'
						}),
						E('span', { 'style': 'opacity:0.6;font-size:0.85em' },
							_('Filter mode: ') + (iface.macfilter || 'disable')),
						maclistStr
							? E('div', { 'style': 'font-size:0.8em;opacity:0.5;margin-top:2px' },
								_('Current list: ') + maclistStr)
							: ''
					])
				]);
				radioDiv.appendChild(row);
			});

			ifaceContainer.appendChild(radioDiv);
		});

		// Update checkboxes when device selection changes
		macSelect.addEventListener('change', function() {
			var mac = (this.value || '').toUpperCase();
			var cbs = ifaceContainer.querySelectorAll('.cm-wifi-cb');
			cbs.forEach(function(cb) {
				if (!mac) {
					cb.disabled = true;
					cb.checked = false;
					return;
				}
				cb.disabled = false;
				var row = cb.closest('[data-maclist]');
				var maclist = [];
				try {
					maclist = JSON.parse(row.getAttribute('data-maclist') || '[]')
						.map(function(m) { return (m || '').toUpperCase(); });
				} catch(e) {}
				cb.checked = maclist.indexOf(mac) > -1;
			});
		});

		var applyBtn = E('button', {
			'class': 'cbi-button cbi-button-save',
			'click': function() {
				var mac = macSelect.value;
				if (!mac) {
					ui.addNotification(null,
						E('p', {}, _('Please select a device.')), 'warning');
					return;
				}

				var promises = [];
				var cbs = ifaceContainer.querySelectorAll('.cm-wifi-cb');
				cbs.forEach(function(cb) {
					var section = cb.getAttribute('data-section');
					var row = cb.closest('[data-maclist]');
					var maclist = [];
					try {
						maclist = JSON.parse(row.getAttribute('data-maclist'))
							.map(function(m) { return m.toUpperCase(); });
					} catch(e) {}

					var wasIn = maclist.indexOf(mac.toUpperCase()) > -1;
					var nowIn = cb.checked;

					if (nowIn && !wasIn) {
						promises.push(callSetMacFilter(section, mac, 'add'));
					} else if (!nowIn && wasIn) {
						promises.push(callSetMacFilter(section, mac, 'remove'));
					}
				});

				if (promises.length === 0) {
					ui.addNotification(null,
						E('p', {}, _('No changes to apply.')), 'info');
					return;
				}

				Promise.all(promises).then(function() {
					ui.addNotification(null,
						E('p', {}, _('MAC filter updated. WiFi is reloading…')),
						'info');
					window.setTimeout(function() {
						window.location.reload();
					}, 3000);
				});
			}
		}, _('Apply Changes'));

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('WiFi Access Control')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Manage which SSIDs a device is allowed to connect to using MAC filtering.')),

			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Device')),
					E('div', { 'class': 'cbi-value-field' }, macSelect)
				])
			]),

			ifaceContainer,

			E('div', { 'class': 'cbi-page-actions' }, applyBtn)
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
