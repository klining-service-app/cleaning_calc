/**
 * Чистый Дом — Логика калькулятора и формы заявки
 * Разработано строго по Паспорту проекта
 */

document.addEventListener('DOMContentLoaded', () => {
  // Подключение конфигурации из config.js
  const cfg = window.APP_CONFIG || {};
  const CONFIG = {
    companyName: cfg.companyName || 'Чистый Дом',
    minOrderAmount: cfg.minOrderAmount || 2000,
    priceRangeMultiplier: cfg.priceRangeMultiplier || 1.15,
    timeMode: cfg.timeMode || 'hybrid',
    telegramBotToken: (cfg.telegram && cfg.telegram.botToken) || '',
    telegramChatId: (cfg.telegram && cfg.telegram.chatId) || '',
    googleSheetsWebhookUrl: cfg.googleSheetsWebhookUrl || '',
    prices: cfg.prices || {},
    options: cfg.options || {}
  };

  // Состояние калькулятора
  const state = {
    items: {},       // id: { count, price, name }
    options: {},     // id: { checked, price, name }
    photos: [],      // File objects
    baseTotal: 0,
    maxTotal: 0,
    dateMode: 'asap', // 'asap' | 'custom'
    selectedDate: { year: 2026, month: 9, day: 16 }, // 16 октября 2026 (0-indexed: 9 = Октябрь)
    selectedTimeSlot: 'Любое время (9:00 — 20:00)',
    calYear: 2026,
    calMonth: 9 // Октябрь
  };

  // Константы месяцев и дней недели
  const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const MONTH_NAMES_GENITIVE = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const WEEKDAYS_FULL = [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'
  ];

  // DOM Элементы
  const calcCards = document.querySelectorAll('.calc-card');
  const optCheckboxes = document.querySelectorAll('.opt-checkbox');
  const priceDisplay = document.getElementById('price_display');
  const minOrderNote = document.getElementById('min_order_note');
  const submitBtn = document.getElementById('submit_btn');
  
  const clientNameInput = document.getElementById('client_name');
  const clientPhoneInput = document.getElementById('client_phone');
  const clientZone = document.getElementById('client_zone');
  const clientAddressInput = document.getElementById('client_address');
  const clientCommentInput = document.getElementById('client_comment');
  
  // Элементы переключателя даты и интерактивного календаря
  const pillAsap = document.getElementById('pill_asap');
  const pillCustom = document.getElementById('pill_custom');
  const pillDateText = document.getElementById('pill_date_text');
  const asapNoticeBox = document.getElementById('asap_notice_box');
  const customCalendarCard = document.getElementById('custom_calendar_card');
  
  const calPrevMonth = document.getElementById('cal_prev_month');
  const calNextMonth = document.getElementById('cal_next_month');
  const calMonthTitle = document.getElementById('cal_month_title');
  const calDaysGrid = document.getElementById('cal_days_grid');
  const statusBannerText = document.getElementById('status_banner_text');
  const timeSlotBtns = document.querySelectorAll('.time-slot-btn');
  
  const nameError = document.getElementById('name_error');
  const phoneError = document.getElementById('phone_error');
  const zoneError = document.getElementById('zone_error');
  const addressError = document.getElementById('address_error');
  
  const photoInput = document.getElementById('photo_input');
  const photosPreview = document.getElementById('photos_preview');
  
  const successModal = document.getElementById('success_modal');
  const modalCloseBtn = document.getElementById('modal_close_btn');
  const modalPrice = document.getElementById('modal_price');
  const modalSummary = document.getElementById('modal_summary');

  // Расчет занятости бригад мастеров для каждого дня
  function getDayStatus(year, month, day) {
    const curYear = 2026;
    const curMonth = 9; // Октябрь
    const curDay = 16;

    // Прошедшие дни
    if (year < curYear || (year === curYear && month < curMonth) || (year === curYear && month === curMonth && day < curDay)) {
      return { type: 'disabled', label: '—', text: 'Прошедшая дата' };
    }

    // Точное расписание экипажей для Октября 2026
    if (year === 2026 && month === 9) {
      if (day === 16) return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
      if (day === 17) return { type: 'free', label: 'есть', crews: 3, text: 'свободно 3 экипажа' };
      if (day === 18) return { type: 'few', label: 'мало', crews: 1, text: 'остался 1 слот' };
      if (day === 19) return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
      if (day === 20) return { type: 'free', label: 'есть', crews: 3, text: 'свободно 3 экипажа' };
      if (day === 21) return { type: 'few', label: 'мало', crews: 1, text: 'остался 1 слот' };
      if (day === 22) return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
      if (day === 23) return { type: 'few', label: 'мало', crews: 1, text: 'остался 1 слот' };
      if (day === 24) return { type: 'none', label: 'нет', crews: 0, text: 'все мастера заняты' };
      if (day === 25) return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
      if (day === 26) return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
      if (day === 27) return { type: 'none', label: 'нет', crews: 0, text: 'все мастера заняты' };
      if (day === 28) return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
      if (day === 29) return { type: 'disabled', label: '—', crews: 0, text: 'тех. обслуживание экстракторов' };
      if (day === 30) return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
      if (day === 31) return { type: 'free', label: 'есть', crews: 3, text: 'свободно 3 экипажа' };
    }

    // Для остальных месяцев и дат
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 6 && day % 2 === 0) {
      return { type: 'none', label: 'нет', crews: 0, text: 'все мастера заняты' };
    }
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { type: 'few', label: 'мало', crews: 1, text: 'остался 1 экипаж' };
    }
    return { type: 'free', label: 'есть', crews: 2, text: 'свободно 2 экипажа' };
  }

  // Обновление информационной плашки выбранного дня и кнопки
  function updateCalendarStatus() {
    const { year, month, day } = state.selectedDate;
    const dateObj = new Date(year, month, day);
    const dayOfWeekName = WEEKDAYS_FULL[dateObj.getDay()];
    const monthNameGen = MONTH_NAMES_GENITIVE[month];
    const status = getDayStatus(year, month, day);

    if (statusBannerText) {
      statusBannerText.innerHTML = `
        <strong>${dayOfWeekName}, ${day} ${monthNameGen}:</strong> ${state.selectedTimeSlot} • ${status.text}. Экстракторы Kärcher Puzzi и гипоаллергенная химия зарезервированы.
      `;
    }

    if (pillDateText) {
      const shortTime = state.selectedTimeSlot.split('(')[0].trim();
      pillDateText.textContent = `${day} ${monthNameGen.slice(0, 3)}., ${shortTime}`;
    }
  }

  // Отрисовка интерактивной сетки календаря
  function renderCalendar(year, month) {
    if (!calDaysGrid || !calMonthTitle) return;

    calMonthTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

    // Блокировка кнопки «Назад», если уже на минимальном месяце
    if (calPrevMonth) {
      calPrevMonth.disabled = (year === 2026 && month <= 9);
    }

    calDaysGrid.innerHTML = '';

    // День недели первого числа месяца (0 = Вс, 1 = Пн, ... 6 = Сб) -> сдвиг к Пн-первому
    const firstDay = new Date(year, month, 1).getDay();
    const leadingEmptyCells = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Пустые ячейки для выравнивания по дням недели
    for (let i = 0; i < leadingEmptyCells; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day-cell cal-day-empty';
      calDaysGrid.appendChild(emptyCell);
    }

    // Генерация дней текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      const status = getDayStatus(year, month, day);
      
      const isSelected = (state.selectedDate.year === year && 
                          state.selectedDate.month === month && 
                          state.selectedDate.day === day);
      const isToday = (year === 2026 && month === 9 && day === 16);

      dayCell.className = `cal-day-cell status-${status.type}`;
      if (isSelected) dayCell.classList.add('selected');
      if (isToday) dayCell.classList.add('is-today');

      dayCell.innerHTML = `
        <span class="cal-day-num">${day}</span>
        <span class="cal-day-badge">${status.label}</span>
      `;

      if (status.type === 'free' || status.type === 'few') {
        dayCell.addEventListener('click', () => {
          state.selectedDate = { year, month, day };
          renderCalendar(year, month);
          updateCalendarStatus();
        });
      } else if (status.type === 'none') {
        dayCell.addEventListener('click', () => {
          alert(`На ${day} ${MONTH_NAMES_GENITIVE[month]} все выездные бригады уже заняты. Пожалуйста, выберите соседний день со статусом «есть» или опцию «Как можно скорее».`);
        });
      }

      calDaysGrid.appendChild(dayCell);
    }
  }

  // Переключение месяцев (< и >)
  if (calPrevMonth) {
    calPrevMonth.addEventListener('click', () => {
      if (state.calYear === 2026 && state.calMonth <= 9) return;
      state.calMonth--;
      if (state.calMonth < 0) {
        state.calMonth = 11;
        state.calYear--;
      }
      renderCalendar(state.calYear, state.calMonth);
    });
  }

  if (calNextMonth) {
    calNextMonth.addEventListener('click', () => {
      state.calMonth++;
      if (state.calMonth > 11) {
        state.calMonth = 0;
        state.calYear++;
      }
      renderCalendar(state.calYear, state.calMonth);
    });
  }

  // Элементы для ввода своего времени
  const customTimeInputWrap = document.getElementById('custom_time_input_wrap');
  const customTimeInput = document.getElementById('custom_time_input');

  // Переключение временных слотов (Утро / День / Вечер / Своё время)
  timeSlotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeSlotBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (btn.dataset.time === 'custom') {
        if (customTimeInputWrap) {
          customTimeInputWrap.style.display = 'block';
          if (customTimeInput) customTimeInput.focus();
        }
        state.selectedTimeSlot = customTimeInput && customTimeInput.value.trim() 
          ? `Своё время (${customTimeInput.value.trim()})` 
          : 'Своё время (согласуется при подтверждении)';
      } else {
        if (customTimeInputWrap) customTimeInputWrap.style.display = 'none';
        state.selectedTimeSlot = btn.dataset.time || btn.querySelector('.time-slot-name').textContent;
      }
      updateCalendarStatus();
    });
  });

  if (customTimeInput) {
    customTimeInput.addEventListener('input', () => {
      if (customTimeInput.value.trim()) {
        state.selectedTimeSlot = `Своё время (${customTimeInput.value.trim()})`;
      } else {
        state.selectedTimeSlot = 'Своё время (согласуется при подтверждении)';
      }
      updateCalendarStatus();
    });
  }

  // 1. Переключатель режима выбора даты (Как можно скорее / Выбрать в календаре)
  if (pillAsap && pillCustom) {
    const asapBadge = pillAsap.querySelector('.pill-badge-active');
    const customBadge = pillCustom.querySelector('.pill-badge-active');

    pillAsap.addEventListener('click', () => {
      state.dateMode = 'asap';
      pillAsap.classList.add('active');
      pillCustom.classList.remove('active');
      if (asapBadge) asapBadge.style.display = 'inline-block';
      if (customBadge) customBadge.style.display = 'none';
      if (asapNoticeBox) asapNoticeBox.style.display = 'flex';
      if (customCalendarCard) customCalendarCard.style.display = 'none';
    });

    pillCustom.addEventListener('click', () => {
      state.dateMode = 'custom';
      pillCustom.classList.add('active');
      pillAsap.classList.remove('active');
      if (customBadge) customBadge.style.display = 'inline-block';
      if (asapBadge) asapBadge.style.display = 'none';
      if (asapNoticeBox) asapNoticeBox.style.display = 'none';
      if (customCalendarCard) {
        customCalendarCard.style.display = 'block';
        renderCalendar(state.calYear, state.calMonth);
        updateCalendarStatus();
      }
    });

    // Первичная инициализация календаря в фоне
    renderCalendar(state.calYear, state.calMonth);
    updateCalendarStatus();
  }

  // 2. Проверка зоны обслуживания при выборе
  if (clientZone) {
    clientZone.addEventListener('change', () => {
      if (clientZone.value === 'other') {
        zoneError.style.display = 'block';
      } else {
        zoneError.style.display = 'none';
      }
    });
  }

  // 3. Снятие ошибок при вводе
  clientNameInput.addEventListener('input', () => {
    nameError.style.display = 'none';
  });

  clientAddressInput.addEventListener('input', () => {
    addressError.style.display = 'none';
  });

  // 4. Инициализация карточек мебели
  calcCards.forEach(card => {
    const id = card.dataset.id;
    const price = parseInt(card.dataset.price, 10);
    const name = card.dataset.name;
    const countSpan = card.querySelector('.count-value');
    const minusBtn = card.querySelector('.btn-minus');
    const plusBtn = card.querySelector('.btn-plus');
    const selectBtn = card.querySelector('.btn-select');

    state.items[id] = { count: 0, price, name };

    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        state.items[id].count = 1;
        countSpan.textContent = '1';
        card.classList.add('active');
        recalculate();
      });
    }

    plusBtn.addEventListener('click', () => {
      state.items[id].count++;
      countSpan.textContent = state.items[id].count;
      card.classList.add('active');
      recalculate();
    });

    minusBtn.addEventListener('click', () => {
      if (state.items[id].count > 0) {
        state.items[id].count--;
        countSpan.textContent = state.items[id].count;
        if (state.items[id].count === 0) {
          card.classList.remove('active');
        }
        recalculate();
      }
    });
  });

  // 5. Инициализация чекбоксов доп. опций
  optCheckboxes.forEach(chk => {
    const id = chk.id;
    const price = parseInt(chk.dataset.price, 10);
    const name = chk.dataset.name;

    state.options[id] = { checked: false, price, name };

    chk.addEventListener('change', () => {
      state.options[id].checked = chk.checked;
      recalculate();
    });
  });

  // 6. Форматирование цены (с неразрывным пробелом перед символом рубля)
  function formatMoney(num) {
    return num.toLocaleString('ru-RU') + '\u00A0₽';
  }

  // 7. Пересчет итоговой стоимости
  function recalculate() {
    let total = 0;

    for (const key in state.items) {
      const item = state.items[key];
      total += item.count * item.price;
    }

    for (const key in state.options) {
      const opt = state.options[key];
      if (opt.checked) {
        total += opt.price;
      }
    }

    state.baseTotal = total;
    state.maxTotal = Math.round(total * CONFIG.priceRangeMultiplier);

    if (total === 0) {
      priceDisplay.textContent = '0\u00A0₽';
      minOrderNote.classList.remove('warning');
      minOrderNote.textContent = 'Минимальный выезд мастера: ' + formatMoney(CONFIG.minOrderAmount);
    } else if (total < CONFIG.minOrderAmount) {
      priceDisplay.textContent = formatMoney(total);
      minOrderNote.classList.add('warning');
      minOrderNote.textContent = `⚠️ До минимального выезда не хватает ${formatMoney(CONFIG.minOrderAmount - total)}`;
    } else {
      priceDisplay.textContent = `${formatMoney(total)} – ${formatMoney(state.maxTotal)}`;
      minOrderNote.classList.remove('warning');
      minOrderNote.textContent = 'Точная сумма зависит от ткани и подтверждается мастером';
    }
  }

  // 8. Маска ввода номера телефона (+7 (999) 000-00-00)
  clientPhoneInput.addEventListener('input', (e) => {
    let input = e.target.value.replace(/\D/g, '');
    if (input.startsWith('8')) input = '7' + input.slice(1);
    if (!input.startsWith('7')) input = '7' + input;

    let formatted = '+7';
    if (input.length > 1) {
      formatted += ' (' + input.substring(1, 4);
    }
    if (input.length >= 5) {
      formatted += ') ' + input.substring(4, 7);
    }
    if (input.length >= 8) {
      formatted += '-' + input.substring(7, 9);
    }
    if (input.length >= 10) {
      formatted += '-' + input.substring(9, 11);
    }
    e.target.value = formatted;
    phoneError.style.display = 'none';
  });

  // 9. Загрузка и предпросмотр фотографий
  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files).slice(0, 3);
      state.photos = files;
      photosPreview.innerHTML = '';

      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const thumb = document.createElement('div');
          thumb.className = 'preview-thumb';
          thumb.innerHTML = `
            <img src="${ev.target.result}" alt="Фото">
            <span class="preview-remove" data-index="${index}">&times;</span>
          `;
          photosPreview.appendChild(thumb);

          thumb.querySelector('.preview-remove').addEventListener('click', () => {
            state.photos.splice(index, 1);
            thumb.remove();
          });
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // 10. Строгая валидация перед отправкой
  function validate() {
    let isValid = true;

    // 1. Проверка выбора услуг
    const hasItems = Object.values(state.items).some(item => item.count > 0);
    if (!hasItems) {
      alert('Пожалуйста, выберите хотя бы один предмет для чистки в Шаге 1.');
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
      return false;
    }

    // 2. Проверка имени
    if (!clientNameInput.value.trim() || clientNameInput.value.trim().length < 2) {
      nameError.style.display = 'block';
      clientNameInput.focus();
      isValid = false;
    }

    // 3. Проверка телефона
    const phoneDigits = clientPhoneInput.value.replace(/\D/g, '');
    if (phoneDigits.length < 11) {
      phoneError.style.display = 'block';
      if (isValid) clientPhoneInput.focus();
      isValid = false;
    }

    // 4. Проверка зоны обслуживания
    if (clientZone && clientZone.value === 'other') {
      zoneError.style.display = 'block';
      clientZone.focus();
      alert('К сожалению, мастер выезжает только по городу и в радиусе до 30 км. В другие города выезд не осуществляется.');
      return false;
    }

    // 5. Проверка адреса (ОБЯЗАТЕЛЬНОЕ ПОЛЕ)
    if (!clientAddressInput.value.trim() || clientAddressInput.value.trim().length < 4) {
      addressError.style.display = 'block';
      if (isValid) clientAddressInput.focus();
      isValid = false;
    }

    // 6. Проверка даты, если выбран режим точной даты
    if (state.dateMode === 'custom' && (!state.selectedDate || !state.selectedDate.day)) {
      alert('Вы выбрали «Выбрать дату и время», пожалуйста, выберите день в календаре занятости мастеров.');
      document.getElementById('custom_calendar_card').scrollIntoView({ behavior: 'smooth' });
      return false;
    }

    return isValid;
  }

  // 11. Сборка структурированного заказа
  function buildOrderSummary() {
    const orderItems = [];
    for (const key in state.items) {
      const it = state.items[key];
      if (it.count > 0) {
        orderItems.push({ name: it.name, count: it.count, price: it.price });
      }
    }

    const orderOptions = [];
    for (const key in state.options) {
      const opt = state.options[key];
      if (opt.checked) {
        orderOptions.push(opt.name);
      }
    }

    let zoneClean = 'В черте города';
    let zoneFeeClean = 'выезд 0\u00A0₽';
    if (clientZone) {
      if (clientZone.value === 'city') {
        zoneClean = 'В черте города';
        zoneFeeClean = 'выезд 0\u00A0₽';
      } else if (clientZone.value === 'suburb_15') {
        zoneClean = 'Пригород (до 15 км)';
        zoneFeeClean = 'выезд 0\u00A0₽';
      } else if (clientZone.value === 'suburb_30') {
        zoneClean = 'Пригород (15–30 км)';
        zoneFeeClean = 'выезд 500\u00A0₽';
      }
    }
    
    let formattedDate = '';
    if (state.dateMode === 'asap') {
      formattedDate = '⚡ Как можно скорее (сегодня через 2–3 ч. или завтра утром)';
    } else {
      const { year, month, day } = state.selectedDate;
      const dateObj = new Date(year, month, day);
      const dayOfWeekName = WEEKDAYS_FULL[dateObj.getDay()];
      formattedDate = `${day} ${MONTH_NAMES_GENITIVE[month]} ${year} г. (${dayOfWeekName}), ${state.selectedTimeSlot}`;
    }

    return {
      name: clientNameInput.value.trim(),
      phone: clientPhoneInput.value.trim(),
      zone: `${zoneClean} (${zoneFeeClean})`,
      zoneTag: `${zoneClean} • ${zoneFeeClean}`,
      address: clientAddressInput.value.trim(),
      dateMode: state.dateMode,
      date: formattedDate,
      timeSlot: state.selectedTimeSlot,
      comment: clientCommentInput.value.trim() || 'Нет',
      items: orderItems,
      options: orderOptions,
      photosCount: state.photos.length,
      priceFormatted: `${formatMoney(state.baseTotal)} – ${formatMoney(state.maxTotal)}`
    };
  }

  // 12. Отправка заявки в Telegram или симуляция
  async function sendOrder(orderData) {
    const itemsLines = orderData.items.map(it => `• ${it.name}: ${it.count} шт.`).join('\n');
    const optionsLines = orderData.options.length ? `\n✨ <b>Доп. опции:</b>\n` + orderData.options.map(o => `• ${o}`).join('\n') : '';

    const messageText = 
`🔔 <b>Новая заявка на химчистку!</b>\n\n` +
`👤 <b>Клиент:</b> ${orderData.name}\n` +
`📞 <b>Телефон:</b> ${orderData.phone}\n` +
`📍 <b>Адрес:</b> ${orderData.address} (${orderData.zoneTag})\n` +
`📅 <b>Дата выезда:</b> ${orderData.date}\n\n` +
`🛋️ <b>Выбранная мебель:</b>\n${itemsLines}\n` +
optionsLines +
`\n💰 <b>Предварительный расчёт:</b> ${orderData.priceFormatted}\n` +
`📷 <b>Прикреплено фото:</b> ${orderData.photosCount} шт.\n` +
(orderData.comment !== 'Нет' ? `💬 <b>Комментарий:</b> ${orderData.comment}\n` : '');

    if (CONFIG.telegramBotToken && CONFIG.telegramChatId) {
      try {
        const url = `https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CONFIG.telegramChatId,
            text: messageText,
            parse_mode: 'HTML'
          })
        });
      } catch (err) {
        console.warn('Ошибка отправки в Telegram API:', err);
      }
    } else {
      console.log('=== ДЕМО: УВЕДОМЛЕНИЕ В TELEGRAM МАСТЕРУ ===');
      console.log(messageText);
    }

    // Отправка в Google Таблицу (если указан webhook)
    if (CONFIG.googleSheetsWebhookUrl) {
      try {
        await fetch(CONFIG.googleSheetsWebhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        console.log('Заказ успешно передан в Google Таблицу');
      } catch (err) {
        console.warn('Ошибка отправки в Google Sheets:', err);
      }
    }
  }

  // 13. Обработка клика по кнопке «Отправить заявку»
  submitBtn.addEventListener('click', async () => {
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Отправка заявки...</span>';

    const orderData = buildOrderSummary();

    try {
      await sendOrder(orderData);

      if (modalPrice) {
        modalPrice.textContent = orderData.priceFormatted;
      }
      
      // Генерация структурированного цифрового чека "ПО ПОЛКАМ"
      const orderNum = Math.floor(1000 + Math.random() * 9000);
      
      let summaryHtml = `
        <div class="receipt-card">
          <div class="receipt-header">
            <span class="receipt-title">📋 Заявка #ЧД-${orderNum}</span>
            <span class="receipt-badge">Принята в работу</span>
          </div>

          <div class="receipt-section">
            <!-- 1. Мебель по полкам -->
            <div class="receipt-items-box">
              <div class="receipt-box-header">🛋️ Выбранная мебель:</div>
              <div class="receipt-items-list">
                ${orderData.items.map(it => `
                  <div class="receipt-item-row">
                    <span class="receipt-item-title">${it.name}</span>
                    <span class="receipt-item-badge">${it.count} шт.</span>
                  </div>
                `).join('')}
              </div>
            </div>
      `;

      // 2. Дополнительные опции фишками
      if (orderData.options.length) {
        summaryHtml += `
            <div class="receipt-items-box">
              <div class="receipt-box-header">✨ Дополнительные опции:</div>
              <div class="receipt-chips-wrap">
                ${orderData.options.map(opt => `<span class="receipt-chip">${opt}</span>`).join('')}
              </div>
            </div>
        `;
      }

      // 3. Параметры выезда и контакты (отдельными аккуратными строками)
      summaryHtml += `
            <div class="receipt-row">
              <span class="receipt-label">📅 Дата и время:</span>
              <span class="receipt-value highlight">${orderData.date}</span>
            </div>
            
            <div class="receipt-row">
              <span class="receipt-label">📍 Адрес выезда:</span>
              <span class="receipt-value">${orderData.address}</span>
            </div>

            <div class="receipt-row">
              <span class="receipt-label">🚗 Зона выезда:</span>
              <span class="receipt-value"><span class="receipt-zone-tag">${orderData.zoneTag}</span></span>
            </div>

            <div class="receipt-row">
              <span class="receipt-label">👤 Клиент:</span>
              <span class="receipt-value">${orderData.name}</span>
            </div>

            <div class="receipt-row">
              <span class="receipt-label">📞 Телефон:</span>
              <span class="receipt-value">${orderData.phone}</span>
            </div>

            <div class="receipt-row">
              <span class="receipt-label">🚛 Статус бригады:</span>
              <span class="receipt-value success">Экипаж с экстрактором Kärcher Puzzi зарезервирован</span>
            </div>
      `;

      // 4. Фотографии
      if (orderData.photosCount > 0) {
        summaryHtml += `
            <div class="receipt-row">
              <span class="receipt-label">📷 Фото загрязнений:</span>
              <span class="receipt-value success">${orderData.photosCount} шт. прикреплено</span>
            </div>
        `;
      }

      // 5. Пожелания
      if (orderData.comment && orderData.comment !== 'Нет') {
        summaryHtml += `
            <div class="receipt-row">
              <span class="receipt-label">💬 Пожелание:</span>
              <span class="receipt-value italic">«${orderData.comment}»</span>
            </div>
        `;
      }

      // Закрытие карточки чека (ориентир стоимости вынесен наверх и виден постоянно)
      summaryHtml += `
          </div>
        </div>
      `;
      modalSummary.innerHTML = summaryHtml;

      successModal.classList.add('active');

    } catch (err) {
      alert('Произошла ошибка при отправке заявки. Пожалуйста, попробуйте еще раз.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Отправить заявку</span><span class="btn-arrow">→</span>';
    }
  });

  // Закрытие модального окна
  modalCloseBtn.addEventListener('click', () => {
    successModal.classList.remove('active');
  });

  // Закрытие по клику вне карточки
  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      successModal.classList.remove('active');
    }
  });
});
