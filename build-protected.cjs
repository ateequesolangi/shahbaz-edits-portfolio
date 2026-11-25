// Builds the password-protected site in docs/ from the readable site in dist/.
// The whole page (HTML, CSS, scripts and videos.json) is encrypted with AES-256-GCM using a key
// derived from "username:password" (PBKDF2-SHA256, 600k iterations). docs/ only ever holds the
// login page and the encrypted blob, so it is safe to publish publicly.
//
// Usage (PowerShell):  $env:PORTFOLIO_USER='...'; $env:PORTFOLIO_PASSWORD='...'; node build-protected.cjs
const fs = require('node:fs');
const path = require('node:path');
const {webcrypto: crypto} = require('node:crypto');

const user = process.env.PORTFOLIO_USER || '';
const password = process.env.PORTFOLIO_PASSWORD || '';
if (!user || password.length < 12) {
  console.error('Set PORTFOLIO_USER and PORTFOLIO_PASSWORD (at least 12 characters).');
  process.exit(1);
}
const ITERATIONS = 600000;
const src = path.join(__dirname, 'dist');
const out = path.join(__dirname, 'docs');
const read = name => fs.readFileSync(path.join(src, name), 'utf8');

// Inline styles and scripts so the decrypted page needs nothing else from the server.
let html = read('index.html');
const scripts = [];
html = html.replace(/<link rel="stylesheet" href="\.\/styles\.css[^"]*">/, () => '<style>' + read('styles.css') + '</style>');
html = html.replace(/<script src="\.\/(app|share|upload)\.js[^"]*" defer><\/script>\s*/g, (_, name) => { scripts.push(read(name + '.js')); return ''; });
if (scripts.length !== 3) throw new Error('Expected app.js, share.js and upload.js in index.html; found ' + scripts.length);
html = html.replace('<head>', '<head>\n  <meta name="robots" content="noindex, nofollow">');
const bundle = JSON.stringify({html, scripts, videos: read('videos.json')});

(async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(user + ':' + password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt']);
  const data = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, new TextEncoder().encode(bundle)));
  const b64 = bytes => Buffer.from(bytes).toString('base64');
  fs.rmSync(out, {recursive: true, force: true});
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, 'site.enc'), JSON.stringify({v: 1, iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data)}));
  fs.copyFileSync(path.join(__dirname, 'login.html'), path.join(out, 'index.html'));
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  console.log('Built docs/ (' + Math.round(data.length / 1024) + ' KB encrypted).');
})();
