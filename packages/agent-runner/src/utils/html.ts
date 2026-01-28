export const stripHtml = (html: string): string => {
  if (!html) {
    return "";
  }

  // Replace <br> and <br/> tags with newlines before removing other tags
  const withNewlines = html.replace(/<br\s*\/?>/gi, "\n");

  // Remove all HTML tags
  const withoutTags = withNewlines.replace(/<[^>]*>/g, "");

  // Decode common HTML entities
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'");

  // Normalize multiple spaces to single space
  const normalizedSpaces = decoded.replace(/[ \t]+/g, " ");

  // Clean up multiple newlines (more than 2 consecutive) to max 2
  const normalizedNewlines = normalizedSpaces.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace from start and end of each line
  const trimmedLines = normalizedNewlines
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  // Final trim of the entire string
  return trimmedLines.trim();
};
