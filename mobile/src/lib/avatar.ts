/** Stable pseudorandom assignment: no personal attributes or external avatar service. */
export function avatarVariant(userId: string): number {
  let hash = 2166136261;
  for (const character of userId) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return (hash >>> 0) % 4;
}
