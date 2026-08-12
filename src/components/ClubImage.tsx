import Image, { type ImageProps } from "next/image";

type Props = Omit<ImageProps, "src"> & { src?: ImageProps["src"] | null };

/** All photography passes through one consistent treatment so stock and
 *  real club photos read as a single set: slight desaturation, gentle
 *  contrast, never lifted blacks. Swap-in of real imagery = same slot.
 *
 *  Falls back to the charcoal ground when no photo exists yet — events
 *  and cars are routinely created before their photography arrives. */
export function ClubImage({ className = "", alt, src, ...rest }: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-slate to-charcoal ${className}`}
    >
      {src && (
        <Image
          alt={alt}
          src={src}
          {...rest}
          fill
          className="object-cover [filter:saturate(0.82)_contrast(1.05)]"
        />
      )}
    </div>
  );
}
