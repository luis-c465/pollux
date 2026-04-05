import * as Comlink from "comlink";
import type { SearchWorkerApi } from "#/lib/search-worker";

// ---------------------------------------------------------------------------
// Singleton search worker — instantiated once, reused across the app.
// ---------------------------------------------------------------------------

let proxy: Comlink.Remote<SearchWorkerApi> | undefined;
let worker: Worker | undefined;

/**
 * Returns a Comlink proxy to the search worker. The worker (and its FlexSearch
 * index + IndexedDB persistence) lives in a dedicated thread — all heavy
 * work happens off the main thread.
 */
export function getSearchWorker(): Comlink.Remote<SearchWorkerApi> {
	if (!proxy) {
		worker = new Worker(new URL("./search-worker.ts", import.meta.url), {
			type: "module",
		});
		proxy = Comlink.wrap<SearchWorkerApi>(worker);
	}
	return proxy;
}

/** Terminate the worker and release the proxy. */
export function terminateSearchWorker(): void {
	if (proxy) {
		proxy[Comlink.releaseProxy]();
		proxy = undefined;
	}
	if (worker) {
		worker.terminate();
		worker = undefined;
	}
}
