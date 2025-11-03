function toHex(buffer) {
	const bytes = new Uint8Array(buffer);
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		out += bytes[i].toString(16).padStart(2, '0');
	}
	return out;
}

export async function hashPassword(plaintext) {
	if (!plaintext && plaintext !== '') return '';
	const enc = new TextEncoder();
	const data = enc.encode(plaintext);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return toHex(digest);
}
