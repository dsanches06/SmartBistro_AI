import { useState } from "react";
import { notificationService } from "@/services";

export function NotificationItem({ notification, onRemove }) {
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
      className={`rounded-lg mb-1 transition-colors ${!isRead ? "hover:bg-[var(--surface-2)]" : ""}`}
      style={{
        padding: "12px",
        cursor: isRead ? "default" : "pointer",
        opacity: isRead ? 0.55 : 1,
        borderLeft: isRead ? "4px solid transparent" : "4px solid #ef4444",
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
