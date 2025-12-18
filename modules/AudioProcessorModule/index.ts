// Reexport the native module. On web, it will be resolved to AudioProcessorModule.web.ts
// and on native platforms to AudioProcessorModule.ts
export { default } from './src/AudioProcessorModule';
export { default as AudioProcessorModuleView } from './src/AudioProcessorModuleView';
export * from  './src/AudioProcessorModule.types';
