// Shared by the picker form (browser) and the /pick page (server).

// "How much time do you have?" in minutes. Anything else means "any length".
export const TIME_LIMITS = [90, 120, 150] as const;

export function isTimeLimit(n: number): n is (typeof TIME_LIMITS)[number] {
  return (TIME_LIMITS as readonly number[]).includes(n);
}
