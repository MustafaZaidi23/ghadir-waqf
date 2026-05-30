export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        expand(): void;
        close(): void;
        setHeaderColor?(color: string): void;
        setBackgroundColor?(color: string): void;
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          hash: string;
          auth_date: number;
        };
        platform: string;
        colorScheme: "light" | "dark";
      };
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

export function getTelegramUser(): TelegramUser | undefined {
  return getTelegramWebApp()?.initDataUnsafe?.user;
}

export function isInTelegram(): boolean {
  const twa = getTelegramWebApp();
  return !!twa && !!twa.initData && twa.initData.length > 0;
}
