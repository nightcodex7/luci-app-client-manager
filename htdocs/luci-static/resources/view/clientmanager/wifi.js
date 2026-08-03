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
			'class': 'cbi-input-select cm-dropdown',
			'id': 'cm-wifi-mac',
			'style': 'min-width:300px;margin-bottom:8px;font-size:1em;padding:6px 10px;'
		});

		macSelect.appendChild(E('option', { 'value': '' },
			_('— Select a device —')));
		clients.forEach(function(c) {
			var label = (c.name || c.hostname || _('Unknown')) +
				' (' + c.mac + ')';
			macSelect.appendChild(E('option', { 'value': c.mac }, label));
		});
		macSelect.appendChild(E('option', { 'value': 'custom' },
			_('✏️ Custom MAC Address...')));

		var customMacInput = E('input', {
			'type': 'text',
			'class': 'cbi-input-text',
			'id': 'cm-wifi-custom-mac',
			'placeholder': 'AA:BB:CC:DD:EE:FF',
			'style': 'display:none;width:220px;margin-left:10px;font-size:1em;padding:5px 8px;',
			'maxlength': '17'
		});

		var deviceField = E('div', { 'class': 'cbi-value-field', 'style': 'display:flex;align-items:center;flex-wrap:wrap;' }, [
			macSelect,
			customMacInput
		]);

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
				E('legend', { 'style': 'font-size:1.1em;font-weight:bold;' }, radio)
			]);

			byRadio[radio].forEach(function(iface) {
				if (iface.disabled === '1') return;

				var row = E('div', {
					'class': 'cbi-value',
					'data-section': iface.section,
					'data-maclist': JSON.stringify(iface.maclist || [])
				}, [
					E('label', { 'class': 'cbi-value-title', 'style': 'font-size:1.05em;font-weight:600;' },
						iface.ssid || iface.section),
					E('div', { 'class': 'cbi-value-field' }, [
						E('input', {
							'type': 'checkbox',
							'class': 'cm-wifi-cb',
							'data-section': iface.section,
							'disabled': 'disabled',
							'style': 'margin-right:8px;cursor:pointer;transform:scale(1.2);vertical-align:middle;'
						}),
						E('span', { 'style': 'opacity:0.85;font-size:1em;vertical-align:middle;' },
							_('Filter mode: ') + (iface.macfilter || 'disable'))
					])
				]);
				radioDiv.appendChild(row);
			});

			ifaceContainer.appendChild(radioDiv);
		});

		function getActiveMac() {
			if (macSelect.value === 'custom') {
				return (customMacInput.value || '').trim().toUpperCase();
			}
			return (macSelect.value || '').trim().toUpperCase();
		}

		function updateCheckboxes() {
			var mac = getActiveMac();
			var isValid = /^([0-9A-FA-F]{2}[:-]){5}([0-9A-FA-F]{2})$/.test(mac);
			var cbs = ifaceContainer.querySelectorAll('.cm-wifi-cb');
			cbs.forEach(function(cb) {
				if (!isValid) {
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
		}

		// Update checkboxes when selection or custom MAC changes
		macSelect.addEventListener('change', function() {
			if (this.value === 'custom') {
				customMacInput.style.display = 'inline-block';
				customMacInput.focus();
			} else {
				customMacInput.style.display = 'none';
			}
			updateCheckboxes();
		});

		customMacInput.addEventListener('input', updateCheckboxes);

		var applyBtn = E('button', {
			'class': 'cbi-button cbi-button-save',
			'click': function() {
				var mac = getActiveMac();
				var macRegex = /^([0-9A-FA-F]{2}[:-]){5}([0-9A-FA-F]{2})$/;
				if (!mac || !macRegex.test(mac)) {
					ui.addNotification(null,
						E('p', {}, _('Please enter or select a valid MAC address (e.g. AA:BB:CC:DD:EE:FF).')), 'warning');
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

					var wasIn = maclist.indexOf(mac) > -1;
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
						E('p', {}, _('MAC filter updated for %s. WiFi is reloading…').format(mac)),
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
					E('label', { 'class': 'cbi-value-title', 'style': 'font-size:1.05em;font-weight:600;' }, _('Device')),
					deviceField
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
