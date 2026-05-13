import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { apiUrl } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const HospitalNotificationAlert = () => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  const isHospital = isAuthenticated && user?.role === "hospital";

  const loadNotifications = useCallback(async () => {
    if (!isHospital) {
      setNotifications([]);
      return;
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    try {
      const res = await fetch(apiUrl("/api/dashboard/notifications"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch {
      // keep alert unobtrusive if fetch fails
    }
  }, [isHospital]);

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

  if (!isHospital || notifications.length === 0 || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-[70]">
      <div className="relative">
        <button
          type="button"
          onClick={() => navigate("/hospital-dashboard#dashboard-notifications")}
          className="group flex items-center gap-3 rounded-full border bg-card/95 px-4 py-2.5 pr-9 shadow-lg backdrop-blur hover:border-primary/40 transition-colors"
          aria-label="Open hospital dashboard notifications"
        >
          <div className="relative">
            <Bell className="h-5 w-5 text-primary group-hover:scale-105 transition-transform" />
            <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-destructive text-[10px] text-white flex items-center justify-center px-1">
              {notifications.length}
            </span>
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Hospital Alerts</p>
            <p className="text-sm font-medium">Open new notifications</p>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border bg-background/90 hover:border-primary/40 flex items-center justify-center"
          aria-label="Dismiss notification alert"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default HospitalNotificationAlert;
