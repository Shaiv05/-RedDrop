import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { apiUrl } from "@/lib/api";
import { useNavigate } from "react-router-dom";

type NotificationItem = {
  id?: string;
  title?: string;
  message?: string;
  createdAt?: string;
};

const UserNotificationAlert = () => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  const isUser = isAuthenticated && user?.role === "user";

  const loadNotifications = useCallback(async () => {
    if (!isUser) {
      setNotifications([]);
      return;
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    try {
      const res = await fetch(apiUrl("/api/user-dashboard"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch {
      setNotifications([]);
    }
  }, [isUser]);

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 20000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (notifications.length > 0) {
      setIsDismissed(false);
    }
  }, [notifications.length]);

  if (!isUser || notifications.length === 0 || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-[70]">
      <div className="relative">
        <button
          type="button"
          onClick={() => navigate("/dashboard#dashboard-notifications")}
          className="group flex items-center gap-3 rounded-full border bg-card/95 px-4 py-2.5 pr-9 shadow-lg backdrop-blur hover:border-primary/40 transition-colors"
          aria-label="Open user dashboard notifications"
        >
          <div className="relative">
            <Bell className="h-5 w-5 text-primary group-hover:scale-105 transition-transform" />
            <span className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
              {notifications.length}
            </span>
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">User Alerts</p>
            <p className="text-sm font-medium">Open new notifications</p>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 hover:border-primary/40"
          aria-label="Dismiss notification alert"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default UserNotificationAlert;
