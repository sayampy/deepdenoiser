# Contributing

Thanks for considering contributing to DeepDenoiser. This is a small personal project, and I'd love your help.

## How to contribute

1. **Fork** the repo and clone your fork.
2. **Create a branch** for your change.
3. **Make your changes** — keep them focused on one thing.
4. **Test** by running the app on a device/emulator:
   ```sh
   bun install
   bunx expo run:android
   ```
5. **Submit a pull request** against `master`. Describe what you changed and why.

## Code style

- TypeScript with strict types.
- Kotlin native modules live in `modules/AudioProcessorModule/`.
- Expo Router file-based routing under `src/app/`.
- I use `bun` for mostly everything.
- Run `bunx expo lint && bunx expo-doctor` before committing.

## Questions?

Open an issue or start a discussion. I'm happy to help.
