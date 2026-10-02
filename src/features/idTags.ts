// Account and group IDs are platform-specific strings (QQ numbers, OpenIDs such as 06E88C1E…, Telegram
// usernames), so tag inputs only trim, drop empties and de-duplicate them.

/** Pasting "123, abc 456" adds three tags */
export const ID_TAG_DELIMITER = /[,，\s]+/

export function normalizeIdTags(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(value => value.trim()).filter(Boolean))]
}
