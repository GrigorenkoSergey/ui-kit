import { test, expect, Locator } from "@playwright/test";

const expectSelected = async (locator: Locator, toBeSelected: boolean) => {
  if (toBeSelected) await expect(locator).toHaveAttribute("aria-selected", "true");
  else await expect(locator).not.toHaveAttribute("aria-selected");
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 1, 14));
  await page.goto("http://localhost:8080/storybook/pages/date-picker/");
});

test("Стрелочки вправо-влево перемещают фокус на другие поля", async ({page}) => {
  const calendarInput = page.getByTestId("basic");
  const firstInput = calendarInput.locator("input").nth(0);
  const secondInput = calendarInput.locator("input").nth(1);
  const thirdInput = calendarInput.locator("input").nth(2);

  await firstInput.focus();

  await page.keyboard.down("ArrowRight");
  await expect(secondInput).toBeFocused();

  await page.keyboard.down("ArrowRight");
  await expect(thirdInput).toBeFocused();

  await page.keyboard.down("ArrowLeft");
  await expect(secondInput).toBeFocused();

  await page.keyboard.down("ArrowLeft");
  await expect(firstInput).toBeFocused();
});

test("Ввод в поле года (min = 0000, max = 9999)", async ({page}) => {
  await page.evaluate(() => {
    const inputNode = document.querySelector("[data-testid='basic']");
    if (inputNode) {
      inputNode.setAttribute("min-year", "0000");
      inputNode.setAttribute("max-year", "9999");
    }
  });

  const calendarInput = page.getByTestId("basic");
  const input = calendarInput.getByPlaceholder("YYYY");
  await input.pressSequentially("0");
  await expect(input).toHaveValue("0000");

  await test.step("При вводе чисел, символы вставляются в конец строки", async () => {
    await input.pressSequentially("1");
    await expect(input).toHaveValue("0001");
    await input.pressSequentially("2");
    await expect(input).toHaveValue("0012");
    await input.pressSequentially("3");
    await expect(input).toHaveValue("0123");
    await input.pressSequentially("4");
    await expect(input).toHaveValue("1234");
  });

  await test.step("При переполнении строки, в начале вставляются нули", async () => {
    await input.pressSequentially("1234");
    await expect(input).toHaveValue("1234");
    await input.pressSequentially("5");
    await expect(input).toHaveValue("0005");
  });

  await test.step("Нажатие 'Backspace' полностью стирает содержимое ввода", async () => {
    await input.press("Backspace");
    await expect(input).toHaveValue("");
  });

  await test.step("Нажатие на срелочки вверх-вниз увеличивают/уменьшают год", async () => {
    await input.pressSequentially("9999");
    await expect(input).toHaveValue("9999");
    await input.press("ArrowUp");
    await expect(input).toHaveValue("0000");

    await input.press("ArrowDown");
    await expect(input).toHaveValue("9999");
  });

  await test.step("Если год не выбран, нажатие стрелочек ввер-вниз устанавливает текущий год", async () => {
    await input.fill("");
    await expect(input).toHaveValue("");
    await input.press("ArrowUp");
    await expect(input).toHaveValue("2026");

    await input.fill("");
    await expect(input).toHaveValue("");
    await input.press("ArrowDown");
    await expect(input).toHaveValue("2026");
  });
});

test("Ввод в поле месяцев", async ({page}) =>{ // TODO линтер
  const calendarInput = page.getByTestId("basic");
  const input = calendarInput.getByPlaceholder("MM");

  await test.step("Можно ввести не более 2-х символов, в начало вставляются нули", async () => {
    await input.pressSequentially("1");
    await expect(input).toHaveValue("01");

    await input.pressSequentially("2");
    await expect(input).toHaveValue("12");

    await input.pressSequentially("3");
    await expect(input).toHaveValue("03");
  });

  await input.clear();

  await test.step("Вводим число 1. Далее возможен ввод другого числа", async () => {
    await input.pressSequentially("1");
    await expect(input).toHaveValue("01");
    await expect(input).toBeFocused();

    await input.pressSequentially("2");
    await expect(input).toHaveValue("12");
    await expect(input).not.toBeFocused();
  });

  await input.clear();

  await test.step("При вводе числа больше 12, устанавливается 12 и фокус уходит (на другое поле ввода)", async () => {
    await input.pressSequentially("12");
    await expect(input).toHaveValue("12");
    await expect(input).not.toBeFocused();

    await input.pressSequentially("13");
    await expect(input).toHaveValue("12");
    await expect(input).not.toBeFocused();
  });

  await input.clear();

  await test.step("Дополнительная проверка на переполнение", async () => {
    await input.pressSequentially("5");
    await expect(input).toHaveValue("05");
    await expect(input).not.toBeFocused();
    await input.pressSequentially("1");
    await expect(input).toHaveValue("01");
  });

  await test.step("Нажатие 'Backspace' полностью стирает содержимое ввода", async () => {
    await input.press("Backspace");
    await expect(input).toHaveValue("");
  });

  await test.step("Стрелочки вверх-вниз увеличивают и уменьшают счетчик", async () => {
    await input.pressSequentially("12");
    await expect(input).toHaveValue("12");

    await input.focus();
    await page.keyboard.down("ArrowUp");
    await expect(input).toHaveValue("01");

    await page.keyboard.down("ArrowUp");
    await expect(input).toHaveValue("02");

    await page.keyboard.down("ArrowDown");
    await expect(input).toHaveValue("01");
    await page.keyboard.down("ArrowDown");
    await expect(input).toHaveValue("12");
  });
});

test("Ввод в поле даты", async ({page}) => {
  const calendarInput = page.getByTestId("basic");
  const input = calendarInput.getByPlaceholder("DD");

  await test.step("Можно ввести не более 2-х символов, в начало вставляются нули", async () => {
    await input.pressSequentially("1");
    await expect(input).toHaveValue("01");

    await input.pressSequentially("2");
    await expect(input).toHaveValue("12");

    await input.pressSequentially("3");
    await expect(input).toHaveValue("03");

    await input.clear();

    await test.step("При вводе числа больше 31, устанавливается 31", async () => {
      await input.pressSequentially("31");
      await expect(input).toHaveValue("31");

      await input.pressSequentially("33");
      await expect(input).toHaveValue("31");
    });

    await test.step("Дополнительная проверка на переполнение", async () => {
      await input.pressSequentially("5");
      await expect(input).toHaveValue("05");
      await input.pressSequentially("1");
      await expect(input).toHaveValue("01");
    });

    await test.step("Нажатие 'Backspace' полностью стирает содержимое ввода", async () => {
      await input.press("Backspace");
      await expect(input).toHaveValue("");
    });

    await test.step("Стрелочки вверх-вниз увеличивают и уменьшают счетчик", async () => {
      await input.pressSequentially("31");
      await expect(input).toHaveValue("31");

      await input.focus();
      await page.keyboard.down("ArrowUp");
      await expect(input).toHaveValue("01");

      await page.keyboard.down("ArrowUp");
      await expect(input).toHaveValue("02");

      await page.keyboard.down("ArrowDown");
      await expect(input).toHaveValue("01");
      await page.keyboard.down("ArrowDown");
      await expect(input).toHaveValue("31");
    });
  });

  await test.step("Когда ввели валидную дату, происходит фокусировка на следующем поле", async () => {
    await input.pressSequentially("5");
    await expect(input).not.toBeFocused();

    await input.pressSequentially("12");
    await expect(input).not.toBeFocused();

    await input.pressSequentially("1");
    await expect(input).toBeFocused();
  });
});

test("В календарике даты совпадают с датами в поле ввода (если поле заполнено)", async ({page}) => {
  const calendarInput = page.getByTestId("basic");
  const monthInput = calendarInput.getByPlaceholder("MM");
  const dateInput = calendarInput.getByPlaceholder("DD");
  const yearInput = calendarInput.getByPlaceholder("YYYY");

  const icon = calendarInput.getByRole("button", { name: "Открыть календарь" });
  const dialog = page.getByRole("dialog", { name: "Выберите дату" });

  await yearInput.fill("2026");

  await test.step("Граничные условия - конец года", async () => {
    await monthInput.fill("12");
    await dateInput.fill("05");
    await icon.click();
    await expect(calendarInput.getByRole("heading", { name: "декабрь 2026 г" })).toBeVisible();
  });

  await test.step("Граничные условия - начало года", async () => {
    await monthInput.focus();

    await monthInput.fill("01");
    await expect(monthInput).toHaveValue("01");

    await dateInput.fill("01");
    await expect(dialog).toBeHidden();

    await icon.click();
    await expect(calendarInput.getByRole("heading", { name: "январь 2026 г" })).toBeVisible();
    await expectSelected(calendarInput.getByRole("gridcell", { name: "1", exact: true }).first(), true);
  });

  await test.step("Февраль не високосного года", async () => {
    await dateInput.fill("29");
    await monthInput.fill("02");
    await yearInput.fill("2019");

    await icon.click();
    await expect(calendarInput.getByRole("heading", { name: "март 2019 г" })).toBeVisible();
    await expect(calendarInput.getByRole("gridcell", { name: "1", exact: true })).toBeVisible();
  });
});

test("Установка даты по выбору в календарике", async ({page}) => {
  const calendarInput = page.getByTestId("basic");
  const icon = calendarInput.getByRole("button", { name: "Открыть календарь" });
  await icon.click();

  const dialog = page.getByRole("dialog", { name: "Выберите дату" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("gridcell", { name: "9", exact: true }).click();

  const yearInput = calendarInput.getByPlaceholder("YYYY");
  const monthInput = calendarInput.getByPlaceholder("MM");
  const dateInput = calendarInput.getByPlaceholder("DD");
  await expect(yearInput).toHaveValue("2026");
  await expect(monthInput).toHaveValue("02");
  await expect(dateInput).toHaveValue("09");

  await expect(dialog).not.toBeVisible();

  await test.step("При повторном нажатии на иконку, календарик сразу же открывается", async () => {
    await icon.click();
    await expect(dialog).toBeVisible();
  });

  await test.step("Даты можно выборать в другом месяце", async () => {
    await dialog.getByRole("button", { name: "next month" }).click();
    await expect(dialog.getByRole("heading", { name: "март 2026 г" })).toBeVisible();
    await dialog.getByRole("gridcell", { name: "10" }).click();

    await expect(yearInput).toHaveValue("2026");
    await expect(monthInput).toHaveValue("03");
    await expect(dateInput).toHaveValue("10");
    await expect(dialog).toBeHidden();
  });

  await test.step("В календарике отображается текущая выбранная дата", async () => {
    await icon.click();
    await expect(dialog.getByRole("heading", { name: "март 2026 г" })).toBeVisible();
    await expectSelected(dialog.getByRole("gridcell", { name: "10" }), true);
  });
});

test("Открытие/закрытие календарика", async ({page}) => {
  await page.evaluate(() => {
    const inputNode = document.querySelector("[data-testid='basic']");
    if (inputNode) {
      inputNode.setAttribute("min-year", "1970");
      inputNode.setAttribute("max-year", "2100");
    }
  });

  const calendarInput = page.getByTestId("basic");
  const input = calendarInput.getByPlaceholder("YYYY");

  const dialog = page.getByRole("dialog", { name: "Выберите дату" });
  await expect(dialog).toBeHidden();
  const icon = calendarInput.getByRole("button", { name: "Открыть календарь" });

  await test.step("Открывается по Enter/Space. При выборе с клавиатуры возврат на иконку", async () => {
    await icon.focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();

    await expect(icon).toBeFocused();

    await page.keyboard.press("Space");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Space");
    await expect(dialog).toBeHidden();
  });

  await test.step("Введен год", async () => {
    await input.pressSequentially("2026");

    await icon.click(); 
    await expect(dialog).toBeVisible();

    await icon.click();
    await expect(dialog).toBeHidden();
  });

  await test.step("Закрывается при клике снаружи или потере фокуса", async () => {
    await icon.click();
    await expect(dialog).toBeVisible();
    await calendarInput.click();
    await expect(dialog).toBeHidden();

    await icon.click();
    await expect(dialog).toBeVisible();
    await input.focus();
    await expect(dialog).toBeHidden();
  });

  await test.step("Закрывается при нажатии на \"Escape\"", async () => {
    await icon.focus();
    await page.keyboard.down("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.down("Escape");
    await expect(dialog).toBeHidden();
  });
});

test("Кнопки в календарике", async ({page}) => {
  const calendarInput = page.getByTestId("basic");
  const dialog = page.getByRole("dialog", { name: "Выберите дату" });
  const icon = calendarInput.getByRole("button", { name: "Открыть календарь" });

  const yearInput = calendarInput.getByPlaceholder("YYYY");
  const monthInput = calendarInput.getByPlaceholder("MM");
  const dateInput = calendarInput.getByPlaceholder("DD");

  await test.step("Клик по кнопке \"Отмена\" просто закрывает календарик", async () => {
    await expect(dialog).toBeHidden();
    await icon.click();
    await dialog.getByRole("button", { name: "Отмена" }).click();
    await expect(dialog).toBeHidden();

    await expect(yearInput).toHaveValue("");
    await expect(monthInput).toHaveValue("");
    await expect(dateInput).toHaveValue("");
  });

  await test.step("Клик по кнопке \"Сегодня\" выбирает дату и закрывает календарик", async () => {
    await icon.click(); 
    await dialog.getByRole("button", { name: "Сегодня" }).click();

    const yearInput = calendarInput.getByPlaceholder("YYYY");
    const monthInput = calendarInput.getByPlaceholder("MM");
    const dateInput = calendarInput.getByPlaceholder("DD");
    await expect(yearInput).toHaveValue("2026");
    await expect(monthInput).toHaveValue("02");
    await expect(dateInput).toHaveValue("14");

    await expect(dialog).toBeHidden();
  });
});

test("Отображение ошибок", async ({page, context, browserName}) => {
  await page.evaluate(() => {
    const inputNode = document.querySelector("[data-testid='basic']");
    if (inputNode) {
      inputNode.setAttribute("min-year", "1970");
      inputNode.setAttribute("max-year", "2100");
    }
  });

  const calendarInput = page.getByTestId("basic");
  const input = calendarInput.getByPlaceholder("YYYY");

  // запись в буфер обмена требует некоторой задержки, поэтому перед вставкой
  // из буфера, нужно убедиться, что в него значения действительно записались
  const verifyClipboardContent = async (expectedText: string) => {
    await expect(async () => {
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent).toBe(expectedText);
    }).toPass({ timeout: 5000 });
  };

  await test.step("Минимальное значение", async () => {
    await expect(calendarInput.locator(":invalid")).toBeHidden();
    await input.pressSequentially("1960");
    await expect(calendarInput.locator(":invalid")).toBeVisible();
    await input.pressSequentially("1970");
    await expect(calendarInput.locator(":invalid")).toBeHidden();
  });

  await test.step("Максимальное значение", async () => {
    await expect(calendarInput.locator(":invalid")).toBeHidden();
    await input.pressSequentially("2222");
    await expect(calendarInput.locator(":invalid")).toBeVisible();
    await input.pressSequentially("1970");
    await expect(calendarInput.locator(":invalid")).toBeHidden();
  });

  await test.step("Нельзя ввести недопустимые символы", async () => {
    await calendarInput.pressSequentially("12as!@#$%^&*()_+~;',./34");
    await expect(input).toHaveValue("1234");
  });

  await test.step("Недопустимые символы нельзя вставить через copy-paste", async () => {
    const validText = "4567";
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }

    await page.evaluate((bufferText: string) => {
      navigator.clipboard.writeText(bufferText);
    }, validText);

    await verifyClipboardContent(validText);

    await input.focus();
    await page.keyboard.press("ControlOrMeta+V");
    await expect(input).toHaveValue(validText); // периодически здесь падает
      
    const invalidText = "asdf";
    await page.evaluate((bufferText: string) => {
      navigator.clipboard.writeText(bufferText);
    }, invalidText);

    await verifyClipboardContent(invalidText);

    await page.keyboard.press("ControlOrMeta+V");
    await expect(input).toHaveValue(validText);
  });

  await test.step("Календарь не открывается, если год невалиден", async () => {
    const dialog = page.getByRole("dialog", { name: "Выберите дату" });
    await expect(dialog).toBeHidden();

    await input.pressSequentially("4000");

    const icon = calendarInput.getByRole("button", { name: "Открыть календарь" });

    await icon.click();
    await expect(dialog).toBeHidden();
  });
});

test("В открытом каледарике фокус по нажатию Tab закольцован", async ({page}) => {
  const calendarInput = page.getByTestId("basic");
  const icon = calendarInput.getByRole("button", { name: "Открыть календарь" });

  await icon.click();
  const dialog = page.getByRole("dialog", { name: "Выберите дату" });
  await expect(dialog).toBeVisible();
  
  await expect(dialog.locator(":focus")).toBeVisible();
  const maxFocusableElements = 6;
  for (let i = 0; i <= maxFocusableElements + 3; i++) {
    await page.keyboard.press("Tab");
  }
  await expect(dialog.locator(":focus")).toBeVisible();
});

test("Отображение в разных локалях. \
  Календарь Григорианский. Цифры арабский. Направление слева-направо. \
  Разделители в начале и в конце удаляются.", async ({page}) => {
  const date = "Sat Apr 25 2026";

  await page.evaluate(([d]) => {
    const inputNode = document.querySelector("[data-testid='basic']");
    if (inputNode) {
      inputNode.setAttribute("date", d);
    }
  }, [date]);

  const locales = [
    "ru-RU", "en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "it-IT", 
    "zh-CN", "ja-JP", "ko-KR", "tr-TR", "pl-PL", "nl-NL", 
    "sv-SE", "pt-BR", "pt-PT", "hi-IN", "vi-VN", "uk-UA", 
    "cs-CZ", "hu-HU", "el-GR", "he-IL", "da-DK", "fi-FI", "no-NO", 
    "ro-RO", "sk-SK", "bg-BG", "hr-HR", "sr-RS", "lt-LT", "lv-LV", 
    "et-EE", "sl-SI", "id-ID", "ms-MY", "ta-IN", "te-IN",
    "ur-PK",
  ];

  const localeAndFormattedPairs = locales.map(locale => {
    const formatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit"});

    return [
      locale, 
      formatter.format(new Date(date))
        .replace(/^[^0-9]+/, "")
        .replace(/[^0-9]+$/, ""),
    ];
  });

  for (const [locale, formattedDate] of localeAndFormattedPairs) {
    await test.step(`Locale = ${locale}`, async () => {
      await page.evaluate(([loc]) => {
        const inputNode = document.querySelector("[data-testid='basic']");
        if (inputNode) {
          inputNode.setAttribute("locale", loc);
        }
      }, [locale]);

      await page.waitForTimeout(10);

      const localizedText = await page.evaluate(() => {
        const inputNode = document.querySelector("[data-testid='basic']");
        if (!inputNode) return "Календарь не найден...";

        const inputWrapper = inputNode.shadowRoot?.querySelector("#input-wrapper");
        if (!inputWrapper) return "Неверный селектор";

        return [...inputWrapper.children]
          .map(child => child instanceof HTMLInputElement ? child.value : child.textContent)
          .join("");
      });

      expect(localizedText).toBe(formattedDate);
    });
  }
});

test.describe("Подключение к нативным формам", async () => {
  test("Отображение данных и сброс данных", async({page}) => {
    const form = page.locator("#test-form");

    const submit = page.getByRole("button", { name: "Submit" });
    const reset = page.getByRole("button", { name: "Reset" });
    const formInfo = page.getByTestId("form-info");

    await test.step("Изначально данных нет", async () => {
      await submit.click();
      await expect(formInfo).toContainText("null");
    });

    await test.step("Данные после выбора даты", async () => {
      await form.getByRole("button", { name: "Открыть календарь" }).click();
      await form.getByRole("gridcell", { name: "14" }).click();

      await submit.click();
      const text = "02/14/2026";
      await expect(formInfo).toContainText(text);

      await reset.click();
      await expect(formInfo).not.toContainText(text);
    });

    await test.step("Очистка одной из частей даты очищает дату полностью", async () => {
      await form.getByRole("button", { name: "Открыть календарь" }).click();
      await form.getByRole("gridcell", { name: "14" }).click();

      const text = "02/14/2026";
      await submit.click();
      await expect(formInfo).toContainText(text);

      const dateInput = form.getByPlaceholder("DD");
      await dateInput.press("Backspace");
      await expect(dateInput).toHaveValue("");

      await submit.click();
      await expect(formInfo).not.toContainText(text);
    });

    await test.step("Отображение ошибок constrain validation API", async () => {
      await expect(page.getByText("Должно быть заполнено")).toBeVisible();

      await form.getByRole("button", { name: "Открыть календарь" }).click();
      await form.getByRole("gridcell", { name: "14" }).click();
      await expect(page.getByText("Должно быть заполнено")).not.toBeVisible();
    });

    await test.step("Отображение специфичных ошибок при установки setCustomValidity", async () => {
      await form.getByRole("button", { name: "Открыть календарь" }).click();
      await form.getByRole("gridcell", { name: "15" }).click();

      await expect(page.getByText("Нельзя выбрать эту дату!")).toBeVisible();

      await form.getByRole("button", { name: "Открыть календарь" }).click();
      await form.getByRole("gridcell", { name: "14" }).click();
      await expect(page.getByText("Нельзя выбрать эту дату!")).not.toBeVisible();
    });
  });
});
