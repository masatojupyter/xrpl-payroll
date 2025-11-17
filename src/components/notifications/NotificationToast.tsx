"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, UserPlus } from "lucide-react";
import type { NotificationType } from "@/lib/notifications";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
}

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
  duration?: number;
}

export function NotificationToast({
  notification,
  onClose,
  duration = 5000,
}: NotificationToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case "employee_registered":
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "payroll_completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "payroll_failed":
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "system":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case "employee_registered":
      case "system":
        return "border-l-blue-500";
      case "payroll_completed":
        return "border-l-green-500";
      case "payroll_failed":
      case "error":
        return "border-l-red-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 shadow-lg rounded-lg border-l-4 ${getBorderColor()}
        p-4 mb-3 max-w-md w-full
        transform transition-all duration-300 ease-in-out
        ${isLeaving ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {notification.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {notification.message}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

interface NotificationToastContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationToastContainer({
  notifications,
  onRemove,
}: NotificationToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-col items-end pointer-events-auto">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
