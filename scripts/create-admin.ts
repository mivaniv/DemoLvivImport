import { createDb } from "./cli";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../src/lib/auth/password";

// Створює адміністратора або оновлює пароль наявного:
//   npm run admin:create -- email@lvivimport.com "надійний-пароль"
const [emailArg, password] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();

if (!email || !password) {
  console.error('Використання: npm run admin:create -- <email> "<пароль>"');
  process.exit(2);
}
if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`Пароль має бути щонайменше ${PASSWORD_MIN_LENGTH} символів`);
  process.exit(2);
}

const db = createDb();

(async () => {
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email },
    create: {
      email, passwordHash, role: "ADMIN", status: "ACTIVE", approvedAt: new Date(),
      company: "Львівімпорт", contactName: "Адміністратор", phone: "+380670112212",
    },
    update: { passwordHash, role: "ADMIN", status: "ACTIVE" },
  });
  await db.session.deleteMany({ where: { userId: user.id } });
  console.log(`Адміністратор ${user.email} готовий. Вхід: /account/login → /admin`);
})().finally(() => db.$disconnect());
