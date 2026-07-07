import type { DesignConfig } from "./types";

export const designPresets: Record<string, DesignConfig> = {
  nexora_default: {
    background_type: "solid",
    background_value: "#edffef",
    card_color: "#edffef",
    button_color: "#0a844a",
    text_color: "#030609",
    layout: "nexora_default",
    watermark: true
  },
  white: {
    background_type: "solid",
    background_value: "#f4f4f5",
    card_color: "#ffffff",
    button_color: "#111111",
    text_color: "#111111",
    layout: "white",
    watermark: false
  },
  dark: {
    background_type: "solid",
    background_value: "#080808",
    card_color: "#000000",
    button_color: "#ffffff",
    text_color: "#f4f4f5",
    layout: "dark",
    watermark: false
  }
};

export const defaultDesign = designPresets.nexora_default;

export function applyDesignPreset(layout: string): DesignConfig {
  return { ...(designPresets[layout] || defaultDesign) };
}
