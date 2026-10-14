import type { Metadata } from "next";
import { TextPage } from "@/components/ui/TextPage";
import { termsPage } from "@/content/legal";

export const metadata: Metadata = { title: termsPage.title };

export default function Page() {
  return <TextPage title={termsPage.title} text={termsPage.text} />;
}
