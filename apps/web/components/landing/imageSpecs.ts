import type { ImageProps } from "next/image";
import mpesa from "../../public/landing/mpesa.png";
import driver from "../../public/landing/driver.jpg";
import appSearch from "../../public/landing/app-search.png";
import appHome from "../../public/landing/app-home.png";
import appRides from "../../public/landing/app-rides.png";

export const ROUTE_BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA4IDUnPjxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzUnIGZpbGw9JyMyMjMwMjknLz48L3N2Zz4=";

export const mpesaImage = {
  src: mpesa,
  alt: "M-PESA",
  sizes: "96px",
  placeholder: "blur",
} satisfies ImageProps;

export const driverImage = {
  src: driver,
  alt: "A driver at the wheel, about to set off",
  fill: true,
  sizes: "(max-width: 960px) 100vw, 50vw",
  quality: 70,
  placeholder: "blur",
} satisfies ImageProps;

export const phoneImages = {
  left: {
    src: appSearch,
    alt: "Kipita search screen",
    sizes: "(max-width: 640px) 27vw, 210px",
    placeholder: "blur",
  },
  center: {
    src: appHome,
    alt: "Kipita home screen",
    sizes: "(max-width: 640px) 34vw, 250px",
    placeholder: "blur",
  },
  right: {
    src: appRides,
    alt: "Kipita rides screen",
    sizes: "(max-width: 640px) 27vw, 210px",
    placeholder: "blur",
  },
} satisfies Record<string, ImageProps>;

export function routeCardImage(src: string): ImageProps {
  return {
    src,
    alt: "",
    fill: true,
    sizes: "(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw",
    quality: 70,
    placeholder: "blur",
    blurDataURL: ROUTE_BLUR,
  };
}
