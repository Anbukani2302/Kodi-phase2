import React from "react";
import { User } from "lucide-react";

export default function Hex({
  label,
  filled = false,
  onClick,
}: {
  label?: string;
  filled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`hex cursor-pointer ${filled ? "hex-filled" : ""}`}
    >
      <div className="hex-inner">
        <User size={26} />
        <div className="text-xs font-bold mt-1">
          {label || "ADD"}
        </div>
      </div>
    </div>
  );
}
