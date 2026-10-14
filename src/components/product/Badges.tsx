// Позначки як на lvivimport.com: Top (популярні), New (новинки), Sale (акції).
export function Badges({ isPopular, isNew, isSale, className = "" }: { isPopular: boolean; isNew: boolean; isSale: boolean; className?: string }) {
  if (!isPopular && !isNew && !isSale) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {isSale && <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">Sale</span>}
      {isNew && <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">New</span>}
      {isPopular && <span className="rounded-md bg-gold px-2 py-0.5 text-[11px] font-bold uppercase text-navy-900">Top</span>}
    </div>
  );
}
