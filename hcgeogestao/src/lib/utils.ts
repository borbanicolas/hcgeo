import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `https://wa.me/<digits>` for opening WhatsApp Web / app; returns null if no digits. */
export function whatsappUrlFromPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Common BR storage: DDD + number without country code — wa.me expects full international format.
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }
  return `https://wa.me/${digits}`;
}
