import type { Metadata } from "next";
import { catalogPage } from "@/components/catalog/CatalogScreen";

export const metadata: Metadata = { title: "Популярні позиції" };

export default catalogPage("popular");
