let _debugEnabled = false;
chrome.storage.sync.get(['debug'], ({ debug }) => { _debugEnabled = Boolean(debug); });
function dlog(...args) { if (_debugEnabled) console.log('[SecurePro Ext]', ...args); }

async function getSiteConfig() {
	return new Promise((resolve) => {
		chrome.storage.sync.get(['siteConfig'], ({ siteConfig }) => resolve(siteConfig));
	});
}

function selectFirst(selector) {
	if (!selector) return null;
	const el = document.querySelector(selector);
	return el || null;
}

function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function setInputValue(input, value) {
	if (!input) return false;
    try {
	input.focus();
        
        // Clear existing value first
        input.value = '';
        
        // Use native setter for React/framework compatibility
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeValueSetter) {
            nativeValueSetter.call(input, value || '');
        } else {
            input.value = value || '';
        }
        
        // Create and dispatch input event (most frameworks listen to this)
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        Object.defineProperty(inputEvent, 'target', { value: input, enumerable: true });
        input.dispatchEvent(inputEvent);
        
        // Dispatch change event
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        input.dispatchEvent(changeEvent);
        
        // Simulate keyboard events for React
        ['keydown', 'keypress', 'keyup'].forEach(type => {
            const ke = new KeyboardEvent(type, { bubbles: true, cancelable: true });
            input.dispatchEvent(ke);
        });
        
        // Try React's onChange handler by accessing the internal property
        if (input._valueTracker) {
            input._valueTracker.setValue('');
        }
        
        // Set again after React hydration
        if (nativeValueSetter) {
            nativeValueSetter.call(input, value || '');
        } else {
	input.value = value || '';
        }
        
        // Trigger another input event after value is set
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Verify it actually got set
        const finalValue = input.value || '';
        return finalValue.length > 0;
    } catch (e) {
        dlog('setInputValue error', String(e));
        return false;
    }
}

async function tryAutofill() {
	const siteConfig = await getSiteConfig();
	if (!siteConfig) return;
	const { sitePattern, usernameSelector, passwordSelector, submitSelector, autoSubmit } = siteConfig;
	const href = window.location.href;
	// Ignore default placeholder pattern; only enforce when user provided a real filter
	const isPlaceholderPattern = sitePattern === 'example.com/login';
	if (sitePattern && !isPlaceholderPattern && !href.includes(sitePattern)) { dlog('URL does not include sitePattern; skipping'); return; }

	dlog('Requesting creds for', location.origin);
	chrome.runtime.sendMessage({ type: 'FETCH_CREDENTIALS', payload: { host: location.origin } }, async (resp) => {
		if (!resp || !resp.ok || !resp.data) { dlog('No credentials or error', resp && resp.error); return; }
		const { username, password, email } = resp.data || {};
		// Use email if available, otherwise use username
		const usernameOrEmail = email || username;
		// Allow autofill even if password is not provided - just fill username/email
		if (!usernameOrEmail) { dlog('Missing username/email in response'); return; }

		// Wait for dynamically rendered inputs (e.g., Instagram SPA)
		async function waitForElement(selector, timeoutMs = 5000) {
			if (!selector) return null;
			const existing = document.querySelector(selector);
			if (existing) return existing;
			return new Promise((resolve) => {
				let resolved = false;
				const observer = new MutationObserver(() => {
					const el = document.querySelector(selector);
					if (el && !resolved) {
						resolved = true;
						clearTimeout(timeoutId);
						observer.disconnect();
						resolve(el);
					}
				});
				const timeoutId = setTimeout(() => {
					if (!resolved) {
						resolved = true;
						observer.disconnect();
						resolve(null);
					}
				}, timeoutMs);
				observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
			});
		}


		// Heuristic selectors as fallback when config selectors are missing or not found
		// Prioritize email input fields (input#email, input[type='email'], etc.)
		const userHeuristics = [
			"input#email",
			"input[id='email']",
			"input[type='email']",
			"input[name='email']",
			"input[autocomplete='email']",
			"input[name='username']",
			"input[autocomplete='username']",
			"input[aria-label*='email' i]",
			"input[aria-label*='Email' i]",
			"input[placeholder*='email' i]",
			"input[placeholder*='Email' i]",
			"input[id*='email']",
			"input[id*='user']",
			"input[name*='user']",
			"input[name*='login']"
		].join(',');
		const passHeuristics = [
			"input[type='password']",
			"input[autocomplete='current-password']",
			"input[id*='pass']",
			"input[name*='pass']"
		].join(',');
		const submitHeuristics = [
			"button[type='submit']",
			"input[type='submit']",
			"form button:not([type]), form button[type='submit']"
		].join(',');

		async function waitForAny(selectorsCsv, timeoutMs = 5000) {
			if (!selectorsCsv) return null;
			const immediate = document.querySelector(selectorsCsv);
			if (immediate) return immediate;
			return waitForElement(selectorsCsv, timeoutMs);
		}

		const userSelectorToUse = usernameSelector && usernameSelector.trim() ? usernameSelector : userHeuristics;
		const passSelectorToUse = passwordSelector && passwordSelector.trim() ? passwordSelector : passHeuristics;
		const submitSelectorToUse = submitSelector && submitSelector.trim() ? submitSelector : submitHeuristics;

		const [userEl, passEl, submitEl] = await Promise.all([
			waitForAny(userSelectorToUse),
			waitForAny(passSelectorToUse),
			waitForAny(submitSelectorToUse, 3000)
		]);

		dlog('Selectors used', { userSelectorToUse, passSelectorToUse, submitSelectorToUse });
		dlog('Elements found', { haveUser: Boolean(userEl), havePass: Boolean(passEl), haveSubmit: Boolean(submitEl) });

		// If primary/heuristic selectors didn't find elements, take first visible sensible fallback
		let resolvedUserEl = userEl;
		let resolvedPassEl = passEl;
		if (!resolvedPassEl) {
			resolvedPassEl = Array.from(document.querySelectorAll("input[type='password'], input[autocomplete='current-password']")).find(isVisible) || null;
		}
		if (!resolvedUserEl) {
			// Try email inputs first, then username inputs
			const fallbackSelectors = [
				"input#email",
				"input[id='email']",
				"input[type='email']",
				"input[name='email']",
				"input[autocomplete='email']",
				"input[name='username']",
				"input[autocomplete='username']",
				"input[aria-label*='email' i]",
				"input[aria-label*='Email' i]",
				"input[placeholder*='email' i]",
				"input[placeholder*='Email' i]",
				"input[type='text']"
			];
			for (const selector of fallbackSelectors) {
				const found = document.querySelector(selector);
				if (found && isVisible(found) && found.type !== 'password' && !found.type.includes('hidden')) {
					resolvedUserEl = found;
					dlog('Found user input with fallback selector', selector);
					break;
				}
			}
		}

		// Only require username/email input - password is optional
		if (!resolvedUserEl) {
			dlog('No visible username/email input found', { resolvedUserEl: Boolean(resolvedUserEl), resolvedPassEl: Boolean(resolvedPassEl) });
			return;
		}

		dlog('Attempting to fill', { usernameOrEmail: usernameOrEmail ? `${usernameOrEmail.substring(0, 3)}...` : 'empty', hasPass: Boolean(password), hasPassField: Boolean(resolvedPassEl) });

		// Fill username/email (required)
		let uOk = setInputValue(resolvedUserEl, usernameOrEmail);
		
		// Fill password only if both password value and password field exist (optional)
		let pOk = false;
		if (password && resolvedPassEl) {
			pOk = setInputValue(resolvedPassEl, password);
		} else if (password && !resolvedPassEl) {
			dlog('Password provided but no password field found');
		} else if (!password) {
			dlog('No password provided, skipping password fill');
			pOk = true; // Consider it successful since password is optional
		}
		
		// Verify values were actually set
		const userAfter = resolvedUserEl.value || '';
		const passAfter = resolvedPassEl ? (resolvedPassEl.value || '') : '';
		dlog('After first fill attempt', { userSet: userAfter.length > 0, passSet: passAfter.length > 0, userLen: userAfter.length, passLen: passAfter.length });

		// Retry briefly in case the framework hydrates and resets values
		for (let i = 0; i < 5 && (!uOk || (password && resolvedPassEl && !pOk)); i++) {
			await new Promise(r => setTimeout(r, 200));
			// Re-fetch elements in case they were replaced
			const freshUser = resolvedUserEl.isConnected ? resolvedUserEl : (document.querySelector(userSelectorToUse) || resolvedUserEl);
			const freshPass = resolvedPassEl && resolvedPassEl.isConnected ? resolvedPassEl : (document.querySelector(passSelectorToUse) || resolvedPassEl);
			uOk = uOk || setInputValue(freshUser, usernameOrEmail);
			if (password && freshPass) {
				pOk = pOk || setInputValue(freshPass, password);
			}
			dlog(`Retry ${i + 1}`, { uOk, pOk, userVal: freshUser.value?.substring(0, 3) || 'empty', passVal: freshPass && freshPass.value ? '***' : 'empty' });
		}
		
		// Final check
		const finalUserVal = resolvedUserEl.value || '';
		const finalPassVal = resolvedPassEl ? (resolvedPassEl.value || '') : '';
		dlog('Final fill result', { uOk, pOk, userFilled: finalUserVal.length > 0, passFilled: finalPassVal.length > 0, haveSubmit: Boolean(submitEl) });

		// Auto-submit is disabled for security - user must manually click submit button
		// Credentials are filled but form submission requires user confirmation
		dlog('Autofill complete. User must manually click submit to sign in.');
		// Form will NOT be submitted automatically - user must click the submit button themselves
	});
}

// Listen for manual trigger from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'TRIGGER_AUTOFILL') {
		dlog('Manual autofill trigger from popup');
		tryAutofill();
		sendResponse({ ok: true });
	}
	return true;
});

// Check for multiple credentials and open popup if needed
async function checkMultipleCredentials() {
	try {
		const host = location.origin;
		dlog('Checking for multiple credentials for', host);
		chrome.runtime.sendMessage({ type: 'CHECK_MULTIPLE_CREDENTIALS', payload: { host } }, (resp) => {
			if (resp && resp.ok && resp.data && resp.data.hasMultiple) {
				dlog('Multiple credentials detected, attempting to open popup');
				// Request background script to open popup
				chrome.runtime.sendMessage({ type: 'OPEN_POPUP_FOR_SELECTION' });
			}
		});
	} catch (e) {
		dlog('checkMultipleCredentials error', String(e?.message || e));
	}
}

// Run autofill on page load
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		setTimeout(() => {
			checkMultipleCredentials();
			tryAutofill();
		}, 500);
		setTimeout(tryAutofill, 2000); // Retry after 2 seconds for slow pages
	});
} else {
	setTimeout(() => {
		checkMultipleCredentials();
		tryAutofill();
	}, 500);
	setTimeout(tryAutofill, 2000);
}

// Re-run autofill on SPA navigations (e.g., Instagram route changes)
(function hookHistory() {
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function() { 
		const r = origPush.apply(this, arguments); 
		setTimeout(() => {
			checkMultipleCredentials();
			tryAutofill();
		}, 100); 
		return r; 
	};
    history.replaceState = function() { 
		const r = origReplace.apply(this, arguments); 
		setTimeout(() => {
			checkMultipleCredentials();
			tryAutofill();
		}, 100); 
		return r; 
	};
    window.addEventListener('popstate', () => {
		setTimeout(() => {
			checkMultipleCredentials();
			tryAutofill();
		}, 100);
	});
})();
