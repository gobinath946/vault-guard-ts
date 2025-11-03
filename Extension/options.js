const form = document.getElementById('optionsForm');
const saveStatus = document.getElementById('saveStatus');

function setStatus(msg, type = 'info') {
	saveStatus.textContent = msg;
	saveStatus.className = `status ${type}`;
}

function load() {
	chrome.storage.sync.get(['siteConfig', 'apiBaseUrl', 'debug'], ({ siteConfig, apiBaseUrl, debug }) => {
		if (apiBaseUrl) {
			document.getElementById('apiBaseUrl').value = apiBaseUrl;
		}
		document.getElementById('debug').checked = Boolean(debug);
		if (!siteConfig) return;
		document.getElementById('sitePattern').value = siteConfig.sitePattern || '';
		document.getElementById('usernameSelector').value = siteConfig.usernameSelector || '';
		document.getElementById('passwordSelector').value = siteConfig.passwordSelector || '';
		document.getElementById('submitSelector').value = siteConfig.submitSelector || '';
		document.getElementById('autoSubmit').checked = Boolean(siteConfig.autoSubmit);
	});
}

form.addEventListener('submit', (e) => {
	e.preventDefault();
	const apiBaseUrl = document.getElementById('apiBaseUrl').value.trim();
	const debug = document.getElementById('debug').checked;
	const siteConfig = {
		sitePattern: document.getElementById('sitePattern').value.trim(),
		usernameSelector: document.getElementById('usernameSelector').value.trim(),
		passwordSelector: document.getElementById('passwordSelector').value.trim(),
		submitSelector: document.getElementById('submitSelector').value.trim(),
		autoSubmit: document.getElementById('autoSubmit').checked
	};
	chrome.storage.sync.set({ apiBaseUrl, debug, siteConfig }, () => setStatus('Saved', 'success'));
});

load();
