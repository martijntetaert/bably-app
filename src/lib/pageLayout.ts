import { type InjectionKey } from 'vue';

/**
 * Page headers hand their title element to the page around it, which shrinks the visible one
 * into the compact bar as the page scrolls. A page can hold several, one per segment.
 */
export const pageTitleKey: InjectionKey<{ add: (title: HTMLElement) => void; remove: (title: HTMLElement) => void }> =
    Symbol('pageTitle');

/**
 * The selector of where a page's bottom bar goes on an iPhone: outside the scrolling content,
 * because WebKit lets a fixed element inside a scroller scroll along anyway.
 */
export const pageBottomBarKey: InjectionKey<string> = Symbol('pageBottomBar');
