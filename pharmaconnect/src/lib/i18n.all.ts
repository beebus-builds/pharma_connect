/**
 * Side-effect module that eagerly registers every locale.
 *
 * Only for contexts that genuinely need them all at once — tests, and any future
 * static generation that walks both dictionaries. The browser bundle must *not*
 * import this: it is exactly the weight the dynamic split in `LocaleProvider`
 * exists to avoid.
 */
import { registerDictionary, type Dictionary } from "@/lib/i18n";
import { ne } from "@/lib/i18n.ne";

registerDictionary("ne", ne as Dictionary);

export { ne };
