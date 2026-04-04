"use client";

import { useAuiState, useMessagePartText } from "@assistant-ui/react";
import { code } from "@streamdown/code";
import { memo, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

import { cn } from "#/lib/utils";

const BACKLOG_THRESHOLD = 100; // characters
const ANIMATE_OPTIONS = { duration: 15, stagger: 5, sep: "word" } as const;

const MarkdownTextImpl = () => {
	const part = useMessagePartText();
	const isLastMessage = useAuiState((s) => s.message.isLast);
	const isRunning = useAuiState((s) => s.message.status?.type === "running");
	const caret = isRunning && isLastMessage ? "block" : undefined;
	const text =
		part.type === "text" || part.type === "reasoning" ? part.text : "";

	return (
		<Streamdown
			animated={false}
			caret={caret}
			className={cn("aui-md text-sm leading-6")}
			isAnimating={isRunning}
			plugins={{ code }}
			shikiTheme={["github-light", "github-dark"]}
		>
			{text}
		</Streamdown>
	);
};

export const MarkdownText = memo(MarkdownTextImpl);
