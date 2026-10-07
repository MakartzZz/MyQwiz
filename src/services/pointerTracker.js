const subscribers = new Set();
let frameId = null;
let listening = false;
let latestPointer = { x: 0, y: 0 };

const flushPointer = () => {
  frameId = null;
  subscribers.forEach((subscriber) => subscriber(latestPointer));
};

const handlePointerMove = (event) => {
  if (event.pointerType === "touch") return;
  latestPointer = { x: event.clientX, y: event.clientY };
  if (frameId == null) frameId = window.requestAnimationFrame(flushPointer);
};

const startListening = () => {
  if (listening) return;
  listening = true;
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
};

const stopListening = () => {
  if (!listening || subscribers.size) return;
  listening = false;
  window.removeEventListener("pointermove", handlePointerMove);
  if (frameId != null) window.cancelAnimationFrame(frameId);
  frameId = null;
};

export const subscribeToPointer = (subscriber) => {
  subscribers.add(subscriber);
  startListening();
  return () => {
    subscribers.delete(subscriber);
    stopListening();
  };
};
