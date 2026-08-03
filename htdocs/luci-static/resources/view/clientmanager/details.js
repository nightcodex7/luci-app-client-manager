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

function getMac() {
	var macPattern = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;

	var path = L.env.requestpath || [];
	var idx = path.indexOf('details');
	if (idx > -1 && path.length > idx + 1) {
		var pMac = decodeURIComponent(path.slice(idx + 1).join(':'));
		var m1 = pMac.match(macPattern);
		if (m1) return m1[0].toUpperCase();
	}

	if (window.location.search) {
		var params = new URLSearchParams(window.location.search);
		var qMac = params.get('mac');
		if (qMac) {
			var m2 = decodeURIComponent(qMac).match(macPattern);
			if (m2) return m2[0].toUpperCase();
		}
	}

	if (window.location.hash) {
		var hash = decodeURIComponent(window.location.hash).replace(/^#/, '');
		var m3 = hash.match(macPattern);
		if (m3) return m3[0].toUpperCase();
	}

	if (window.location.pathname) {
		var m4 = decodeURIComponent(window.location.pathname).match(macPattern);
		if (m4) return m4[0].toUpperCase();
	}

	return '';
}

function formatRadioFreq(freq, ifName) {
	if (!freq) {
		var lower = (ifName || '').toLowerCase();
		if (lower.indexOf('phy0') > -1 || lower.indexOf('wlan0') > -1 || lower.indexOf('ra0') > -1)
			return '2.4 GHz';
		if (lower.indexOf('phy1') > -1 || lower.indexOf('wlan1') > -1 || lower.indexOf('ra1') > -1)
			return '5 GHz';
		if (lower.indexOf('phy2') > -1 || lower.indexOf('wlan2') > -1)
			return '6 GHz';
		return '';
	}
	var num = parseFloat(freq);
	if (!isNaN(num) && num > 100) {
		return (num / 1000).toFixed(3) + ' GHz';
	}
	return freq;
}

function formatIfaceName(ifName, isWireless, ssid, freq) {
	if (!ifName) return '—';
	if (!isWireless) return ifName;

	var radioFreq = formatRadioFreq(freq, ifName);

	if (ssid && radioFreq) {
		return ifName + '(' + ssid + '(' + radioFreq + '))';
	} else if (ssid) {
		return ifName + '(' + ssid + ')';
	} else if (radioFreq) {
		return ifName + '(' + radioFreq + ')';
	}

	return ifName;
}

return view.extend({
	load: function() {
		var mac = getMac();
		if (!mac) return Promise.resolve([{}, []]);
		return Promise.all([
			callGetClientDetail(mac),
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
		var fwRules = data[1] || [];
		var isBlocked = fwRules.some(function(r) {
			return r.src_mac && r.src_mac.toUpperCase() === mac.toUpperCase() &&
				r.target === 'REJECT';
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

		var formattedIface = formatIfaceName(client.interface, client.wireless, client.ssid, client.freq);

		var infoTable = E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'width:160px;font-weight:bold' },
					_('MAC Address')),
				E('td', { 'class': 'td' }, E('code', {}, mac))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('IPv4 Address')),
				E('td', { 'class': 'td' }, client.ip || '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('IPv6 Address')),
				E('td', { 'class': 'td' }, client.ip6 ? E('code', { 'style': 'font-size:0.85em;' }, client.ip6) : '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Hostname')),
				E('td', { 'class': 'td' }, client.hostname || '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Connection Interface')),
				E('td', { 'class': 'td' }, formattedIface)
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Signal Strength')),
				E('td', { 'class': 'td' },
					client.wireless ? (client.signal ? client.signal + ' dBm' : '—') : _('Wired Connection'))
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
			E('h2', {}, client.hostname || mac),
			E('a', {
				'href': L.url('admin/clientmanager/dashboard'),
				'style': 'display:inline-block;margin-bottom:16px;'
			}, _('← Back to Client List')),

			E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Device Information')),
				infoTable
			]),

			E('fieldset', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Internet Access Control')),
				E('div', { 'style': 'padding:8px 0' }, blockBtn)
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
