// Статична збірка (GitHub Pages): сервера немає, тож відвідувач завжди гість.
// next.config підставляє цей модуль замість session.ts.
import type { Viewer } from "./session";

export type { Viewer };

export async function getViewer(): Promise<Viewer | null> {
  return null;
}
