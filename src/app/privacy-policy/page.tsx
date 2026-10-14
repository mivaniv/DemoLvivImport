import type { Metadata } from "next";
import { TextPage } from "@/components/ui/TextPage";
import { privacyPage } from "@/content/legal";

export const metadata: Metadata = { title: privacyPage.title };

export default function Page() {
  return <TextPage title={privacyPage.title} text={privacyPage.text} />;
}
