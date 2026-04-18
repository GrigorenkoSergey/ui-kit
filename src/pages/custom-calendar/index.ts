import {CustomCalendar as CustomCalendarOrigin} from "@/components/custom-calendar";
import fullyCustomizedCSS from "./fully-customized.css?raw";
import additionalCss from "./additional.css?raw";
import { assert } from "@/utils/assert";
import "./style.css";

const CustomCalendar = CustomCalendarOrigin.getConstructor();

export default () => {
  const additionalSheet = new CSSStyleSheet();
  additionalSheet.replaceSync(additionalCss);
  CustomCalendar.defaultSheets = [...CustomCalendar.defaultSheets, additionalSheet];

  CustomCalendar.init();

  const basic = document.querySelector("[data-testid='basic']");
  assert(basic instanceof CustomCalendar);

  const renderCount = document.querySelector("[data-testid='basic-renders-count']");
  assert(renderCount);

  const originalUpdateFunc = basic.render;
  basic.render = function (...args) {
    const currentCount = +renderCount.textContent;
    renderCount.textContent = String(currentCount + 1);
    return originalUpdateFunc.call(basic, ...args);
  };

  const styleTag = document.createElement("style");
  styleTag.textContent = fullyCustomizedCSS;

  const fullyCustomized = document.querySelector("[data-testid='styles-customized-full']");
  fullyCustomized?.shadowRoot?.getElementById("default-style")?.replaceWith(styleTag);
};