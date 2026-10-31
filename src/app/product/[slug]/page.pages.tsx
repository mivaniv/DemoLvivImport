// Окремі сторінки товарів для GitHub Pages: там немає .htaccess, щоб віддавати один шаблон на всі адреси.
// Підключається лише при STATIC_PRODUCT_PAGES=1 (див. pageExtensions у next.config.ts).
export { default, generateMetadata, generateStaticParams } from "./page.server";
