import Image, { type ImageProps } from "next/image";

/** All photography passes through one consistent treatment so stock and
 *  real club photos read as a single set: slight desaturation, gentle
 *  contrast, never lifted blacks. Swap-in of real imagery = same slot. */
export function ClubImage({ className = "", alt, ...rest }: ImageProps) {
  return (
    <div className={`relative overflow-hidden bg-charcoal ${className}`}>
      <Image
        alt={alt}
        {...rest}
        className="object-cover [filter:saturate(0.82)_contrast(1.05)]"
        fill
      />
    </div>
  );
}
