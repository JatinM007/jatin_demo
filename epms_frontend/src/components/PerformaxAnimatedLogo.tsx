import { useState, type KeyboardEvent } from "react";

export default function PerformaxAnimatedLogo({ compact = false }: { compact?: boolean }) {
  const [animationKey, setAnimationKey] = useState(0);
  const replay = () => setAnimationKey((current) => current + 1);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      replay();
    }
  };

  return (
    <div
      className="performax-animated-wrapper"
      role="button"
      tabIndex={0}
      title="Click to replay animation"
      aria-label="Performax — click to replay logo animation"
      onClick={replay}
      onKeyDown={handleKeyDown}
      style={compact ? { transform: "scale(0.82)", transformOrigin: "left center" } : undefined}
    >
      <div key={animationKey} className="performax-animated-logo">
        <span className="performax-animated-perfor" style={{ color: "#ffffff" }}>
          PERFOR
        </span>
        <span className="performax-animated-max">
          <span className="performax-animated-ma">MA</span>
          <span className="performax-animated-x">
            <svg
              viewBox="0 0 54 66"
              className="performax-animated-x-svg"
              fill="none"
              aria-hidden="true"
            >
              <line
                className="performax-animated-slash performax-animated-slash-1"
                x1="6"
                y1="7"
                x2="48"
                y2="59"
              />
              <line
                className="performax-animated-slash performax-animated-slash-2"
                x1="48"
                y1="7"
                x2="6"
                y2="59"
              />
            </svg>
            <span className="performax-animated-spark" />
          </span>
          <span className="performax-animated-dot" />
        </span>
      </div>
    </div>
  );
}
