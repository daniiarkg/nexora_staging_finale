import React from "react";

export function LottieHero() {
  return (
    <div className="nfc-hero-visual reveal" aria-hidden="true">
      {React.createElement("lottie-player", {
        src: "/cms-api/assets/nfc-lottie",
        background: "transparent",
        speed: "1",
        loop: true,
        autoplay: true
      })}
    </div>
  );
}
