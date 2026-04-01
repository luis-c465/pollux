"use client";

import type { SourceMessagePart } from "@assistant-ui/react";
import { ExternalLinkIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "#/lib/utils";

type SourcesProps = SourceMessagePart;

const getHostname = (url: string): string => {
	try {
		const hostname = new URL(url).hostname;
		return hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};

const getFaviconUrl = (url: string): string => {
	try {
		const { hostname } = new URL(url);
		return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
	} catch {
		return "";
	}
};

export const Sources = ({ url, title }: SourcesProps) => {
	const [faviconFailed, setFaviconFailed] = useState(false);
	const hostname = useMemo(() => getHostname(url), [url]);
	const faviconUrl = useMemo(() => getFaviconUrl(url), [url]);

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"mt-2 mr-2 inline-flex max-w-full items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted",
			)}
			title={url}
		>
			{!faviconFailed && faviconUrl ? (
				<img
					src={faviconUrl}
					alt=""
					className="size-4 rounded-sm"
					onError={() => setFaviconFailed(true)}
				/>
			) : (
				<span className="flex size-4 items-center justify-center rounded-sm bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
					{hostname.charAt(0)}
				</span>
			)}
			<span className="truncate">{title || hostname}</span>
			<ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
		</a>
	);
};
