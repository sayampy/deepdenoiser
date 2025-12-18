import { NativeModule, requireNativeModule } from 'expo';

import { AudioProcessorModuleEvents } from './AudioProcessorModule.types';

declare class AudioProcessorModule extends NativeModule<AudioProcessorModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AudioProcessorModule>('AudioProcessorModule');
