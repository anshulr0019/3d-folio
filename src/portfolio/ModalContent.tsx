import { useEffect, useRef, useState, type FormEvent } from "react";
import { CONTENT } from "./content";
import { PROJECT_EXHIBITS } from "./projectExhibits";
import { InterfaceIcon } from "./InterfaceIcon";

interface Props { sectionId: string; onProjectSelect?: (index: number) => void }
export function ModalContent({ sectionId, onProjectSelect }: Props) {
  const projectMatch = /^project_([0-2])$/.exec(sectionId);
  if (projectMatch) return <ProjectsSection projectIndex={Number(projectMatch[1])} />;
  if (sectionId.startsWith("contact")) return <ContactSection />;
  switch (sectionId) {
    case "about": return <AboutSection />;
    case "skills": return <SkillsSection />;
    case "projects": case "showcase": return <ProjectsSection onProjectSelect={onProjectSelect} />;
    case "experience": return <EducationSection />;
    case "desk": return <WorkstationSection />;
    case "library": return <LibrarySection />;
    default: return <p className="panel-copy">This chapter is unavailable.</p>;
  }
}

function AboutSection() {
  return <div className="about-panel">
    <div className="about-panel-identity"><span className="about-panel-monogram" aria-hidden="true">ak.</span><div><p className="interface-kicker">{CONTENT.about.location}</p><h3>{CONTENT.brand.name}</h3><p>{CONTENT.brand.role}</p></div></div>
    <div className="panel-prose">{CONTENT.about.bio.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    <div className="about-panel-notes"><span>Currently</span><p>Studying computer science.<br />Building products for the web.<br />Exploring what a browser can do.</p></div>
  </div>;
}
function SkillsSection() {
  return <div><p className="panel-lead">The tools behind the products, experiments, and this little world.</p>
    <div className="panel-skill-list">{CONTENT.skills.map((skill, index) => <div key={skill.name}><span className="chapter-number">0{index + 1}</span><h3>{skill.name}</h3></div>)}</div>
    <p className="panel-note">Explore the project case studies to see how these tools come together.</p>
  </div>;
}
function ProjectsSection({ projectIndex, onProjectSelect }: { projectIndex?: number; onProjectSelect?: (index: number) => void } = {}) {
  const single = projectIndex !== undefined;
  return <div className={`project-cases${single ? " project-cases-single" : ""}`}>
    {!single && <p className="panel-lead">From everyday tools to an interactive world. A closer look at three things I've built.</p>}
    {CONTENT.projects.map((project, index) => ({ project, index })).filter(({ index }) => !single || index === projectIndex).map(({ project, index }) => {
      const exhibit = PROJECT_EXHIBITS[index];
      return <article className="project-case" key={project.title}>
        <div className="project-case-media"><img src={exhibit.preview} alt={exhibit.previewAlt} width={1280} height={720} loading={single || index === 0 ? "eager" : "lazy"} /><span>0{index + 1} / SELECTED WORK</span></div>
        <div className="project-case-body"><p className="project-case-kicker">{exhibit.category}</p>{!single && <h3>{project.title}</h3>}<p className="project-case-summary">{exhibit.summary}</p>
          {single && <><p className="project-case-description">{project.description}</p><div className="project-case-focus"><span>BUILD FOCUS</span><p>{exhibit.focus}</p></div></>}
          <div className="project-case-stack" aria-label="Technology stack">{project.tech.map(tech => <span key={tech}>{tech}</span>)}</div>
          <div className="project-case-actions">{!single && onProjectSelect ? <button className="interface-button interface-button-primary" onClick={() => onProjectSelect(index)}>View case study<InterfaceIcon name="arrow" /></button> : <>{project.link !== "#" && <a className="interface-button interface-button-primary" href={project.link} target="_blank" rel="noopener noreferrer">Visit live project<InterfaceIcon name="arrow" /></a>}<a className="interface-button" href={project.github} target="_blank" rel="noopener noreferrer">Source code<InterfaceIcon name="arrow" /></a></>}</div>
        </div>
      </article>;
    })}
  </div>;
}
function EducationSection() {
  return <div><p className="panel-lead">Learning the fundamentals, then putting them to work.</p><div className="panel-timeline">{CONTENT.education.map(education => <article key={education.degree}><p className="interface-kicker">{education.period}</p><h3>{education.degree}</h3><p>{education.institution}</p><ul>{education.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul></article>)}</div><div className="education-note"><span className="interface-kicker">ALONGSIDE THE CLASSROOM</span><p>Infyn, DeliveryWatch, and this portfolio are where I put those ideas into practice.</p></div></div>;
}
function ContactSection() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(CONTENT.contact.email); setCopyState("copied"); }
    catch { setCopyState("error"); }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 3000);
  };
  return <div className="contact-panel"><p className="contact-availability"><span aria-hidden="true" />{CONTENT.contact.availability}</p><p className="panel-lead">Have a role, a project, or an interesting idea? I'd like to hear about it.</p>
    <a className="contact-email" href={`mailto:${CONTENT.contact.email}`}>{CONTENT.contact.email}<InterfaceIcon name="arrow" /></a>
    <div className="contact-panel-actions"><a className="interface-button interface-button-primary" href={`mailto:${CONTENT.contact.email}`}>Write an email<InterfaceIcon name="arrow" /></a><button className="interface-button" onClick={copy}><InterfaceIcon name="copy" />{copyState === "copied" ? "Email copied" : "Copy email"}</button></div>
    <p className="contact-copy-status" role="status">{copyState === "copied" ? "Email address copied to clipboard." : copyState === "error" ? "Couldn't copy. Select the address above or open your email app." : "The email link opens your email app."}</p>
    <div className="contact-socials">{CONTENT.contact.socials.filter(social => social.name !== "Email").map(social => <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer">{social.name}<InterfaceIcon name="arrow" /></a>)}<a href={`tel:+91${CONTENT.contact.phone}`}>+91 {CONTENT.contact.phone}<InterfaceIcon name="arrow" /></a></div>
  </div>;
}
function WorkstationSection() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([{ command: "hello", output: `${CONTENT.brand.name} / ${CONTENT.brand.role}\nType help to look around the workstation.` }]);
  const streamRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight; }, [history]);
  const handleCommand = (event: FormEvent) => {
    event.preventDefault(); const command = input.trim().toLowerCase(); if (!command) return;
    const outputs: Record<string, string> = {
      help: "Available commands: skills, projects, stack, bio, clear, contact",
      skills: CONTENT.skills.map(skill => skill.name).join("\n"),
      projects: CONTENT.projects.map(project => `${project.title}\n${project.description}`).join("\n\n"),
      stack: "Frontend: TypeScript, React, Next.js, Tailwind CSS, Three.js\nBackend: Node.js, Supabase, REST APIs\nTools: Git, Vercel, VS Code",
      bio: CONTENT.about.bio.join("\n\n"), contact: `Email: ${CONTENT.contact.email}\nPhone: +91 ${CONTENT.contact.phone}\n${CONTENT.contact.availability}`,
    };
    if (command === "clear") setHistory([]);
    else setHistory(previous => [...previous.slice(-29), { command: input, output: outputs[command] ?? `Unknown command: ${command}. Type help for the list.` }]);
    setInput("");
  };
  return <div><p className="panel-lead">A small working terminal. Type a command and take a look around.</p><div className="workstation-terminal"><div className="terminal-heading"><span aria-hidden="true">● ● ●</span><span>anshul@studio ~</span></div><div className="terminal-stream" ref={streamRef} role="log" aria-label="Terminal output">{history.map((item, index) => <div key={index}><p><span aria-hidden="true">→ </span>{item.command}</p><pre>{item.output}</pre></div>)}</div><form onSubmit={handleCommand}><label htmlFor="studio-command">→</label><input id="studio-command" aria-label="Terminal command" value={input} onChange={event => setInput(event.target.value)} placeholder="Type help…" autoComplete="off" autoCapitalize="none" spellCheck={false} /><button type="submit" aria-label="Run terminal command"><InterfaceIcon name="arrow" /></button></form></div></div>;
}
function LibrarySection() {
  const books = [
    { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", tag: "Architecture" },
    { title: "The Nature of Code", author: "Daniel Shiffman", tag: "Creative coding" },
    { title: "Refactoring UI", author: "Adam Wathan & Steve Schoger", tag: "Visual design" },
    { title: "Clean Architecture", author: "Robert C. Martin", tag: "Software design" },
  ];
  return <div><p className="panel-lead">Build something useful. Learn from the details. Make the next version better.</p><p className="interface-kicker library-label">BOOKSHELF & INFLUENCES</p><div className="panel-book-list">{books.map((book, index) => <article key={book.title}><span className="chapter-number">0{index + 1}</span><div><h3>{book.title}</h3><p>{book.author}</p><span>{book.tag}</span></div></article>)}</div></div>;
}
