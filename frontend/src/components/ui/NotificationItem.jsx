import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { notificationService } from "@/services";

export function NotificationItem({ notification, onRemove }) {
  const { theme } = useTheme();
  const [isRead, setIsRead] = useState(notification.is_read ?? false);

  const handleRead = async () => {
    if (isRead) return;
    try {
      await notificationService.markAsRead(notification.id);
      setIsRead(true);
      onRemove?.(notification.id);
    } catch (err) {
      console.error("Erro ao marcar como lida", err);
    }
  };

  return (
    <div
      onClick={handleRead}
      style={{
        padding: "12px",
        borderRadius: "8px",
        cursor: isRead ? "default" : "pointer",
        transition: "background 0.2s",
        opacity: isRead ? 0.55 : 1,
        borderLeft: isRead ? "4px solid transparent" : "4px solid #ef4444",
        marginBottom: "4px",
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          theme === "dark" ? "#2a2a2a" : "#f5f5f5";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <p style={{ fontSize: 13, fontWeight: isRead ? 400 : 700, color: "var(--text)", marginBottom: 2 }}>
        {notification.title || "Notificação"}
      </p>
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        {notification.message || ""}
      </p>
    </div>
  );
}
