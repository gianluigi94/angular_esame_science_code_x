declare module 'vanillajs-datepicker' {
  export class Datepicker {
    constructor(element: HTMLElement, options?: any);
    show(): void;
    hide(): void;
    destroy(): void;
    static locales: Record<string, any>;
  }
}

declare module 'vanillajs-datepicker/locales/it' {
  const it: any;
  export default it;
}
