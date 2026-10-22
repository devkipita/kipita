import { getImageProps, type ImageProps } from "next/image";

export function ImagePreload({
  images,
  fetchPriority = "low",
}: {
  images: ImageProps[];
  fetchPriority?: "high" | "low" | "auto";
}) {
  return (
    <>
      {images.map((image, i) => {
        const { props } = getImageProps(image);
        return (
          <link
            key={`${i}-${props.src}`}
            rel="preload"
            as="image"
            href={props.src}
            imageSrcSet={props.srcSet}
            imageSizes={props.sizes}
            fetchPriority={fetchPriority}
          />
        );
      })}
    </>
  );
}
