import { NextResponse, type NextRequest } from "next/server";

// HTTP Basic Auth для /admin. Логін і пароль — ADMIN_USER / ADMIN_PASSWORD у .env.
export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) {
    return new NextResponse("Адмінпанель вимкнена: не задано ADMIN_USER / ADMIN_PASSWORD", { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    if (sep > 0 && safeEqual(decoded.slice(0, sep), user) && safeEqual(decoded.slice(sep + 1), password)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Потрібна авторизація", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Lviv Import admin", charset="UTF-8"' },
  });
}

// Порівняння без раннього виходу, щоб час відповіді не підказував правильні символи.
function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
