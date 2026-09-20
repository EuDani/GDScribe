export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center border-2 border-line bg-paper text-ink"
      style={{ width: size, height: size, fontSize: size * 0.62 }}
    >
      <span className="text-display leading-none">G</span>
      <span
        className="absolute bottom-[-2px] right-[-2px] border-2 border-line bg-accent-yellow"
        style={{ width: size * 0.4, height: size * 0.4 }}
      />
    </span>
  )
}
