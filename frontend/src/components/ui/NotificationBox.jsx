import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { notificationService } from "@/services";
import { NotificationItem } from "./NotificationItem.jsx";

export function NotificationBox({ isOpen, onClose, onRefreshBadge }) {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getAll();
      const all = Array.isArray(data) ? data : [];
      setNotifications(all.filter((n) => n.is_read === false));
    } catch (err) {
      console.error("Erro ao carregar notificações", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isDark = theme === "dark";

  return (
    <div
      ref={boxRef}
      style={{
        position: "absolute",
        top: "46px",
        right: 0,
        width: 320,
        maxHeight: 420,
        backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        border: `1px solid ${isDark ? "#333" : "#eee"}`,
        zIndex: 1000,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${isDark ? "#333" : "#eee"}`,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text)",
        }}
      >
        Notificações não lidas ({notifications.length})
      </div>

      <div style={{ overflowY: "auto", flex: 1, padding: 8 }}>
        {loading ? (
          <p style={{ textAlign: "center", padding: 20, color: "var(--text-secondary)", fontSize: 13 }}>
            A carregar...
          </p>
        ) : notifications.length === 0 ? (
          <p style={{ textAlign: "center", padding: 20, opacity: 0.5, color: "var(--text-secondary)", fontSize: 13 }}>
            Sem notificações
          </p>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRemove={(id) => {
                setNotifications((prev) => prev.filter((x) => x.id !== id));
                onRefreshBadge();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
