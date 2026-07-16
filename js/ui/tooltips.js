/**
 * Tooltip UI wiring for financial definitions.
 * Handles desktop hover and mobile click-to-dismiss states.
 * @module ui/tooltips
 */

export function initTooltips() {
  const triggers = document.querySelectorAll(".tooltip-trigger");

  triggers.forEach((trigger) => {
    const text = trigger.getAttribute("data-tooltip");
    if (!text) return;

    // Create tooltip element
    const tooltip = document.createElement("span");
    tooltip.className = "tooltip";
    tooltip.textContent = text;
    trigger.appendChild(tooltip);

    // Support toggle click on touch devices
    trigger.addEventListener("click", (e) => {
      // Check if touch device
      if (window.matchMedia("(pointer: coarse)").matches) {
        e.stopPropagation();
        
        // Remove active class from all other tooltips
        document.querySelectorAll(".tooltip-trigger").forEach((t) => {
          if (t !== trigger) t.classList.remove("is-tooltip-visible");
        });

        trigger.classList.toggle("is-tooltip-visible");
      }
    });
  });

  // Global click listener to dismiss tooltips on mobile
  document.addEventListener("click", () => {
    document.querySelectorAll(".tooltip-trigger").forEach((trigger) => {
      trigger.classList.remove("is-tooltip-visible");
    });
  });
}
