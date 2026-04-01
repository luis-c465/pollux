import {
	type Attachment,
	type AttachmentAdapter,
	type CompleteAttachment,
	CompositeAttachmentAdapter,
	type PendingAttachment,
} from "@assistant-ui/react";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const DOCUMENT_ACCEPT =
	"text/plain,text/markdown,text/csv,application/json,text/html,text/css,text/javascript,application/pdf";

const TEXT_DOCUMENT_MIME_TYPES = new Set([
	"text/plain",
	"text/markdown",
	"text/csv",
	"application/json",
	"text/html",
	"text/css",
	"text/javascript",
]);

const bytesToMegabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

const readFileAsDataUrl = (file: File) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
		reader.readAsDataURL(file);
	});

const readFileAsText = (file: File) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
		reader.readAsText(file);
	});

const createPendingAttachment = (
	file: File,
	type: PendingAttachment["type"],
): PendingAttachment => ({
	id: crypto.randomUUID(),
	type,
	name: file.name,
	contentType: file.type,
	file,
	status: { type: "requires-action", reason: "composer-send" },
});

class ImageAttachmentAdapter implements AttachmentAdapter {
	public accept = IMAGE_ACCEPT;

	public async add({ file }: { file: File }): Promise<PendingAttachment> {
		if (file.size > MAX_IMAGE_SIZE_BYTES) {
			throw new Error(
				`Image attachments must be 20MB or smaller (received ${bytesToMegabytes(file.size)}MB).`,
			);
		}

		return createPendingAttachment(file, "image");
	}

	public async send(
		attachment: PendingAttachment,
	): Promise<CompleteAttachment> {
		if (attachment.file.size > MAX_IMAGE_SIZE_BYTES) {
			throw new Error(
				`Image attachments must be 20MB or smaller (received ${bytesToMegabytes(attachment.file.size)}MB).`,
			);
		}

		return {
			...attachment,
			status: { type: "complete" },
			content: [
				{
					type: "image",
					image: await readFileAsDataUrl(attachment.file),
				},
			],
		};
	}

	public async remove(_attachment: Attachment): Promise<void> {
		// noop
	}
}

class DocumentAttachmentAdapter implements AttachmentAdapter {
	public accept = DOCUMENT_ACCEPT;

	public async add({ file }: { file: File }): Promise<PendingAttachment> {
		if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
			throw new Error(
				`Document attachments must be 10MB or smaller (received ${bytesToMegabytes(file.size)}MB).`,
			);
		}

		return createPendingAttachment(file, "document");
	}

	public async send(
		attachment: PendingAttachment,
	): Promise<CompleteAttachment> {
		if (attachment.file.size > MAX_DOCUMENT_SIZE_BYTES) {
			throw new Error(
				`Document attachments must be 10MB or smaller (received ${bytesToMegabytes(attachment.file.size)}MB).`,
			);
		}

		const mimeType = attachment.contentType || "text/plain";
		const data = TEXT_DOCUMENT_MIME_TYPES.has(mimeType)
			? await readFileAsText(attachment.file)
			: await readFileAsDataUrl(attachment.file);

		return {
			...attachment,
			status: { type: "complete" },
			content: [
				{
					type: "file",
					filename: attachment.name,
					mimeType,
					data,
				},
			],
		};
	}

	public async remove(_attachment: Attachment): Promise<void> {
		// noop
	}
}

export const compositeAttachmentAdapter = new CompositeAttachmentAdapter([
	new ImageAttachmentAdapter(),
	new DocumentAttachmentAdapter(),
]);
