const fs = require('fs');
const path = require('path');

// This script is located in the 'android' directory.
// node_modules is likely in the project root (one level up).
const ortAndroidDir = path.resolve(__dirname, '..', 'node_modules', 'onnxruntime-react-native', 'android');
const buildGradlePath = path.join(ortAndroidDir, 'build.gradle');
const cmakeListsPath = path.join(ortAndroidDir, 'CMakeLists.txt');

function patchBuildGradle() {
    if (!fs.existsSync(buildGradlePath)) {
        console.warn(`File not found: ${buildGradlePath}`);
        return;
    }
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    const flag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
    
    if (!content.includes(flag)) {
        console.log('Patching build.gradle...');
        // Find arguments in externalNativeBuild { cmake { ... } }
        // Attempt to insert into arguments list or string
        const regex = /(arguments\s+)(['"]|\[)/;
        if (regex.test(content)) {
            content = content.replace(
                regex,
                (match, p1, p2) => {
                    if (p2 === '[') return `${p1}['${flag}', `;
                    return `${p1}${p2}${flag}${p2}, ${p2}`;
                }
            );
            fs.writeFileSync(buildGradlePath, content);
            console.log('Successfully patched build.gradle.');
        } else {
            console.warn('Could not find CMake arguments in build.gradle.');
        }
    } else {
        console.log('build.gradle already patched.');
    }
}

function patchCMakeLists() {
    if (!fs.existsSync(cmakeListsPath)) {
        console.warn(`File not found: ${cmakeListsPath}`);
        return;
    }
    let content = fs.readFileSync(cmakeListsPath, 'utf8');
    const linkerOption = 'target_link_options(onnxruntimejsi PRIVATE "-Wl,-z,max-page-size=16384" "-Wl,-z,common-page-size=16384")';
    
    if (!content.includes('max-page-size=16384')) {
        console.log('Patching CMakeLists.txt...');
        // Append to the end of the file or after target_link_libraries if exists
        if (content.includes('target_link_libraries(onnxruntimejsi')) {
            content = content.replace(/(target_link_libraries\(onnxruntimejsi[^\)]*\))/, `$1\n${linkerOption}`);
        } else {
            content += `\n${linkerOption}\n`;
        }
        fs.writeFileSync(cmakeListsPath, content);
        console.log('Successfully patched CMakeLists.txt.');
    } else {
        console.log('CMakeLists.txt already patched.');
    }
}

console.log('Starting onnxruntime-react-native patches...');
patchBuildGradle();
patchCMakeLists();
console.log('Patching complete.');
