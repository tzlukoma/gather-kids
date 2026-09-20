import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * The GatherSystem type scale (#380), declared as `--text-*` tokens in
 * `src/app/globals.css`.
 *
 * tailwind-merge has to be told about these. Its default config recognises a
 * font size by its *shape* — `text-sm`, `text-2xl`, `text-[13px]` — and
 * anything else in `text-*` is assumed to be a colour. So `text-display-28`
 * was being filed as a colour, and `cn('text-display-28', 'text-foreground')`
 * dropped the size and kept the colour: the utility never reached the DOM and
 * the element silently rendered at whatever size it inherited.
 *
 * Keep this list in step with the `@theme` block; the unit test in
 * `__tests__/lib/utils-type-scale.test.ts` fails if a token is added there
 * and not here.
 */
export const GATHERSYSTEM_TEXT_TOKENS = [
  "display-28",
  "headline-22",
  "title-18",
  "title-16",
  "body-15",
  "body-14",
  "body-13",
  "label-12",
  "eyebrow-11",
  "scripture-18",
  "scripture-16",
  "mono-12",
  "mono-11",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...GATHERSYSTEM_TEXT_TOKENS] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
