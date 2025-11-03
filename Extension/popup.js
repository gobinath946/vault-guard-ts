let _debugEnabled = false;
chrome.storage.sync.get(['debug'], ({ debug }) => { _debugEnabled = Boolean(debug); });
function dlog(...args) { if (_debugEnabled) console.log('[SecurePro Ext][Popup]', ...args); }

const statusEl = document.getElementById('status');
const loginForm = document.getElementById('loginForm');
const actions = document.getElementById('actions');
const syncBtn = document.getElementById('syncBtn');
const logoutBtn = document.getElementById('logoutBtn');
const credentialList = document.getElementById('credentialList');
const credentialItems = document.getElementById('credentialItems');

function setStatus(text, type = 'info') {
	if (!statusEl) return;
	statusEl.textContent = text;
	statusEl.className = `status ${type}`;
	statusEl.style.display = 'block';
}

function refreshStatus() {
    return new Promise((resolve) => {
        dlog('Refreshing status');
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (resp) => {
            if (!resp || !resp.ok) {
                dlog('GET_STATUS failed', resp);
                setStatus('Unable to read status', 'error');
                return resolve(false);
            }
            const { isLoggedIn } = resp.data || {};
            dlog('GET_STATUS ok', { isLoggedIn });
            if (isLoggedIn) {
                setStatus('Logged in');
                if (statusEl) statusEl.style.display = 'block';
            } else {
                // Hide status on login page
                if (statusEl) statusEl.style.display = 'none';
            }
            if (loginForm) loginForm.style.display = isLoggedIn ? 'none' : 'block';
            if (actions) actions.style.display = isLoggedIn ? 'block' : 'none';
            if (syncBtn) syncBtn.disabled = !isLoggedIn;
            resolve(Boolean(isLoggedIn));
        });
    });
}

async function getActiveTabOrigin() {
	return new Promise((resolve) => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			const url = tabs && tabs[0] && tabs[0].url;
			try {
				const u = new URL(url);
                return resolve(u.origin);
			} catch (_) {
				return resolve(null);
			}
		});
	});
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        setStatus('Logging in...');
        dlog('AUTH_LOGIN attempt', { email });
        chrome.runtime.sendMessage({ type: 'AUTH_LOGIN', payload: { email, password } }, (resp) => {
            if (resp && resp.ok) {
                dlog('AUTH_LOGIN success');
                setStatus('Login successful', 'success');
                refreshStatus();
            } else {
                dlog('AUTH_LOGIN failed', { resp });
                const msg = resp && resp.error ? String(resp.error).slice(0, 200) : 'Login failed';
                setStatus(msg, 'error');
            }
        });
    });
}

syncBtn.addEventListener('click', async () => {
	const host = await getActiveTabOrigin();
	if (host) {
		// Reload credentials list
		await loadAndDisplayCredentials(host);
	}
	
	setStatus('Syncing credentials...');
    dlog('FETCH_CREDENTIALS manual trigger for', host);
    chrome.runtime.sendMessage({ type: 'FETCH_CREDENTIALS', payload: { host } }, (resp) => {
		if (resp && resp.ok) {
			dlog('FETCH_CREDENTIALS success', resp.data);
			setStatus('Credentials synced', 'success');
			// Trigger autofill on the active tab
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs && tabs[0]) {
					chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_AUTOFILL' }, () => {
						// Ignore errors if content script isn't ready
					});
				}
			});
		} else if (resp && resp.error === 'NOT_AUTHENTICATED') {
			dlog('FETCH_CREDENTIALS not authenticated');
			setStatus('Please log in first', 'error');
		} else if (resp && resp.error === 'NO_CREDENTIALS') {
			dlog('FETCH_CREDENTIALS no credentials');
			setStatus('No credentials for this host', 'error');
		} else {
			dlog('FETCH_CREDENTIALS failed', resp);
			setStatus('Sync failed', 'error');
		}
	});
});

if (logoutBtn) {
	logoutBtn.addEventListener('click', () => {
		setStatus('Logging out...');
		dlog('AUTH_LOGOUT attempt');
		chrome.runtime.sendMessage({ type: 'AUTH_LOGOUT' }, (resp) => {
			if (resp && resp.ok) {
				dlog('AUTH_LOGOUT success');
				setStatus('Logged out successfully', 'success');
				// Clear login form
				if (loginForm) {
					document.getElementById('email').value = '';
					document.getElementById('password').value = '';
				}
				refreshStatus();
			} else {
				dlog('AUTH_LOGOUT failed', resp);
				setStatus('Logout failed', 'error');
			}
		});
	});
}

// Options link removed

async function loadAndDisplayCredentials(host) {
	if (!host || !credentialList || !credentialItems) return;
	
	// Hide credential list initially
	credentialList.style.display = 'none';
	credentialItems.innerHTML = '';
	
	// Fetch all credentials
	chrome.runtime.sendMessage({ type: 'FETCH_ALL_CREDENTIALS', payload: { host } }, (resp) => {
		if (!resp || !resp.ok || !resp.data || !Array.isArray(resp.data)) {
			return;
		}
		
		const credentials = resp.data;
		
		// Only show list if multiple credentials exist
		if (credentials.length > 1) {
			credentialList.style.display = 'block';
			
			// Calculate max-height to show exactly 5 accounts
			// Each item: ~48px (32px avatar + 16px padding) + 4px gap between items
			// For 5 items: (5 × 48px) + (4 × 4px) = 240px + 16px = 256px
			// Simplified: ~52px per item including gap
			// For 5 items: 5 × 52px = 260px
			if (credentials.length > 5) {
				const maxHeight = 5 * 52; // 260px for 5 items
				credentialItems.style.maxHeight = maxHeight + 'px';
				// Add class which will enable scrolling via CSS
				credentialItems.classList.add('has-scroll');
				// Force reflow to ensure scrollbar appears
				void credentialItems.offsetHeight;
			} else {
				credentialItems.style.maxHeight = 'none';
				credentialItems.style.overflowY = '';
				credentialItems.style.paddingRight = '';
				credentialItems.classList.remove('has-scroll');
			}
			
			// Create clickable items for each credential
			credentials.forEach((cred) => {
				const item = document.createElement('button');
				item.type = 'button';
				item.className = 'credential-item';
				const displayText = cred.label || cred.email || cred.username || 'Untitled';
				const accountInitial = displayText.charAt(0).toUpperCase();
				item.innerHTML = `
					<div class="credential-avatar">${accountInitial}</div>
					<div class="credential-info">
						<span class="credential-name">${displayText}</span>
					</div>
					<svg class="credential-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor"/>
					</svg>
				`;
				item.addEventListener('click', async () => {
					// Save selection and autofill
					await chrome.runtime.sendMessage({ 
						type: 'SET_SELECTED_CREDENTIAL', 
						payload: { host, credentialId: cred.id } 
					});
					
					// Sync and autofill
					setStatus('Syncing credentials...');
					chrome.runtime.sendMessage({ type: 'FETCH_CREDENTIALS', payload: { host, credentialId: cred.id } }, (resp) => {
						if (resp && resp.ok) {
							setStatus('Credentials synced', 'success');
							// Trigger autofill
							chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
								if (tabs && tabs[0]) {
									chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_AUTOFILL' }, () => {});
								}
							});
						}
					});
				});
				credentialItems.appendChild(item);
			});
		}
	});
}

// Auto-sync credentials for current tab when popup opens (if logged in)
(async () => {
    const isLoggedIn = await refreshStatus();
    if (!isLoggedIn) return;
    try {
        const host = await getActiveTabOrigin();
        if (!host) return;
        
        // Load and display credentials list if multiple exist
        await loadAndDisplayCredentials(host);
        
        setStatus('Syncing credentials...');
        dlog('AUTO FETCH_CREDENTIALS for', host);
        chrome.runtime.sendMessage({ type: 'FETCH_CREDENTIALS', payload: { host } }, (resp) => {
            if (resp && resp.ok) {
                dlog('AUTO FETCH_CREDENTIALS success');
                setStatus('Credentials synced', 'success');
                // Trigger autofill on the active tab
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs && tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_AUTOFILL' }, () => {
                            // Ignore errors if content script isn't ready
                        });
                    }
                });
            } else if (resp && resp.error === 'NO_CREDENTIALS') {
                dlog('AUTO FETCH_CREDENTIALS no credentials');
                setStatus('No credentials for this site', 'info');
            } else if (resp && resp.error === 'NOT_AUTHENTICATED') {
                dlog('AUTO FETCH_CREDENTIALS not authenticated');
                setStatus('Please log in first', 'error');
            } else {
                dlog('AUTO FETCH_CREDENTIALS failed', resp);
                setStatus('Sync failed', 'error');
            }
        });
    } catch (e) {
        dlog('AUTO FETCH_CREDENTIALS exception', String(e?.message || e));
    }
})();
