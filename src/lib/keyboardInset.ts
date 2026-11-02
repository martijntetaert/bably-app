/**
 * On an iPhone the on-screen keyboard slides over the page without making it shorter, so a
 * sheet pinned to the bottom ends up behind it. This keeps two CSS variables in step with
 * the part of the screen that is really visible: --keyboard-inset (how much the keyboard
 * covers) and --visible-height (what is left above it). While the keyboard is up the root
 * carries data-keyboard="open", so a sheet can drop the home indicator padding the keyboard
 * already covers.
 */

// Smaller differences are the browser toolbar collapsing, not a keyboard.
const KEYBOARD_THRESHOLD = 120;

// iOS reports the final keyboard size late, and sometimes not at all when focus moves from
// one field to the next, so a focus change measures again until the animation has settled.
const SETTLE_DELAYS = [0, 120, 300, 600];

export function trackKeyboardInset(): void {
    const viewport = window.visualViewport;

    if (!viewport) {
        return;
    }

    const root = document.documentElement;
    let frame = 0;

    const keepFocusedFieldInView = (): void => {
        const field = document.activeElement;

        if (
            field instanceof HTMLElement &&
            field.matches('input, textarea, select') &&
            field.closest('.drawer-content, .drawer-sheet')
        ) {
            field.scrollIntoView({ block: 'nearest' });
        }
    };

    const update = (): void => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const covered = Math.max(
                0,
                Math.round(
                    window.innerHeight - viewport.height - viewport.offsetTop,
                ),
            );
            const isOpen = covered > KEYBOARD_THRESHOLD;

            root.style.setProperty('--keyboard-inset', `${covered}px`);
            root.style.setProperty(
                '--visible-height',
                `${Math.round(viewport.height)}px`,
            );
            root.toggleAttribute('data-keyboard', isOpen);

            if (isOpen) {
                requestAnimationFrame(keepFocusedFieldInView);
            }
        });
    };

    const settle = (): void => {
        SETTLE_DELAYS.forEach((delay) => window.setTimeout(update, delay));
    };

    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('focusin', settle);
    window.addEventListener('focusout', settle);
    update();
}
