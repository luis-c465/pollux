"use client";

import { useAuiState, useMessagePartText } from "@assistant-ui/react";
import { createCodePlugin } from "@streamdown/code";
import { createMathPlugin } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { memo } from "react";
import { Streamdown } from "streamdown";
import 'katex/dist/katex.min.css';

import { cn } from "#/lib/utils";

const code = createCodePlugin({
  themes: ['github-light', 'github-dark'], // [light, dark]
});

const math = createMathPlugin({
  singleDollarTextMath: true, // Enable $...$ syntax (default: false)
  errorColor: '#dc2626',      // Custom error color (default: "var(--color-muted-foreground)")
});

const MarkdownTextImpl = () => {
	const part = useMessagePartText();
	const isLastMessage = useAuiState((s) => s.message.isLast);
	const isRunning = useAuiState((s) => s.message.status?.type === "running");
	const caret = isRunning && isLastMessage ? "circle" : undefined;
	const text =
		part.type === "text" || part.type === "reasoning" ? part.text : "";

	return (
		<Streamdown
			animated={false}
			caret={caret}
			className={cn("aui-md text-sm leading-6")}
			isAnimating={isRunning}
			plugins={{ code, math, mermaid }}
			shikiTheme={["github-light", "github-dark"]}
		>
			{text}
		</Streamdown>
	);
};

export const MarkdownText = memo(MarkdownTextImpl);
