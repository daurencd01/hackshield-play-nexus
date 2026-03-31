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
  type: "narrative" | "situation" | "terminal" | "outcome" | "dialogue" | "log" | "result";
  text?: string;
  content?: string;
  speaker?: string;
  question?: string;
  choices?: {
    id: string;
    text: string;
    consequence: string;
    xpGain: number;
    isOptimal: boolean;
  }[];
  options?: {
    text: string;
    isCorrect: boolean;
    explanation: string;
    xpAward: number;
  }[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "legendary";
  category: "phishing" | "network" | "password" | "social engineering" | "device";
  steps: ScenarioStep[];
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

export const scenarios: Scenario[] = [
  {
    id: "phish_01",
    title: "The Urgent HR Email",
    description: "You receive an urgent email about your payroll. Can you spot the red flags?",
    difficulty: "easy",
    category: "phishing",
    steps: [
      {
        id: "p1_s1",
        type: "dialogue",
        content: "It's Friday afternoon, and you're just about to wrap up your work for the week. Suddenly, a notification pops up."
      },
      {
        id: "p1_s2",
        type: "log",
        content: "New Email: [URGENT] Verify your Bank Details for Payroll by 5:00 PM. \nSender: HR-updater@company-payroll-alerts.com"
      },
      {
        id: "p1_s3",
        type: "situation",
        question: "What is your first course of action?",
        options: [
          {
            text: "Click the link to verify my details quickly. I don't want to miss my paycheck!",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: Your credentials were stolen! This is a classic phishing attack using urgency and a fake sender address. The company would never rush payroll updates via a random email."
          },
          {
            text: "Hover over the link without clicking to see where it actually goes.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Excellent! Checking the destination URL is a great way to spot fake links."
          }
        ]
      },
      {
        id: "p1_s4",
        type: "dialogue",
        content: "Regardless of what happened, moments later IT sends out a company-wide alert about a new phishing campaign."
      },
      {
        id: "p1_s5",
        type: "situation",
        question: "Since there's an active phishing campaign, what should you do with that HR email?",
        options: [
          {
            text: "Forward the phishing email to my team to warn them.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: By forwarding the email, your coworker accidentally clicked the link! You should report it to IT security instead so they can remove it from everyone's inbox."
          },
          {
            text: "Use the 'Report Phishing' button in the email client.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Spot on! Reporting helps the security team analyze the threat and block the sender for everyone."
          }
        ]
      },
      {
        id: "p1_s6",
        type: "result",
        content: "Scenario Complete! Phishing emails prey on emotions like fear and urgency. Always verify the sender's actual address, not just their display name."
      }
    ]
  },
  {
    id: "net_01",
    title: "Coffee Shop Connection",
    description: "Working from a local cafe sounds great, but is the public network safe?",
    difficulty: "medium",
    category: "network",
    steps: [
      {
        id: "n1_s1",
        type: "dialogue",
        content: "You are at 'Cyber Brews' coffee shop to finish an important presentation for work."
      },
      {
        id: "n1_s2",
        type: "log",
        content: "Wi-Fi Networks Available: \n1. Cyber Brews Free Wi-Fi\n2. Cyber Brews 5G_FAST"
      },
      {
        id: "n1_s3",
        type: "situation",
        question: "Which network should you connect to?",
        options: [
          {
            text: "Cyber Brews 5G_FAST, it sounds faster and has a stronger signal.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: You connected to a hacker's device! This is an 'Evil Twin' attack. Hackers often set up fake networks with appealing names to steal your data as it passes through."
          },
          {
            text: "Ask the barista for the official network name and password.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Smart move! Always verify public network names with staff to avoid connecting to malicious hotspots."
          }
        ]
      },
      {
        id: "n1_s4",
        type: "dialogue",
        content: "You are now connected to the internet and need to log into your work email."
      },
      {
        id: "n1_s5",
        type: "situation",
        question: "Do you take any extra precautions before logging in on this public network?",
        options: [
          {
            text: "No, as long as the website has the padlock icon (HTTPS), I am totally secure.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: While HTTPS helps, the cafe network can still see what websites you visit, and some elements might still be vulnerable. A VPN is much safer."
          },
          {
            text: "Yes, I turn on my company's VPN before doing any work.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Perfect! A VPN (Virtual Private Network) encrypts your traffic in a secure tunnel, keeping your data safe from anyone snooping on the public network."
          }
        ]
      },
      {
        id: "n1_s6",
        type: "result",
        content: "Scenario Complete! Public Wi-Fi is inherently untrusted. Treat all public networks as hostile and use a VPN for sensitive tasks."
      }
    ]
  },
  {
    id: "pass_01",
    title: "The Streaming Account",
    description: "Your favorite streaming service had a data breach. Are your other accounts safe?",
    difficulty: "medium",
    category: "password",
    steps: [
      {
        id: "pw1_s1",
        type: "dialogue",
        content: "You receive a notification that a small online forum you used 5 years ago has been hacked."
      },
      {
        id: "pw1_s2",
        type: "log",
        content: "ALERT: Your account for 'GamerzForum' was compromised in a data breach. Passwords were leaked in plain text."
      },
      {
        id: "pw1_s3",
        type: "situation",
        question: "Your GamerzForum password was 'P@ssword123'. Do you need to worry?",
        options: [
          {
            text: "No, I haven't used that forum in years. They can have that account.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: Hackers logged into your bank! If you reused this password anywhere else, hackers will try it automatically on hundreds of sites (Credential Stuffing)."
          },
          {
            text: "Yes, I need to check if I am using that specific password on any other active accounts.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Exact right intuition! Password reuse means one breach on a useless site can compromise your most important accounts."
          }
        ]
      },
      {
        id: "pw1_s4",
        type: "dialogue",
        content: "You realize you use 'P@ssword123' for your personal email."
      },
      {
        id: "pw1_s5",
        type: "situation",
        question: "How do you fix this and prevent future issues?",
        options: [
          {
            text: "Change my email password to 'P@ssword124' so I don't forget it.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: Your account was hacked again! Hackers use algorithms that easily guess predictable variations of leaked passwords (like adding +1 to a number)."
          },
          {
            text: "Use a Password Manager to generate and store a long, completely random password.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Excellent choice! Unique, random passwords for every site keep you safe, and a manager means you only need to remember one master password."
          }
        ]
      },
      {
        id: "pw1_s6",
        type: "result",
        content: "Scenario Complete! Never reuse passwords across important accounts. Password managers are your best defense against credential stuffing."
      }
    ]
  },
  {
    id: "soc_01",
    title: "The 'Helpful' IT Guy",
    description: "Someone claiming to be from IT calls you for a quick software update.",
    difficulty: "easy",
    category: "social engineering",
    steps: [
      {
        id: "se1_s1",
        type: "dialogue",
        content: "Your desk phone rings during a busy morning. The caller ID simply says 'Unknown Number'."
      },
      {
        id: "se1_s2",
        type: "log",
        content: "Voice: 'Hi, this is Dave from the IT Helpdesk. We are seeing some critical errors coming from your computer. I need you to download a quick diagnostic tool right now to stop it from crashing.'"
      },
      {
        id: "se1_s3",
        type: "situation",
        question: "How do you respond to 'Dave'?",
        options: [
          {
            text: "Ask Dave to email the tool link so you can download it and fix the errors quickly.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: You just let a hacker install ransomware! Attackers often impersonate authority figures and use pressure to make you bypass security protocols."
          },
          {
            text: "Hang up, then call the official IT Helpdesk number from the company directory to verify.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Great thinking! Verifying requests through an independent, trusted internal channel is the best defense against social engineering."
          }
        ]
      },
      {
        id: "se1_s4",
        type: "dialogue",
        content: "You verified, and the real IT team told you Dave is not an employee. 'Dave' was a scammer."
      },
      {
        id: "se1_s5",
        type: "situation",
        question: "The fake Dave calls back a few minutes later, acting angry about you hanging up.",
        options: [
          {
            text: "Tell him you know he's a fake and argue with him to waste his time.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: The scammer recorded your voice! Engaging with attackers can accidentally give them more information or escalate the situation. It's best not to engage."
          },
          {
            text: "Hang up immediately and report the timeline of events to the real IT department.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Perfect. Reporting the specifics (time, phone number, what they said) helps IT warn others who might get the exact same scam call."
          }
        ]
      },
      {
        id: "se1_s6",
        type: "result",
        content: "Scenario Complete! Social engineering manipulates human trust. Remember: Verify, don't trust, especially when pressured by 'authority'."
      }
    ]
  },
  {
    id: "usb_01",
    title: "The Mystery Drive",
    description: "You find a USB drive in the parking lot. It says 'Confidential Salaries'.",
    difficulty: "easy",
    category: "device",
    steps: [
      {
        id: "u1_s1",
        type: "dialogue",
        content: "You are walking through the company parking lot and spot something shiny on the ground."
      },
      {
        id: "u1_s2",
        type: "log",
        content: "It's a sleek metallic USB drive. A sticky note is attached that reads: 'Q4 Bonuses - CONFIDENTIAL'."
      },
      {
        id: "u1_s3",
        type: "situation",
        question: "What do you do with the USB drive?",
        options: [
          {
            text: "Plug it into my computer just to see who it belongs to, so I can return it.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: Your system was just infected and locked down! Malicious USB drives can automatically install malware the second they are plugged in, bypassing antivirus."
          },
          {
            text: "Take it directly to the IT or security department without plugging it in anywhere.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Excellent! IT has safe, isolated sandbox environments to analyze suspicious hardware without risking the company network."
          }
        ]
      },
      {
        id: "u1_s4",
        type: "dialogue",
        content: "IT later informs you it was an attacker's device designed to act like a keyboard, typing invisible, malicious commands rapidly once plugged in."
      },
      {
        id: "u1_s5",
        type: "situation",
        question: "Your coworker mentions they found a similar USB at a trade show. They want to use it for personal family photos. What do you say?",
        options: [
          {
            text: "Tell them to format the drive first before using it, just to be safe.",
            isCorrect: false,
            xpAward: 2,
            explanation: "Consequence: Their computer still gets hacked! Formatting software only wipes the storage; it doesn't fix hardware-level firmware attacks. The device is fundamentally unsafe."
          },
          {
            text: "Warn them it could be malicious and advise them to throw it away or destroy it.",
            isCorrect: true,
            xpAward: 10,
            explanation: "Good advice! 'Found' hardware is never worth the risk. Always buy storage from trusted retailers."
          }
        ]
      },
      {
        id: "u1_s6",
        type: "result",
        content: "Scenario Complete! Human curiosity is a tool for hackers. Never plug untrusted hardware into your personal or work devices."
      }
    ]
  }
];
