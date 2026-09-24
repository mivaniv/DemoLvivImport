import type { PackshotSpec } from "../src/lib/packshots";

// Демонстраційний асортимент для локальної розробки. Після підключення 1С
// ці дані перезаписуються імпортом (ключ — externalId).

export const categories = [
  { externalId: "cat-pasta", slug: "makaronni-vyroby", name: "Макаронні вироби", sortOrder: 1 },
  { externalId: "cat-sauces", slug: "sousy-dzhemy-namazky", name: "Соуси, джеми, намазки", sortOrder: 2 },
  { externalId: "cat-coffee", slug: "kava", name: "Кава", sortOrder: 3 },
  { externalId: "cat-canned", slug: "olyvky-konservy", name: "Оливки, консерви", sortOrder: 4 },
  { externalId: "cat-sweets", slug: "vafli-ta-solodoshchi", name: "Вафлі та солодощі", sortOrder: 5 },
];

export const brands = [
  { externalId: "br-messis", slug: "messis", name: "MESSIS", country: "Польща" },
  { externalId: "br-vivavo", slug: "vivavo", name: "VIVAVO", country: "Італія" },
  { externalId: "br-barilla", slug: "barilla", name: "Barilla", country: "Італія" },
  { externalId: "br-helcom", slug: "helcom", name: "HELCOM", country: "Польща" },
];

type DemoProduct = {
  externalId: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  netWeight: string;
  unitsPerBox: number;
  inStock: boolean;
  isPopular?: boolean;
  description: string;
  attributes?: [string, string][];
  packshot: PackshotSpec;
};

const jam = (title: string, fill: string, accent: string) =>
  ({ kind: "jar", brand: "MESSIS", title, subtitle: "EXTRA JAM", weight: "280 g", fill, accent }) as const;

export const products: DemoProduct[] = [
  {
    externalId: "00-00001201", sku: "MESS-STR-280", name: "Джем MESSIS Полуниця, 280 г",
    category: "cat-sauces", brand: "br-messis", netWeight: "280 г", unitsPerBox: 9, inStock: true, isPopular: true,
    description: "Джем MESSIS Полуниця — це насичений смак стиглої полуниці, виготовлений за традиційними європейськими рецептами. Ідеально підходить для сніданків, десертів та професійного використання у HoReCa.",
    attributes: [["Вміст фруктів", "50 г на 100 г"], ["Термін придатності", "18 місяців"]],
    packshot: jam("Strawberry", "#c8202e", "#d8232f"),
  },
  {
    externalId: "00-00001202", sku: "MESS-APR-280", name: "Джем MESSIS Абрикос, 280 г",
    category: "cat-sauces", brand: "br-messis", netWeight: "280 г", unitsPerBox: 9, inStock: true,
    description: "Ніжний абрикосовий джем із шматочками фруктів. Підходить для випічки, сирників і сніданків.",
    attributes: [["Вміст фруктів", "50 г на 100 г"], ["Термін придатності", "18 місяців"]],
    packshot: jam("Apricot", "#f08a1c", "#e5770c"),
  },
  {
    externalId: "00-00001203", sku: "MESS-BLC-280", name: "Джем MESSIS Чорна смородина, 280 г",
    category: "cat-sauces", brand: "br-messis", netWeight: "280 г", unitsPerBox: 9, inStock: true,
    description: "Джем із чорної смородини з яскравою кислинкою. Добре поєднується з млинцями та десертами.",
    attributes: [["Вміст фруктів", "50 г на 100 г"], ["Термін придатності", "18 місяців"]],
    packshot: jam("Blackcurrant", "#3a1233", "#5b1a50"),
  },
  {
    externalId: "00-00001204", sku: "MESS-CHR-280", name: "Джем MESSIS Вишня, 280 г",
    category: "cat-sauces", brand: "br-messis", netWeight: "280 г", unitsPerBox: 9, inStock: false,
    description: "Вишневий джем з насиченим кольором і глибоким смаком стиглих ягід.",
    attributes: [["Вміст фруктів", "50 г на 100 г"], ["Термін придатності", "18 місяців"]],
    packshot: jam("Cherry", "#8e0f1f", "#a3122a"),
  },
  {
    externalId: "00-00001205", sku: "MESS-RSP-280", name: "Джем MESSIS Малина, 280 г",
    category: "cat-sauces", brand: "br-messis", netWeight: "280 г", unitsPerBox: 9, inStock: true,
    description: "Малиновий джем з ароматом свіжих ягід для сніданків, випічки та десертів.",
    attributes: [["Вміст фруктів", "50 г на 100 г"], ["Термін придатності", "18 місяців"]],
    packshot: jam("Raspberry", "#c2185b", "#d81b60"),
  },
  {
    externalId: "00-00002101", sku: "VIV-CRM-1000", name: "Кава VIVAVO Caffè Crema, 1 кг",
    category: "cat-coffee", brand: "br-vivavo", netWeight: "1 кг", unitsPerBox: 6, inStock: true, isPopular: true,
    description: "Кава в зернах Caffè Crema з м'яким смаком і щільною пінкою. Оптимальний вибір для кав'ярень, офісів і HoReCa.",
    attributes: [["Тип", "Зерно"], ["Обсмаження", "Середнє"], ["Склад", "70% арабіка, 30% робуста"]],
    packshot: { kind: "bag", brand: "VIVAVO", title: "CAFFÈ CREMA", subtitle: "COFFEE BEANS", weight: "1 kg", color: "#1d1a19", accent: "#c9a25b" },
  },
  {
    externalId: "00-00002102", sku: "VIV-ESP-1000", name: "Кава VIVAVO Espresso Intenso, 1 кг",
    category: "cat-coffee", brand: "br-vivavo", netWeight: "1 кг", unitsPerBox: 6, inStock: true,
    description: "Інтенсивний еспресо-бленд з нотами какао та карамелі. Розрахований на професійні кавомашини.",
    attributes: [["Тип", "Зерно"], ["Обсмаження", "Темне"], ["Склад", "50% арабіка, 50% робуста"]],
    packshot: { kind: "bag", brand: "VIVAVO", title: "ESPRESSO", subtitle: "INTENSO", weight: "1 kg", color: "#5a1a14", accent: "#e0b36a" },
  },
  {
    externalId: "00-00002103", sku: "VIV-GRD-250", name: "Кава мелена VIVAVO Classico, 250 г",
    category: "cat-coffee", brand: "br-vivavo", netWeight: "250 г", unitsPerBox: 12, inStock: true,
    description: "Мелена кава для турки, гейзерної кавоварки та фільтра. Збалансований смак на щодень.",
    attributes: [["Тип", "Мелена"], ["Обсмаження", "Середнє"]],
    packshot: { kind: "bag", brand: "VIVAVO", title: "CLASSICO", subtitle: "GROUND COFFEE", weight: "250 g", color: "#1f3a5f", accent: "#d6b36c" },
  },
  {
    externalId: "00-00003101", sku: "BAR-PEN-500", name: "Макарони Barilla Penne Rigate, 500 г",
    category: "cat-pasta", brand: "br-barilla", netWeight: "500 г", unitsPerBox: 12, inStock: true, isPopular: true,
    description: "Класичні пере з рифленою поверхнею, що добре тримають соус. Виготовлені з твердих сортів пшениці.",
    attributes: [["Час варіння", "11 хв"], ["Склад", "Борошно з твердих сортів пшениці, вода"]],
    packshot: { kind: "box", brand: "Barilla", title: "PENNE RIGATE", number: "N°73", weight: "500 g", color: "#1f4fa3", shape: "penne" },
  },
  {
    externalId: "00-00003102", sku: "BAR-SPG-500", name: "Макарони Barilla Spaghetti n.5, 500 г",
    category: "cat-pasta", brand: "br-barilla", netWeight: "500 г", unitsPerBox: 24, inStock: true,
    description: "Спагеті середньої товщини — універсальна основа для більшості італійських страв.",
    attributes: [["Час варіння", "9 хв"], ["Склад", "Борошно з твердих сортів пшениці, вода"]],
    packshot: { kind: "box", brand: "Barilla", title: "SPAGHETTI", number: "N°5", weight: "500 g", color: "#1f4fa3", shape: "spaghetti" },
  },
  {
    externalId: "00-00003103", sku: "BAR-FUS-500", name: "Макарони Barilla Fusilli, 500 г",
    category: "cat-pasta", brand: "br-barilla", netWeight: "500 г", unitsPerBox: 12, inStock: true,
    description: "Спіральки фузілі для салатів, запіканок і густих соусів.",
    attributes: [["Час варіння", "10 хв"], ["Склад", "Борошно з твердих сортів пшениці, вода"]],
    packshot: { kind: "box", brand: "Barilla", title: "FUSILLI", number: "N°98", weight: "500 g", color: "#1f4fa3", shape: "fusilli" },
  },
  {
    externalId: "00-00003104", sku: "BAR-FAR-500", name: "Макарони Barilla Farfalle, 500 г",
    category: "cat-pasta", brand: "br-barilla", netWeight: "500 г", unitsPerBox: 12, inStock: false,
    description: "Метелики фарфалле — для легких соусів, салатів і дитячого меню.",
    attributes: [["Час варіння", "11 хв"], ["Склад", "Борошно з твердих сортів пшениці, вода"]],
    packshot: { kind: "box", brand: "Barilla", title: "FARFALLE", number: "N°65", weight: "500 g", color: "#1f4fa3", shape: "farfalle" },
  },
  {
    externalId: "00-00004101", sku: "HEL-GRN-340", name: "Оливки HELCOM зелені без кісточки, 340 г",
    category: "cat-canned", brand: "br-helcom", netWeight: "340 г", unitsPerBox: 6, inStock: true, isPopular: true,
    description: "Зелені оливки без кісточки в розсолі. Для закусок, салатів і піци.",
    attributes: [["Маса після відціджування", "150 г"], ["Упаковка", "Скляна банка"]],
    packshot: { kind: "jar", brand: "HELCOM", title: "Green Olives", subtitle: "PITTED", weight: "340 g", fill: "#8a9a2b", accent: "#4a6b1a", lid: "solid", lidColor: "#3f6b1f", contents: "olives" },
  },
  {
    externalId: "00-00004102", sku: "HEL-BLK-340", name: "Оливки HELCOM чорні без кісточки, 340 г",
    category: "cat-canned", brand: "br-helcom", netWeight: "340 г", unitsPerBox: 6, inStock: true,
    description: "Чорні оливки без кісточки з м'яким смаком для закусок і гарячих страв.",
    attributes: [["Маса після відціджування", "150 г"], ["Упаковка", "Скляна банка"]],
    packshot: { kind: "jar", brand: "HELCOM", title: "Black Olives", subtitle: "PITTED", weight: "340 g", fill: "#2a2a2e", accent: "#333", lid: "solid", lidColor: "#23262d", contents: "olives" },
  },
  {
    externalId: "00-00004103", sku: "HEL-JAL-340", name: "Оливки HELCOM з перцем халапеньо, 340 г",
    category: "cat-canned", brand: "br-helcom", netWeight: "340 г", unitsPerBox: 6, inStock: true,
    description: "Зелені оливки, фаршировані гострим перцем халапеньо.",
    attributes: [["Маса після відціджування", "150 г"], ["Упаковка", "Скляна банка"]],
    packshot: { kind: "jar", brand: "HELCOM", title: "Jalapeño", subtitle: "STUFFED OLIVES", weight: "340 g", fill: "#6f8f2a", accent: "#b3261e", lid: "solid", lidColor: "#b3261e", contents: "olives" },
  },
  {
    externalId: "00-00005101", sku: "MESS-WAF-180", name: "Вафлі MESSIS з кремом, 180 г",
    category: "cat-sweets", brand: "br-messis", netWeight: "180 г", unitsPerBox: 12, inStock: true, isPopular: true,
    description: "Хрусткі вафлі з ніжним вершковим кремом. Популярна позиція для роздрібу та кав'ярень.",
    attributes: [["Термін придатності", "12 місяців"]],
    packshot: { kind: "pack", brand: "MESSIS", title: "Wafers", subtitle: "cream filling", weight: "180 g", color: "#d3212d", cream: "#fff3d6" },
  },
  {
    externalId: "00-00005102", sku: "MESS-WAC-180", name: "Вафлі MESSIS шоколадні, 180 г",
    category: "cat-sweets", brand: "br-messis", netWeight: "180 г", unitsPerBox: 12, inStock: true,
    description: "Вафлі з шоколадним кремом і насиченим какао-смаком.",
    attributes: [["Термін придатності", "12 місяців"]],
    packshot: { kind: "pack", brand: "MESSIS", title: "Wafers", subtitle: "chocolate filling", weight: "180 g", color: "#5b3420", cream: "#7a4a2d" },
  },
  {
    externalId: "00-00005103", sku: "MESS-WAL-180", name: "Вафлі MESSIS лимонні, 180 г",
    category: "cat-sweets", brand: "br-messis", netWeight: "180 г", unitsPerBox: 12, inStock: false,
    description: "Легкі вафлі з освіжаючим лимонним кремом.",
    attributes: [["Термін придатності", "12 місяців"]],
    packshot: { kind: "pack", brand: "MESSIS", title: "Wafers", subtitle: "lemon filling", weight: "180 g", color: "#e2b325", cream: "#fff6b8" },
  },
];
