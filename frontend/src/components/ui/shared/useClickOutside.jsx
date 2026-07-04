import { useEffect } from "react";

// Chama callback quando se clica fora do elemento referenciado por ref (ex: fechar dropdown/modal).
export function useClickOutside(ref, callback, active = true) {
  useEffect(() => {
    if (!active) return;

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback, active]);
}
