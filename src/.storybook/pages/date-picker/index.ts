import { DatePicker } from "@/components/date-picker";
import { CustomCalendar } from "@/components/custom-calendar";
import "./style.css";
import { assert } from "@/utils/assert";

DatePicker.init();
CustomCalendar.init();

const form = document.querySelector("#test-form");
assert(form instanceof HTMLFormElement);

const submit = form.querySelector("[type='submit']");
assert(submit instanceof HTMLButtonElement);

const reset = form.querySelector("[type='reset']");
assert(reset instanceof HTMLButtonElement);

const disableButton = form.querySelector("#disable-button");
assert(disableButton instanceof HTMLButtonElement);

const errorMessage = document.querySelector(".error");
assert(errorMessage instanceof HTMLSpanElement);

const showFormContent = () => {
  const data = new FormData(form);

  const formDataSpan = form.querySelector(".form-data");
  assert(formDataSpan instanceof HTMLSpanElement);
  formDataSpan.textContent = String(data.get("date"));
};

submit.addEventListener("click", (event) => {
  event.preventDefault();
  showFormContent();
  form.reportValidity();
});

reset.addEventListener("click", () => setTimeout(showFormContent));

const dateInput = document.querySelector("[data-testid='form-connected']");
assert(dateInput);

dateInput.addEventListener("change", (event) => {
  const {target} = event;
  assert(target instanceof DatePicker);
  errorMessage.textContent = "";

  if (target.date === "02/15/2026") {
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

disableButton.addEventListener("click", () => {
  dateInput.toggleAttribute("disabled");
});

