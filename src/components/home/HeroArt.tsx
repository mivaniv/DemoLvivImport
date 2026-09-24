import Image from "next/image";

// Композиція упаковок для банера. Шляхи — до згенерованих демо-ілюстрацій;
// коли з'являться маркетингові фото, їх достатньо підставити сюди.
const ITEMS = [
  { src: "/demo/products/makarony-barilla-penne-rigate-500-h.svg", cls: "left-[2%] top-[4%] w-[56%] -rotate-6 z-10" },
  { src: "/demo/products/kava-vivavo-caffe-crema-1-kh.svg", cls: "right-[-2%] top-[-2%] w-[56%] rotate-3 z-0" },
  { src: "/demo/products/dzhem-messis-polunytsia-280-h.svg", cls: "left-[20%] bottom-[-2%] w-[52%] z-30" },
  { src: "/demo/products/olyvky-helcom-zeleni-bez-kistochky-340-h.svg", cls: "right-[0%] bottom-[2%] w-[46%] z-20" },
  { src: "/demo/products/vafli-messis-z-kremom-180-h.svg", cls: "left-[-6%] bottom-[8%] w-[40%] -rotate-3 z-20" },
];

export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[1.05] w-full max-w-[560px]">
      <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-brand-100 via-white to-brand-50 blur-2xl" />
      <div className="absolute left-[10%] top-[12%] size-[78%] rounded-full border border-brand-100" />
      {ITEMS.map((item) => (
        <div key={item.src} className={`absolute aspect-square ${item.cls}`}>
          <Image src={item.src} alt="" fill unoptimized loading="eager" className="object-contain drop-shadow-xl" />
        </div>
      ))}
      <p className="absolute -left-4 top-[50%] z-40 hidden max-w-40 -rotate-12 font-script text-2xl leading-6 text-brand-600 sm:block">
        Європейська якість на вашій полиці
      </p>
    </div>
  );
}
