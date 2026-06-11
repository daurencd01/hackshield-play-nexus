// Cybersecurity hack-challenges for the 2D stealth game (Operation BLACKOUT).
// Each terminal opens one of these. Picked deterministically by terminal id so
// a given terminal always shows the same question.

export interface HackChallenge {
  id: string;
  category: string;        // shown as the "system" being breached
  difficulty: 1 | 2 | 3;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

export const HACK_CHALLENGES: HackChallenge[] = [
  {
    id: 'phishing-1',
    category: 'MAIL GATEWAY',
    difficulty: 1,
    prompt: 'Письмо «от банка» просит срочно подтвердить пароль по ссылке hxxp://secure-bank.verify-login.ru. Главный признак фишинга?',
    options: [
      'Поддельный домен и срочность ("verify-login.ru" ≠ банк)',
      'Письмо пришло утром',
      'В письме есть логотип банка',
      'Тема письма на русском языке',
    ],
    correctIndex: 0,
    explanation: 'Настоящий банк не просит пароль по ссылке, а домен-обманка + давление срочности — классика фишинга.',
    xpReward: 60,
  },
  {
    id: 'ports-ssh',
    category: 'FIREWALL',
    difficulty: 1,
    prompt: 'Какой порт по умолчанию использует SSH?',
    options: ['80', '22', '443', '3389'],
    correctIndex: 1,
    explanation: 'SSH — порт 22. (80=HTTP, 443=HTTPS, 3389=RDP).',
    xpReward: 60,
  },
  {
    id: 'pw-strong',
    category: 'AUTH SERVER',
    difficulty: 1,
    prompt: 'Какой пароль самый надёжный?',
    options: ['Dauren2005', 'qwerty123', 'P@ssw0rd', 'k7$Lм9!vQ2#xZ обычно длинная фраза'],
    correctIndex: 3,
    explanation: 'Длина + случайность + разные классы символов важнее «хитрых» замен в коротком слове.',
    xpReward: 70,
  },
  {
    id: 'mfa',
    category: 'IDENTITY',
    difficulty: 1,
    prompt: 'Что добавляет двухфакторная аутентификация (2FA/MFA)?',
    options: [
      'Второй независимый фактор подтверждения личности',
      'Делает пароль длиннее',
      'Шифрует жёсткий диск',
      'Ускоряет вход в систему',
    ],
    correctIndex: 0,
    explanation: 'MFA требует второй фактор (код/ключ/биометрия) — украденного пароля уже недостаточно.',
    xpReward: 70,
  },
  {
    id: 'ransomware',
    category: 'EDR CONSOLE',
    difficulty: 2,
    prompt: 'NULL SECTOR запустил шифровальщик. Лучший способ восстановиться без выкупа?',
    options: [
      'Заплатить выкуп',
      'Восстановить из оффлайн-резервных копий',
      'Перезагрузить компьютер',
      'Сменить пароль администратора',
    ],
    correctIndex: 1,
    explanation: 'Изолированные оффлайн-бэкапы — главная защита от ransomware. Платить нельзя (нет гарантий, финансирует атаки).',
    xpReward: 90,
  },
  {
    id: 'sqli',
    category: 'WEB APP DB',
    difficulty: 2,
    prompt: "Ввод ' OR '1'='1 в форму логина — это попытка какой атаки?",
    options: ['XSS', 'SQL-инъекция', 'DDoS', 'Фишинг'],
    correctIndex: 1,
    explanation: "SQL-инъекция: подмена логики запроса. Защита — параметризованные запросы / prepared statements.",
    xpReward: 90,
  },
  {
    id: 'hashing',
    category: 'CRYPTO VAULT',
    difficulty: 2,
    prompt: 'Как правильно хранить пароли пользователей в БД?',
    options: [
      'Открытым текстом',
      'Зашифровать обратимым шифром',
      'Хешировать с солью (bcrypt/argon2)',
      'Закодировать в Base64',
    ],
    correctIndex: 2,
    explanation: 'Пароли хешируют с солью медленными алгоритмами (bcrypt/argon2). Base64 — это кодирование, не защита.',
    xpReward: 100,
  },
  {
    id: 'https',
    category: 'NETWORK TAP',
    difficulty: 1,
    prompt: 'Что обеспечивает HTTPS по сравнению с HTTP?',
    options: [
      'Шифрование трафика между браузером и сервером',
      'Ускорение загрузки страниц',
      'Бесплатный хостинг',
      'Защиту от вирусов на сервере',
    ],
    correctIndex: 0,
    explanation: 'HTTPS (TLS) шифрует канал, защищая данные от перехвата (MITM).',
    xpReward: 60,
  },
  {
    id: 'social-eng',
    category: 'BADGE READER',
    difficulty: 2,
    prompt: 'Человек без пропуска просит придержать дверь "забыл бейдж". Как называется приём?',
    options: ['Tailgating (проход «на хвосте»)', 'Брутфорс', 'Снифинг', 'Спуфинг'],
    correctIndex: 0,
    explanation: 'Tailgating — физическая социальная инженерия. Не пропускайте людей без проверки доступа.',
    xpReward: 90,
  },
  {
    id: 'c2-killswitch',
    category: 'C2 KILL-SWITCH',
    difficulty: 3,
    prompt: 'Чтобы остановить шифровальщик в сети, что эффективнее всего сделать первым?',
    options: [
      'Изолировать заражённые хосты от сети (segment/quarantine)',
      'Разослать всем письмо с предупреждением',
      'Выключить кондиционер в серверной',
      'Удалить браузер',
    ],
    correctIndex: 0,
    explanation: 'Сетевая изоляция (containment) останавливает распространение и связь с C2 — первый шаг IR.',
    xpReward: 130,
  },
  {
    id: 'zero-day',
    category: 'PATCH MGMT',
    difficulty: 2,
    prompt: 'Что такое уязвимость «нулевого дня» (zero-day)?',
    options: [
      'Уязвимость без доступного патча, неизвестная вендору',
      'Вирус, который активируется в полночь',
      'Старый баг из прошлого года',
      'Ошибка пользователя',
    ],
    correctIndex: 0,
    explanation: 'Zero-day — эксплуатируется до выхода исправления. Защита: сегментация, EDR, принцип наименьших привилегий.',
    xpReward: 100,
  },
  {
    id: 'exfil',
    category: 'DLP MONITOR',
    difficulty: 3,
    prompt: 'Аномалия: ночью 40 ГБ уходят на неизвестный внешний IP. Что это вероятнее всего?',
    options: [
      'Эксфильтрация данных (кража)',
      'Плановое обновление Windows',
      'Резервное копирование',
      'Спам-рассылка',
    ],
    correctIndex: 0,
    explanation: 'Большой исходящий трафик на незнакомый IP ночью — типичный признак exfiltration. Нужно блокировать и расследовать.',
    xpReward: 130,
  },
];

// Stable pick: same terminal id -> same challenge.
export function challengeForTerminal(terminalId: string, isMain: boolean): HackChallenge {
  if (isMain) return HACK_CHALLENGES.find(c => c.id === 'c2-killswitch')!;
  let hash = 0;
  for (let i = 0; i < terminalId.length; i++) hash = (hash * 31 + terminalId.charCodeAt(i)) >>> 0;
  // exclude the C2 kill-switch from random pool (reserved for main terminal)
  const pool = HACK_CHALLENGES.filter(c => c.id !== 'c2-killswitch');
  return pool[hash % pool.length];
}
