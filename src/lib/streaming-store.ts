import { create } from "zustand";

type StreamingState = {
	runningThreadIds: Set<string>;
	setRunning: (threadId: string, running: boolean) => void;
};

export const useStreamingStore = create<StreamingState>((set) => ({
	runningThreadIds: new Set<string>(),
	setRunning: (threadId, running) => {
		set((state) => {
			const runningThreadIds = new Set(state.runningThreadIds);
			if (running) {
				runningThreadIds.add(threadId);
			} else {
				runningThreadIds.delete(threadId);
			}

			return { runningThreadIds };
		});
	},
}));
