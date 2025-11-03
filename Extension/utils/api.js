import { debugLog } from './logger.js';
import { hashPassword } from './crypto.js';

function getStoredBaseUrl() {
	return new Promise((resolve) => {
		try {
			chrome.storage.sync.get(['apiBaseUrl'], ({ apiBaseUrl }) => {
				resolve(apiBaseUrl || 'http://localhost:5000');
			});
		} catch (_) {
			resolve('http://localhost:5000');
		}
	});
}

async function http(path, options = {}) {
	const baseUrl = await getStoredBaseUrl();
	const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
	await debugLog('HTTP', options.method || 'GET', url, options.body ? JSON.parse(options.body) : undefined);
	const resp = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(options.headers || {})
		}
	});
	if (!resp.ok) {
		const text = await resp.text().catch(() => '');
		await debugLog('HTTP ERROR', resp.status, url, text);
		const err = new Error(text || `HTTP ${resp.status}`);
		err.status = resp.status;
		throw err;
	}
	const json = await resp.json();
	await debugLog('HTTP OK', url, json);
	return json;
}

export async function login(email, password) {
	if (!email || !password) throw new Error('Missing credentials');
	const sha256 = await hashPassword(password);
	const data = await http('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password: sha256 })
	});
	if (data && data.token) return data.token;
	throw new Error('No token in response');
}

export async function fetchCredentials(token, host) {
	if (!token) throw new Error('No token');
	if (!host) throw new Error('Missing host');
	const q = new URLSearchParams({ host }).toString();
	const data = await http(`/api/extension/by-domain?${q}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	const first = (data && Array.isArray(data.items) && data.items[0]) || null;
	if (!first) {
		const err = new Error('NO_CREDENTIALS');
		err.code = 'NO_CREDENTIALS';
		throw err;
	}
	return { username: first.username, email: first.email, password: first.password };
}

export async function fetchAllCredentials(token, host) {
	if (!token) throw new Error('No token');
	if (!host) throw new Error('Missing host');
	const q = new URLSearchParams({ host }).toString();
	const data = await http(`/api/extension/by-domain?${q}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	const items = (data && Array.isArray(data.items)) ? data.items : [];
	if (items.length === 0) {
		const err = new Error('NO_CREDENTIALS');
		err.code = 'NO_CREDENTIALS';
		throw err;
	}
	return items.map(item => ({
		id: item.id || `${item.username || item.email || 'cred'}@${host}`,
		username: item.username,
		email: item.email,
		password: item.password,
		label: item.label || item.email || item.username || 'Untitled'
	}));
}

export async function quickAdd(token, payload) {
	if (!token) throw new Error('No token');
	const data = await http('/api/extension/quick-add', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	return data;
}
