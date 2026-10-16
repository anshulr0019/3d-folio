/** Screenshot previews captured from the live projects and the completed studio. */
export const PROJECT_EXHIBITS = [
  {
    name: "Infyn", category: "CONNECTIONS / PWA", accent: 0xc68f91,
    preview: "/images/projects/infyn.jpg", previewAlt: "Infyn's live welcome and sign-in screen",
    summary: "A mobile-first space for finding your people.",
    focus: "Mobile interaction, onboarding, and responsive UI.",
  },
  {
    name: "DeliveryWatch", category: "DNS MONITORING / SAAS", accent: 0x3d6a58,
    preview: "/images/projects/deliverywatch.jpg", previewAlt: "DeliveryWatch's live DNS monitoring landing page",
    summary: "Make email DNS health easier to understand.",
    focus: "DNS observations, change history, and notification tracking.",
  },
  {
    name: "3D Story Portfolio", category: "INTERACTIVE / WEBGL", accent: 0xb9a164,
    preview: "/images/projects/portfolio.jpg", previewAlt: "The interactive studio inside this portfolio",
    summary: "A small world built to explore.",
    focus: "Three.js scenes, character navigation, and interactive exhibits.",
  },
] as const;
