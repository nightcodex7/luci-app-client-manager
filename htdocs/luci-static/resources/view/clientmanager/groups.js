'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetGroups = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getGroups',
	expect: { groups: [] }
});

var callSetGroup = rpc.declare({
	object: 'luci.clientmanager',
	method: 'setGroup',
	params: ['id', 'name', 'description', 'block_internet']
});

var callDeleteGroup = rpc.declare({
	object: 'luci.clientmanager',
	method: 'deleteGroup',
	params: ['id']
});

var callGetClients = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getClients',
	expect: { clients: [] }
});

return view.extend({
	load: function() {
		return Promise.all([
			callGetGroups(),
			callGetClients()
		]);
	},

	render: function(data) {
		var groups = data[0] || [];
		var clients = data[1] || [];

		var container = E('div', {});

		// Add group form
		var newIdInput = E('input', {
			'type': 'text', 'class': 'cbi-input-text',
			'placeholder': _('Group ID (no spaces)'),
			'id': 'cm-new-group-id',
			'style': 'margin-right:8px;'
		});
		var newNameInput = E('input', {
			'type': 'text', 'class': 'cbi-input-text',
			'placeholder': _('Group Name'),
			'id': 'cm-new-group-name',
			'style': 'margin-right:8px;'
		});
		var addBtn = E('button', {
			'class': 'cbi-button cbi-button-add',
			'click': function() {
				var id = newIdInput.value.trim().replace(/\s+/g, '_');
				var name = newNameInput.value.trim();
				if (!id) {
					ui.addNotification(null,
						E('p', {}, _('Group ID is required.')), 'warning');
					return;
				}
				callSetGroup(id, name || id, '', '0').then(function() {
					window.location.reload();
				});
			}
		}, _('Add Group'));

		container.appendChild(E('fieldset', { 'class': 'cbi-section' }, [
			E('legend', {}, _('Create Group')),
			E('div', { 'style': 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;' }, [
				newIdInput, newNameInput, addBtn
			])
		]));

		// List existing groups
		if (groups.length === 0) {
			container.appendChild(
				E('div', { 'class': 'cbi-section',
					'style': 'text-align:center;padding:24px;opacity:0.6;' },
					_('No groups defined yet.'))
			);
		}

		groups.forEach(function(g) {
			var gid = g.id || g.section;
			var members = clients.filter(function(c) {
				return c.groups && c.groups.indexOf(gid) > -1;
			});

			var memberList = E('div', { 'style': 'margin-top:8px;' });
			if (members.length > 0) {
				members.forEach(function(m) {
					memberList.appendChild(E('span', {
						'style': 'display:inline-block;background:var(--cbi-section-bg,' +
							'#f0f0f0);padding:2px 8px;margin:2px;border-radius:4px;' +
							'font-size:0.85em;'
					}, (m.name || m.hostname || m.mac)));
				});
			} else {
				memberList.appendChild(
					E('em', { 'style': 'opacity:0.5' }, _('No members'))
				);
			}

			var deleteBtn = E('button', {
				'class': 'cbi-button cbi-button-remove',
				'click': function() {
					ui.showModal(_('Delete Group'), [
						E('p', {}, _('Delete group "%s"?').format(
							g.name || gid)),
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
									callDeleteGroup(gid).then(function() {
										window.location.reload();
									});
								}
							}, _('Delete'))
						])
					]);
				}
			}, _('Delete'));

			container.appendChild(E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, g.name || gid),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('ID')),
					E('div', { 'class': 'cbi-value-field' }, gid)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' },
						_('Description')),
					E('div', { 'class': 'cbi-value-field' },
						g.description || '—')
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Members')),
					E('div', { 'class': 'cbi-value-field' }, [
						members.length + ' ' + _('device(s)'),
						memberList
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' },
						_('Internet')),
					E('div', { 'class': 'cbi-value-field' },
						g.block_internet === '1'
							? E('span', { 'style': 'color:#e74c3c' },
								_('Blocked'))
							: E('span', { 'style': 'color:#27ae60' },
								_('Allowed')))
				]),
				E('div', { 'style': 'text-align:right;padding:8px 0' },
					deleteBtn)
			]));
		});

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Device Groups')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Organize devices into groups. Assign devices to groups from the device detail page.')),
			container
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
