import * as React from 'react';

import { AudioProcessorModuleViewProps } from './AudioProcessorModule.types';

export default function AudioProcessorModuleView(props: AudioProcessorModuleViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
