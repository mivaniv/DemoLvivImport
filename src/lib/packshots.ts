// Генератор ілюстративних SVG-упаковок для демоданих, доки з 1С не прийдуть справжні фото.
// Кожна ілюстрація — квадрат 400×400 з прозорим тлом, щоб лягати на картки як фото без фону.

export type PackshotSpec =
  | {
      kind: "jar";
      brand: string;
      title: string;
      subtitle?: string;
      weight: string;
      fill: string; // колір вмісту
      accent: string; // колір назви та фруктів
      lid?: "gingham" | "solid";
      lidColor?: string;
      contents?: "jam" | "olives";
    }
  | {
      kind: "bag";
      brand: string;
      title: string;
      subtitle?: string;
      weight: string;
      color: string;
      accent: string;
    }
  | {
      kind: "box";
      brand: string;
      title: string;
      number?: string;
      weight: string;
      color: string;
      shape: "penne" | "spaghetti" | "fusilli" | "farfalle";
    }
  | {
      kind: "pack";
      brand: string;
      title: string;
      subtitle?: string;
      weight: string;
      color: string;
      cream: string;
    };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SCRIPT = "'Brush Script MT', 'Segoe Script', cursive";
const SANS = "'Segoe UI', Arial, sans-serif";

const shadow = (w = 120) =>
  `<ellipse cx="200" cy="372" rx="${w}" ry="12" fill="#0b1f44" opacity=".10"/>`;

function jar(s: Extract<PackshotSpec, { kind: "jar" }>): string {
  const lidColor = s.lidColor ?? "#d0212b";
  const lid =
    s.lid === "solid"
      ? `<rect x="104" y="58" width="192" height="60" rx="12" fill="url(#lidg)"/>
         <rect x="104" y="100" width="192" height="10" fill="${shade(lidColor, -0.12)}"/>`
      : `<path d="M88 92 Q200 40 312 92 L300 122 Q200 100 100 122 Z" fill="url(#ging)"/>
         <path d="M88 92 Q200 40 312 92" fill="none" stroke="${shade(lidColor, -0.15)}" stroke-width="2"/>
         <rect x="106" y="112" width="188" height="12" rx="4" fill="${shade(lidColor, -0.2)}"/>`;
  const contents =
    s.contents === "olives"
      ? Array.from({ length: 22 }, (_, i) => {
          const cx = 118 + ((i * 37) % 170);
          const cy = 150 + Math.floor(i / 4.6) * 42 + (i % 2) * 10;
          return `<ellipse cx="${cx}" cy="${cy}" rx="21" ry="16" fill="${shade(s.fill, (i % 3) * 0.05 - 0.05)}"/>
                  <ellipse cx="${cx - 6}" cy="${cy - 5}" rx="6" ry="3" fill="#fff" opacity=".35"/>`;
        }).join("")
      : Array.from({ length: 14 }, (_, i) => {
          const cx = 120 + ((i * 53) % 165);
          const cy = 150 + ((i * 71) % 190);
          return `<circle cx="${cx}" cy="${cy}" r="${6 + (i % 3) * 3}" fill="${shade(s.fill, -0.12)}" opacity=".6"/>`;
        }).join("");
  const fruit = (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${s.accent}"/>
     <circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 4}" fill="#fff" opacity=".4"/>
     <path d="M${x - 5} ${y - r + 2} q5 -9 12 -6" stroke="#3f8f2f" stroke-width="3" fill="none"/>`;

  return `
  <defs>
    <linearGradient id="glass" x1="0" x2="1">
      <stop offset="0" stop-color="${shade(s.fill, -0.18)}"/>
      <stop offset=".45" stop-color="${s.fill}"/>
      <stop offset="1" stop-color="${shade(s.fill, -0.25)}"/>
    </linearGradient>
    <linearGradient id="lidg" x1="0" x2="1">
      <stop offset="0" stop-color="${shade(lidColor, -0.15)}"/>
      <stop offset=".5" stop-color="${shade(lidColor, 0.1)}"/>
      <stop offset="1" stop-color="${shade(lidColor, -0.2)}"/>
    </linearGradient>
    <pattern id="ging" width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="18" height="18" fill="#fff"/>
      <rect width="9" height="18" fill="${lidColor}" opacity=".55"/>
      <rect width="18" height="9" fill="${lidColor}" opacity=".55"/>
    </pattern>
    <clipPath id="jarclip"><rect x="96" y="118" width="208" height="246" rx="42"/></clipPath>
  </defs>
  ${shadow()}
  <rect x="96" y="118" width="208" height="246" rx="42" fill="url(#glass)"/>
  <g clip-path="url(#jarclip)">${contents}</g>
  <rect x="112" y="132" width="18" height="210" rx="9" fill="#fff" opacity=".28"/>
  ${lid}
  <rect x="116" y="176" width="168" height="136" rx="12" fill="#fffdf8"/>
  <rect x="122" y="182" width="156" height="124" rx="9" fill="none" stroke="${s.accent}" stroke-width="1.5" opacity=".5"/>
  <text x="200" y="214" text-anchor="middle" font-family="${SERIF}" font-weight="700" font-size="25" letter-spacing="1.5" fill="#3b1d12">${esc(s.brand)}</text>
  <text x="200" y="250" text-anchor="middle" font-family="${SCRIPT}" font-size="${Math.min(30, Math.round(250 / s.title.length))}" fill="${s.accent}">${esc(s.title)}</text>
  ${s.subtitle ? `<text x="200" y="272" text-anchor="middle" font-family="${SANS}" font-size="11" letter-spacing="2" fill="#6b5a4a">${esc(s.subtitle)}</text>` : ""}
  <text x="200" y="296" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="13" fill="#3b1d12">${esc(s.weight)}</text>
  ${s.contents === "olives" ? "" : fruit(270, 330, 22) + fruit(128, 330, 16)}`;
}

function bag(s: Extract<PackshotSpec, { kind: "bag" }>): string {
  return `
  <defs>
    <linearGradient id="bagg" x1="0" x2="1">
      <stop offset="0" stop-color="${shade(s.color, -0.1)}"/>
      <stop offset=".35" stop-color="${shade(s.color, 0.08)}"/>
      <stop offset="1" stop-color="${shade(s.color, -0.14)}"/>
    </linearGradient>
  </defs>
  ${shadow(105)}
  <path d="M112 72 L288 72 L300 362 L100 362 Z" fill="url(#bagg)"/>
  <path d="M110 44 L290 44 L290 76 L110 76 Z" fill="${shade(s.color, -0.06)}"/>
  <path d="M110 44 ${Array.from({ length: 18 }, (_, i) => `L${110 + (i + 0.5) * 10} ${i % 2 ? 44 : 38}`).join(" ")} L290 44" fill="${shade(s.color, -0.06)}"/>
  <line x1="110" y1="76" x2="290" y2="76" stroke="#000" opacity=".25"/>
  <text x="200" y="128" text-anchor="middle" font-family="${SERIF}" font-size="34" letter-spacing="4" fill="#f4efe6">${esc(s.brand)}</text>
  <circle cx="200" cy="195" r="42" fill="none" stroke="${s.accent}" stroke-width="2"/>
  <path d="M176 190 h40 v8 a20 20 0 0 1 -40 0 Z" fill="#f4efe6"/>
  <path d="M216 194 a8 8 0 0 1 0 14" stroke="#f4efe6" stroke-width="3" fill="none"/>
  <path d="M186 180 q4 -8 0 -14 M198 180 q4 -8 0 -14" stroke="#f4efe6" stroke-width="2" fill="none" opacity=".7"/>
  <rect x="130" y="256" width="140" height="2" fill="${s.accent}"/>
  <text x="200" y="284" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="19" letter-spacing="2" fill="#f4efe6">${esc(s.title)}</text>
  ${s.subtitle ? `<text x="200" y="306" text-anchor="middle" font-family="${SANS}" font-size="12" letter-spacing="2" fill="${s.accent}">${esc(s.subtitle)}</text>` : ""}
  <text x="200" y="338" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="14" fill="#f4efe6" opacity=".85">${esc(s.weight)}</text>
  <rect x="112" y="80" width="14" height="276" fill="#fff" opacity=".07"/>`;
}

function pastaShape(shape: Extract<PackshotSpec, { kind: "box" }>["shape"]): string {
  const gold = "#f1c24b", dark = "#d49b22";
  switch (shape) {
    case "penne":
      return [[-20, 150, 250], [25, 215, 262], [-35, 175, 300], [15, 235, 318], [40, 190, 280]]
        .map(([rot, x, y]) =>
          `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x - 34} ${y - 9} L${x + 26} ${y - 9} L${x + 34} ${y + 9} L${x - 26} ${y + 9} Z" fill="${gold}"/>
           ${[-20, -8, 4, 16].map((o) => `<line x1="${x + o}" y1="${y - 9}" x2="${x + o + 8}" y2="${y + 9}" stroke="${dark}" stroke-width="2"/>`).join("")}</g>`,
        ).join("");
    case "spaghetti":
      return Array.from({ length: 16 }, (_, i) =>
        `<line x1="${138 + i * 8}" y1="228" x2="${150 + i * 7}" y2="336" stroke="${i % 2 ? gold : dark}" stroke-width="4" stroke-linecap="round"/>`,
      ).join("");
    case "fusilli":
      return [[160, 250], [230, 270], [185, 310], [245, 322]]
        .map(([x, y]) =>
          `<g transform="rotate(-30 ${x} ${y})">${[0, 1, 2, 3, 4].map((k) => `<ellipse cx="${x - 24 + k * 12}" cy="${y}" rx="8" ry="16" fill="${k % 2 ? gold : dark}"/>`).join("")}</g>`,
        ).join("");
    case "farfalle":
      return [[165, 255], [235, 268], [190, 315], [248, 322]]
        .map(([x, y]) =>
          `<path d="M${x - 30} ${y - 18} L${x} ${y} L${x - 30} ${y + 18} Z M${x + 30} ${y - 18} L${x} ${y} L${x + 30} ${y + 18} Z" fill="${gold}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>
           <circle cx="${x}" cy="${y}" r="6" fill="${dark}"/>`,
        ).join("");
  }
}

function box(s: Extract<PackshotSpec, { kind: "box" }>): string {
  return `
  <defs>
    <linearGradient id="boxg" x1="0" x2="1">
      <stop offset="0" stop-color="${shade(s.color, 0.06)}"/>
      <stop offset="1" stop-color="${shade(s.color, -0.12)}"/>
    </linearGradient>
    <clipPath id="win"><rect x="135" y="220" width="130" height="118" rx="14"/></clipPath>
  </defs>
  ${shadow(100)}
  <path d="M285 52 L306 66 L306 370 L285 360 Z" fill="${shade(s.color, -0.28)}"/>
  <rect x="112" y="52" width="174" height="308" rx="6" fill="url(#boxg)"/>
  <ellipse cx="199" cy="100" rx="64" ry="30" fill="#e2231a" stroke="#fff" stroke-width="3"/>
  <text x="199" y="109" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-weight="700" font-size="27" fill="#fff">${esc(s.brand)}</text>
  <text x="199" y="162" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="17" letter-spacing="1.5" fill="#fff">${esc(s.title)}</text>
  ${s.number ? `<text x="199" y="186" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="14" fill="#fff" opacity=".9">${esc(s.number)}</text>` : ""}
  <rect x="135" y="220" width="130" height="118" rx="14" fill="${shade(s.color, 0.22)}"/>
  <g clip-path="url(#win)">${pastaShape(s.shape)}</g>
  <rect x="135" y="220" width="130" height="118" rx="14" fill="none" stroke="#fff" stroke-width="3"/>
  <text x="270" y="352" text-anchor="end" font-family="${SANS}" font-weight="600" font-size="12" fill="#fff">${esc(s.weight)}</text>`;
}

function pack(s: Extract<PackshotSpec, { kind: "pack" }>): string {
  const wafer = (x: number, y: number) =>
    `<g transform="rotate(-8 ${x} ${y})"><rect x="${x - 44}" y="${y - 18}" width="88" height="36" rx="3" fill="#e6b872"/>
     ${[0, 1, 2, 3, 4, 5].map((k) => `<line x1="${x - 44 + k * 15 + 7}" y1="${y - 18}" x2="${x - 44 + k * 15 + 7}" y2="${y + 18}" stroke="#c38d45" stroke-width="2"/>`).join("")}
     <rect x="${x - 44}" y="${y - 3}" width="88" height="6" fill="${s.cream}"/></g>`;
  return `
  <defs>
    <linearGradient id="packg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(s.color, 0.1)}"/>
      <stop offset="1" stop-color="${shade(s.color, -0.12)}"/>
    </linearGradient>
  </defs>
  ${shadow(150)}
  <g transform="rotate(-10 200 230)">
    <path d="M52 150 L348 150 L352 312 L48 312 Z" fill="url(#packg)"/>
    ${Array.from({ length: 16 }, (_, i) => `<rect x="${52 + i * 18.5}" y="142" width="9" height="10" fill="${shade(s.color, -0.2)}"/>`).join("")}
    <path d="M52 150 L200 150 L180 312 L48 312 Z" fill="#fff" opacity=".12"/>
    <rect x="66" y="168" width="120" height="30" rx="15" fill="#fff"/>
    <text x="126" y="189" text-anchor="middle" font-family="${SERIF}" font-weight="700" font-size="18" letter-spacing="1.5" fill="${s.color}">${esc(s.brand)}</text>
    <text x="78" y="250" font-family="${SCRIPT}" font-size="48" fill="#fff">${esc(s.title)}</text>
    ${s.subtitle ? `<text x="80" y="278" font-family="${SANS}" font-size="13" letter-spacing="1" fill="#fff" opacity=".9">${esc(s.subtitle)}</text>` : ""}
    <text x="80" y="298" font-family="${SANS}" font-weight="600" font-size="13" fill="#fff">${esc(s.weight)}</text>
    ${wafer(280, 220)}${wafer(292, 262)}
  </g>`;
}

export function renderPackshot(spec: PackshotSpec): string {
  const body =
    spec.kind === "jar" ? jar(spec) : spec.kind === "bag" ? bag(spec) : spec.kind === "box" ? box(spec) : pack(spec);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">${body}</svg>`;
}
