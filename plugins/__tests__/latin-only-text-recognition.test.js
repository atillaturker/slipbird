const plugin = require('../withLatinOnlyTextRecognition');

const BUILD_GRADLE = `apply plugin: "com.android.application"

android {
    compileSdk 36
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

describe('addGradleExclusions', () => {
  const result = plugin.addGradleExclusions(BUILD_GRADLE);

  it('excludes the four non-Latin artifacts from every runtime classpath, and only those', () => {
    for (const module of ['chinese', 'devanagari', 'japanese', 'korean']) {
      expect(result).toContain(`exclude group: 'com.google.mlkit', module: 'text-recognition-${module}'`);
    }
    expect(result).not.toMatch(/module: 'text-recognition'/);
    expect(result).toContain("name.toLowerCase().endsWith('runtimeclasspath')");
  });

  it('keeps the original file and is idempotent', () => {
    expect(result.startsWith(BUILD_GRADLE.trimEnd())).toBe(true);
    expect(plugin.addGradleExclusions(result)).toBe(result);
  });
});

describe('addProguardRules', () => {
  it('silences missing-class warnings for the excluded packages, once', () => {
    const result = plugin.addProguardRules('# existing rules\n-keep class a.B\n');
    for (const p of ['chinese', 'devanagari', 'japanese', 'korean']) {
      expect(result).toContain(`-dontwarn com.google.mlkit.vision.text.${p}.**`);
    }
    expect(result).not.toContain('text.latin');
    expect(result).toContain('-keep class a.B');
    expect(plugin.addProguardRules(result)).toBe(result);
  });

  it('works on a missing (empty) rules file', () => {
    expect(plugin.addProguardRules('')).toContain('-dontwarn');
  });
});

describe('plugin', () => {
  it('does nothing when latinOnly is false', () => {
    const config = { name: 'x' };
    expect(plugin(config, { latinOnly: false })).toBe(config);
  });
});
