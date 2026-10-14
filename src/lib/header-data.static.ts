// Статична збірка: кошика немає — відвідувач завжди гість.
export async function getHeaderCartCount(_userId: number): Promise<number> {
  return 0;
}
