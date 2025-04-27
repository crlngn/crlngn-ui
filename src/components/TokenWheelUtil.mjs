import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class TokenWheel {
  static #innerRadius;
  static #outerRadius;
  static #center;
  /**
   * Initialize the token wheel system
   */
  static init() {
    Hooks.on(HOOKS_CORE.RENDER_TOKEN_HUD, TokenWheel.onRenderTokenHUD);
  }

  /**
   * Handle rendering the token HUD
   * @param {TokenHUD} tokenHUD - The token HUD instance
   * @param {jQuery} html - The HTML element
   * @param {Object} data - The data object
   */
  static onRenderTokenHUD = async (tokenHUD, html, data) => {
    LogUtil.log("onRenderTokenHUD", [tokenHUD, html, data]);

    if (html.id !== "token-hud") {
      return;
    }

    const wheelContainer = document.createElement("div");
    wheelContainer.classList.add("crlngn-token-wheel");
    html.prepend(wheelContainer);
    // Create the wheel container and ring
    const donut = document.createElement("div");
    donut.classList.add("donut");
    wheelContainer.appendChild(donut);

    requestAnimationFrame(() => {
      // Get the center of the wheel and calculate inner/outer boundaries
      const rect = donut.getBoundingClientRect();
      TokenWheel.#center = {
        x: rect.width / 2,
        y: rect.height / 2,
      };
      const wheelRadius = rect.width / 2;
      TokenWheel.#innerRadius = wheelRadius * 0.4; // 40% is the mask cutout
      TokenWheel.#outerRadius = wheelRadius;
      LogUtil.log("onRenderTokenHUD", [canvas]);

      TokenWheel.#distributeElements(html);

      html.addEventListener("mousemove", TokenWheel.#onWheelPosition);
    });
  };

  /**
   * Handle wheel highlight
   * @param {MouseEvent} event - The mouse event
   */
  static #onWheelPosition(event) {
    LogUtil.log("onWheelPosition", []);
    const hud = event.target;
    const donut = hud.querySelector(".donut");
    if (!donut) return;
    donut.style.background = `conic-gradient( var(--control-bg-color) 0% 100%)`;

    // Calculate distance from center to mouse position
    const clickX = event.clientX;
    const clickY = event.clientY;
    const distanceFromCenter = Math.sqrt(
      Math.pow(clickX - TokenWheel.#center.x, 2) +
        Math.pow(clickY - TokenWheel.#center.y, 2)
    );
    LogUtil.log("onWheelPosition", [
      hud,
      donut,
      distanceFromCenter,
      TokenWheel.#innerRadius,
      TokenWheel.#outerRadius,
    ]);
    // Only process if mouse is within the ring (not in the masked center)
    if (
      distanceFromCenter < TokenWheel.#innerRadius ||
      distanceFromCenter > TokenWheel.#outerRadius
    ) {
      return;
    }

    // Calculate angle from center to click point, in degrees (0-360)
    let angle =
      Math.atan2(clickY - TokenWheel.#center.y, clickX - TokenWheel.#center.x) *
      (180 / Math.PI);
    angle = (angle % 360) + 180; // Convert to 0-360 range (atan2 returns -180 to 180)

    // Calculate the start and end percentages for the highlight - centered on the angle)
    const highlightStart = (angle / 360) * 100 - 2.5; // -4
    const highlightEnd = (angle / 360) * 100 + 2.5; // 6
    let stops = [highlightStart, highlightStart, highlightEnd, highlightEnd];

    // Handle edge cases for the gradient when crossing 0/360 degrees
    if (highlightStart < 0) {
      const wrappedStart = 100 + highlightStart; //example: 100 + (-4) = 96
      stops = [highlightEnd, highlightEnd, wrappedStart, wrappedStart];
    } else if (highlightEnd > 100) {
      const wrappedEnd = highlightEnd - 100; //example: 104 - 100 = 4;
      stops = [wrappedEnd, wrappedEnd, highlightStart, highlightStart];
    }

    let gradientCSS = TokenWheel.#getRingGradient(
      stops,
      highlightStart < 0 || highlightEnd > 100
    );
    LogUtil.log("onWheelPosition", [angle, stops, gradientCSS]);
    donut.style.background = gradientCSS;
  }

  static #getRingGradient(stops, isSplit) {
    let gradientCSS;
    if (isSplit) {
      gradientCSS = `conic-gradient(var(--color-secondary-90) 0% ${stops[0]}%, var(--control-bg-color) ${stops[1]}% ${stops[2]}%, var(--color-secondary-90) ${stops[3]}% 100%)`;
    } else {
      gradientCSS = `conic-gradient(var(--control-bg-color) 0% ${stops[0]}%, var(--color-secondary-90) ${stops[1]}% ${stops[2]}%, var(--control-bg-color) ${stops[3]}% 100%)`;
    }
    return gradientCSS;
  }

  static #distributeElements(html) {
    const rightElements = html.querySelectorAll(".col.right > button");
    const leftElements = html.querySelectorAll(".col.left > button");
    // const centerElements = html.querySelectorAll(".col.center > *");
    const scale = 1; //html.querySelector("#hud").style.getPropertyValue('transform').split('scale(')[1].split(')')[0];

    let degreesPerItem = 25;
    let colRange = (rightElements.length - 1) * degreesPerItem;

    const colRight = html.querySelector(".col.right");
    const w = colRight.offsetWidth * scale;
    const h = colRight.offsetHeight * scale;
    const center = { x: w / 2, y: h / 2 };
    const radius = w / 2;
    let rightAngleStart = -(colRange / 2);
    let pos = {
      x: 0,
      y: 0,
    };
    let currAngle = rightAngleStart;
    LogUtil.log("distributeElements start", [
      scale,
      radius,
      currAngle,
      degreesPerItem,
    ]);
    rightElements.forEach((elem, i) => {
      // calculate position in the ring
      pos = TokenWheel.#getPointOnCircle(radius, currAngle, center);
      elem.style.transform = `translate(calc(${pos.x}px - 50%), calc(${pos.y}px - 50%)) scale(0.8)`;
      LogUtil.log("distributeElements", [scale, radius, currAngle, pos]);
      currAngle += degreesPerItem;
    });
  }

  static #getPointOnCircle(radius, angle, center) {
    // Convert the angle from degrees to radians
    const angle_radians = (angle * Math.PI) / 180;

    // Calculate the x and y coordinates
    const x = radius * Math.cos(angle_radians) + center.x;
    const y = radius * Math.sin(angle_radians) + center.y;

    return { x: x, y: y };
  }
}
