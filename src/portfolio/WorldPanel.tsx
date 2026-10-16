import { useEffect, useRef, useState } from "react";
import { CONTENT } from "./content";
import { ModalContent } from "./ModalContent";
import { ArcadeGame } from "./ArcadeGame";
import { InterfaceIcon } from "./InterfaceIcon";
import { useOverlayFocus } from "./useOverlayFocus";

const LABELS: Record<string, string> = {
  about: "The person behind the work.", skills: "Tools I build with.", projects: "Selected projects.",
  experience: "Always learning.", contact: "Let's make something.", desk: "Inside the workstation.",
  showcase: "Built & shipped.", library: "Ideas worth keeping.",
};
export function WorldPanel({ sectionId, onClose }: { sectionId: string; onClose: () => void }) {
  const [section, setSection] = useState(sectionId);
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useOverlayFocus(ref, onClose);
  useEffect(() => { setSection(sectionId); }, [sectionId]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    ref.current?.focus({ preventScroll: true });
  }, [section]);
  const match = /^project_([0-2])$/.exec(section);
  const projectIndex = match ? Number(match[1]) : null;
  const project = projectIndex !== null ? CONTENT.projects[projectIndex] : null;
  const isWork = section === "projects" || section === "showcase" || !!project;
  const title = project?.title ?? (section.startsWith("contact") ? LABELS.contact : LABELS[section] ?? "Explore the world.");
  if (section === "arcade") return <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Snake arcade"><ArcadeGame onClose={onClose} /></div>;
  return <div className="world-panel-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`world-panel${isWork ? " world-panel-work" : ""}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="world-panel-title" tabIndex={-1}>
      <header className="world-panel-heading"><div><p className="interface-kicker">{isWork ? "SELECTED WORK / ANSHUL KUMAR" : "FROM ANSHUL’S LITTLE WORLD"}</p><h2 id="world-panel-title">{title}</h2></div><button className="interface-icon-button" onClick={onClose} aria-label="Close panel"><InterfaceIcon name="close" /></button></header>
      <div className="world-panel-body" ref={bodyRef}><ModalContent key={section} sectionId={section} onProjectSelect={index => setSection(`project_${index}`)} /></div>
      <footer className="world-panel-footer">{projectIndex !== null ? <div className="panel-project-pagination"><button className="interface-icon-button" onClick={() => setSection(`project_${(projectIndex + 2) % 3}`)} aria-label="Previous project"><InterfaceIcon name="back" /></button><span>0{projectIndex + 1} / 03</span><button className="interface-icon-button" onClick={() => setSection(`project_${(projectIndex + 1) % 3}`)} aria-label="Next project"><span className="next-project-icon"><InterfaceIcon name="back" /></span></button></div> : <span className="panel-footer-note">A little more of the story.</span>}<button className="interface-button" onClick={onClose}>Back to world<kbd>Esc</kbd></button></footer>
    </div>
  </div>;
}
