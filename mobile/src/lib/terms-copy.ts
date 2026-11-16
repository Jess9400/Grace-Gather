import type { Language } from "./content";

// Words around the Terms of Use: its title, the onboarding tick and the link.
export const termsCopy: Record<
  Language,
  { title: string; agree: string; read: string; continueNotice: string; signInNotice: string; close: string }
> = {
  en: {
    title: "Terms of Use",
    agree: "I agree to the Terms of Use",
    read: "Read the Terms of Use",
    continueNotice: "By continuing, you agree to the ",
    signInNotice: "By signing in or creating an account, you agree to the ",
    close: "Close",
  },
  pt: {
    title: "Termos de Uso",
    agree: "Concordo com os Termos de Uso",
    read: "Ler os Termos de Uso",
    continueNotice: "Ao continuar, você concorda com os ",
    signInNotice: "Ao entrar ou criar uma conta, você concorda com os ",
    close: "Fechar",
  },
  es: {
    title: "Términos de Uso",
    agree: "Acepto los Términos de Uso",
    read: "Leer los Términos de Uso",
    continueNotice: "Al continuar, aceptas los ",
    signInNotice: "Al iniciar sesión o crear una cuenta, aceptas los ",
    close: "Cerrar",
  },
  ru: {
    title: "Условия использования",
    agree: "Я принимаю Условия использования",
    read: "Прочитать Условия использования",
    continueNotice: "Продолжая, вы принимаете ",
    signInNotice: "Входя в аккаунт или создавая его, вы принимаете ",
    close: "Закрыть",
  },
};
