/**
 * Expo config plugin: ship only the Latin text-recognition model on Android.
 *
 * @react-native-ml-kit/text-recognition depends on five ML Kit artifacts (Latin, Chinese, Devanagari, Japanese,
 * Korean). Slipbird reads English and Turkish only, so the other four are dead weight in the download.
 *
 * The library's Java code imports and instantiates the other four recognizer classes, so they cannot be removed
 * from the *compile* classpath (the library would not compile). They are excluded from every runtime classpath
 * instead: the models never reach the APK, and the classes are only touched when a non-Latin script is requested,
 * which Slipbird never does. R8 gets -dontwarn rules so a minified release build does not stop on the missing classes.
 *
 * Options: { latinOnly: false } turns the plugin off (all five models are bundled again).
 */
const fs = require('fs');
const path = require('path');

const MODULES = ['text-recognition-chinese', 'text-recognition-devanagari', 'text-recognition-japanese', 'text-recognition-korean'];
const PACKAGES = ['chinese', 'devanagari', 'japanese', 'korean'];

const GRADLE_START = '// >>> slipbird: Latin-only ML Kit text recognition';
const GRADLE_END = '// <<< slipbird: Latin-only ML Kit text recognition';
const PROGUARD_START = '# >>> slipbird: Latin-only ML Kit text recognition';
const PROGUARD_END = '# <<< slipbird: Latin-only ML Kit text recognition';

/** Appends the runtime-classpath exclusions to app/build.gradle (once). */
function addGradleExclusions(contents) {
  if (contents.includes(GRADLE_START)) return contents;
  const excludes = MODULES.map((m) => `        exclude group: 'com.google.mlkit', module: '${m}'`).join('\n');
  return `${contents.trimEnd()}

${GRADLE_START}
// Only the Latin model is needed (English and Turkish). The non-Latin artifacts stay on the compile classpath because
// the library's Java imports their classes, but are left out of what gets packaged.
configurations.configureEach {
    if (name.toLowerCase().endsWith('runtimeclasspath')) {
${excludes}
    }
}
${GRADLE_END}
`;
}

/** Appends the R8 rules to app/proguard-rules.pro (once). */
function addProguardRules(contents) {
  if (contents.includes(PROGUARD_START)) return contents;
  const rules = PACKAGES.map((p) => `-dontwarn com.google.mlkit.vision.text.${p}.**`).join('\n');
  return `${contents.trimEnd()}\n\n${PROGUARD_START}\n${rules}\n${PROGUARD_END}\n`;
}

function withLatinOnlyTextRecognition(config, { latinOnly = true } = {}) {
  if (!latinOnly) return config;
  const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

  config = withAppBuildGradle(config, (c) => {
    if (c.modResults.language === 'groovy') c.modResults.contents = addGradleExclusions(c.modResults.contents);
    return c;
  });

  return withDangerousMod(config, [
    'android',
    async (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      fs.writeFileSync(file, addProguardRules(current));
      return c;
    },
  ]);
}

module.exports = withLatinOnlyTextRecognition;
module.exports.addGradleExclusions = addGradleExclusions;
module.exports.addProguardRules = addProguardRules;
