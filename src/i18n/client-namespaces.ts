// What each part of the site hands its client components, following next-intl's guidance to provide only the
// messages Client Components need (lodash `pick` over getMessages()). Server components read the full catalogue
// through the request config and are unaffected. Staff, preview-login and developer copy stay off public pages.
// tests/i18n/client-message-delivery.test.ts walks each segment's imports and checks its list covers every
// useTranslations namespace; add a namespace here when a client component starts reading one.

/**
 * The site layout and the 404: header, menus, theme, footer, error and loading boundaries, plus the shared
 * InlineRetry control (the setlist pages mount it; any page may).
 */
export const shellNamespaces = [
  // The in-place sign-in sheet (src/components/auth/account-sheet.tsx) opens over any page (owner, 24 Nov).
  "AuthPhase",
  "Common",
  "InlineRetry",
  "Interface",
  "MemberAuth",
  "System",
  "Customer.components_shell_header_actions",
  "Customer.components_shell_header_panels",
  "Customer.components_shell_site_menu",
  "Customer.inAppBrowserHelp",
  "Customer.menuButton",
  "Customer.navigation",
  "Customer.panelRows",
  "Customer.themeControl",
  "Verification",
  "VerificationTrial"
] as const;

/** The in-place sign-in sheet's own copy, for layouts outside the site shell (the NFC tap). */
export const accountSheetNamespaces = ["AuthPhase", "Common", "Interface", "MemberAuth", "Verification", "VerificationTrial"] as const;

/** The home page's Warp tuning and sequence panels, which only mount in development. */
export const developmentNamespaces = ["Developer"] as const;

export const shellDelivery: readonly string[] =
  process.env.NODE_ENV === "development"
    ? [...shellNamespaces, ...developmentNamespaces]
    : shellNamespaces;

// The sign-in step, checkout and phone verification appear inline on the purchase and account pages.
const purchase = [
  "AuthPhase",
  "Common",
  "Interface",
  "MemberAuth",
  "PageMetadata",
  "Verification",
  "VerificationTrial",
  "Customer.components_commerce_checkout",
  "Customer.components_commerce_payment",
  "Customer.components_commerce_shipping_address",
  "Customer.components_tickets_ticket_selection",
  "Customer.navigation"
] as const;

/** One list per top-level site segment; its layout.tsx delivers it to that segment's pages. */
export const segmentNamespaces = {
  account: [
    ...purchase,
    "Customer.app_site_me_orders_page",
    "Customer.app_site_me_settings_page_client",
    "Customer.components_tickets_ticket_account_entry"
  ],
  // The standalone sign-in page: the account flow inline (owner, 24 Nov).
  "sign-in": [...purchase],
  essays: [
    "Interface",
    "Customer.components_reading_article_hero",
    "Customer.components_reading_bookmark_button",
    "Customer.components_reading_page_links",
    "Customer.components_reading_reader",
    "Customer.components_reading_stage"
  ],
  me: [
    ...purchase,
    "Customer.app_site_me_page",
    "Customer.app_site_me_settings_account_page_client",
    "Customer.app_site_me_settings_addresses_page",
    "Customer.app_site_me_settings_general_page_client",
    "Customer.app_site_me_settings_notifications_page",
    "Customer.app_site_me_settings_page_client",
    "Customer.app_site_me_settings_security_page_client",
    "Customer.app_site_shop_cart_page",
    "Customer.cartDrawer",
    "Customer.components_commerce_cart",
    "Customer.components_commerce_orders",
    "Customer.components_settings_SettingsRail",
    "Customer.settingsControls",
    "Customer.settingsSections"
  ],
  privacy: ["Customer.policy"],
  refund: ["Customer.policy"],
  shop: [
    ...purchase,
    // A failed shop or checkout read retries in place (CommerceLoadRetry).
    "InlineRetry",
    "Customer.app_site_shop_invitations_page",
    "Customer.components_commerce_book_offer",
    "Customer.components_commerce_cart",
    "Customer.components_commerce_invitation_claim",
    "Customer.components_commerce_offer",
    "Customer.components_commerce_order_admissions"
  ],
  team: ["Customer.app_site_team_page"],
  terms: ["Customer.policy"],
  tickets: [
    // /tickets renders the shop page, including its failed-read retry.
    "InlineRetry",
    ...purchase,
    "Customer.components_commerce_book_offer",
    "Customer.components_commerce_offer",
    "Customer.components_tickets_portone_payment_result"
  ],
  welcome: ["Customer.components_membership_welcome"]
} as const satisfies Record<string, readonly string[]>;
