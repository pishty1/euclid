import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const commit = process.env.GITHUB_SHA;
if (!/^[0-9a-f]{40}$/.test(commit || '')) throw new Error('Set GITHUB_SHA to the source commit');
const js = readFileSync('docs/js/main.js');
const hash = createHash('sha256').update(js).digest('hex').slice(0, 16);
const asset = `js/main-${hash}.js`;
const template = readFileSync('docs/index.html', 'utf8');
const html = template.replace(/src="js\/main\.js(?:\?[^"]*)?"/, `src="${asset}"`);
if (html === template) throw new Error('Production script reference not found');
mkdirSync('dist/js', { recursive: true });
mkdirSync('dist/images', { recursive: true });
writeFileSync(`dist/${asset}`, js);
writeFileSync('dist/index.html', html);
copyFileSync('docs/images/fav.png', 'dist/images/fav.png');
writeFileSync('dist/release.json', JSON.stringify({ commit, asset }) + '\n');
console.log(`Packaged ${commit}: ${asset}`);
