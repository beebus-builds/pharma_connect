/**
 * Lightweight locale layer (SPECS 3C).
 *
 * Deliberately dependency-free: no route prefixes, so the SEO canonicals and
 * sitemap URLs from Phase 2 stay stable. The active locale is persisted in
 * localStorage and mirrored onto <html lang> for screen readers and `lang`
 * based font/line-breaking.
 *
 * Medicine names stay in Latin script on purpose — that is how they are printed
 * on Nepali medicine strips and pharmacy labels.
 */

export const LOCALES = ["en", "ne"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "pharmaconnect_locale";

const en = {
  "nav.howItWorks": "How it Works",
  "nav.dashboard": "Dashboard",
  "nav.messages": "Messages",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.signOut": "Sign out",
  "nav.login": "Log in",
  "nav.signup": "Sign up",
  "nav.skipToContent": "Skip to content",
  "nav.toggleMenu": "Toggle menu",
  "nav.liteModeOn": "Enable lite mode",
  "nav.liteModeOff": "Disable lite mode",
  "nav.themeLight": "Switch to light mode",
  "nav.themeDark": "Switch to dark mode",
  "nav.language": "Change language",

  "search.placeholder": "Search medicine by generic or brand name...",
  "search.label": "Search medicine",
  "search.clear": "Clear search",
  "search.searching": "Searching medicines…",
  "search.empty": "Start typing to search medicines.",
  "search.noResults": "No medicines found for “{query}”. Try another keyword.",
  "search.recent": "Recent Searches",
  "search.clearRecent": "Clear",
  "search.matches": "{count} Match for “{query}”|{count} Matches for “{query}”",
  "search.loadMore": "Show more medicines",
  "search.loadingMore": "Loading more…",
  "search.suggestions": "Search suggestions",
  "search.recentList": "Recent searches",
  "search.searchFailed": "Search failed",
  "search.loadMoreFailed": "Could not load more medicines",
  "search.clearRecentAria": "Clear recent searches",

  "home.welcomeBack": "Welcome back",
  "home.searchNearby": "Search medicines available near you",
  "home.subtitle": "Live stock from verified pharmacies across Nepal. Find it, request it, chat — no wasted trips.",
  "home.searchCta": "Find medicines",
  "home.howItWorks": "How it works",
  "home.resultsFor": "Results for",
  "home.pharmaciesNearby": "pharmacies nearby",
  "home.readyPrompt": "Ready to find your medicine?",
  "home.listView": "List",
  "home.mapView": "Map",
  "home.useLocation": "Use my location",
  "home.radius": "Radius",
  "home.verified": "Verified",
  "home.inStock": "In stock",
  "home.lowStock": "Low stock",
  "home.outOfStock": "Out of stock",
  "home.request": "Request",
  "home.call": "Call",
  "home.report": "Report this listing",
  "home.noResults": "No pharmacies found with this medicine in range. Try widening the radius.",
  "offline.banner": "You are offline. Cached medicine pages still work.",
  "offline.title": "You are offline",
  "offline.body": "PharmaConnect needs a connection the first time you open a page. Once a medicine catalog is cached you can still browse it without data.",
  "offline.retry": "Try again",
  "offline.cached": "Browse cached medicines",

  "footer.tagline": "Empowering patients and pharmacies across Nepal with real-time availability data, reducing healthcare friction, and saving precious time.",
  "footer.quickLinks": "Quick Links",
  "footer.stayUpdated": "Stay Updated",
  "footer.searchMedicines": "Search Medicines",
  "footer.userLogin": "User Login",
  "footer.joinPharmacy": "Join as Pharmacy",
  "footer.emailPlaceholder": "Email address",
  "footer.subscribe": "Subscribe",
  "footer.subscribed": "Thanks for subscribing!",
  "footer.privacy": "Privacy Policy",
  "footer.terms": "Terms of Service",
  "footer.contact": "Contact",

  "auth.welcomeBack": "Welcome back",
  "auth.loginSubtitle": "Sign in to your PharmaConnect account",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "auth.forgotPassword": "Forgot password?",
  "auth.signIn": "Sign in",
  "auth.emailNotVerified": "Email not verified yet.",
  "auth.emailNotVerifiedHint": "Check your inbox (and spam) for the verification link, or resend it:",
  "auth.sending": "Sending…",
  "auth.resendVerification": "Resend verification email",
  "auth.noAccount": "Don't have an account?",
  "auth.createOne": "Create one",
  "auth.backHome": "Back to homepage",
  "auth.invalidCredentials": "Invalid email or password",
  "auth.verifyFirst": "Please verify your email first — we can resend the link below.",
  "auth.registerTitle": "Create your account",
  "auth.registerSubtitle": "Start finding medicines near you",
  "auth.fullName": "Full name",
  "auth.iAm": "I am a",
  "auth.rolePatient": "Patient",
  "auth.rolePharmacy": "Pharmacy",
  "auth.pharmacyName": "Pharmacy name",
  "auth.licenseNumber": "Drug licence number",
  "auth.address": "Address",
  "auth.phone": "Phone",
  "auth.pinLocation": "Pin your shop location",
  "auth.pinHint": "Click the map or drag the pin to your exact shop entrance.",
  "auth.noAccountYet": "Already have an account?",
  "auth.forgotTitle": "Reset your password",
  "auth.forgotSubtitle": "We will email you a reset link.",
  "auth.sendResetLink": "Send reset link",
  "auth.linkSent": "If that email exists, a reset link is on its way.",
  "auth.backToLogin": "Back to login",
  "auth.newPassword": "New password",
  "auth.newPasswordHint": "Choose something strong and unique.",
  "auth.confirmPassword": "Confirm password",
  "auth.updatePassword": "Update password",
  "auth.passwordUpdated": "Password updated. You can sign in now.",
  "auth.resetInvalid": "This reset link is invalid or has expired.",
} as const;

export type MessageKey = keyof typeof en;

const ne: Record<MessageKey, string> = {
  "nav.howItWorks": "कसरी काम गर्छ",
  "nav.dashboard": "ड्यासबोर्ड",
  "nav.messages": "सन्देश",
  "nav.profile": "प्रोफाइल",
  "nav.settings": "सेटिङ",
  "nav.signOut": "साइन आउट",
  "nav.login": "लगइन",
  "nav.signup": "दर्ता गर्नुहोस्",
  "nav.skipToContent": "सामग्रीमा जानुहोस्",
  "nav.toggleMenu": "मेनु खोल्नुहोस्",
  "nav.liteModeOn": "लाइट मोड सक्रिय गर्नुहोस्",
  "nav.liteModeOff": "लाइट मोड बन्द गर्नुहोस्",
  "nav.themeLight": "हल्का रङमा जानुहोस्",
  "nav.themeDark": "गाढा रङमा जानुहोस्",
  "nav.language": "भाषा बदल्नुहोस्",

  "search.placeholder": "जेनेरिक वा ब्रान्ड नामबाट औषधि खोज्नुहोस्...",
  "search.label": "औषधि खोज्नुहोस्",
  "search.clear": "खोज हटाउनुहोस्",
  "search.searching": "औषधि खोज्दै...",
  "search.empty": "औषधि खोज्न टाइप गर्नुहोस्।",
  "search.noResults": "“{query}” का लागि कुनै औषधि भेटिएन। अर्को शब्द प्रयास गर्नुहोस्।",
  "search.recent": "हालका खोजहरू",
  "search.clearRecent": "हटाउनुहोस्",
  "search.matches": "“{query}” का लागि {count} मिलान",
  "search.loadMore": "थप औषधि देखाउनुहोस्",
  "search.loadingMore": "थप लोड हुँदै...",
  "search.suggestions": "खोज सुझाव",
  "search.recentList": "हालका खोजहरू",
  "search.searchFailed": "खोज असफल भयो",
  "search.loadMoreFailed": "थप औषधि लोड गर्न सकिएन",
  "search.clearRecentAria": "हालका खोजहरू हटाउनुहोस्",

  "home.welcomeBack": "पुनः स्वागत छ",
  "home.searchNearby": "तपाईंको नजिकका औषधि खोज्नुहोस्",
  "home.subtitle": "नेपालभरिका प्रमाणित फार्मेसीहरूको वास्तविक स्टक। खोज्नुहोस्, अनुरोध गर्नुहोस्, कुराकानी गर्नुहोस् — भ्रमण व्यर्थ नहोस्।",
  "home.searchCta": "औषधि खोज्नुहोस्",
  "home.howItWorks": "कसरी काम गर्छ",
  "home.resultsFor": "नतिजा",
  "home.pharmaciesNearby": "नजिकका फार्मेसीहरू",
  "home.readyPrompt": "आफ्नो औषधि खोज्न तयार हुनुहुन्छ?",
  "home.listView": "सूची",
  "home.mapView": "नक्सा",
  "home.useLocation": "मेरो स्थान प्रयोग गर्नुहोस्",
  "home.radius": "दायरा",
  "home.verified": "प्रमाणित",
  "home.inStock": "स्टकमा",
  "home.lowStock": "कम स्टक",
  "home.outOfStock": "स्टक समाप्त",
  "home.request": "अनुरोध",
  "home.call": "कल गर्नुहोस्",
  "home.report": "यस सूचीको रिपोट गर्नुहोस्",
  "home.noResults": "यस दायरामा यस औषधिको कुनै फार्मेसी भेटिएन। दायरा बढाउनुहोस्।",
  "offline.banner": "तपाईं अफलाइन हुनुहुन्छ। क्यास गरिएका पृष्ठहरू अझै चल्छन्।",
  "offline.title": "तपाईं अफलाइन हुनुहुन्छ",
  "offline.body": "पहिलो पटक पृष्ठ खोल्दा PharmaConnect लाई इन्टरनेट चाहिन्छ। औषधि सूची क्यास भएपछि तपाईं डाटा बिना नै हेर्न सक्नुहुन्छ।",
  "offline.retry": "पुनः प्रयास",
  "offline.cached": "क्यास गरिएका औषधि हेर्नुहोस्",

  "footer.tagline": "वास्तविक उपलब्धताको डाटाका माध्यमबाट नेपालभरिका बिरामी र फार्मेसीलाई सशक्त बनाउने, स्वास्थ्य सेवामा बाधा घटाउने र बहुमूल्य समय बचाउने।",
  "footer.quickLinks": "छिटो लिंकहरू",
  "footer.stayUpdated": "अद्यावधिक रहनुहोस्",
  "footer.searchMedicines": "औषधि खोज्नुहोस्",
  "footer.userLogin": "प्रयोगकर्ता लगइन",
  "footer.joinPharmacy": "फार्मेसीको रूपमा जोडिनुहोस्",
  "footer.emailPlaceholder": "इमेल ठेगाना",
  "footer.subscribe": "सदस्यता लिनुहोस्",
  "footer.subscribed": "सदस्यता लिनुभएकोमा धन्यवाद!",
  "footer.privacy": "गोपनीयता नीति",
  "footer.terms": "सेवाका सर्तहरू",
  "footer.contact": "सम्पर्क",

  "auth.welcomeBack": "पुनः स्वागत छ",
  "auth.loginSubtitle": "आफ्नो PharmaConnect खातामा लगइन गर्नुहोस्",
  "auth.email": "इमेल",
  "auth.password": "पासवर्ड",
  "auth.showPassword": "पासवर्ड देखाउनुहोस्",
  "auth.hidePassword": "पासवर्ड लुकाउनुहोस्",
  "auth.forgotPassword": "पासवर्ड बिर्सनुभयो?",
  "auth.signIn": "लगइन",
  "auth.emailNotVerified": "इमेल अझै प्रमाणित भएको छैन।",
  "auth.emailNotVerifiedHint": "प्रमाणीकरण लिंकका लागि इनबक्स (र स्प्याम) हेर्नुहोस्, वा पुनः पठाउनुहोस्:",
  "auth.sending": "पठाउँदै...",
  "auth.resendVerification": "प्रमाणीकरण इमेल पुनः पठाउनुहोस्",
  "auth.noAccount": "खाता छैन?",
  "auth.createOne": "खाता खोल्नुहोस्",
  "auth.backHome": "गृहपृष्ठमा फर्कनुहोस्",
  "auth.invalidCredentials": "इमेल वा पासवर्ड मिलेन",
  "auth.verifyFirst": "कृपया पहिले इमेल प्रमाणीकरण गर्नुहोस् — तलबाट लिंक पुनः पठाउन सकिन्छ।",
  "auth.registerTitle": "आफ्नो खाता खोल्नुहोस्",
  "auth.registerSubtitle": "नजिकका औषधि खोज्न सुरु गर्नुहोस्",
  "auth.fullName": "पूरा नाम",
  "auth.iAm": "म",
  "auth.rolePatient": "बिरामी",
  "auth.rolePharmacy": "फार्मेसी",
  "auth.pharmacyName": "फार्मेसीको नाम",
  "auth.licenseNumber": "औषधि अनुमतिपत्र नम्बर",
  "auth.address": "ठेगाना",
  "auth.phone": "फोन",
  "auth.pinLocation": "पसलको स्थान पिन गर्नुहोस्",
  "auth.pinHint": "नक्सामा क्लिक गर्नुहोस् वा पिनलाई आफ्नो पसलको ढोकासम्म तान्नुहोस्।",
  "auth.noAccountYet": "पहिले नै खाता छ?",
  "auth.forgotTitle": "पासवर्ड रिसेट गर्नुहोस्",
  "auth.forgotSubtitle": "हामी तपाईंलाई इमेलमा रिसेट लिंक पठाउनेछौं।",
  "auth.sendResetLink": "रिसेट लिंक पठाउनुहोस्",
  "auth.linkSent": "त्यो इमेल भएमा रिसेट लिंक पठाइएको छ।",
  "auth.backToLogin": "लगइनमा फर्कनुहोस्",
  "auth.newPassword": "नयाँ पासवर्ड",
  "auth.newPasswordHint": "बलियो र फरक पासवर्ड छान्नुहोस्।",
  "auth.confirmPassword": "पासवर्ड पुष्टि गर्नुहोस्",
  "auth.updatePassword": "पासवर्ड अद्यावधिक गर्नुहोस्",
  "auth.passwordUpdated": "पासवर्ड अद्यावधिक भयो। अब लगइन गर्न सक्नुहुन्छ।",
  "auth.resetInvalid": "यो रिसेट लिंक मान्य छैन वा म्याद सकिएको छ।",
};

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, ne };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  if (isLocale(value)) return value;
  const base = value.toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : null;
}

type Params = Record<string, string | number>;

/** Resolve the `A|B` plural variant for the `count` param, then interpolate. */
function resolvePlural(template: string, count: number | undefined): string {
  if (!template.includes("|")) return template;
  const parts = template.split("|");
  return count === 1 || count === 0 ? parts[0] : parts[parts.length - 1];
}

/** Translate a key. `{placeholders}` are substituted; `A|B` picks by count. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Params
): string {
  const template = dictionaries[locale]?.[key] ?? en[key] ?? key;
  const chosen = resolvePlural(template, params?.count === undefined ? undefined : Number(params.count));
  return Object.entries(params ?? {}).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
    chosen
  );
}

export function getDictionary(locale: Locale): Record<MessageKey, string> {
  return dictionaries[locale] ?? dictionaries.en;
}
