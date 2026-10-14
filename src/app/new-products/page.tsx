import type { Metadata } from "next";
import { catalogPage } from "@/components/catalog/CatalogScreen";

export const metadata: Metadata = { title: "Новинки" };

export default catalogPage("new");
