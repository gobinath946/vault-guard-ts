import { login, fetchCredentials, fetchAllCredentials, quickAdd } from './utils/api.js';
import { getToken, setToken, clearToken, getSiteConfig, setLastSync, getSelectedCredentialId, setSelectedCredentialId } from './utils/storage.js';
import { debugLog } from './utils/logger.js';

chrome.runtime.onInstalled.addListener(async () => {
	const existing = await getSiteConfig();
	if (!existing) {
		await chrome.storage.sync.set({
			siteConfig: {
				sitePattern: "example.com/login",
				usernameSelector: "input[name='username'], input[type='email']",
				passwordSelector: "input[name='password']",
				submitSelector: "button[type='submit'], input[type='submit']",
				autoSubmit: false
			}
		});
	}
	await debugLog('Installed/Updated, default siteConfig ensured');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		try {
			await debugLog('onMessage', message?.type, message?.payload);
			switch (message?.type) {
				case 'AUTH_LOGIN': {
					const { email, password } = message.payload || {};
					const token = await login(email, password);
					await setToken(token);
					await debugLog('AUTH_LOGIN ok');
					sendResponse({ ok: true });
					break;
				}
				case 'AUTH_LOGOUT': {
					await clearToken();
					await debugLog('AUTH_LOGOUT ok');
					sendResponse({ ok: true });
					break;
				}
				case 'FETCH_CREDENTIALS': {
					const token = await getToken();
					if (!token) {
						await debugLog('FETCH_CREDENTIALS not authenticated');
						return sendResponse({ ok: false, error: 'NOT_AUTHENTICATED' });
					}
					const { host, credentialId } = message.payload || {};
					try {
						// If credentialId is provided, fetch all and find the matching one
						if (credentialId) {
							const allCreds = await fetchAllCredentials(token, host);
							const selected = allCreds.find(c => c.id === credentialId);
							if (selected) {
								await setSelectedCredentialId(host, credentialId);
								await setLastSync(Date.now());
								await debugLog('FETCH_CREDENTIALS ok (selected)', host, credentialId);
								sendResponse({ ok: true, data: { username: selected.username, email: selected.email, password: selected.password } });
								break;
							}
						}
						
						// Try to use stored selected credential
						const selectedId = await getSelectedCredentialId(host);
						if (selectedId) {
							const allCreds = await fetchAllCredentials(token, host);
							const selected = allCreds.find(c => c.id === selectedId);
							if (selected) {
								await setLastSync(Date.now());
								await debugLog('FETCH_CREDENTIALS ok (using stored selection)', host, selectedId);
								sendResponse({ ok: true, data: { username: selected.username, email: selected.email, password: selected.password } });
								break;
							}
						}
						
						// Fallback to first credential (backward compatible)
						const creds = await fetchCredentials(token, host);
						await setLastSync(Date.now());
						await debugLog('FETCH_CREDENTIALS ok (first)', host);
						sendResponse({ ok: true, data: creds });
					} catch (e) {
						if (e && (e.code === 'NO_CREDENTIALS' || e.message === 'NO_CREDENTIALS')) {
							await debugLog('FETCH_CREDENTIALS none', host);
							return sendResponse({ ok: false, error: 'NO_CREDENTIALS' });
						}
						await debugLog('FETCH_CREDENTIALS error', String(e?.message || e));
						throw e;
					}
					break;
				}
				case 'FETCH_ALL_CREDENTIALS': {
					const token = await getToken();
					if (!token) {
						await debugLog('FETCH_ALL_CREDENTIALS not authenticated');
						return sendResponse({ ok: false, error: 'NOT_AUTHENTICATED' });
					}
					const { host } = message.payload || {};
					if (!host) {
						await debugLog('FETCH_ALL_CREDENTIALS missing host');
						return sendResponse({ ok: false, error: 'MISSING_HOST' });
					}
					try {
						const allCreds = await fetchAllCredentials(token, host);
						await debugLog('FETCH_ALL_CREDENTIALS ok', host, allCreds.length);
						sendResponse({ ok: true, data: allCreds });
					} catch (e) {
						if (e && (e.code === 'NO_CREDENTIALS' || e.message === 'NO_CREDENTIALS')) {
							await debugLog('FETCH_ALL_CREDENTIALS none', host);
							return sendResponse({ ok: false, error: 'NO_CREDENTIALS' });
						}
						await debugLog('FETCH_ALL_CREDENTIALS error', String(e?.message || e));
						sendResponse({ ok: false, error: String(e?.message || e) });
					}
					break;
				}
				case 'SET_SELECTED_CREDENTIAL': {
					const { host, credentialId } = message.payload || {};
					if (host && credentialId) {
						await setSelectedCredentialId(host, credentialId);
						await debugLog('SET_SELECTED_CREDENTIAL ok', host, credentialId);
						sendResponse({ ok: true });
					} else {
						sendResponse({ ok: false, error: 'Missing host or credentialId' });
					}
					break;
				}
				case 'QUICK_ADD': {
					const token = await getToken();
					if (!token) {
						await debugLog('QUICK_ADD not authenticated');
						return sendResponse({ ok: false, error: 'NOT_AUTHENTICATED' });
					}
					const result = await quickAdd(token, message.payload || {});
					await debugLog('QUICK_ADD ok');
					sendResponse({ ok: true, data: result });
					break;
				}
				case 'GET_STATUS': {
					const [token, siteConfig] = await Promise.all([getToken(), getSiteConfig()]);
					await debugLog('GET_STATUS', { isLoggedIn: Boolean(token) });
					sendResponse({ ok: true, data: { isLoggedIn: Boolean(token), siteConfig } });
					break;
				}
				case 'CHECK_MULTIPLE_CREDENTIALS': {
					const token = await getToken();
					if (!token) {
						await debugLog('CHECK_MULTIPLE_CREDENTIALS not authenticated');
						return sendResponse({ ok: true, data: { hasMultiple: false } });
					}
					const { host } = message.payload || {};
					if (!host) {
						return sendResponse({ ok: true, data: { hasMultiple: false } });
					}
					try {
						const allCreds = await fetchAllCredentials(token, host);
						const hasMultiple = allCreds && Array.isArray(allCreds) && allCreds.length > 1;
						await debugLog('CHECK_MULTIPLE_CREDENTIALS', host, { count: allCreds?.length || 0, hasMultiple });
						sendResponse({ ok: true, data: { hasMultiple } });
					} catch (e) {
						await debugLog('CHECK_MULTIPLE_CREDENTIALS error', String(e?.message || e));
						sendResponse({ ok: true, data: { hasMultiple: false } });
					}
					break;
				}
				case 'OPEN_POPUP_FOR_SELECTION': {
					// Try to open popup programmatically
					// Note: This may not work due to browser restrictions requiring user gesture
					try {
						// Get the active tab
						const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
						if (tabs && tabs[0]) {
							// Try to open the popup using action API
							// This will only work if called in response to a user gesture
							await chrome.action.openPopup();
							await debugLog('OPEN_POPUP_FOR_SELECTION attempted');
							sendResponse({ ok: true });
						} else {
							sendResponse({ ok: false, error: 'No active tab' });
						}
					} catch (e) {
						// This is expected to fail often due to browser restrictions
						// The visual indicator will serve as fallback
						await debugLog('OPEN_POPUP_FOR_SELECTION failed (expected)', String(e?.message || e));
						sendResponse({ ok: false, error: String(e?.message || e) });
					}
					break;
				}
				default:
					await debugLog('UNKNOWN_MESSAGE', message?.type);
					sendResponse({ ok: false, error: 'UNKNOWN_MESSAGE' });
			}
		} catch (err) {
			await debugLog('onMessage error', String(err?.message || err));
			sendResponse({ ok: false, error: (err && err.message) || 'UNEXPECTED_ERROR' });
		}
	})();
	return true;
});
