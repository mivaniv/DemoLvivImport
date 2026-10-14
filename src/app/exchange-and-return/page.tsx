import type { Metadata } from "next";
import { TextPage } from "@/components/ui/TextPage";
import { returnsPage } from "@/content/legal";

export const metadata: Metadata = { title: returnsPage.title };

export default function Page() {
  return <TextPage title={returnsPage.title} text={returnsPage.text} />;
}
