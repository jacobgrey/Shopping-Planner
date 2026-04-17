import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  onDone: () => void;
  duration?: number;
}

export default function Toast({ message, type = "error", onDone, duration }: ToastProps) {
  const effectiveDuration = duration ?? (type === "error" ? 6000 : 3000);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), effectiveDuration - 500);
    const removeTimer = setTimeout(onDone, effectiveDuration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onDone]);

  const colors = {
    error: "bg-red-600",
    success: "bg-green-600",
    info: "bg-blue-600",
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] ${colors[type]} text-white px-4 py-2.5 rounded-lg shadow-lg text-sm max-w-md transition-opacity duration-500 ${
        visible ? "opacity-90" : "opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
