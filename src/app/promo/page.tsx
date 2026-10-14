import type { Metadata } from "next";
import { catalogPage } from "@/components/catalog/CatalogScreen";

export const metadata: Metadata = { title: "Акції" };

export default catalogPage("sale");
