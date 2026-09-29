// How wide the app is, chosen per browser and applied before the first paint.
export const APP_WIDTHS = { normal: "1400px", wide: "1760px", full: "100%" } as const;
export type AppWidth = keyof typeof APP_WIDTHS;
export const APP_WIDTH_KEY = "mto.appWidth";

export const appWidthScript = `try{var o=${JSON.stringify(APP_WIDTHS)},k=localStorage.getItem(${JSON.stringify(APP_WIDTH_KEY)});if(k&&Object.prototype.hasOwnProperty.call(o,k))document.documentElement.style.setProperty("--app-width",o[k])}catch(e){}`;
