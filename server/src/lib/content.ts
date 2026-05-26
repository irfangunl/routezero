import type { ChatMessage } from "@routezero/shared/types.js";

// OpenAI-spec message content can be one of:
//   - string                        (plain text)
//   - null                          (assistant with tool_calls only)
//   - Array<ContentBlock>           (multimodal envelope; we extract text only)
//
// routezero accepts the array envelope so clients like opencode and
// continue.dev (which always serialize as arrays) don't 400. Non-text blocks
// are dropped silently — vision/audio aren't supported (see README).
export type ContentTextBlock = { type: "text"; text: string };
export type ContentBlock =
  | ContentTextBlock
  | { type: string; [key: string]: unknown };

export function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (content == null) return "";
  if (Array.isArray(content)) {
    return content
      .map((b) =>
        typeof b === "string"
          ? b
          : (b as ContentTextBlock)?.type === "text"
            ? (b as ContentTextBlock).text
            : "",
      )
      .join("");
  }
  return "";
}

export function flattenMessageContent(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    ...m,
    content: contentToString(m.content),
  }));
}

/** Check if any message contains image_url blocks. */
export function hasImageContent(messages: ChatMessage[]): boolean {
  for (const m of messages) {
    if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if ((block as any).type === "image_url") return true;
      }
    }
  }
  return false;
}

/** Extract image_url blocks from messages, returning { mimeType, base64Data } pairs. */
export function extractImageBlocks(
  messages: ChatMessage[],
): Array<{ mimeType: string; data: string }> {
  const images: Array<{ mimeType: string; data: string }> = [];
  for (const m of messages) {
    if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if ((block as any).type === "image_url") {
          const url: string = (block as any).image_url?.url ?? "";
          if (url.startsWith("data:")) {
            // data:image/{mimeType};base64,{data}
            const match = url.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
              images.push({ mimeType: match[1], data: match[2] });
            }
          } else if (url.startsWith("http")) {
            // URL-based images — store URL to be fetched by provider
            images.push({ mimeType: "url", data: url });
          }
        }
      }
    }
  }
  return images;
}
