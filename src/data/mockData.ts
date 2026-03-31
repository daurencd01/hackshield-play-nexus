export interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "legendary";
  xpReward: number;
  status: "locked" | "available" | "in-progress" | "completed";
  chapter: number;
  icon: string;
  briefing: string;
}

export interface ScenarioStep {
  id: string;
  type: "narrative" | "situation" | "terminal" | "outcome";
  text: string;
  speaker?: string;
  choices?: {
    id: string;
    text: string;
    consequence: string;
    xpGain: number;
    isOptimal: boolean;
  }[];
}

export interface Player {
  id: string;
  username: string;
  level: number;
  xp: number;
  xpToNext: number;
  avatar: string;
  rank: string;
  missionsCompleted: number;
  streak: number;
  joinedDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  unlockedDate?: string;
  progress?: number;
  maxProgress?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  xp: number;
  avatar: string;
  missionsCompleted: number;
  isOnline: boolean;
}

export const currentPlayer: Player = {
  id: "player-1",
  username: "ShadowByte",
  level: 7,
  xp: 2450,
  xpToNext: 3000,
  avatar: "🦊",
  rank: "Cyber Agent",
  missionsCompleted: 12,
  streak: 5,
  joinedDate: "2025-11-15",
};

export const missions: Mission[] = [
  {
    id: "m1",
    title: "Phishing Net",
    description: "Вас наняли расследовать фишинговую атаку на корпорацию NovaTech. Найдите источник и нейтрализуйте угрозу.",
    difficulty: "easy",
    xpReward: 200,
    status: "completed",
    chapter: 1,
    icon: "🎣",
    briefing: "Сотрудники NovaTech получают подозрительные письма. Ваша задача — проанализировать ситуацию.",
  },
  {
    id: "m2",
    title: "Dark Proxy",
    description: "Обнаружен вредоносный прокси-сервер, перехватывающий данные сотрудников. Отследите его и отключите.",
    difficulty: "easy",
    xpReward: 250,
    status: "completed",
    chapter: 1,
    icon: "🌐",
    briefing: "Трафик организации перенаправляется через неизвестный прокси.",
  },
  {
    id: "m3",
    title: "Ransomware Siege",
    description: "Вирус-шифровальщик блокирует серверы городской больницы. Каждая минута на счету.",
    difficulty: "medium",
    xpReward: 400,
    status: "available",
    chapter: 2,
    icon: "🔒",
    briefing: "Критическая инфраструктура под угрозой. Время действовать.",
  },
  {
    id: "m4",
    title: "Social Engineer",
    description: "Кто-то проникает в здание через социальную инженерию. Остановите его, прежде чем он получит доступ.",
    difficulty: "medium",
    xpReward: 450,
    status: "available",
    chapter: 2,
    icon: "🎭",
    briefing: "Охранник сообщил о подозрительном визитёре.",
  },
  {
    id: "m5",
    title: "Zero Day Hunt",
    description: "Обнаружена 0-day уязвимость в критической системе. Найдите эксплойт до того, как его используют.",
    difficulty: "hard",
    xpReward: 600,
    status: "locked",
    chapter: 3,
    icon: "🐛",
    briefing: "Неизвестная уязвимость. Нет патчей. Только ваши навыки.",
  },
  {
    id: "m6",
    title: "Ghost Protocol",
    description: "APT-группировка проникла в правительственную сеть. Операция высшей секретности.",
    difficulty: "legendary",
    xpReward: 1000,
    status: "locked",
    chapter: 4,
    icon: "👻",
    briefing: "Совершенно секретно. Только для агентов уровня 10+.",
  },
];

export const missionScenario: ScenarioStep[] = [
  {
    id: "s1",
    type: "narrative",
    text: "🔔 Входящее сообщение от HACKSHIELD HQ...",
    speaker: "СИСТЕМА",
  },
  {
    id: "s2",
    type: "narrative",
    text: "Агент, у нас ситуация. Серверы городской больницы «Медикор» заблокированы вирусом-шифровальщиком. Пациенты не могут получить лечение. На экранах — требование выкупа: 50 BTC в течение 6 часов.",
    speaker: "Commander Vex",
  },
  {
    id: "s3",
    type: "situation",
    text: "Вы прибываете в серверную «Медикор». На мониторах мигает красное предупреждение. Системный администратор в панике говорит: «Мы можем заплатить выкуп и восстановить всё за час... или вы попробуете что-то другое, но я не уверен, что получится.»",
    choices: [
      {
        id: "c1",
        text: "Заплатить выкуп — это самый быстрый путь",
        consequence: "Вы перевели 50 BTC. Данные расшифрованы, но через неделю атака повторилась — злоумышленники поняли, что вы платите. Репутация подорвана.",
        xpGain: 20,
        isOptimal: false,
      },
      {
        id: "c2",
        text: "Изолировать заражённые сервера и начать анализ",
        consequence: "Отличное решение! Вы отключили заражённые сегменты от сети, предотвратив дальнейшее распространение. Время на анализ вектора атаки.",
        xpGain: 100,
        isOptimal: true,
      },
      {
        id: "c3",
        text: "Позвонить в полицию и ждать",
        consequence: "Полиция приняла заявление, но у них нет специалистов по кибер-инцидентам. Время идёт, шифровальщик распространяется на резервные системы.",
        xpGain: 30,
        isOptimal: false,
      },
    ],
  },
  {
    id: "s4",
    type: "terminal",
    text: "Анализ логов показывает, что вирус проник через email-вложение, открытое бухгалтером. Файл: invoice_final_v2.exe. В логах firewall видна связь с C2-сервером: 185.143.xx.xx:4444",
    speaker: "ТЕРМИНАЛ",
  },
  {
    id: "s5",
    type: "situation",
    text: "Вы обнаружили C2-сервер злоумышленника. У вас есть несколько вариантов действий.",
    choices: [
      {
        id: "c4",
        text: "Заблокировать IP на firewall и восстановить из бэкапов",
        consequence: "Профессиональный подход! IP заблокирован, связь с C2 разорвана. Бэкапы двухдневной давности доступны. Больница восстановлена за 4 часа.",
        xpGain: 120,
        isOptimal: true,
      },
      {
        id: "c5",
        text: "Попытаться взломать C2-сервер в ответ",
        consequence: "Hack-back — незаконная операция. Вы получили данные, но нарушили закон. Юридические последствия неизбежны. Хороший хакер — не всегда хороший агент.",
        xpGain: 40,
        isOptimal: false,
      },
      {
        id: "c6",
        text: "Отключить весь интернет в больнице",
        consequence: "Радикально, но эффективно для остановки утечки. Однако отключились и медицинские IoT-устройства. Некоторым пациентам стало хуже.",
        xpGain: 50,
        isOptimal: false,
      },
    ],
  },
  {
    id: "s6",
    type: "narrative",
    text: "Системы «Медикор» восстановлены. Вы составили отчёт об инциденте и рекомендации по безопасности. Commander Vex доволен вашей работой.",
    speaker: "Commander Vex",
  },
  {
    id: "s7",
    type: "outcome",
    text: "Миссия завершена! Больница спасена. Ваш отчёт поможет предотвратить будущие атаки.",
  },
];

export const achievements: Achievement[] = [
  { id: "a1", title: "First Blood", description: "Завершить первую миссию", icon: "⚔️", rarity: "common", unlocked: true, unlockedDate: "2025-12-01" },
  { id: "a2", title: "Phishing Expert", description: "Распознать 10 фишинговых писем", icon: "🎣", rarity: "common", unlocked: true, unlockedDate: "2025-12-05", progress: 10, maxProgress: 10 },
  { id: "a3", title: "Firewall Guardian", description: "Заблокировать 5 C2-серверов", icon: "🛡️", rarity: "rare", unlocked: true, unlockedDate: "2026-01-10", progress: 5, maxProgress: 5 },
  { id: "a4", title: "Speed Runner", description: "Завершить миссию за 3 минуты", icon: "⚡", rarity: "rare", unlocked: false, progress: 0, maxProgress: 1 },
  { id: "a5", title: "Ghost Agent", description: "Пройти 3 миссии без ошибок", icon: "👻", rarity: "epic", unlocked: false, progress: 1, maxProgress: 3 },
  { id: "a6", title: "Cyber Legend", description: "Достичь 10 уровня", icon: "👑", rarity: "legendary", unlocked: false, progress: 7, maxProgress: 10 },
  { id: "a7", title: "Team Player", description: "Выиграть 5 мультиплеер матчей", icon: "🤝", rarity: "rare", unlocked: false, progress: 2, maxProgress: 5 },
  { id: "a8", title: "Streak Master", description: "Играть 7 дней подряд", icon: "🔥", rarity: "epic", unlocked: false, progress: 5, maxProgress: 7 },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, username: "NullPointer", level: 15, xp: 12500, avatar: "🐉", missionsCompleted: 42, isOnline: true },
  { rank: 2, username: "ByteStorm", level: 13, xp: 10200, avatar: "⚡", missionsCompleted: 38, isOnline: false },
  { rank: 3, username: "CipherQueen", level: 12, xp: 9800, avatar: "👸", missionsCompleted: 35, isOnline: true },
  { rank: 4, username: "DarkRouter", level: 11, xp: 8900, avatar: "🌑", missionsCompleted: 30, isOnline: true },
  { rank: 5, username: "ZeroDay", level: 10, xp: 7500, avatar: "🎯", missionsCompleted: 28, isOnline: false },
  { rank: 6, username: "PacketSniff", level: 9, xp: 6200, avatar: "🔍", missionsCompleted: 24, isOnline: false },
  { rank: 7, username: "ShadowByte", level: 7, xp: 2450, avatar: "🦊", missionsCompleted: 12, isOnline: true },
  { rank: 8, username: "FirewallFox", level: 6, xp: 2100, avatar: "🦁", missionsCompleted: 10, isOnline: true },
  { rank: 9, username: "MalwareHunter", level: 5, xp: 1800, avatar: "🏹", missionsCompleted: 8, isOnline: false },
  { rank: 10, username: "RootAccess", level: 4, xp: 1200, avatar: "🔑", missionsCompleted: 5, isOnline: false },
];

export const friends: LeaderboardEntry[] = [
  { rank: 1, username: "CipherQueen", level: 12, xp: 9800, avatar: "👸", missionsCompleted: 35, isOnline: true },
  { rank: 2, username: "DarkRouter", level: 11, xp: 8900, avatar: "🌑", missionsCompleted: 30, isOnline: true },
  { rank: 3, username: "FirewallFox", level: 6, xp: 2100, avatar: "🦁", missionsCompleted: 10, isOnline: true },
  { rank: 4, username: "MalwareHunter", level: 5, xp: 1800, avatar: "🏹", missionsCompleted: 8, isOnline: false },
];
