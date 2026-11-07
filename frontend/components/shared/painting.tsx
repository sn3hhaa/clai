import { asset, cn } from "@/lib/utils";

/**
 * Full-bleed backdrop: George Inness, "Landscape" (1884 or 1889), The Metropolitan Museum of Art,
 * public domain (Open Access). Gently lifted so the old varnish reads as light, misty green.
 */
export function Painting({ className, position = "center 30%", size = 2400 }: { className?: string; position?: string; size?: 1280 | 2400 }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <picture>
        <source srcSet={asset(`/art/landscape-${size}.webp`)} type="image/webp" />
        <img
        src={asset(`/art/landscape-${size}.jpg`)}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover [filter:brightness(1.18)_saturate(1.08)_contrast(0.94)]"
        style={{ objectPosition: position }}
        />
      </picture>
      <span className="absolute inset-0 bg-gradient-to-b from-[#f4f1dc]/35 via-transparent to-transparent" />
    </div>
  );
}
