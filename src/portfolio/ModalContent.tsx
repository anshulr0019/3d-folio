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
    case "desk":
      return <WorkstationSection />;
    case "showcase":
      return <ShowcaseSection />;
    case "library":
      return <LibrarySection />;
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

// ─── Workstation & Terminal ──────────────────────────────────────────────────
function WorkstationSection() {
  const [input, setInput] = React.useState("");
  const [history, setHistory] = React.useState<Array<{ command: string; output: string }>>([
    {
      command: "neofetch",
      output: `OS: Creative Developer Studio v2.4
Host: Alex Rivera M3 Max (36GB Unified RAM)
Shell: zsh 5.9 (x86_64-apple-darwin22.0)
DE: Three.js WebGL Engine (ACESFilmic ToneMapping)
Stack: TypeScript, React, Three.js, GLSL Shaders, Next.js, Web Audio
Status: 🟢 Available for full-time & high-impact contracts`,
    },
  ]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    let out = "";
    if (cmd === "help") {
      out = "Available commands: skills, projects, stack, bio, clear, contact";
    } else if (cmd === "skills") {
      out = CONTENT.skills.map((s) => `• ${s.name.padEnd(26)} [${s.level}%]`).join("\n");
    } else if (cmd === "projects") {
      out = CONTENT.projects.map((p) => `${p.emoji} ${p.title}: ${p.description}`).join("\n\n");
    } else if (cmd === "stack") {
      out = "Frontend: TypeScript, Three.js, React, Tailwind, Vite\nBackend: Node.js, WebSockets, Supabase\n3D & Art: Blender, GLSL, GSAP, Web Audio API";
    } else if (cmd === "bio") {
      out = CONTENT.about.bio.join("\n\n");
    } else if (cmd === "clear") {
      setHistory([]);
      setInput("");
      return;
    } else if (cmd === "contact") {
      out = `Email: ${CONTENT.contact.email}\nStatus: ${CONTENT.contact.availability}`;
    } else {
      out = `Command not recognized: "${cmd}". Type "help" for a list of commands.`;
    }

    setHistory((prev) => [...prev, { command: input, output: out }]);
    setInput("");
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="bg-black/70 border border-cyan-500/30 rounded-2xl p-4 shadow-xl overflow-hidden">
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="text-slate-400 font-bold ml-2 text-[11px]">alex@studio-workstation: ~</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">INTERACTIVE CLI</span>
        </div>

        {/* Terminal Output Stream */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin text-slate-300">
          {history.map((h, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span>➜</span>
                <span className="text-purple-400">~</span>
                <span>{h.command}</span>
              </div>
              <pre className="text-slate-300 font-sans text-xs whitespace-pre-wrap leading-relaxed pl-4 border-l border-cyan-500/20">
                {h.output}
              </pre>
            </div>
          ))}
        </div>

        {/* Input Prompt */}
        <form onSubmit={handleCommand} className="flex items-center gap-2 pt-3 mt-3 border-t border-white/10">
          <span className="text-cyan-400 font-bold">➜</span>
          <span className="text-purple-400">~</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type 'help', 'skills', 'projects', 'stack'..."
            className="flex-1 bg-transparent text-white focus:outline-none placeholder-slate-600 text-xs font-mono"
            autoFocus
          />
        </form>
      </div>

      {/* Hardware Rig Specs */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-white/4 border border-white/10 rounded-xl p-3">
          <p className="text-indigo-400 font-bold text-[11px] mb-1">💻 Primary Rig</p>
          <p className="text-slate-300 text-xs font-sans">Apple M3 Max, 36GB RAM, Studio Display 5K</p>
        </div>
        <div className="bg-white/4 border border-white/10 rounded-xl p-3">
          <p className="text-cyan-400 font-bold text-[11px] mb-1">⌨️ Peripherals</p>
          <p className="text-slate-300 text-xs font-sans">Keychron Q1 Pro (Boba U4T), Logitech MX Master 3S</p>
        </div>
      </div>
    </div>
  );
}

// ─── Showcase & Awards ───────────────────────────────────────────────────────
function ShowcaseSection() {
  const awards = [
    { title: "Awwwards Site of the Day Nominee", org: "Awwwards", year: "2024", icon: "🏆" },
    { title: "Three.js Creative Showcase Winner", org: "Three.js Community", year: "2023", icon: "🎖️" },
    { title: "Global Web3 Hackathon 1st Place", org: "EthGlobal", year: "2023", icon: "🥇" },
    { title: "CSS Design Awards - Best UI/UX", org: "CSSDA", year: "2022", icon: "⭐" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm leading-relaxed">
        Key industry recognitions, hackathon podiums, and community accolades for creative frontend engineering.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {awards.map((award, idx) => (
          <div
            key={idx}
            className="bg-white/4 border border-purple-500/30 hover:border-purple-400/60 transition-all rounded-2xl p-4 flex items-start gap-3 shadow-lg"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl flex-shrink-0 shadow-md">
              {award.icon}
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-purple-400 font-mono font-bold">{award.org}</span>
                <span className="text-[10px] text-slate-500 font-mono">{award.year}</span>
              </div>
              <h4 className="text-white font-bold text-sm mt-0.5">{award.title}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-2xl p-4 mt-4">
        <p className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-1">🎮 Specialization</p>
        <p className="text-slate-300 text-xs leading-relaxed">
          Crafting bespoke WebGL experiences, gamified interactive portfolios, real-time shaders, and ultra-high-performance reactive React applications.
        </p>
      </div>
    </div>
  );
}

// ─── Reading Lounge & Dev Philosophy ────────────────────────────────────────
function LibrarySection() {
  const books = [
    { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", tag: "Architecture" },
    { title: "The Nature of Code", author: "Daniel Shiffman", tag: "Creative Coding" },
    { title: "Refactoring UI", author: "Adam Wathan & Steve Schoger", tag: "Visual Design" },
    { title: "Clean Architecture", author: "Robert C. Martin", tag: "Software Design" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4">
        <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">💡 Engineering Philosophy</h4>
        <p className="text-slate-200 text-sm leading-relaxed italic">
          "Code is not just instructions for a CPU—it is an interactive medium of human expression. When engineering and art converge, the browser transforms from a document viewer into a world."
        </p>
      </div>

      <div>
        <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-3">📚 Bookshelf & Influences</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {books.map((b, i) => (
            <div key={i} className="bg-white/4 border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-bold">{b.title}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{b.author}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {b.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
