export function RatingBadge({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const color = rating >= 8 ? "bg-pitch-500 text-ink" : rating >= 7 ? "bg-blue-400 text-ink" : rating >= 6 ? "bg-amber-300 text-ink" : "bg-rose-400 text-white";
  const sizes = {
    sm: "h-10 w-10 text-sm",
    md: "h-12 w-12 text-base",
    lg: "h-16 w-16 text-2xl",
  };

  return <span className={`grid shrink-0 place-items-center rounded-2xl font-black ${color} ${sizes[size]}`}>{rating.toFixed(1)}</span>;
}
