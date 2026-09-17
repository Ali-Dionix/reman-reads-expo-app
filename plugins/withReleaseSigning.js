// A release build is signed with the house's upload key, not the template's
// debug key.
//
// Expo's prebuild writes android/app/build.gradle with ONE signing config,
// `debug` (the debug.keystore every Android SDK ships, password "android"),
// and points the release build type at it, with a comment saying not to. Up
// to build v7 (17 Sep 2026) every APK went out that way — fine for the
// owner's phone over adb, not for a download the website hands to readers:
// anyone with the SDK holds the same key, and a Play Store build made under a
// real key could never update an installed copy.
//
// This plugin adds a `release` signing config that reads four Gradle
// properties — RR_UPLOAD_STORE_FILE, RR_UPLOAD_STORE_PASSWORD,
// RR_UPLOAD_KEY_ALIAS, RR_UPLOAD_KEY_PASSWORD — and points the release build
// type at it WHEN THE FIRST ONE IS SET. They live in the builder's own
// ~/.gradle/gradle.properties (never in the repo; prebuild rewrites
// android/gradle.properties anyway), so a machine without the key still
// builds, debug-signed, exactly as before. The key itself is in C:\rr\keys on
// the owner's PC, with a README saying to back it up.
//
// The edit is a text transform on the generated file, which is what a config
// plugin is; `transformBuildGradle` is exported on its own so the same
// transform can be run against a build.gradle that already exists (the short
// build clone, which is not re-prebuilt for every build).

const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // the house's upload key, when this machine has it (see plugins/withReleaseSigning.js)
            if (project.hasProperty('RR_UPLOAD_STORE_FILE')) {
                storeFile file(RR_UPLOAD_STORE_FILE)
                storePassword RR_UPLOAD_STORE_PASSWORD
                keyAlias RR_UPLOAD_KEY_ALIAS
                keyPassword RR_UPLOAD_KEY_PASSWORD
            }
        }
    }`;

function transformBuildGradle(contents) {
  if (contents.includes("RR_UPLOAD_STORE_FILE")) return contents; // already done
  const before = contents;
  contents = contents.replace(
    /    signingConfigs \{\n        debug \{\n            storeFile file\('debug\.keystore'\)\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        \}\n    \}/,
    SIGNING,
  );
  contents = contents.replace(
    /(        release \{\n(?:            \/\/[^\n]*\n)*)            signingConfig signingConfigs\.debug\n/,
    "$1            signingConfig project.hasProperty('RR_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug\n",
  );
  if (contents === before) throw new Error("withReleaseSigning: build.gradle did not match the template this plugin knows");
  return contents;
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (c) => {
    c.modResults.contents = transformBuildGradle(c.modResults.contents);
    return c;
  });

module.exports = withReleaseSigning;
module.exports.transformBuildGradle = transformBuildGradle;
