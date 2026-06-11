export function isSampleMode() {
  return process.env.NEXT_PUBLIC_RATING_PROVIDER === "sample";
}
