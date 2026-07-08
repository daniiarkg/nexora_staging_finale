"use client";

import { useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type { MeshGradientConfig, MeshPoint } from "@/lib/types";
import { cloneMesh, meshAnimationPresets, meshGradientToCss, meshPresets, nextMeshPoint, normalizeMeshGradient } from "@/lib/mesh-gradient";

type Props = {
  value: MeshGradientConfig;
  fallback: string;
  onChange: (value: MeshGradientConfig) => void;
};

export function MeshGradientEditor({ value, fallback, onChange }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const mesh = useMemo(() => normalizeMeshGradient(value, fallback), [fallback, value]);
  const [selectedId, setSelectedId] = useState(mesh.points[0]?.id || "p1");
  const selectedPoint = mesh.points.find((point) => point.id === selectedId) || mesh.points[0];

  function commit(next: MeshGradientConfig) {
    onChange(normalizeMeshGradient({ ...next, preset: next.preset || "custom" }, fallback));
  }

  function updatePoint(id: string, next: Partial<MeshPoint>) {
    commit({
      ...mesh,
      preset: "custom",
      points: mesh.points.map((point) => point.id === id ? { ...point, ...next } : point)
    });
  }

  function movePoint(id: string, event: PointerEvent<HTMLElement>) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    updatePoint(id, { x, y });
  }

  function selectPreset(name: string) {
    const preset = meshPresets.find((item) => item.name === name);
    if (!preset) return;
    const next = cloneMesh(preset.mesh);
    commit(next);
    setSelectedId(next.points[0]?.id || "p1");
  }

  function addPoint() {
    if (mesh.points.length >= 6) return;
    const next = nextMeshPoint(mesh.points);
    commit({ ...mesh, preset: "custom", points: [...mesh.points, next] });
    setSelectedId(next.id);
  }

  function removePoint() {
    if (!selectedPoint || mesh.points.length <= 3) return;
    const nextPoints = mesh.points.filter((point) => point.id !== selectedPoint.id);
    commit({ ...mesh, preset: "custom", points: nextPoints });
    setSelectedId(nextPoints[0]?.id || "p1");
  }

  return (
    <div className="mesh-editor">
      <div className="mesh-toolbar">
        <label>
          <span>Preset</span>
          <select value={mesh.preset} onChange={(event) => selectPreset(event.target.value)}>
            <option value="custom">Custom</option>
            {meshPresets.map((preset) => <option key={preset.name} value={preset.name}>{preset.label}</option>)}
          </select>
        </label>
        <label>
          <span>Animation</span>
          <select value={mesh.animation} onChange={(event) => commit({ ...mesh, animation: event.target.value as MeshGradientConfig["animation"] })}>
            {meshAnimationPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          </select>
        </label>
        <label>
          <span>Speed, sec</span>
          <input type="number" min="3" max="40" value={mesh.animation_speed || 10} onChange={(event) => commit({ ...mesh, animation_speed: Number(event.target.value) })} />
        </label>
      </div>

      <div
        className={`mesh-canvas${mesh.animation !== "none" ? ` mesh-animation-${mesh.animation}` : ""}`}
        ref={previewRef}
        style={{ background: meshGradientToCss(mesh, fallback), "--mesh-animation-speed": `${mesh.animation_speed || 10}s` } as CSSProperties}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget || !selectedPoint) return;
          movePoint(selectedPoint.id, event);
        }}
      >
        {mesh.points.map((point, index) => (
          <button
            type="button"
            className={`mesh-point${point.id === selectedPoint?.id ? " is-active" : ""}`}
            key={point.id}
            style={{ left: `${point.x}%`, top: `${point.y}%`, background: point.color }}
            aria-label={`Mesh point ${index + 1}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelectedId(point.id);
              event.currentTarget.setPointerCapture(event.pointerId);
              movePoint(point.id, event);
            }}
            onPointerMove={(event) => {
              if (event.buttons !== 1) return;
              movePoint(point.id, event);
            }}
          />
        ))}
      </div>

      {selectedPoint ? (
        <div className="mesh-controls">
          <label><span>Color</span><input type="color" value={selectedPoint.color} onChange={(event) => updatePoint(selectedPoint.id, { color: event.target.value })} /></label>
          <label><span>Opacity {Math.round(selectedPoint.opacity * 100)}%</span><input type="range" min="0" max="1" step="0.01" value={selectedPoint.opacity} onChange={(event) => updatePoint(selectedPoint.id, { opacity: Number(event.target.value) })} /></label>
          <label><span>Radius {Math.round(selectedPoint.radius)}%</span><input type="range" min="18" max="90" step="1" value={selectedPoint.radius} onChange={(event) => updatePoint(selectedPoint.id, { radius: Number(event.target.value) })} /></label>
          <div className="mesh-actions">
            <button type="button" className="secondary compact" onClick={addPoint} disabled={mesh.points.length >= 6}>Добавить точку</button>
            <button type="button" className="secondary compact" onClick={removePoint} disabled={mesh.points.length <= 3}>Удалить точку</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
