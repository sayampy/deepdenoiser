import * as fs from 'expo-file-system';
import { NativeModules } from 'react-native';
const { AudioProcessor } = NativeModules;

export async function toWav(file: fs.File): Promise<fs.File> {
    console.log('Converting to WAV:', file.uri);
    if (!AudioProcessor) {
        const errorMessage = "AudioProcessor native module is not available. Make sure it's properly linked.";
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
    try {
        // The native module handles file creation and returns the new URI
        const outputUri = await AudioProcessor.toWav(file.uri);
        console.log('Successfully converted to WAV at', outputUri);
        const outputFile = new fs.File(outputUri);
        return outputFile;
    } catch (error) {
        console.error('Failed to convert to WAV.', error);
        // Re-throw the error to be handled by the caller
        throw new Error(`LiTr conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
