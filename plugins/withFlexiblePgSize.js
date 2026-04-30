const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs/promises');
const path = require('path');

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
          return config;
        }

        // Insert the flag after the first existing cmake argument block you identify.
        // Replace the anchor line below with a line that already exists in that file.
        const anchor = '"-DUSE_NNAPI=${!useQnn}"';
        if (!contents.includes(anchor)) {
          throw new Error(`Anchor not found in ${gradleFile}`);
        }

        contents = contents.replace(
          anchor,
          `${anchor},\n        "${flag}"`
        );

        await fs.writeFile(filePath, contents);
        console.log(`✅ Added ${flag} to ${gradleFile}`);
      } catch (e) {
        console.warn(`⚠️ Could not patch ${gradleFile}:`, e.message);
      }

      return config;
    },
  ]);
};