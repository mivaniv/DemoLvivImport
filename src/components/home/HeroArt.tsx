import Image from "next/image";
import { asset } from "@/lib/asset";

// Композиція упаковок для банера — фото товарів без фону (public/home, WebP з прозорістю).
const ITEMS = [
  { src: "/home/viyavo-coffee-classic.webp", alt: "Кава в зернах Viyavo Classic", cls: "left-[0%] top-[6%] h-[64%] w-[32%] -rotate-6 z-0" },
  { src: "/home/barilla-farfalle.webp", alt: "Макарони Barilla Farfalle", cls: "left-[29%] top-[0%] h-[58%] w-[42%] rotate-1 z-0" },
  { src: "/home/viyavo-olyvky-chorni.webp", alt: "Чорні оливки Viyavo", cls: "right-[0%] top-[10%] h-[58%] w-[30%] rotate-3 z-0" },
  { src: "/home/pringles-cheesy-cheese.webp", alt: "Pringles Cheesy Cheese", cls: "left-[22%] bottom-[5%] h-[56%] w-[18%] -rotate-2 z-10" },
  { src: "/home/messis-sik-mango-yabluko-persyk.webp", alt: "Сік Messis манго, яблуко, персик", cls: "left-[42%] bottom-[1%] h-[50%] w-[20%] rotate-2 z-20" },
  { src: "/home/go-on-protein-bar-chocolate.webp", alt: "Протеїновий батончик GO ON", cls: "right-[0%] bottom-[7%] h-[22%] w-[48%] -rotate-6 z-30" },
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
