import { getCartCount } from "@/lib/cart";

// Окремий модуль, щоб у статичній збірці його можна було підмінити (там немає бази).
export const getHeaderCartCount = getCartCount;
