// dmg подписывается и нотаризуется уже после сборки (scripts/notarize-dmg.sh), поэтому его размер
// и контрольная сумма в latest-mac.yml устаревают. Записываем настоящие.
// node scripts/fix-dmg-yml.js release/latest-mac.yml release/Kompot-1.2.0-arm64.dmg
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [yml, dmg] = process.argv.slice(2);
const data = fs.readFileSync(dmg);
const sha512 = crypto.createHash('sha512').update(data).digest('base64');
const name = path.basename(dmg).replace(/[.]/g, '\\.');
const entry = new RegExp(`(- url: ${name}\\n\\s+sha512: )\\S+(\\n\\s+size: )\\d+`);
const text = fs.readFileSync(yml, 'utf8');
if (!entry.test(text)) {
  console.error(`В ${yml} нет записи о ${path.basename(dmg)}`);
  process.exit(1);
}
fs.writeFileSync(yml, text.replace(entry, (_m, a, b) => `${a}${sha512}${b}${data.length}`));
