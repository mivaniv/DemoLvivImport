import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { runCleanup } from "@/importer/run-cleanup";
import { runSync } from "@/importer/run-sync";
import { acquireImportLock } from "@/importer/shared";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject("databaseUrl") }) });
const dir = mkdtempSync(path.join(tmpdir(), "lvivimport-test-"));
const opts = { mediaDir: path.join(dir, "media") };

// YML-вивантаження з товарами 1..n (крім пропущених) — щоб моделювати зникнення й повернення товарів.
function feed(ids: number[], name = "feed.xml") {
  const offers = ids
    .map((i) => `<offer id="P${i}" available="true"><name>Товар ${i}</name><categoryId>1</categoryId><picture>https://cdn.example.com/${i}.jpg</picture></offer>`)
    .join("");
  const file = path.join(dir, name);
  writeFileSync(file, `<?xml version="1.0"?><yml_catalog><shop><categories><category id="1">Категорія</category></categories><offers>${offers}</offers></shop></yml_catalog>`);
  return file;
}
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const active = () => db.product.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, select: { externalId: true } }).then((r) => r.map((p) => p.externalId));

beforeEach(async () => {
  await db.$executeRawUnsafe(
    `TRUNCATE "ProductImage", "ProductAttribute", "Product", "Category", "Brand", "ImportRun" RESTART IDENTITY CASCADE`,
  );
});
afterAll(() => db.$disconnect());

describe("синхронізація + прибирання", () => {
  it("створює товари з категорією й фото за посиланням", async () => {
    const r = await runSync(db, feed(range(3)), opts);
    expect(r).toMatchObject({ status: "SUCCESS", fullExport: true, created: 3, updated: 0 });
    const p = await db.product.findUnique({ where: { externalId: "P1" }, include: { images: true, category: true } });
    expect(p?.category?.name).toBe("Категорія");
    expect(p?.images.map((i) => i.url)).toEqual(["https://cdn.example.com/1.jpg"]);
    expect(p?.lastSeenRunId).toBe(r.runId);
  });

  it("товар зник з повного файлу → приховано; повернувся → відновлено", async () => {
    await runSync(db, feed(range(10)), opts);
    expect((await runCleanup(db)).deactivated).toBe(0);

    await runSync(db, feed(range(10).filter((i) => i !== 4 && i !== 7)), opts);
    const cleanup = await runCleanup(db);
    expect(cleanup).toMatchObject({ status: "SUCCESS", deactivated: 2 });
    expect(await active()).not.toContain("P4");
    const hidden = await db.product.findUnique({ where: { externalId: "P4" } });
    expect(hidden?.hiddenAt).toBeInstanceOf(Date);

    const back = await runSync(db, feed(range(10)), opts);
    expect(back.restored).toBe(2);
    expect(await active()).toHaveLength(10);
    expect((await db.product.findUnique({ where: { externalId: "P4" } }))?.hiddenAt).toBeNull();
  });

  it("ціна, штрихкод і позначки з файлу записуються в товар", async () => {
    const r = await runSync(db, path.resolve("data/1c-sample/sample.yml.xml"), opts);
    expect(r.status).toBe("SUCCESS");
    const p = await db.product.findUnique({ where: { externalId: "YML-0001" } });
    expect(Number(p?.price)).toBe(79.9);
    expect(Number(p?.oldPrice)).toBe(86.5);
    expect(p).toMatchObject({ barcode: "8076809513753", minOrder: 6, isNew: true, isSale: true });
  });

  it("повторне прибирання для тієї ж синхронізації не виконується", async () => {
    await runSync(db, feed(range(3)), opts);
    expect((await runCleanup(db)).status).toBe("SUCCESS");
    expect((await runCleanup(db)).message).toMatch(/уже виконано/);
  });

  it("джерело недоступне / порожнє → синхронізація FAILED, прибирання пропущено, каталог без змін", async () => {
    await runSync(db, feed(range(5)), opts);
    await runCleanup(db);

    const missing = await runSync(db, path.join(dir, "no-such-file.xml"), opts);
    expect(missing.status).toBe("FAILED");
    expect((await runCleanup(db)).message).toMatch(/не успішна/);

    const empty = path.join(dir, "empty.xml");
    writeFileSync(empty, "   ");
    expect((await runSync(db, empty, opts)).message).toMatch(/порожній/);

    expect(await active()).toHaveLength(5);
  });

  it("файл лише зі змінами → прибирання не враховує відсутні товари", async () => {
    await runSync(db, feed(range(5)), opts);
    const changes = readFileSync("data/1c-sample/sample.commerceml.xml", "utf8").replace(
      '<Каталог СодержитТолькоИзменения="false">',
      '<Каталог СодержитТолькоИзменения="true">',
    );
    const file = path.join(dir, "changes.xml");
    writeFileSync(file, changes);

    const sync = await runSync(db, file, opts);
    expect(sync).toMatchObject({ status: "SUCCESS", fullExport: false });
    expect((await runCleanup(db)).message).toMatch(/лише зміни/);
    expect(await active()).toHaveLength(7);
  });

  it("запобіжник: не ховає понад 30% каталогу за раз", async () => {
    await runSync(db, feed(range(10)), opts);
    await runSync(db, feed(range(5)), opts);
    const cleanup = await runCleanup(db, { maxRatio: 0.3 });
    expect(cleanup.status).toBe("FAILED");
    expect(cleanup.message).toMatch(/5 з 10/);
    expect(await active()).toHaveLength(10);
  });

  it("одночасний запуск блокується", async () => {
    await runSync(db, feed(range(3)), opts);
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let locked!: () => void;
    const isLocked = new Promise<void>((r) => (locked = r));

    // Інша «задача» тримає блокування, поки ми пробуємо запустити прибирання.
    const holder = db.$transaction(async (tx) => {
      await acquireImportLock(tx);
      locked();
      await held;
    });
    await isLocked;
    const cleanup = await runCleanup(db);
    release();
    await holder;

    expect(cleanup).toMatchObject({ status: "FAILED", message: "Інша задача імпорту вже виконується" });
    expect((await runCleanup(db)).status).toBe("SUCCESS"); // після звільнення — працює
  });
});
