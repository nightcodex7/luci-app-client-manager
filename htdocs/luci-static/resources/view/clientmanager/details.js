'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetClientDetail = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getClientDetail',
	params: ['mac'],
	expect: { client: {} }
});

var callSetClientMeta = rpc.declare({
	object: 'luci.clientmanager',
	method: 'setClientMeta',
	params: ['mac', 'name', 'owner', 'notes', 'icon']
});

var callSetFirewallRule = rpc.declare({
	object: 'luci.clientmanager',
	method: 'setFirewallRule',
	params: ['mac', 'action']
});

var callGetFirewallRules = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getFirewallRules',
	expect: { rules: [] }
});

var callGetGroups = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getGroups',
	expect: { groups: [] }
});

var callAssignGroup = rpc.declare({
	object: 'luci.clientmanager',
	method: 'assignGroup',
	params: ['mac', 'group', 'action']
});

var ICON_OPTIONS = [
	['', 'Auto-detect'],
	['phone', '📱 Phone'],
	['laptop', '💻 Laptop'],
	['desktop', '🖥️ Desktop'],
	['tablet', '📲 Tablet'],
	['tv', '📺 TV / Media'],
	['iot', '🔌 IoT Device'],
	['printer', '🖨️ Printer'],
	['camera', '📷 Camera'],
	['gaming', '🎮 Gaming'],
	['server', '🖧 Server']
];

function getMac() {
	// LuCI passes extra path segments via L.env.requestpath
	// URL: .../admin/clientmanager/details/AA:BB:CC:DD:EE:FF
	var path = L.env.requestpath || [];
	// requestpath = ['admin', 'clientmanager', 'details', 'AA:BB:CC:DD:EE:FF']
	if (path.length > 3)
		return decodeURIComponent(path.slice(3).join('/'));
	return '';
}

return view.extend({
	load: function() {
		var mac = getMac();
		if (!mac) return Promise.resolve([{}, [], false]);
		return Promise.all([
			callGetClientDetail(mac),
			callGetGroups(),
			callGetFirewallRules()
		]);
	},

	render: function(data) {
		var mac = getMac();
		if (!mac) {
			return E('div', { 'class': 'cbi-map' }, [
				E('h2', {}, _('Device Details')),
				E('p', {}, _('No device selected.')),
				E('a', { 'href': L.url('admin/clientmanager/dashboard') },
					_('← Back to Client List'))
			]);
		}

		var client = data[0] || {};
		var groups = data[1] || [];
		var fwRules = data[2] || [];
		var isBlocked = fwRules.some(function(r) {
			return r.src_mac && r.src_mac.toUpperCase() === mac.toUpperCase() &&
				r.target === 'REJECT';
		});

		var nameInput = E('input', {
			'type': 'text', 'class': 'cbi-input-text',
			'id': 'cm-name', 'value': client.name || '',
			'placeholder': _('Custom display name')
		});
		var ownerInput = E('input', {
			'type': 'text', 'class': 'cbi-input-text',
			'id': 'cm-owner', 'value': client.owner || '',
			'placeholder': _('Device owner')
		});
		var notesInput = E('textarea', {
			'class': 'cbi-input-textarea', 'id': 'cm-notes',
			'rows': '3', 'placeholder': _('Notes about this device'),
			'style': 'width:100%'
		}, client.notes || '');

		var iconSelect = E('select', {
			'class': 'cbi-input-select', 'id': 'cm-icon'
		});
		ICON_OPTIONS.forEach(function(opt) {
			var o = E('option', { 'value': opt[0] }, opt[1]);
			if (opt[0] === (client.icon || ''))
				o.selected = true;
			iconSelect.appendChild(o);
		});

		var blockBtn = E('button', {
			'class': isBlocked ? 'cbi-button cbi-button-apply' : 'cbi-button cbi-button-negative',
			'click': function() {
				var action = isBlocked ? 'unblock' : 'block';
				ui.showModal(_('Confirm'), [
					E('p', {},
						isBlocked
							? _('Allow this device to access the internet?')
							: _('Block this device from accessing the internet?')),
					E('div', { 'class': 'right' }, [
						E('button', {
							'class': 'cbi-button',
							'click': ui.hideModal
						}, _('Cancel')),
						' ',
						E('button', {
							'class': 'cbi-button cbi-button-negative',
							'click': function() {
								ui.hideModal();
								callSetFirewallRule(mac, action).then(function() {
									window.location.reload();
								});
							}
						}, isBlocked ? _('Unblock') : _('Block'))
					])
				]);
			}
		}, isBlocked ? _('🔓 Unblock Internet') : _('⛔ Block Internet'));

		// Group checkboxes
		var groupSection = E('div', {});
		if (groups.length > 0) {
			var clientGroups = client.groups || [];
			groups.forEach(function(g) {
				var gid = g.id || g.section;
				var isMember = clientGroups.indexOf(gid) > -1;
				var cb = E('label', {
					'style': 'display:block;margin:4px 0;cursor:pointer;'
				}, [
					E('input', {
						'type': 'checkbox',
						'checked': isMember ? 'checked' : null,
						'data-group': gid,
						'style': 'margin-right:6px;',
						'change': function(ev) {
							var act = ev.target.checked ? 'add' : 'remove';
							callAssignGroup(mac, gid, act);
						}
					}),
					g.name || gid
				]);
				groupSection.appendChild(cb);
			});
		} else {
			groupSection.appendChild(
				E('em', { 'style': 'opacity:0.6' },
					_('No groups defined. Create groups in the Groups tab.'))
			);
		}

		var saveBtn = E('button', {
			'class': 'cbi-button cbi-button-save',
			'click': function() {
				callSetClientMeta(
					mac,
					nameInput.value,
					ownerInput.value,
					notesInput.value,
					iconSelect.value
				).then(function() {
					ui.addNotification(null,
						E('p', {}, _('Settings saved.')), 'info');
				});
			}
		}, _('Save'));

		var infoTable = E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'width:160px;font-weight:bold' },
					_('MAC Address')),
				E('td', { 'class': 'td' }, E('code', {}, mac))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('IP Address')),
				E('td', { 'class': 'td' }, client.ip || '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Hostname')),
				E('td', { 'class': 'td' }, client.hostname || '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Connection')),
				E('td', { 'class': 'td' },
					client.wireless
						? _('Wireless') + ' (' + (client.interface || '') + ')'
						: _('Wired') + (client.interface ? ' (' + client.interface + ')' : ''))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Signal')),
				E('td', { 'class': 'td' },
					client.signal ? client.signal + ' dBm' : '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Internet Access')),
				E('td', { 'class': 'td' },
					isBlocked
						? E('span', { 'style': 'color:#e74c3c' }, _('⛔ Blocked'))
						: E('span', { 'style': 'color:#27ae60' }, _('✓ Allowed')))
			])
		]);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, client.name || client.hostname || mac),
			E('a', {
				'href': L.url('admin/clientmanager/dashboard'),
				'style': 'display:inline-block;margin-bottom:16px;'
			}, _('← Back to Client List')),

			E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Device Information')),
				infoTable
			]),

			E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Custom Metadata')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Display Name')),
					E('div', { 'class': 'cbi-value-field' }, nameInput)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Owner')),
					E('div', { 'class': 'cbi-value-field' }, ownerInput)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Icon')),
					E('div', { 'class': 'cbi-value-field' }, iconSelect)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Notes')),
					E('div', { 'class': 'cbi-value-field' }, notesInput)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('div', { 'class': 'cbi-value-field', 'style': 'text-align:right' },
						saveBtn)
				])
			]),

			E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Groups')),
				groupSection
			]),

			E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Internet Access')),
				E('div', { 'style': 'padding:8px 0' }, blockBtn)
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
