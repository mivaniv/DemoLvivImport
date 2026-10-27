// Дані компанії та тексти — з чинного сайту lvivimport.com.

export const COMPANY = {
  name: "Львівімпорт",
  legalName: 'ТОВ "ЛЬВІВІМПОРТ"',
  edrpou: "43440447",
  legalAddress: "Україна, 79053, Львівська обл., місто Львів, вул. Володимира Великого, будинок 2",
  address: "79004, м. Львів, вул. В. Великого, 2",
  mapUrl: "https://goo.gl/maps/zAoAkp24P4LyxKjf8",
  mapEmbed: "https://www.google.com/maps?q=%D0%9B%D1%8C%D0%B2%D1%96%D0%B2%2C+%D0%B2%D1%83%D0%BB.+%D0%92%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BC%D0%B8%D1%80%D0%B0+%D0%92%D0%B5%D0%BB%D0%B8%D0%BA%D0%BE%D0%B3%D0%BE%2C+2&output=embed",
  foundedYear: 2020,
};

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const OFFICE = { title: "Офіс", phone: "+38 (067) 011 22 12", email: "info@lvivimport.com" };
export const WAREHOUSE = { title: "Склад", phone: "+38 (067) 011 22 13", email: "sklad@lvivimport.com" };
export const MAIN_PHONE = { label: OFFICE.phone, href: tel(OFFICE.phone) };

export const WAREHOUSE_HOURS = "08:00 - 19:00";
export const HOURS = ["Пн. - Сб.: 08:00 - 18:00", `Склад: ${WAREHOUSE_HOURS}`];

export const DEPARTMENTS = [
  { title: "Керівник відділу продажу", phone: "+38 (067) 011 22 17", email: "natalia.riabchykova@lvivimport.com" },
  { title: "Бухгалтерія", phone: "+38 (067) 011 22 40", email: "buhgalteriya@lvivimport.com" },
  { title: "Відділ закупівель", phone: "+38 (067) 011 22 56", email: "anastasiia.oliynik@lvivimport.com" },
  { title: "Відділ маркетингу", phone: "+38 (067) 011 22 60", email: "olga.moroz@lvivimport.com" },
  { title: "Відділ національних мереж", phone: "+38 (067) 011 22 97", email: "Mykola.Ryabchikov@lvivimport.com" },
].map((d) => ({ ...d, phoneHref: tel(d.phone) }));

export const phoneHref = tel;

export const SOCIALS = {
  facebook: "https://www.facebook.com/Lvivimport",
  instagram: "https://www.instagram.com/lvivimport_2020/",
  telegram: "https://t.me/lvivimport",
  viber: "viber://chat?number=%2B380670112212",
  tiktok: "https://www.tiktok.com/@lvivimport",
};

export const HERO_TAGLINE = "«Львівімпорт» провідна компанія імпортер високоякісних продуктів харчування європейських виробників";

export const HOME_ABOUT = [
  "Львівімпорт є провідною компанією імпортером високоякісних продуктів харчування європейських виробників. Ми використовуємо знання та досвід, аналізуємо світові ринки, щоб дати нашим клієнтам інноваційні продукти і найкращу якість, досконалі у всіх відношеннях.",
  "Наявність попиту, спільна пристрасть, праця та відданість нашої команди стали причинами того, що ми стрімко розвиваємося. Наша діяльність зосереджена довкола сертифікованої продукції що призначена для різних вікових категорій. Як результат, асортимент наших продуктів представлений у багатьох локальних та місцевих мережах України.",
];

export const ABOUT = {
  intro: [
    "ЛЬВІВІМПОРТ - це провідний західноукраїнський імпортер високоякісних продуктів харчування європейських виробників. Попит, спільні цінності, наполеглива праця та відданість нашої команди змушують нас динамічно розвиватися. Ми аналізуємо світові ринки, щоб надавати нашим клієнтам високоякісні продукти найкращої якості, ідеальні у всіх відношеннях.",
    "Ми постійно розширюємо власний автопарк та постійно вдосконалюємо систему транспортної логістики, щоб забезпечувати наших партнерів та українських споживачів якісними продуктами харчування.",
    "Наша діяльність спрямована на сертифіковану продукцію, призначену для різних вікових категорій. Завдяки цьому наш асортимент представлений у багатьох національних та регіональних мережах України.",
  ],
  clients: [
    "Постійно зростаючий попит змушує нас розширювати асортимент імпортованих продуктів та шукати партнерів для довготривалої співпраці. Як результат, ми набули досвіду і готові широко відкрити український ринок збуту для своїх партнерів.",
    "Ключовими цінностями компанії завжди є: клієнтоорієнтованість, надійність, та довіра.",
    "А кожен новий день ми розпочинаємо з одним простим наміром: робити краще, аніж напередодні.",
  ],
  values: [
    {
      title: "Клієнтоорієнтованість",
      text: "Довіра є наріжним каменем будь-яких ділових відносин, тому ми зосереджуємось на тому, щоб завоювати довіру наших клієнтів, надаючи виняткові послуги, забезпечуючи стабільну якість продукції та полегшуючи ведення бізнесу з нами. Наша мета — створити цінність для кожного клієнта, створюючи рішення, які покращують та полегшують їхню діяльність в довготерміновій перспективі.",
    },
    {
      title: "Цілісність",
      text: "Ми тримаємо слово і цінуємо довіру понад усе. Наша чесність дозволила нам витримати випробування часом і побудувати взаємовигідні відносини з нашими співробітниками, нашими клієнтами, нашими діловими партнерами та громадою.",
    },
    {
      title: "Підприємництво",
      text: "Ми цінуємо та плекаємо підприємницький дух у нашій організації. Продовжуючи розвивати нашу компанію та диверсифікувати нашу діяльність, ми зберігаємо довгострокову перспективу та залишаємось відкритими для нових ідей та інновацій. Наші співробітники підтверджують цю філософію завдяки своїй прихильності до досконалості та цілей організації.",
    },
    {
      title: "Сімейний дух",
      text: "Наша організація – як сім’я. А наша сім’я представляє собою один з наших основних пріоритетів. Ми виховуємо почуття причетності, заохочуючи командну роботу та підтримуючи ініціативи співробітників, які сприяють нашому спільному успіху та розвитку. Ми визнаємо цінність і внесок кожної людини в нашій організації.",
    },
  ],
};

// Переваги з картки товару на lvivimport.com
export const PRODUCT_PERKS = ["Швидке відправлення замовлення", "Зручні способи оплати", "Якість та гарантія на продукцію"];

const logo = (dir: string) => (file: string, name: string) => ({ src: `/site/${dir}/${file}`, name });
const c = logo("clients");
const b = logo("brands");

export const CLIENTS = [
  c("1epitsentr.png", "Епіцентр"), c("2metro.svg", "Metro"), c("3blyzenko.svg", "Близенько"), c("4avrora.png", "Аврора"),
  c("5halytska-zdoba.jpg", "Галицька здоба"), c("6halytska-svizhyna.png", "Галицька свіжина"), c("7rodynna-kovbaska.svg", "Родинна ковбаска"),
  c("8ie-take_2.png", "Є таке"), c("9mkhp.png", "МХП"), c("10kopiiochka.png", "Копійочка"), c("11delikat.svg", "Делікат"),
  c("12obzhora.svg", "Обжора"), c("13torba.png", "Торба"), c("14podorozhnyk.png", "Подорожник"), c("15kolo.svg", "Коло"),
  c("16rost.svg", "Рост"), c("17birset.png", "Бірсет"), c("18iehactronom.png", "Єгастроном"), c("19alma.png", "Alma"),
  c("20ekonom.svg", "Економ"), c("21delvi.svg", "Delvi"), c("22silverlend-.svg", "Сільверленд"), c("23iunyk.png", "Юнік"),
  c("24ambar.png", "Амбар"), c("24imprtmarket.png", "Імпорт маркет"), c("25tryde.jpg", "Tryde"), c("26broliia.svg", "Бролія"),
  c("28sam-market.png", "Сам маркет"), c("29bazilik.jpg", "Базилік"), c("30ievrosmak.jpg", "Євросмак"),
  c("31domashnii-market.svg", "Домашній маркет"), c("32zabiiaka.png", "Забіяка"), c("ekspres24.svg", "Експрес 24"),
  c("7-kramar.jpg", "7 Крамар"), c("vash-lavash.jpg", "Ваш лаваш"), c("mida.jpg", "Міда"), c("beiker-market.png", "Бейкер маркет"),
];

export const BRAND_LOGOS = [
  b("1-messis.svg", "Messis"), b("2-viiavo.svg", "Viyavo"), b("1-barilla.png", "Barilla"), b("2-pringles-logo.png", "Pringles"),
  b("3-capri-sun.png", "Capri-Sun"), b("4-helcom.png", "Helcom"), b("5-dallmayr.png", "Dallmayr"), b("6-lavazza.png", "Lavazza"),
  b("7-alpinella.png", "Alpinella"), b("8-schogetten.png", "Schogetten"), b("9-dowtona.png", "Dawtona"), b("10-mlekovita.png", "Mlekovita"),
  b("11-polmlek.png", "Polmlek"), b("12-fiesta.png", "Fiesta"), b("13-sante.png", "Sante"), b("14-tomadini.png", "Tomadini"),
  b("15-hutesa.png", "Hutesa"), b("16-mk.png", "MK"), b("17-kruger.png", "Krüger"), b("18-emix.png", "Emix"), b("19-grand.png", "Grand"),
  b("20-bite-the-world.png", "Bite the World"), b("21-athina.png", "Athina"), b("22-el-sabor.png", "El Sabor"),
  b("23-amor-di-pane.png", "Amor di Pane"), b("24-yoo-hoo.png", "Yoo-hoo"), b("25-minutka.png", "Minutka"), b("26-rodzinna.png", "Rodzinna"),
  b("27-green-garden.png", "Green Garden"), b("28-krawpak.png", "Krawpak"), b("29-celiko.png", "Celiko"), b("30-capri.png", "Capri"),
  b("31-kriss.png", "Kriss"), b("32-citles.png", "Citles"), b("33-fortuna.png", "Fortuna"),
  b("34-storck-werthers-orirginal.png", "Werther's Original"), b("35-storck-mamba.png", "Mamba"), b("36-storck-knoppers.png", "Knoppers"),
  b("37-jacobs.png", "Jacobs"), b("38-kucharek.png", "Kucharek"), b("39-laciate.png", "Łaciate"), b("40-lowicz.png", "Łowicz"),
];

export const GALLERY = ["1", "9", "8", "7", "6", "5", "4", "3", "2"].map((n) => `/site/gallery/${n}.jpg`);
