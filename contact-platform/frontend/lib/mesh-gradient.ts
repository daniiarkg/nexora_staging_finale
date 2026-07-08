import type { BackgroundType, DesignConfig, MeshAnimationPreset, MeshGradientConfig, MeshPoint } from "./types";

export const meshAnimationPresets: { value: MeshAnimationPreset; label: string }[] = [
  { value: "none", label: "Без анимации" },
  { value: "drift", label: "Drift" },
  { value: "pulse", label: "Pulse" },
  { value: "orbit", label: "Orbit" },
  { value: "breathe", label: "Breathe" }
];

export const meshPresets: { name: string; label: string; mesh: MeshGradientConfig }[] = [
  {
    name: "nexora",
    label: "Nexora",
    mesh: {
      preset: "nexora",
      animation: "drift",
      animation_speed: 14,
      points: [
        { id: "p1", x: 16, y: 20, color: "#edffef", opacity: 0.95, radius: 50 },
        { id: "p2", x: 84, y: 18, color: "#0a844a", opacity: 0.56, radius: 44 },
        { id: "p3", x: 76, y: 84, color: "#ffffff", opacity: 0.74, radius: 48 },
        { id: "p4", x: 23, y: 80, color: "#baf7cc", opacity: 0.58, radius: 38 }
      ]
    }
  },
  {
    name: "graphite",
    label: "Graphite",
    mesh: {
      preset: "graphite",
      animation: "breathe",
      animation_speed: 11,
      points: [
        { id: "p1", x: 18, y: 18, color: "#ffffff", opacity: 0.2, radius: 44 },
        { id: "p2", x: 74, y: 20, color: "#8b949e", opacity: 0.34, radius: 50 },
        { id: "p3", x: 82, y: 82, color: "#111827", opacity: 0.76, radius: 58 },
        { id: "p4", x: 24, y: 76, color: "#3f3f46", opacity: 0.58, radius: 42 }
      ]
    }
  },
  {
    name: "aurora",
    label: "Aurora",
    mesh: {
      preset: "aurora",
      animation: "orbit",
      animation_speed: 18,
      points: [
        { id: "p1", x: 20, y: 22, color: "#dbeafe", opacity: 0.86, radius: 48 },
        { id: "p2", x: 78, y: 18, color: "#a7f3d0", opacity: 0.72, radius: 46 },
        { id: "p3", x: 84, y: 76, color: "#f0abfc", opacity: 0.58, radius: 42 },
        { id: "p4", x: 30, y: 84, color: "#fde68a", opacity: 0.52, radius: 44 },
        { id: "p5", x: 50, y: 50, color: "#ffffff", opacity: 0.45, radius: 36 }
      ]
    }
  },
  {
    name: "ember",
    label: "Ember",
    mesh: {
      preset: "ember",
      animation: "pulse",
      animation_speed: 8,
      points: [
        { id: "p1", x: 16, y: 24, color: "#fff7ed", opacity: 0.86, radius: 44 },
        { id: "p2", x: 72, y: 18, color: "#fb7185", opacity: 0.52, radius: 40 },
        { id: "p3", x: 84, y: 82, color: "#f97316", opacity: 0.44, radius: 48 },
        { id: "p4", x: 28, y: 78, color: "#7c2d12", opacity: 0.28, radius: 54 }
      ]
    }
  }
];

export function cloneMesh(mesh: MeshGradientConfig): MeshGradientConfig {
  return {
    preset: mesh.preset,
    animation: mesh.animation,
    animation_speed: mesh.animation_speed,
    points: mesh.points.map((point) => ({ ...point }))
  };
}

export function defaultMeshGradient(primary = "#edffef", secondary = "#0a844a"): MeshGradientConfig {
  return {
    preset: "custom",
    animation: "none",
    animation_speed: 10,
    points: [
      { id: "p1", x: 18, y: 22, color: primary, opacity: 0.9, radius: 48 },
      { id: "p2", x: 82, y: 18, color: secondary, opacity: 0.56, radius: 42 },
      { id: "p3", x: 76, y: 84, color: "#ffffff", opacity: 0.72, radius: 46 },
      { id: "p4", x: 24, y: 78, color: "#c4f7d0", opacity: 0.6, radius: 38 }
    ]
  };
}

export function normalizeMeshGradient(mesh?: Partial<MeshGradientConfig>, primary = "#edffef", secondary = "#0a844a"): MeshGradientConfig {
  const source: MeshGradientConfig = mesh?.points && mesh.points.length >= 3
    ? {
        preset: mesh.preset || "custom",
        animation: normalizeAnimation(mesh.animation),
        animation_speed: clampNumber(mesh.animation_speed, 3, 40, 10),
        points: mesh.points
      }
    : defaultMeshGradient(primary, secondary);
  return {
    preset: source.preset || "custom",
    animation: normalizeAnimation(source.animation),
    animation_speed: clampNumber(source.animation_speed, 3, 40, 10),
    points: source.points.slice(0, 6).map((point, index) => ({
      id: point.id || `p${index + 1}`,
      x: clampNumber(point.x, 0, 100, 50),
      y: clampNumber(point.y, 0, 100, 50),
      color: normalizeColor(point.color, index === 1 ? secondary : primary),
      opacity: clampNumber(point.opacity, 0, 1, 0.72),
      radius: clampNumber(point.radius, 18, 90, 46)
    }))
  };
}

export function meshGradientToCss(mesh: MeshGradientConfig | undefined, fallback = "#edffef") {
  const safeMesh = normalizeMeshGradient(mesh, fallback, "#0a844a");
  const layers = safeMesh.points.map((point) => {
    const near = rgba(point.color, point.opacity);
    const mid = rgba(point.color, point.opacity * 0.52);
    return `radial-gradient(circle at ${round(point.x)}% ${round(point.y)}%, ${near} 0%, ${mid} ${round(point.radius * 0.42)}%, rgba(255,255,255,0) ${round(point.radius)}%)`;
  });
  layers.push(`linear-gradient(135deg, ${fallback}, ${rgba("#ffffff", 0.34)})`);
  return layers.join(", ");
}

export function designStageBackground(design: DesignConfig) {
  return backgroundCss(
    design.background_type,
    design.background_value,
    design.gradient_from,
    design.gradient_to,
    design.gradient_angle,
    design.background_mesh,
    "#edffef"
  );
}

export function designCardBackground(design: DesignConfig) {
  return backgroundCss(
    design.card_background_type || "solid",
    design.card_background_value || design.card_color,
    design.card_gradient_from,
    design.card_gradient_to,
    design.card_gradient_angle,
    design.card_mesh,
    design.card_color || "#edffef"
  );
}

export function backgroundCss(
  type: BackgroundType,
  solid: string,
  gradientFrom: string,
  gradientTo: string,
  gradientAngle: number,
  mesh: MeshGradientConfig | undefined,
  fallback: string
) {
  if (type === "gradient") {
    return `linear-gradient(${gradientAngle || 135}deg, ${gradientFrom || solid || fallback}, ${gradientTo || fallback})`;
  }
  if (type === "mesh") {
    return meshGradientToCss(mesh, solid || fallback);
  }
  return solid || fallback;
}

export function meshAnimationClass(animation?: MeshAnimationPreset) {
  if (!animation || animation === "none") return "";
  return ` mesh-animation-${animation}`;
}

export function nextMeshPoint(points: MeshPoint[]): MeshPoint {
  const index = points.length + 1;
  return {
    id: `p${Date.now().toString(36)}${index}`,
    x: 50,
    y: 50,
    color: "#ffffff",
    opacity: 0.62,
    radius: 40
  };
}

function normalizeAnimation(value: unknown): MeshAnimationPreset {
  return meshAnimationPresets.some((preset) => preset.value === value) ? value as MeshAnimationPreset : "none";
}

function normalizeColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function clampNumber(value: number | undefined, min: number, max: number, fallback = min) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function rgba(hex: string, opacity: number) {
  const color = normalizeColor(hex, "#ffffff").slice(1);
  const red = parseInt(color.slice(0, 2), 16);
  const green = parseInt(color.slice(2, 4), 16);
  const blue = parseInt(color.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(Math.max(opacity, 0), 1).toFixed(3)})`;
}
