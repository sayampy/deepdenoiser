/**
 * Reference-counted background processing guard.
 *
 * ONNX inference runs on the JS thread. The native foreground service (plus a
 * partial wake lock) is what keeps that thread alive when the user leaves the
 * app mid-pass. Calling start/stop directly from a screen is fragile: two
 * overlapping denoise passes make the first one's `finally` stop the service
 * out from under the second.
 *
 * All service transitions are serialised and the service stays alive until the
 * last caller has finished. File processing is currently the only caller, but
 * the guard is safe for a future queue of overlapping passes.
 */

import {
  startBackgroundProcessing,
  stopBackgroundProcessing,
} from "@/modules/AudioProcessorModule";

let refCount = 0;
let started = false;
/** All native start/stop transitions run through one chain, in order. */
let chain: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  const next = chain.then(task, task);
  chain = next.catch(() => {});
  return next;
}

export type BackgroundRelease = () => Promise<void>;

/**
 * Acquire the foreground service and return a release function.
 * Concurrent callers share a single service; it is only stopped after the
 * final one releases. A failure to start the service is logged but does not
 * abort the job — denoising in the foreground still works.
 */
export async function acquireBackgroundProcessing(): Promise<BackgroundRelease> {
  refCount++;
  try {
    await enqueue(async () => {
      if (refCount === 0 || started) return;
      try {
        await startBackgroundProcessing();
        started = true;
      } catch (error) {
        console.warn("Could not start background processing service:", error);
      }
    });
  } catch (error) {
    refCount = Math.max(0, refCount - 1);
    throw error;
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    refCount = Math.max(0, refCount - 1);
    await enqueue(async () => {
      if (refCount !== 0 || !started) return;
      try {
        await stopBackgroundProcessing();
        started = false;
      } catch (error) {
        console.warn("Could not stop background processing service:", error);
      }
    });
  };
}

