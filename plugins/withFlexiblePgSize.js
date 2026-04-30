const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs/promises');
const path = require('path');

/**
 * Expo config plugin to enable 16KB page alignment for locally compiled native libraries.
 * 
 * Specifically targets libonnxruntime-jsi.so which is compiled from source in 
 * onnxruntime-react-native's Android build.
 */
module.exports = function withFlexiblePgSize(config, props = {}) {
  const gradleFile = props.gradleFile;

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const filePath = path.join(config.modRequest.projectRoot, gradleFile);

      try {
        let contents = await fs.readFile(filePath, 'utf8');

        const flag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
        
        if (contents.includes(flag)) {
          console.log(`ℹ️ ${flag} already present in ${gradleFile}`);
          return config;
        }

        // Use regex to find cmake arguments blocks and append the flag.
        // It looks for arguments followed by a list of strings, and inserts before the last string's closing quote
        // or just appends to the list if it matches the known structure.
        
        const anchor = /arguments\s+((?:".*",\s+)*)".*"/g;
        
        if (!anchor.test(contents)) {
          // Fallback to literal search if regex fails
          const literalAnchor = '"-DUSE_NNAPI=${!useQnn}"';
          if (contents.includes(literalAnchor)) {
             contents = contents.replaceAll(
                literalAnchor,
                `${literalAnchor},\n            "${flag}"`
              );
          } else {
            throw new Error(`Anchor for CMake arguments not found in ${gradleFile}`);
          }
        } else {
          // Reset regex index for replaceAll
          anchor.lastIndex = 0;
          contents = contents.replaceAll(anchor, (match) => {
             // Append the flag to the arguments list
             return match.replace(/"$/, `",\n            "${flag}"`);
          });
        }

        await fs.writeFile(filePath, contents);
        console.log(`✅ Added ${flag} to all matching blocks in ${gradleFile}`);
      } catch (e) {
        console.warn(`⚠️ Could not patch ${gradleFile}:`, e.message);
      }

      return config;
    },
  ]);
};
