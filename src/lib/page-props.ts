// Явні типи параметрів для сторінок *.server.tsx: next typegen не генерує для них PageProps<"...">.
type Search = Promise<Record<string, string | string[] | undefined>>;

export type SearchPageProps = { searchParams: Search };
export type IdPageProps = { params: Promise<{ id: string }>; searchParams: Search };
