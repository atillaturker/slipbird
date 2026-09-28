/** A random, time-ordered local id (receipts, items, taxes). Not a security token. */
export function createId(now = Date.now(), random = Math.random): string {
  const time = now.toString(36).padStart(9, '0');
  let rand = '';
  for (let i = 0; i < 12; i += 1) rand += Math.floor(random() * 36).toString(36);
  return `${time}${rand}`;
}
