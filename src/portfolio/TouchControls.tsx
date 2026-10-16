import { useCallback, useEffect, useRef } from "react";
import { InterfaceIcon } from "./InterfaceIcon";

export function MobileJoystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const knobRef = useRef<HTMLSpanElement>(null);
  const pointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const reset = useCallback(() => {
    pointer.current = null;
    onMove(0, 0);
    if (knobRef.current) knobRef.current.style.transform = "translate(-50%, -50%)";
  }, [onMove]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", hidden); reset(); };
  }, [reset]);
  return <div className="world-joystick" role="group" aria-label="Movement joystick. Drag to move, or use arrow keys." tabIndex={0}
    onPointerDown={event => {
      if (event.button > 0 || pointer.current !== null) return;
      // Avoid moving focus away from another held touch control.
      event.preventDefault(); pointer.current = event.pointerId;
      origin.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (event.pointerId !== pointer.current) return;
      const x = (event.clientX - origin.current.x) / 42, y = (event.clientY - origin.current.y) / 42;
      const length = Math.max(1, Math.hypot(x, y));
      onMove(x / length, y / length);
      if (knobRef.current) knobRef.current.style.transform = `translate(calc(-50% + ${x / length * 24}px), calc(-50% + ${y / length * 24}px))`;
    }}
    onPointerUp={event => { if (event.pointerId === pointer.current) reset(); }}
    onPointerCancel={event => { if (event.pointerId === pointer.current) reset(); }}
    onLostPointerCapture={event => { if (event.pointerId === pointer.current) reset(); }}
    onBlur={reset}>
    <InterfaceIcon name="move" /><span ref={knobRef} /><small>MOVE</small>
  </div>;
}

export function HoldControl({ label, code, onKey, icon }: { label: string; code: string; onKey: (code: string, held: boolean) => void; icon: "jump" | "arrow" }) {
  const pointer = useRef<number | null>(null);
  const reset = useCallback(() => { pointer.current = null; onKey(code, false); }, [code, onKey]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", hidden); reset(); };
  }, [reset]);
  return <button className="world-hold-control" aria-label={label === "Run" ? "Hold to run" : label}
    onPointerDown={event => {
      if (event.button > 0 || pointer.current !== null) return;
      event.preventDefault(); pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId); onKey(code, true);
    }}
    onPointerUp={event => { if (event.pointerId === pointer.current) reset(); }}
    onPointerCancel={event => { if (event.pointerId === pointer.current) reset(); }}
    onLostPointerCapture={event => { if (event.pointerId === pointer.current) reset(); }} onBlur={reset}
    onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) onKey(code, true); } }}
    onKeyUp={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); reset(); } }}><InterfaceIcon name={icon} /><span>{label}</span></button>;
}
