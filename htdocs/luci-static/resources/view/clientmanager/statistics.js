'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetStatistics = rpc.declare({
	object: 'luci.clientmanager',
	method: 'getStatistics'
});

function formatBytes(bytes) {
	if (!bytes || bytes === 0) return '0 B';
	var units = ['B', 'KB', 'MB', 'GB', 'TB'];
	var i = Math.floor(Math.log(bytes) / Math.log(1024));
	return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

function drawBarChart(container, dataPoints, labelFn, valueFn, maxVal) {
	if (!dataPoints || dataPoints.length === 0) return;

	var barWidth = Math.max(20, Math.floor(
		(container.offsetWidth || 600) / dataPoints.length) - 4);

	var chart = E('div', {
		'style': 'display:flex;align-items:flex-end;gap:2px;' +
			'height:200px;border-bottom:1px solid var(--border-color-medium,#ccc);' +
			'padding-bottom:4px;margin-bottom:4px;'
	});

	var labels = E('div', {
		'style': 'display:flex;gap:2px;font-size:0.7em;opacity:0.6;'
	});

	dataPoints.forEach(function(dp) {
		var val = valueFn(dp);
		var pct = maxVal > 0 ? Math.max(2, (val / maxVal) * 100) : 2;

		chart.appendChild(E('div', {
			'style': 'width:' + barWidth + 'px;background:var(--primary-color,' +
				'#4a90d9);min-height:2px;height:' + pct + '%;' +
				'border-radius:2px 2px 0 0;',
			'title': labelFn(dp) + ': ' + formatBytes(val)
		}));

		labels.appendChild(E('div', {
			'style': 'width:' + barWidth + 'px;text-align:center;' +
				'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
		}, labelFn(dp)));
	});

	container.appendChild(chart);
	container.appendChild(labels);
}

return view.extend({
	load: function() {
		return callGetStatistics();
	},

	render: function(stats) {
		var container = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Traffic Statistics')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Network traffic statistics from vnstat.'))
		]);

		if (!stats || !stats.available) {
			container.appendChild(
				E('div', { 'class': 'cbi-section',
					'style': 'text-align:center;padding:32px;' }, [
					E('p', { 'style': 'font-size:1.2em;opacity:0.6;' },
						_('Statistics not available')),
					E('p', {},
						_('Install vnstat to enable traffic statistics:')),
					E('code', { 'style': 'display:block;margin:12px auto;' +
						'padding:8px 16px;background:var(--cbi-section-bg,' +
						'#f5f5f5);border-radius:4px;max-width:500px;' },
						'apk add vnstat2  (or: opkg update && opkg install vnstat2)')
				])
			);
			return container;
		}

		// Parse vnstat JSON data
		var vndata = stats.data;
		if (vndata && vndata.interfaces) {
			vndata.interfaces.forEach(function(iface) {
				var section = E('fieldset', { 'class': 'cbi-section' }, [
					E('legend', {}, iface.name || _('Interface'))
				]);

				// Daily traffic
				if (iface.traffic && iface.traffic.day) {
					var days = iface.traffic.day.slice(-14);
					var maxDay = 0;
					days.forEach(function(d) {
						var total = (d.rx || 0) + (d.tx || 0);
						if (total > maxDay) maxDay = total;
					});

					section.appendChild(
						E('h4', { 'style': 'margin:12px 0 8px' },
							_('Daily Traffic (Last 14 Days)')));

					var dayChart = E('div', {
						'style': 'overflow-x:auto;padding:8px 0;'
					});
					drawBarChart(dayChart, days,
						function(d) {
							return d.date.month + '/' + d.date.day;
						},
						function(d) { return (d.rx || 0) + (d.tx || 0); },
						maxDay
					);
					section.appendChild(dayChart);

					// Summary table
					var dayTable = E('table', { 'class': 'table' }, [
						E('thead', {},
							E('tr', { 'class': 'tr table-titles' }, [
								E('th', { 'class': 'th' }, _('Date')),
								E('th', { 'class': 'th' }, _('Download')),
								E('th', { 'class': 'th' }, _('Upload')),
								E('th', { 'class': 'th' }, _('Total'))
							]))
					]);
					var dayBody = E('tbody', {});
					days.reverse().forEach(function(d) {
						dayBody.appendChild(
							E('tr', { 'class': 'tr' }, [
								E('td', { 'class': 'td' },
									d.date.year + '-' + d.date.month +
									'-' + d.date.day),
								E('td', { 'class': 'td' },
									formatBytes(d.rx || 0)),
								E('td', { 'class': 'td' },
									formatBytes(d.tx || 0)),
								E('td', { 'class': 'td', 'style': 'font-weight:bold' },
									formatBytes((d.rx || 0) + (d.tx || 0)))
							]));
					});
					dayTable.appendChild(dayBody);
					section.appendChild(dayTable);
				}

				// Monthly traffic
				if (iface.traffic && iface.traffic.month) {
					var months = iface.traffic.month.slice(-6);
					section.appendChild(
						E('h4', { 'style': 'margin:16px 0 8px' },
							_('Monthly Traffic')));

					var monthTable = E('table', { 'class': 'table' }, [
						E('thead', {},
							E('tr', { 'class': 'tr table-titles' }, [
								E('th', { 'class': 'th' }, _('Month')),
								E('th', { 'class': 'th' }, _('Download')),
								E('th', { 'class': 'th' }, _('Upload')),
								E('th', { 'class': 'th' }, _('Total'))
							]))
					]);
					var monthBody = E('tbody', {});
					months.reverse().forEach(function(m) {
						monthBody.appendChild(
							E('tr', { 'class': 'tr' }, [
								E('td', { 'class': 'td' },
									m.date.year + '-' + m.date.month),
								E('td', { 'class': 'td' },
									formatBytes(m.rx || 0)),
								E('td', { 'class': 'td' },
									formatBytes(m.tx || 0)),
								E('td', { 'class': 'td', 'style': 'font-weight:bold' },
									formatBytes((m.rx || 0) + (m.tx || 0)))
							]));
					});
					monthTable.appendChild(monthBody);
					section.appendChild(monthTable);
				}

				container.appendChild(section);
			});
		}

		return container;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
