export async function getToken() {
	return new Promise((resolve) => {
		chrome.storage.local.get(['authToken'], ({ authToken }) => resolve(authToken || null));
	});
}

export async function setToken(token) {
	return new Promise((resolve) => {
		chrome.storage.local.set({ authToken: token }, () => resolve());
	});
}

export async function getSiteConfig() {
	return new Promise((resolve) => {
		chrome.storage.sync.get(['siteConfig'], ({ siteConfig }) => resolve(siteConfig || null));
	});
}

export async function setLastSync(timestampMs) {
	return new Promise((resolve) => {
		chrome.storage.local.set({ lastSync: timestampMs }, () => resolve());
	});
}

export async function clearToken() {
	return new Promise((resolve) => {
		chrome.storage.local.remove(['authToken'], () => resolve());
	});
}

// Store selected credential ID for each host
export async function getSelectedCredentialId(host) {
	return new Promise((resolve) => {
		chrome.storage.local.get(['selectedCredentials'], ({ selectedCredentials = {} }) => {
			resolve(selectedCredentials[host] || null);
		});
	});
}

export async function setSelectedCredentialId(host, credentialId) {
	return new Promise((resolve) => {
		chrome.storage.local.get(['selectedCredentials'], ({ selectedCredentials = {} }) => {
			const updated = { ...selectedCredentials, [host]: credentialId };
			chrome.storage.local.set({ selectedCredentials: updated }, () => resolve());
		});
	});
}