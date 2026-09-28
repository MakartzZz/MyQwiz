import { sileo } from "sileo";

const createOptions = (title, description, options = {}) => ({
  title,
  ...(description ? { description } : {}),
  ...options,
});

export const systemNotifications = {
  success(title, description, options) {
    return sileo.success(createOptions(title, description, options));
  },

  error(title, description, options) {
    return sileo.error(createOptions(title, description, options));
  },

  warning(title, description, options) {
    return sileo.warning(createOptions(title, description, options));
  },

  info(title, description, options) {
    return sileo.info(createOptions(title, description, options));
  },

  action(title, description, button, options = {}) {
    return sileo.action(createOptions(title, description, { ...options, button }));
  },

  promise(task, messages) {
    return sileo.promise(task, messages);
  },

  dismiss(notificationId) {
    sileo.dismiss(notificationId);
  },

  clear() {
    sileo.clear();
  },
};
