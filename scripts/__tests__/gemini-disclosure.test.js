// docs/RELEASE.md tells the owner exactly which sentences to remove if Gemini billing is enabled.
// This keeps that list true: every sentence it quotes must still exist in the file it names.
const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

const DISCLOSURES = [
  ['docs/privacy/index.html', "Google may use text sent through the free tier of its Gemini API to improve its products; see the providers' policies:"],
  ['docs/privacy/index.html', 'Google, Gemini API’sinin ücretsiz katmanı üzerinden gönderilen metni ürünlerini geliştirmek için kullanabilir; sağlayıcıların politikaları:'],
  ['src/i18n/en.json', 'Google may use text sent through its free tier to improve its products.'],
  ['src/i18n/tr.json', 'Google, ücretsiz katmanı üzerinden gönderilen metni ürünlerini geliştirmek için kullanabilir.'],
];

describe('Gemini billing disclosure', () => {
  const release = read('docs/RELEASE.md');

  it.each(DISCLOSURES)('%s still contains the sentence RELEASE.md says to remove', (file, sentence) => {
    expect(read(file)).toContain(sentence);
    expect(release).toContain(sentence);
    expect(release).toContain(`\`${file}\``);
  });

  it('is in exactly the places RELEASE.md lists (no other copy of the sentence)', () => {
    const files = ['docs/privacy/index.html', 'src/i18n/en.json', 'src/i18n/tr.json'];
    const count = files.reduce((n, f) => n + (read(f).match(/ürünlerini geliştirmek|improve its products/g) ?? []).length, 0);
    expect(count).toBe(DISCLOSURES.length);
  });
});
