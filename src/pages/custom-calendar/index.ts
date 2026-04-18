import {CustomCalendar as CustomCalendarOrigin} from "@/components/custom-calendar";
import fullyCustomizedCSS from "./fully-customized.css?raw";
import { assert } from "@/utils/assert";
import "./style.css";

const CustomCalendar = CustomCalendarOrigin.getConstructor();
CustomCalendar.init();

export default () => {
  const changeDefaultSheets = () => {
    const additionalSheet = new CSSStyleSheet();
    additionalSheet.replaceSync(`
:host(.rect-cells) {
  .date-cell,
  .month-cell,
  .year-cell,
  button {
    border-radius: 4px;
  }
}`);
    if (CustomCalendar.defaultSheets.length === 1) {
      CustomCalendar.defaultSheets = [CustomCalendar.defaultSheets[0], additionalSheet];
    }

    const instances = document.querySelectorAll("custom-calendar");
    instances.forEach(item => {
      assert(item instanceof CustomCalendar);
      item.shadowRoot.adoptedStyleSheets = CustomCalendar.defaultSheets;
    });
  };

  changeDefaultSheets();

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

  const fullyCustomized = document.querySelector("[data-testid='styles-customized-full']");
  assert(fullyCustomized instanceof CustomCalendar);

  const fullyCustomizedSheet = new CSSStyleSheet();
  fullyCustomizedSheet.replaceSync(fullyCustomizedCSS);
  fullyCustomized.shadowRoot.adoptedStyleSheets = [fullyCustomizedSheet];
};