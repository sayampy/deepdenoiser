import { requireNativeView } from 'expo';
import * as React from 'react';

import { AudioProcessorModuleViewProps } from './AudioProcessorModule.types';

const NativeView: React.ComponentType<AudioProcessorModuleViewProps> =
  requireNativeView('AudioProcessorModule');

export default function AudioProcessorModuleView(props: AudioProcessorModuleViewProps) {
  return <NativeView {...props} />;
}
