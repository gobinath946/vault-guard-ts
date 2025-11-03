# SecurePro Autofill Chrome Extension

A Chrome MV3 extension that lets a user log in with SecurePro credentials, fetch synced access credentials (username/password) from the backend, and autofill/submit a target website's login form.

## Features
- Login via popup; token stored in `chrome.storage.local`
- Fetch credentials from SecurePro API via background service worker
- Autofill and optional auto-submit on matching site
- Options page to configure target site, selectors, and API Base URL

## Install (Developer Mode)
1. Build not required (pure JS). Open Chrome → `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select this folder

## Connect to your Backend API
- Default Base URL: `http://localhost:5000`
- You can override it in Options: Extension icon → Options → API Base URL → Save

### Expected Backend Endpoints
- POST `/api/auth/login` → receives `{ email, password: sha256 }` and returns `{ token }`
- GET `/api/extension/by-domain?host=<hostname>` (Authorization: `Bearer <token>`) → returns `{ host, items: Password[] }`
- POST `/api/extension/quick-add` (Authorization: `Bearer <token>`) → accepts `{ username, password, websiteUrl, itemName?, notes? }`

### Auth password hashing (frontend)
- The extension hashes the user-entered password with SHA‑256 before sending to `/api/auth/login`.
- Your backend compares `bcrypt(SHA-256(password))` with the stored hash.

### Vault items (plaintext to backend over HTTPS)
- When creating/syncing password items, the extension sends plaintext `username`, `password`, and `notes`.
- The backend encrypts these fields at rest.

### Running your backend on port 5000 (example: Express)
- Ensure the server listens on port 5000
- Enable CORS for local dev:
```js
import cors from 'cors';
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
```

## Configure Site and Selectors
- Site URL contains: substring of the login page URL (e.g., `yourdomain.com/login`)
- Username selector: e.g., `input[name='username']` or `input[type='email']`
- Password selector: e.g., `input[name='password']`
- Submit selector: e.g., `button[type='submit']`
- Auto submit: toggle on to auto-submit after autofill

## Debugging
- Enable logs: Options → Enable debug logging → Save
- Background logs: chrome://extensions → your extension → Service Worker → Inspect
- Content script logs: open DevTools on the target page → Console
- API tracing: logs show method, URL, payload (hashed for auth), and responses/errors

## Login and Autofill
1. Open the popup and log in with your credentials
2. Optionally click "Sync Credentials Now" to verify connectivity
3. Visit your target website login page; the content script will send `location.hostname` to `GET /api/extension/by-domain`, select the most recent credential, fill the form, and optionally submit

## Notes
- Tokens and timestamps are stored in `chrome.storage.local`
- API Base URL and site configuration are stored in `chrome.storage.sync`
- Content script runs on `<all_urls>` but no-ops unless the URL contains your configured substring

## Security Considerations
- Use HTTPS in non-local environments
- The extension does not persist fetched credentials beyond page fill-in
- Prefer short-lived tokens and rotation on the backend
