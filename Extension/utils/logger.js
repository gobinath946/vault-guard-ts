let _enabled = false;

try {
	chrome.storage.sync.get(['debug'], ({ debug }) => { _enabled = Boolean(debug); });
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'sync' && changes.debug) {
			_enabled = Boolean(changes.debug.newValue);
		}
	});
} catch (_) {}

export function getDebugEnabled() {
	return _enabled;
}

export function debugLog(...args) {
	try {
		if (_enabled) console.log('[SecurePro Ext]', ...args);
	} catch (_) {}
}
