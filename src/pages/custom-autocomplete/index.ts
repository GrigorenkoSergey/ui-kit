import { CustomAutocomplete as CustomAutocompleteOrigin } from "@/components/custom-autocomplete/index";
import { assert } from "@/utils/assert";
import "./style.css";

const CustomAutocomplete = CustomAutocompleteOrigin.getConstructor();
export default () => {
  CustomAutocomplete.init();

  const basic = document.querySelector(".basic");
  assert(basic instanceof CustomAutocomplete);

  const basicOptions = [
    {value: "Опция-1"}, 
    {value: "Опция-2"},
    {value: "Опция-3"},
    {value: "Опция-4"}, 
    {value: "Опция-5"},
  ];
  basic.options = basicOptions;

  const renderCount = document.querySelector("[data-testid='basic-renders-count']");
  assert(renderCount);

  const originalRender = basic.render;
  basic.render = function (...args) {
    const currentCount = +renderCount.textContent;
    renderCount.textContent = String(currentCount + 1);
    return originalRender.call(basic, ...args);
  };

  //   const withCustomizedLi = document.querySelector(".customized-li");
  //   const customizedOptions = [
  //     {
  //       value: "Винни-Пух",
  //       wiki: "https://en.wikipedia.org/wiki/Winnie-the-Pooh",
  //     },
  //     {
  //       value: "Пятачок",
  //       wiki: "https://en.wikipedia.org/wiki/Piglet_(Winnie-the-Pooh)",
  //     },
  //     {
  //       value: "Иа",
  //       wiki: "https://en.wikipedia.org/wiki/Eeyore",
  //     },
  //     {
  //       value: "Сова",
  //       wiki: "https://en.wikipedia.org/wiki/Owl_(Winnie-the-Pooh)",
  //     },
  //     {
  //       value: "Кролик",
  //       wiki: "https://en.wikipedia.org/wiki/Rabbit_(Winnie-the-Pooh)",
  //     },
  //   ];

  //   assert(withCustomizedLi instanceof CustomAutocomplete);
  //   withCustomizedLi.renderLi = (li: typeof customizedOptions[number]) => `\
  // <li part="li" data-value=${li.value}>${li.value} <a href=${li.wiki} 
  //     target="_blank"
  //     part="link">?</a>
  // </li>
  // `;

//   withCustomizedLi.setOptions(customizedOptions);
};
