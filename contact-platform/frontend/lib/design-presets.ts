import type { DesignConfig } from "./types";
import { defaultMeshGradient } from "./mesh-gradient";

export const defaultDesign: DesignConfig = {
  background_type: "solid",
  background_value: "#edffef",
  background_mesh: defaultMeshGradient("#edffef", "#0a844a"),
  card_background_type: "solid",
  card_background_value: "#edffef",
  card_color: "#edffef",
  card_gradient_from: "#edffef",
  card_gradient_to: "#0a844a",
  card_gradient_angle: 135,
  card_gradient_animated: false,
  card_gradient_animation_speed: 10,
  card_mesh: defaultMeshGradient("#edffef", "#0a844a"),
  button_color: "#0a844a",
  text_color: "#030609",
  logo_url: "",
  logo_min_width: 250,
  top_image_url: "",
  bottom_image_url: "",
  gradient_from: "#edffef",
  gradient_to: "#0a844a",
  gradient_angle: 135,
  gradient_animated: false,
  gradient_animation_speed: 10,
  font_family: "system",
  font_weight: 700,
  font_size: 100,
  layout: "custom",
  watermark: true
};
