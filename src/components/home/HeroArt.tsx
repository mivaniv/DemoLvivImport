import Image from "next/image";
import { asset } from "@/lib/asset";

// Композиція упаковок для банера — фото товарів без фону (public/home, WebP з прозорістю).
const ITEMS = [
  { src: "/home/viyavo-coffee-classic.webp", alt: "Кава в зернах Viyavo Classic", cls: "left-[4%] top-[3%] h-[70%] w-[36%] -rotate-6 z-0" },
  { src: "/home/viyavo-olyvky-chorni.webp", alt: "Чорні оливки Viyavo", cls: "right-[3%] top-[8%] h-[62%] w-[34%] rotate-3 z-0" },
  { src: "/home/pringles-cheesy-cheese.webp", alt: "Pringles Cheesy Cheese", cls: "left-[36%] top-[2%] h-[70%] w-[26%] rotate-2 z-10" },
  { src: "/home/messis-sik-mango-yabluko-persyk.webp", alt: "Сік Messis манго, яблуко, персик", cls: "left-[18%] bottom-[2%] h-[56%] w-[24%] -rotate-3 z-20" },
  { src: "/home/go-on-protein-bar-chocolate.webp", alt: "Протеїновий батончик GO ON", cls: "right-[2%] bottom-[8%] h-[24%] w-[56%] -rotate-6 z-30" },
];

export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[1.05] w-full max-w-[560px]">
      <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-brand-100 via-white to-brand-50 blur-2xl" />
      <div className="absolute left-[10%] top-[12%] size-[78%] rounded-full border border-brand-100" />
      {ITEMS.map((item) => (
        <div key={item.src} className={`absolute ${item.cls}`}>
          <Image src={asset(item.src)} alt={item.alt} fill unoptimized loading="eager" sizes="300px" className="object-contain drop-shadow-xl" />
        </div>
      ))}
      <p className="absolute -left-14 bottom-[12%] z-40 hidden max-w-36 -rotate-12 font-script text-2xl leading-6 text-brand-600 sm:block">
        Європейська якість на вашій полиці
      </p>
    </div>
  );
}
