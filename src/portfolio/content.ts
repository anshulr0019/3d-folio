export const CONTENT = {
  brand: {
    name: "Anshul Kumar",
    role: "Full-Stack Developer",
  },
  about: {
    bio: [
      "I'm a full-stack developer passionate about building impactful web apps and SaaS products that solve real problems.",
      "I love working with React, Next.js, TypeScript, and Three.js to create polished, production-ready experiences — from dating apps to email deliverability tools.",
      "Currently pursuing B.Tech in Computer Science, I'm always shipping new projects and exploring the edge of what's possible on the web.",
    ],
    location: "Delhi, India",
    facts: [
      "🎮 Built this portfolio as a 3D game",
      "🚀 21 repos on GitHub & counting",
      "💡 Love building SaaS from scratch",
      "🌙 Best coding time: late nights",
    ],
  },
  skills: [
    { name: "TypeScript / JavaScript", level: 90 },
    { name: "React / Next.js", level: 88 },
    { name: "Node.js / Backend", level: 80 },
    { name: "Three.js / WebGL", level: 72 },
    { name: "Tailwind CSS / Styling", level: 85 },
    { name: "Supabase / Databases", level: 75 },
    { name: "Git / DevOps", level: 78 },
    { name: "Python", level: 65 },
  ],
  projects: [
    {
      title: "Infyn (DateBuddy)",
      description:
        "India's Gen Z dating & connections app. Swipe, match, and find your vibe with people nearby. Features real-time filtering, splash animations, and a buttery-smooth mobile-first PWA experience.",
      tech: ["Next.js", "TypeScript", "Tailwind CSS", "PWA"],
      emoji: "💘",
      link: "https://date-buddy.vercel.app",
      github: "https://github.com/anshulr0019/DateBuddy",
    },
    {
      title: "DeliveryWatch",
      description:
        "Free 24/7 email deliverability & blacklist monitoring SaaS. Continuously checks SPF, DKIM, DMARC, MX records and 8 blacklists every 15 minutes — with instant WhatsApp, Slack & email alerts.",
      tech: ["Next.js", "TypeScript", "Supabase", "DNS APIs"],
      emoji: "📬",
      link: "https://delivery-watch.vercel.app",
      github: "https://github.com/anshulr0019/deliveryWatch",
    },
    {
      title: "3D Story Portfolio",
      description:
        "This very portfolio! A gamified, Three.js-powered 3D world where visitors explore zones to discover my projects, skills, and story — complete with physics, collectibles, and an arcade game.",
      tech: ["Three.js", "TypeScript", "React", "Rapier"],
      emoji: "🌍",
      link: "#",
      github: "https://github.com/anshulr0019/3d-folio",
    },
  ],
  education: [
    {
      degree: "B.Tech in Computer Science",
      institution: "GTB4CEC (Affiliated with GGSIPU)",
      period: "Currently Pursuing",
      highlights: [
        "Building production SaaS apps alongside academics",
        "Shipped 21+ projects across web, mobile, and 3D",
        "Active open-source contributor on GitHub",
      ],
    },
  ],
  experience: [] as Array<{
    role: string;
    company: string;
    period: string;
    bullets: string[];
  }>,
  contact: {
    email: "anshulrajput338@gmail.com",
    phone: "9868595497",
    socials: [
      { name: "GitHub", url: "https://github.com/anshulr0019", emoji: "🐙" },
      { name: "LinkedIn", url: "https://www.linkedin.com/in/anshul-kumar-793502274/", emoji: "💼" },
      { name: "Email", url: "mailto:anshulrajput338@gmail.com", emoji: "📧" },
    ],
    availability: "Available for internships & full-time roles",
  },
};
