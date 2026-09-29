import { sileo } from "sileo";
import { playNotificationSound } from "./uiSounds.js";

const createOptions = (title, description, options = {}) => ({
  title,
  ...(description ? { description } : {}),
  ...options,
});

const announce = (showNotification, options = {}) => {
  const { sound = true, ...notificationOptions } = options;
  if (sound) playNotificationSound();
  return showNotification(notificationOptions);
};

export const systemNotifications = {
  success(title, description, options = {}) {
    return announce((notificationOptions) => sileo.success(createOptions(title, description, notificationOptions)), options);
  },

  error(title, description, options = {}) {
    return announce((notificationOptions) => sileo.error(createOptions(title, description, notificationOptions)), options);
  },

  warning(title, description, options = {}) {
    return announce((notificationOptions) => sileo.warning(createOptions(title, description, notificationOptions)), options);
  },

  info(title, description, options = {}) {
    return announce((notificationOptions) => sileo.info(createOptions(title, description, notificationOptions)), options);
  },

  action(title, description, button, options = {}) {
    return announce((notificationOptions) => sileo.action(createOptions(title, description, { ...notificationOptions, button })), options);
  },

  promise(task, messages, options = {}) {
    return announce(() => sileo.promise(task, messages), options);
  },

  dismiss(notificationId) {
    sileo.dismiss(notificationId);
  },

  clear() {
    sileo.clear();
  },
};
