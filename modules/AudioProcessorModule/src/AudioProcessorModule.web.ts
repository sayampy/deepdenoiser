import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './AudioProcessorModule.types';

type AudioProcessorModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class AudioProcessorModule extends NativeModule<AudioProcessorModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(AudioProcessorModule, 'AudioProcessorModule');
