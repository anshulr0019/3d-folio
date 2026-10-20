import * as THREE from "three";

/** Rasterize at the surface's aspect ratio so letters retain their proportions. */
export function createSignMaterial(
  lines: string[],
  size: readonly number[],
  foreground = "#253b34",
  background = "#eee8d9",
  uniform = false,
) {
  if (!lines.length) return new THREE.MeshBasicMaterial({ color: background });

  // Static, local textures: no font downloads, per-frame redraws or extra meshes.
  // Keep even the smallest marquee detailed without giving every sign a 2K atlas.
  const longest = Math.max(size[0], size[1]);
  const density = Math.min(1536 / longest, Math.max(192, 512 / longest));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size[0] * density);
  canvas.height = Math.round(size[1] * density);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = foreground;
  ctx.textBaseline = "middle";

  const inset = canvas.width * 0.06;
  const available = canvas.width - inset * 2;
  const titleSize = canvas.height * (lines.length === 1 ? 0.52 : lines.length === 2 ? 0.3 : 0.23);
  const rows = lines.map((text, index) => {
    const weight = index === 0 || uniform ? 700 : 600;
    let fontSize = uniform ? canvas.height / (lines.length * 1.55 + 0.6)
      : index === 0 ? titleSize : canvas.height * 0.15;
    ctx.font = `${weight} ${fontSize}px system-ui, sans-serif`;
    // Reduce font size instead of fillText(maxWidth), which squashes glyphs.
    const measured = ctx.measureText(text).width;
    if (measured > available) fontSize *= available / measured;
    return { text, fontSize, weight };
  });
  if (uniform) {
    const fitted = Math.min(...rows.map(row => row.fontSize));
    rows.forEach(row => { row.fontSize = fitted; });
  }
  const gap = canvas.height * 0.075;
  const height = rows.reduce((sum, row) => sum + row.fontSize, 0) + gap * (rows.length - 1);
  let y = (canvas.height - height) / 2;
  rows.forEach(row => {
    ctx.font = `${row.weight} ${row.fontSize}px system-ui, sans-serif`;
    ctx.fillText(row.text, inset, y + row.fontSize / 2);
    y += row.fontSize + gap;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `Sign: ${lines[0]}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8; // Three clamps to the device limit; especially useful on floor signs.
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
}
