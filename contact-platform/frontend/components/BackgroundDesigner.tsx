"use client";

import type { BackgroundType, Design, MeshGradientConfig } from "@/lib/types";
import { defaultMeshGradient } from "@/lib/mesh-gradient";
import { MeshGradientEditor } from "./MeshGradientEditor";

type Props = {
  target: "stage" | "card";
  design: Design;
  onPatch: (next: Partial<Design>) => void;
};

const backgroundTypes: { value: BackgroundType; label: string }[] = [
  { value: "solid", label: "Цвет" },
  { value: "gradient", label: "Градиент" },
  { value: "mesh", label: "Mesh" }
];

export function BackgroundDesigner({ target, design, onPatch }: Props) {
  const isCard = target === "card";
  const title = isCard ? "Фон карточки" : "Фон страницы";
  const type = isCard ? design.card_background_type : design.background_type;
  const solid = isCard ? design.card_background_value || design.card_color : design.background_value;
  const gradientFrom = isCard ? design.card_gradient_from : design.gradient_from;
  const gradientTo = isCard ? design.card_gradient_to : design.gradient_to;
  const gradientAngle = isCard ? design.card_gradient_angle : design.gradient_angle;
  const gradientAnimated = isCard ? design.card_gradient_animated : design.gradient_animated;
  const mesh = isCard ? design.card_mesh : design.background_mesh;
  const fallback = solid || (isCard ? "#edffef" : "#edffef");

  function setType(nextType: BackgroundType) {
    if (isCard) {
      onPatch({
        card_background_type: nextType,
        card_background_value: solid || design.card_color || "#edffef",
        card_color: solid || design.card_color || "#edffef",
        card_gradient_from: gradientFrom || solid || "#edffef",
        card_gradient_to: gradientTo || design.button_color || "#0a844a",
        card_mesh: mesh?.points?.length ? mesh : defaultMeshGradient(solid || "#edffef", design.button_color || "#0a844a")
      });
      return;
    }
    onPatch({
      background_type: nextType,
      gradient_from: gradientFrom || solid || "#edffef",
      gradient_to: gradientTo || design.button_color || "#0a844a",
      background_mesh: mesh?.points?.length ? mesh : defaultMeshGradient(solid || "#edffef", design.button_color || "#0a844a")
    });
  }

  function setSolid(value: string) {
    if (isCard) {
      onPatch({ card_background_value: value, card_color: value, card_gradient_from: value });
      return;
    }
    onPatch({ background_value: value, gradient_from: value });
  }

  function setMesh(value: MeshGradientConfig) {
    onPatch(isCard ? { card_mesh: value } : { background_mesh: value });
  }

  return (
    <div className="background-designer">
      <div className="background-designer-head">
        <b>{title}</b>
        <div className="segmented-control" aria-label={title}>
          {backgroundTypes.map((item) => (
            <button
              type="button"
              className={type === item.value ? "is-active" : ""}
              key={item.value}
              onClick={() => setType(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {type === "solid" ? (
        <label><span>Цвет</span><input type="color" value={solid || "#edffef"} onChange={(event) => setSolid(event.target.value)} /></label>
      ) : null}

      {type === "gradient" ? (
        <div className="control-grid">
          <label><span>Цвет 1</span><input type="color" value={gradientFrom || solid || "#edffef"} onChange={(event) => onPatch(isCard ? { card_gradient_from: event.target.value } : { gradient_from: event.target.value })} /></label>
          <label><span>Цвет 2</span><input type="color" value={gradientTo || design.button_color || "#0a844a"} onChange={(event) => onPatch(isCard ? { card_gradient_to: event.target.value } : { gradient_to: event.target.value })} /></label>
          <label><span>Угол</span><input type="number" min="0" max="360" value={gradientAngle || 135} onChange={(event) => onPatch(isCard ? { card_gradient_angle: Number(event.target.value) } : { gradient_angle: Number(event.target.value) })} /></label>
          <label className="checkbox"><input type="checkbox" checked={Boolean(gradientAnimated)} onChange={(event) => onPatch(isCard ? { card_gradient_animated: event.target.checked } : { gradient_animated: event.target.checked })} /> Анимировать градиент</label>
        </div>
      ) : null}

      {type === "mesh" ? (
        <MeshGradientEditor value={mesh} fallback={fallback} onChange={setMesh} />
      ) : null}
    </div>
  );
}
