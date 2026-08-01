import React from "react";
import { CONTENT } from "./content";

interface Props {
  sectionId: string;
}

export function ModalContent({ sectionId }: Props) {
  if (sectionId.startsWith("contact")) {
    return <ContactSection />;
  }
  switch (sectionId) {
    case "about":
      return <AboutSection />;
    case "skills":
      return <SkillsSection />;
    case "projects":
      return <ProjectsSection />;
    case "experience":
      return <ExperienceSection />;
    default:
      return <p className="text-gray-400">Section not found.</p>;
  }
}

// ─── About ───────────────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
          👤
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{CONTENT.brand.name}</h3>
          <p className="text-indigo-400">{CONTENT.brand.role}</p>
          <p className="text-gray-500 text-sm mt-1">📍 {CONTENT.about.location}</p>
        </div>
      </div>

      {CONTENT.about.bio.map((para, i) => (
        <p key={i} className="text-gray-300 mb-3 leading-relaxed">
          {para}
        </p>
      ))}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {CONTENT.about.facts.map((fact, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300"
          >
            {fact}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skills ──────────────────────────────────────────────────────────────────
function SkillsSection() {
  return (
    <div>
      <p className="text-gray-400 mb-5 leading-relaxed">
        Technologies and tools I work with every day.
      </p>
      <div className="space-y-4">
        {CONTENT.skills.map((skill) => (
          <div key={skill.name}>
            <div className="flex justify-between mb-1">
              <span className="text-white text-sm font-medium">{skill.name}</span>
              <span className="text-indigo-400 text-sm">{skill.level}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <SkillBar level={skill.level} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillBar({ level }: { level: number }) {
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setWidth(level), 100);
    return () => clearTimeout(t);
  }, [level]);
  return (
    <div
      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
      style={{ width: `${width}%` }}
    />
  );
}

// ─── Projects ────────────────────────────────────────────────────────────────
function ProjectsSection() {
  return (
    <div className="space-y-4">
      {CONTENT.projects.map((p) => (
        <div
          key={p.title}
          className="bg-white/4 border border-white/10 rounded-2xl p-4 hover:border-indigo-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{p.emoji}</span>
            <h3 className="text-white font-bold text-lg">{p.title}</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-3">{p.description}</p>
          <div className="flex flex-wrap gap-2">
            {p.tech.map((t) => (
              <span
                key={t}
                className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-2.5 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Experience ──────────────────────────────────────────────────────────────
function ExperienceSection() {
  return (
    <div>
      <div className="relative pl-6 border-l border-white/15 space-y-8">
        {CONTENT.experience.map((exp, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-indigo-500" />
            <div className="text-xs text-indigo-400 font-mono mb-1">{exp.period}</div>
            <h3 className="text-white font-bold">{exp.role}</h3>
            <p className="text-purple-400 text-sm mb-2">{exp.company}</p>
            <ul className="space-y-1">
              {exp.bullets.map((b, j) => (
                <li key={j} className="text-gray-400 text-sm flex gap-2">
                  <span className="text-indigo-500 mt-0.5">▸</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Contact ─────────────────────────────────────────────────────────────────
function ContactSection() {
  const [sent, setSent] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [msg, setMsg] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div>
      <p className="text-indigo-400 text-sm mb-4 font-medium">
        {CONTENT.contact.availability}
      </p>

      <div className="flex gap-3 mb-6 flex-wrap">
        {CONTENT.contact.socials.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-white/6 border border-white/12 rounded-xl text-sm text-gray-300 hover:border-indigo-400 hover:text-white transition-all"
          >
            <span>{s.emoji}</span>
            <span>{s.name}</span>
          </a>
        ))}
      </div>

      <div className="border-t border-white/10 pt-5">
        <p className="text-gray-400 text-sm mb-1">
          📧{" "}
          <a
            href={`mailto:${CONTENT.contact.email}`}
            className="text-indigo-400 hover:underline"
          >
            {CONTENT.contact.email}
          </a>
        </p>
      </div>

      <div className="mt-5">
        {sent ? (
          <div className="bg-green-500/15 border border-green-500/30 rounded-2xl p-4 text-center">
            <p className="text-green-400 font-semibold">✓ Message sent!</p>
            <p className="text-gray-400 text-sm mt-1">I'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <textarea
              placeholder="Your message..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              required
              rows={4}
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
