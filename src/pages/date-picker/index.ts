import { DatePicker as DatePickerOrigin } from "@/components/date-picker";
import "./style.css";
import { assert } from "@/utils/assert";

const DatePicker = DatePickerOrigin.getConstructor();
DatePicker.init();
  
export default () => {
  const form = document.querySelector("#test-form");
  assert(form instanceof HTMLFormElement);

  const showFormContent = () => {
    const data = new FormData(form);

    const formDataSpan = form.querySelector(".form-data");
    assert(formDataSpan instanceof HTMLSpanElement);
    formDataSpan.textContent = String(data.get("date"));
  };

  const submit = form.querySelector("[type='submit']");
  assert(submit instanceof HTMLButtonElement);

  submit.addEventListener("click", (event) => {
    event.preventDefault();
    showFormContent();
    form.reportValidity();
  });

  const reset = form.querySelector("[type='reset']");
  assert(reset instanceof HTMLButtonElement);
  reset.addEventListener("click", () => setTimeout(showFormContent));

  const errorMessage = document.querySelector(".error");
  assert(errorMessage instanceof HTMLSpanElement);

  const dateInput = document.querySelector("[data-testid='form-connected']");
  assert(dateInput);

  dateInput.addEventListener("change", (event) => {
    const {target} = event;
    assert(target instanceof DatePicker);
    errorMessage.textContent = "";

    if (target.date === "2026-02-15") {
      target.setCustomValidity("Нельзя выбрать эту дату!");
    }

    target.checkValidity();
  });

  dateInput.addEventListener("invalid", (event) => {
    const {target} = event;
    assert(target instanceof DatePicker);

    if (target.validity.valueMissing) {
      errorMessage.textContent = "Должно быть заполнено";
    } else if (target.validity.customError) {
      errorMessage.textContent = target.validationMessage;
    }
  });

  const disableButton = form.querySelector("#disable-button");
  assert(disableButton instanceof HTMLButtonElement);

  disableButton.addEventListener("click", () => {
    dateInput.toggleAttribute("disabled");
  });

  const basicCalendar = document.getElementsByName("date")[0];
  assert(basicCalendar instanceof DatePicker);

  const localeSelect = document.querySelector("#basic-locale-select");
  assert(localeSelect instanceof HTMLSelectElement);
  localeSelect.value = navigator.language;

  localeSelect?.addEventListener("change", event => {
    const {target} = event;
    if (!(target instanceof HTMLSelectElement)) return;

    basicCalendar.locale = target.value;
  });
};

