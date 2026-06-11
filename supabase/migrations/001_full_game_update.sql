-- Full Game Update: 21 Rooms, Missions, and Quizzes
-- Date: 2024-05-15

DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS scenario_rooms CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP VIEW IF EXISTS user_quiz_stats CASCADE;
DROP FUNCTION IF EXISTS add_xp_to_user(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS submit_quiz_answer(UUID, UUID, INTEGER, INTEGER, INTEGER) CASCADE;

-- 1.1 Таблица quiz_questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  explanation TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  time_limit_seconds INTEGER NOT NULL DEFAULT 30,
  hint TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_room ON quiz_questions(room_id);
CREATE INDEX idx_quiz_category ON quiz_questions(category);
CREATE INDEX idx_quiz_difficulty ON quiz_questions(difficulty);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_select_auth" ON quiz_questions FOR SELECT TO authenticated USING (true);

-- 1.2 Таблица user_progress
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_question_id UUID REFERENCES quiz_questions(id) ON DELETE SET NULL,
  mission_id TEXT,
  room_id INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_progress_user ON user_progress(user_id);
CREATE INDEX idx_progress_user_quiz ON user_progress(user_id, quiz_question_id);
CREATE INDEX idx_progress_room ON user_progress(user_id, room_id);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_select" ON user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "progress_insert" ON user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update" ON user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 1.3 RPC-функции
CREATE OR REPLACE FUNCTION add_xp_to_user(p_user_id UUID, p_xp INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  UPDATE profiles
  SET xp = COALESCE(xp, 0) + p_xp,
      level = FLOOR((COALESCE(xp, 0) + p_xp) / 100) + 1,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION submit_quiz_answer(
  p_user_id UUID, p_quiz_question_id UUID, p_room_id INTEGER,
  p_selected_answer INTEGER, p_time_spent INTEGER DEFAULT 0
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_correct INTEGER; v_is_correct BOOLEAN;
  v_xp_reward INTEGER; v_xp_earned INTEGER; v_explanation TEXT;
BEGIN
  IF EXISTS(SELECT 1 FROM user_progress WHERE user_id = p_user_id AND quiz_question_id = p_quiz_question_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already answered', 'xp_earned', 0);
  END IF;

  SELECT correct_answer, xp_reward, explanation INTO v_correct, v_xp_reward, v_explanation
  FROM quiz_questions WHERE id = p_quiz_question_id;

  IF v_correct IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Question not found', 'xp_earned', 0);
  END IF;

  v_is_correct := (p_selected_answer = v_correct);
  v_xp_earned := CASE WHEN v_is_correct THEN v_xp_reward + (CASE WHEN p_time_spent < 10 THEN 5 ELSE 0 END) ELSE GREATEST(v_xp_reward / 5, 2) END;

  INSERT INTO user_progress (user_id, quiz_question_id, room_id, score, xp_earned, is_correct, time_spent_seconds)
  VALUES (p_user_id, p_quiz_question_id, p_room_id, CASE WHEN v_is_correct THEN 1 ELSE 0 END, v_xp_earned, v_is_correct, p_time_spent);

  PERFORM add_xp_to_user(p_user_id, v_xp_earned);

  RETURN jsonb_build_object('success', true, 'is_correct', v_is_correct, 'correct_answer', v_correct, 'xp_earned', v_xp_earned, 'explanation', COALESCE(v_explanation, ''));
END;
$$;

-- 1.4 VIEW
CREATE OR REPLACE VIEW user_quiz_stats AS
SELECT user_id, room_id, COUNT(*) as total_answered,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
  SUM(xp_earned) as total_xp,
  ROUND((SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as accuracy_percent
FROM user_progress GROUP BY user_id, room_id;

-- 1.5 ВСТАВКА 105 ВОПРОСОВ
INSERT INTO quiz_questions (room_id, category, difficulty, question_text, options, correct_answer, explanation, xp_reward, time_limit_seconds, hint, source) VALUES

-- ===== КОМНАТА 0: Введение в кибербезопасность =====
(0, 'fundamentals', 'easy',
'Что такое триада CIA в контексте информационной безопасности?',
'["Центральное разведывательное агентство", "Конфиденциальность, Целостность, Доступность (Confidentiality, Integrity, Availability)", "Система классификации вирусов", "Протокол шифрования данных"]'::jsonb,
1, 'CIA Triad — фундаментальная модель ИБ. Конфиденциальность — защита от несанкционированного доступа. Целостность — данные не изменены. Доступность — данные доступны когда нужно.',
10, 30, 'Это не про разведку, а про три столпа безопасности', 'NIST SP 800-12 Rev. 1, "An Introduction to Information Security"'),

(0, 'fundamentals', 'easy',
'Какой тип вредоносного ПО маскируется под легитимную программу?',
'["Червь (Worm)", "Троянский конь (Trojan)", "Руткит (Rootkit)", "Адвер (Adware)"]'::jsonb,
1, 'Троян назван в честь Троянского коня из мифологии. Он выглядит как полезная программа, но содержит скрытый вредоносный код. В отличие от вирусов, трояны не самораспространяются.',
10, 25, 'Вспомни древнегреческий миф', 'Stallings W., "Computer Security: Principles and Practice", 8th Ed., Chapter 6'),

(0, 'fundamentals', 'easy',
'Что означает аббревиатура HTTPS?',
'["HyperText Transfer Protocol Standard", "HyperText Transfer Protocol Secure", "High Transfer Technology Protocol System", "Hybrid Text Transmission Protocol Secure"]'::jsonb,
1, 'HTTPS = HTTP + TLS/SSL шифрование. Обеспечивает шифрование данных между браузером и сервером, аутентификацию сервера через сертификаты и целостность передаваемых данных.',
8, 25, 'Буква S в конце означает...', 'RFC 2818 — "HTTP Over TLS"'),

(0, 'fundamentals', 'medium',
'Какой принцип безопасности гласит, что субъект должен получать только минимально необходимые права?',
'["Defense in Depth", "Principle of Least Privilege", "Separation of Duties", "Security by Obscurity"]'::jsonb,
1, 'Принцип минимальных привилегий (PoLP) — каждый пользователь, процесс или программа должны иметь только те права доступа, которые необходимы для выполнения их задач. Это снижает поверхность атаки.',
12, 30, 'Минимум прав = максимум безопасности', 'Saltzer J.H., Schroeder M.D., "The Protection of Information in Computer Systems", 1975'),

(0, 'fundamentals', 'medium',
'Что такое "поверхность атаки" (Attack Surface)?',
'["Физическая площадь серверной комнаты", "Совокупность всех точек, через которые злоумышленник может попытаться проникнуть в систему", "Интерфейс антивирусной программы", "Количество пользователей системы"]'::jsonb,
1, 'Attack Surface включает: открытые порты, запущенные сервисы, API endpoints, пользовательские интерфейсы, код обработки ввода. Цель безопасности — минимизировать поверхность атаки.',
12, 30, 'Через какие «двери» может войти хакер?', 'OWASP Attack Surface Analysis Cheat Sheet'),

-- ===== КОМНАТА 1: Аутентификация и пароли =====
(1, 'authentication', 'easy',
'Что такое многофакторная аутентификация (MFA)?',
'["Использование очень длинного пароля", "Подтверждение личности с помощью двух или более независимых факторов", "Вход через несколько браузеров одновременно", "Шифрование пароля несколькими алгоритмами"]'::jsonb,
1, 'MFA использует комбинацию факторов: знание (пароль), владение (телефон, ключ), биометрия (отпечаток). Даже если пароль украден, без второго фактора доступ невозможен.',
10, 25, 'Что-то, что ты знаешь + что-то, что ты имеешь', 'NIST SP 800-63B "Digital Identity Guidelines: Authentication"'),

(1, 'authentication', 'easy',
'Какая минимальная длина пароля рекомендуется по стандартам NIST?',
'["6 символов", "8 символов", "12 символов", "16 символов"]'::jsonb,
1, 'NIST SP 800-63B рекомендуется минимум 8 символов, но оптимально 12+. Важнее длины — использование парольных фраз и проверка по словарям скомпрометированных паролей.',
10, 25, 'NIST обновил рекомендации в 2017 году', 'NIST SP 800-63B, Section 5.1.1'),

(1, 'authentication', 'medium',
'Что такое атака credential stuffing?',
'["Подбор пароля методом перебора", "Использование украденных пар логин/пароль с одного сайта для входа на другие сайты", "Перехват паролей через Wi-Fi", "Социальная инженерия для получения пароля"]'::jsonb,
1, 'Credential Stuffing эксплуатирует повторное использование паролей. Если утекла база site_A, злоумышленник пробует те же пары на site_B, site_C. По данным Akamai, 80%+ атак на логин — credential stuffing.',
15, 30, 'Люди часто используют один пароль на многих сайтах', 'Akamai "State of the Internet: Credential Stuffing Attacks" Report, 2021'),

(1, 'authentication', 'medium',
'Какой алгоритм хэширования паролей считается наиболее безопасным в 2024 году?',
'["MD5", "SHA-256", "Argon2id", "Base64"]'::jsonb,
2, 'Argon2id — победитель конкурса Password Hashing Competition (PHC). Он устойчив к GPU-атакам (memory-hard) и timing-атакам. bcrypt и scrypt тоже приемлемы, но Argon2id предпочтительнее.',
15, 30, 'Этот алгоритм победил в специальном конкурсе', 'RFC 9106 — "Argon2 Memory-Hard Function for Password Hashing"'),

(1, 'authentication', 'medium',
'Что такое "радужная таблица" (Rainbow Table)?',
'["Таблица с цветовой кодировкой уровней доступа", "Предварительно вычисленная таблица хэшей для обратного поиска паролей", "Таблица маршрутизации сети", "Таблица DNS-записей с визуальной разметкой"]'::jsonb,
1, 'Rainbow Table — таблица предвычисленных хэшей для быстрого взлома. Защита — использование уникальной "соли" (salt) для каждого пароля перед хэшированием. Это делает rainbow tables бесполезными.',
15, 30, 'Предвычисленные значения для экономии времени при взломе', 'Oechslin P., "Making a Faster Cryptanalytic Time-Memory Trade-Off", CRYPTO 2003'),

-- ===== КОМНАТА 2: Сетевые основы =====
(2, 'network', 'easy',
'Какой уровень модели OSI отвечает за маршрутизацию пакетов между сетями?',
'["Канальный (Data Link) — уровень 2", "Сетевой (Network) — уровень 3", "Транспортный (Transport) — уровень 4", "Сеансовый (Session) — уровень 5"]'::jsonb,
1, 'Уровень 3 (Network) модели OSI отвечает за логическую адресацию (IP-адреса) и маршрутизацию. Протоколы: IP, ICMP, OSPF, BGP. Устройства: маршрутизаторы.',
10, 25, 'Этот уровень работает с IP-адресами', 'Tanenbaum A.S., "Computer Networks", 6th Ed., Chapter 1'),

(2, 'network', 'easy',
'Какой протокол используется для автоматического присвоения IP-адресов устройствам в сети?',
'["DNS", "DHCP", "ARP", "SNMP"]'::jsonb,
1, 'DHCP (Dynamic Host Configuration Protocol) автоматически назначает IP-адрес, маску подсети, шлюз и DNS-серверы. Процесс: DISCOVER → OFFER → REQUEST → ACK.',
10, 25, 'Dynamic Host Configuration...', 'RFC 2131 — "Dynamic Host Configuration Protocol"'),

(2, 'network', 'medium',
'Чем TCP отличается от UDP?',
'["TCP быстрее UDP", "TCP гарантирует доставку и порядок пакетов, UDP — нет", "UDP шифрует данные, TCP — нет", "Они идентичны, просто разные названия"]'::jsonb,
1, 'TCP — надёжный, с установкой соединения (3-way handshake), гарантирует порядок и доставку. UDP — быстрый, без установки соединения, без гарантий. TCP для HTTP/HTTPS, UDP для DNS/VoIP/gaming.',
12, 30, 'Один надёжный но медленный, другой быстрый но ненадёжный', 'Stevens W.R., "TCP/IP Illustrated, Volume 1", 2nd Ed.'),

(2, 'network', 'medium',
'Что такое NAT (Network Address Translation)?',
'["Протокол шифрования сетевого трафика", "Технология преобразования приватных IP-адресов в публичные для доступа в интернет", "Антивирусный сетевой фильтр", "Протокол аутентификации в сети"]'::jsonb,
1, 'NAT позволяет множеству устройств с приватными IP (192.168.x.x) выходить в интернет через один публичный IP. Это также обеспечивает базовую защиту, скрывая внутреннюю структуру сети.',
12, 30, 'Как многие устройства делят один публичный адрес?', 'RFC 3022 — "Traditional IP Network Address Translator"'),

(2, 'network', 'medium',
'Какой порт по умолчанию использует HTTPS?',
'["80", "443", "8080", "22"]'::jsonb,
1, 'Порт 443 — стандартный для HTTPS. Порт 80 — HTTP. Порт 22 — SSH. Порт 8080 — альтернативный HTTP. Знание стандартных портов критично для настройки файрволов и диагностики сети.',
10, 20, 'Это не 80 (HTTP) и не 22 (SSH)', 'IANA Service Name and Transport Protocol Port Number Registry'),

-- ===== КОМНАТА 3: Веб-безопасность (основы) =====
(3, 'web_security', 'easy',
'Что такое SQL-инъекция?',
'["Добавление нового SQL-сервера в сеть", "Внедрение вредоносного SQL-кода через пользовательский ввод для манипуляции базой данных", "Оптимизация SQL-запросов", "Резервное копирование базы данных"]'::jsonb,
1, 'SQL-инъекция позволяет выполнить произвольный SQL через непроверенный ввод. Пример: '' OR 1=1 --. Защита: параметризованные запросы (prepared statements), ORM, валидация ввода, WAF.',
10, 25, 'Вредоносный код в полях ввода', 'OWASP Top 10:2021 — A03:2021 Injection'),

(3, 'web_security', 'medium',
'Что такое XSS (Cross-Site Scripting) атака типа Stored?',
'["Скрипт выполняется только в URL", "Вредоносный скрипт сохраняется на сервере и выполняется у всех пользователей, загружающих страницу", "Скрипт работает только на стороне сервера", "Скрипт шифрует данные на странице"]'::jsonb,
1, 'Stored XSS — самый опасный тип. Злоумышленник сохраняет <script> в БД (через комментарий, профиль). Каждый посетитель страницы выполняет этот скрипт. Защита: экранирование вывода, CSP, HttpOnly cookies.',
15, 30, 'Скрипт хранится в базе данных', 'OWASP XSS Prevention Cheat Sheet'),

(3, 'web_security', 'medium',
'Что делает HTTP-заголовок Content-Security-Policy (CSP)?',
'["Шифрует контент страницы", "Определяет, из каких источников браузер может загружать ресурсы (скрипты, стили, изображения)", "Управляет кэшированием контента", "Аутентифицирует пользователя"]'::jsonb,
1, 'CSP — мощная защита от XSS. Пример: script-src ''self'' означает загрузку скриптов только с текущего домена. CSP блокирует inline-скрипты и eval(), предотвращая выполнение внедрённого кода.',
15, 30, 'Этот заголовок контролирует источники загрузки ресурсов', 'MDN Web Docs — Content Security Policy, W3C CSP Level 3'),

(3, 'web_security', 'medium',
'Что такое CSRF-токен и от чего он защищает?',
'["Токен для шифрования паролей", "Уникальный секретный токен, привязанный к сессии, защищающий от подделки межсайтовых запросов", "Токен для доступа к API", "Токен для авторизации в OAuth"]'::jsonb,
1, 'CSRF (Cross-Site Request Forgery) — атака, заставляющая браузер жертвы отправить запрос от её имени. CSRF-токен — уникальное значение в форме, которое атакующий не может узнать. Альтернатива: SameSite cookies.',
15, 30, 'Защита формы от подделки запроса с другого сайта', 'OWASP CSRF Prevention Cheat Sheet'),

(3, 'web_security', 'hard',
'Какой уязвимости посвящена категория A01:2021 в OWASP Top 10?',
'["Инъекции", "Broken Access Control (Нарушение контроля доступа)", "Криптографические сбои", "Security Misconfiguration"]'::jsonb,
1, 'В 2021 году Broken Access Control поднялся на 1 место. Это ошибки авторизации: IDOR (доступ к чужим данным по ID), отсутствие проверки ролей, обход ограничений через манипуляцию URL/параметров.',
20, 35, 'Это касается авторизации, а не аутентификации', 'OWASP Top 10:2021 — A01:2021 Broken Access Control'),

-- ===== КОМНАТА 4: Вредоносное ПО =====
(4, 'malware', 'easy',
'Чем компьютерный вирус отличается от червя?',
'["Вирус опаснее червя", "Вирус требует файл-носитель для распространения, червь распространяется самостоятельно по сети", "Червь — это разновидность вируса", "Они ничем не отличаются"]'::jsonb,
1, 'Вирус прикрепляется к файлу и активируется при его запуске. Червь — автономная программа, распространяется через сеть без участия пользователя. Пример червя: WannaCry, Stuxnet.',
10, 25, 'Один паразитирует на файлах, другой живёт самостоятельно', 'Szor P., "The Art of Computer Virus Research and Defense", 2005'),

(4, 'malware', 'medium',
'Что такое программа-вымогатель (Ransomware)?',
'["ПО для удалённого администрирования", "Вредоносное ПО, шифрующее данные жертвы и требующее выкуп за ключ дешифрования", "Антивирусная программа с платной лицензией", "ПО для мониторинга сети"]'::jsonb,
1, 'Ransomware шифрует файлы жертвы (часто AES-256 + RSA) и требует оплату (обычно в криптовалюте). Современные варианты также крадут данные перед шифрованием (double extortion). Защита: бэкапы, обновления, сегментация сети.',
15, 30, 'WannaCry и Petya — примеры таких программ', 'CISA "Stop Ransomware" Guide, 2023'),

(4, 'malware', 'medium',
'Что такое руткит (Rootkit)?',
'["Инструмент для получения root-доступа по SSH", "Вредоносное ПО, скрывающее своё присутствие и присутствие других вредоносных программ от средств обнаружения", "Утилита для сброса пароля root", "Скрипт автоматизации для Linux"]'::jsonb,
1, 'Руткит модифицирует ОС для сокрытия вредоносной активности. Типы: user-mode (перехват API), kernel-mode (драйвер ОС), bootkit (модификация загрузчика). Обнаружение крайне затруднено.',
15, 30, 'Прячет другие вредоносные программы от антивируса', 'Hoglund G., Butler J., "Rootkits: Subverting the Windows Kernel", 2005'),

(4, 'malware', 'medium',
'Что такое полиморфный вирус?',
'["Вирус, заражающий несколько ОС", "Вирус, изменяющий свой код при каждом заражении для избежания обнаружения сигнатурным анализом", "Вирус с графическим интерфейсом", "Вирус, работающий через полиморфизм ООП"]'::jsonb,
1, 'Полиморфный вирус использует мутацию кода (шифрование тела с разными ключами, замена инструкций эквивалентными). Сигнатурный антивирус не может его обнаружить, нужен поведенческий анализ.',
15, 30, 'Меняет свой «вид» каждый раз', 'Aycock J., "Computer Viruses and Malware", Springer, 2006'),

(4, 'malware', 'hard',
'Какой тип вредоносного ПО использовал Stuxnet для поражения промышленных систем?',
'["Обычный троян", "Комбинация червя, руткита и эксплойтов нулевого дня для атаки на SCADA/PLC-контроллеры", "Программа-вымогатель", "Обычный кейлоггер"]'::jsonb,
1, 'Stuxnet (2010) — первое кибероружие. Использовал 4 zero-day уязвимости, распространялся через USB, атаковал контроллеры Siemens S7-300 для разрушения центрифуг обогащения урана в Иране.',
20, 35, 'Это был не обычный вирус, а целое кибероружие', 'Langner R., "Stuxnet: Dissecting a Cyberweapon", IEEE S&P, 2011'),

-- ===== КОМНАТА 5: Социальная инженерия =====
(5, 'social_engineering', 'medium',
'Какой метод социальной инженерии использует телефонные звонки?',
'["Phishing", "Vishing (Voice Phishing)", "Smishing", "Pharming"]'::jsonb,
1, 'Vishing — голосовой фишинг через телефон. Злоумышленник звонит, представляясь сотрудником банка/техподдержки. Smishing — фишинг через SMS. Pharming — перенаправление через DNS.',
12, 25, 'Voice + Phishing = ?', 'Hadnagy C., "Social Engineering: The Science of Human Hacking", 2nd Ed., 2018'),

(5, 'social_engineering', 'medium',
'Что такое "pretexting" в контексте социальной инженерии?',
'["Предварительное тестирование сети", "Создание вымышленного сценария (легенды) для манипуляции жертвой и получения информации", "Предварительная настройка файрвола", "Написание тестов перед кодированием"]'::jsonb,
1, 'Претекстинг — злоумышленник создаёт правдоподобную легенду (pretxt): «Я из IT-отдела, мне нужен ваш пароль для обновления». Требует исследования жертвы и подготовки. Защита: верификация личности звонящего.',
15, 30, 'Создание «легенды» для обмана', 'Mitnick K.D., Simon W.L., "The Art of Deception", 2002'),

(5, 'social_engineering', 'medium',
'Что такое "tailgating" (или "piggybacking")?',
'["Слежка за пользователем в интернете", "Физическое проникновение в защищённую зону, следуя за авторизованным сотрудником", "Перехват Wi-Fi трафика", "Отслеживание GPS-координат"]'::jsonb,
1, 'Tailgating — злоумышленник проходит через дверь с контролем доступа вместе с легитимным сотрудником. «Придержите дверь, у меня руки заняты». Защита: турникеты, обучение персонала, mantrap.',
12, 30, 'Физическое проникновение «на хвосте»', 'SANS Security Awareness Report, 2022'),

(5, 'social_engineering', 'hard',
'Что такое Watering Hole Attack?',
'["Атака на системы водоснабжения", "Компрометация веб-сайтов, которые регулярно посещает целевая группа, для заражения их устройств", "Флуд-атака на маршрутизатор", "Перехват трафика через публичный Wi-Fi"]'::jsonb,
1, 'Как хищник ждёт жертву у водопоя: злоумышленник определяет часто посещаемые сайты целевой организации, взламывает их и внедряет эксплойт. Жертва заражается при обычном посещении. Использовался APT-группами.',
20, 35, 'Как хищник у водопоя в саванне', 'Symantec "Internet Security Threat Report", 2019'),

(5, 'social_engineering', 'hard',
'Какой процент успешных кибератак начинается с социальной инженерии (по данным Verizon DBIR)?',
'["Около 10%", "Около 25%", "Около 50%", "Около 75-82%"]'::jsonb,
3, 'По данным Verizon Data Breach Investigations Report, 74-82% всех утечек данных связаны с человеческим фактором: фишинг, компрометация учётных данных, ошибки. Человек — самое слабое звено в безопасности.',
20, 30, 'Человеческий фактор — главная угроза', 'Verizon "Data Breach Investigations Report" (DBIR), 2023'),

-- ===== КОМНАТА 6: Криптография (основы) =====
(6, 'cryptography', 'medium',
'В чём принципиальная разница между симметричным и асимметричным шифрованием?',
'["Симметричное сильнее", "Симметричное использует один ключ, асимметричное — пару (публичный и приватный)", "Асимметричное быстрее", "Симметричное невозможно взломать"]'::jsonb,
1, 'Симметричное (AES): один ключ, быстрое, для данных. Асимметричное (RSA, ECC): пара ключей, медленное, для обмена ключами и подписей. TLS использует асимметричное для обмена ключа, затем симметричное для данных.',
12, 30, 'Один ключ vs два ключа', 'Paar C., Pelzl J., "Understanding Cryptography", Springer, 2nd Ed.'),

(6, 'cryptography', 'medium',
'Какой алгоритм является текущим стандартом симметричного шифрования?',
'["DES", "3DES", "AES (Advanced Encryption Standard)", "RC4"]'::jsonb,
2, 'AES (Rijndael) — стандарт NIST с 2001 года. Ключи 128/192/256 бит. DES (56 бит) взломан в 1998 году. 3DES — временная замена, устарел. RC4 — потоковый, имеет критические уязвимости.',
12, 30, 'Это стандарт NIST с 2001 года', 'FIPS 197 — "Advanced Encryption Standard (AES)"'),

(6, 'cryptography', 'medium',
'Что гарантирует цифровая подпись?',
'["Только конфиденциальность", "Аутентичность отправителя, целостность сообщения и неотказуемость (non-repudiation)", "Только целостность", "Только скорость передачи"]'::jsonb,
1, 'Цифровая подпись = хэш сообщения, зашифрованный приватным ключом отправителя. Любой может проверить публичным ключом. Доказывает: КТО отправил (аутентичность), ЧТО не изменено (целостность), отправитель не может отрицать (non-repudiation).',
15, 30, 'Три гарантии: кто, что, неотказуемость', 'Menezes A.J., "Handbook of Applied Cryptography", CRC Press'),

(6, 'cryptography', 'hard',
'Что такое режим шифрования ECB и почему он небезопасен?',
'["ECB — самый безопасный режим AES", "ECB шифрует каждый блок независимо, одинаковые блоки открытого текста дают одинаковый шифротекст — утечка паттернов", "ECB — это протокол обмена ключами", "ECB не используется в AES"]'::jsonb,
1, 'ECB (Electronic Codebook) — простейший режим: каждый 128-битный блок шифруется независимо. Проблема: одинаковые блоки → одинаковый шифротекст. Знаменитый пример: «ECB Penguin» — зашифрованное изображение сохраняет контуры. Используйте CBC, CTR или GCM.',
20, 35, 'Зашифрованная картинка пингвина всё ещё выглядит как пингвин', 'Ferguson N., Schneier B., "Cryptography Engineering", Wiley, 2010'),

(6, 'cryptography', 'hard',
'Что такое Perfect Forward Secrecy (PFS)?',
'["Идеальное шифрование без возможности взлома", "Свойство протокола, при котором компрометация долгосрочного ключа не раскрывает прошлые сессии, т.к. для каждой сессии генерируется уникальный эфемерный ключ", "Резервное копирование всех ключей", "Протокол автоматической смены паролей"]'::jsonb,
1, 'PFS использует эфемерные ключи Диффи-Хеллмана (DHE/ECDHE) для каждой TLS-сессии. Даже если приватный ключ сервера украден, записанный ранее трафик невозможно дешифровать.',
20, 35, 'Утечка ключа сегодня не раскроет вчерашний трафик', 'Rescorla E., "The Transport Layer Security (TLS) Protocol Version 1.3", RFC 8446'),

-- ===== КОМНАТА 7: Сетевые атаки =====
(7, 'network_attacks', 'medium',
'Что такое ARP-spoofing?',
'["Подделка DNS-записей", "Отправка поддельных ARP-ответов для привязки MAC-адреса атакующего к IP-адресу жертвы в локальной сети", "Сканирование портов", "Перехват HTTPS-трафика"]'::jsonb,
1, 'ARP-spoofing: атакующий отправляет ложные ARP-ответы, связывая свой MAC с IP шлюза. Весь трафик жертвы идёт через атакующего (MITM). Защита: Dynamic ARP Inspection (DAI), статические ARP-записи, VPN.',
15, 30, 'Подмена таблицы MAC-IP адресов', 'Convery S., "Hacking Layer 2: Fun with Ethernet Switches", Black Hat USA'),

(7, 'network_attacks', 'medium',
'Что такое SYN Flood атака?',
'["Отправка большого файла по сети", "Отправка множества SYN-запросов без завершения трёхстороннего рукопожатия TCP, исчерпывая ресурсы сервера", "Сканирование всех портов сервера", "Отравление DNS-кэша"]'::jsonb,
1, 'SYN Flood эксплуатирует TCP 3-way handshake: атакующий шлёт SYN с поддельных IP, сервер отвечает SYN-ACK и ждёт ACK. Половинчатые соединения забивают очередь. Защита: SYN Cookies, rate limiting, cloud mitigation.',
15, 30, 'Половина рукопожатия TCP без завершения', 'CERT Advisory CA-1996-21 "TCP SYN Flooding"'),

(7, 'network_attacks', 'hard',
'Что такое DNS Cache Poisoning?',
'["Удаление DNS-кэша", "Внедрение ложных DNS-записей в кэш резолвера для перенаправления пользователей на поддельные сайты", "Шифрование DNS-запросов", "Ускорение DNS-резолвинга"]'::jsonb,
1, 'DNS Cache Poisoning (атака Каминского): злоумышленник подделывает DNS-ответ до прихода легитимного. Жертва получает ложный IP для домена. Защита: DNSSEC (криптографическая подпись DNS-записей), DNS over HTTPS/TLS.',
20, 35, 'Подмена записей в DNS', 'Kaminsky D., "Black Ops of DNS", Black Hat USA 2008'),

(7, 'network_attacks', 'hard',
'Чем отличается IDS от IPS?',
'["Это одно и то же", "IDS только обнаруживает и оповещает, IPS обнаруживает и автоматически блокирует атаки", "IDS работает на уровне 7, IPS — на уровне 3", "IDS дороже IPS"]'::jsonb,
1, 'IDS (Intrusion Detection System) — пассивная: мониторит трафик и генерирует алерты. IPS (Intrusion Prevention System) — активная: стоит inline и может дропать вредоносные пакеты в реальном времени. Примеры: Snort, Suricata.',
15, 30, 'Detection (обнаружение) vs Prevention (предотвращение)', 'Scarfone K., Mell P., "Guide to Intrusion Detection and Prevention Systems", NIST SP 800-94'),

(7, 'network_attacks', 'hard',
'Что такое BGP Hijacking?',
'["Взлом пароля BGP-маршрутизатора", "Перехват интернет-трафика путём объявления ложных маршрутов BGP для перенаправления трафика через сеть атакующего", "Блокировка BGP-протокола", "Ускорение BGP-маршрутизации"]'::jsonb,
1, 'BGP Hijacking — атакующий объявляет более специфичный маршрут (prefix hijack) или AS-path manipulation. Трафик целых стран может быть перенаправлен. Защита: RPKI (Resource Public Key Infrastructure), ROV.',
20, 35, 'Атака на «протокол доверия» интернета', 'Butler K. et al., "A Survey of BGP Security Issues and Solutions", IEEE, 2010'),

-- ===== КОМНАТА 8: Безопасность ОС =====
(8, 'os_security', 'medium',
'Что такое ASLR (Address Space Layout Randomization)?',
'["Алгоритм шифрования адресов", "Технология рандомизации расположения кода и данных в памяти для усложнения эксплойтов", "Антивирусная технология", "Протокол маршрутизации"]'::jsonb,
1, 'ASLR случайно размещает стек, кучу, библиотеки и исполняемый код в памяти при каждом запуске. Это усложняет атаки переполнения буфера, т.к. атакующий не знает адресов для перенаправления выполнения.',
15, 30, 'Рандомизация памяти при каждом запуске', 'PaX Team, "Address Space Layout Randomization", 2001; Microsoft ASLR Documentation'),

(8, 'os_security', 'medium',
'Что такое песочница (Sandbox) в контексте безопасности?',
'["Папка для временных файлов", "Изолированная среда выполнения, ограничивающая доступ программы к системным ресурсам", "Инструмент для тестирования производительности", "Виртуальная машина для серверов"]'::jsonb,
1, 'Sandbox изолирует код от основной системы. Примеры: браузерные вкладки (site isolation), контейнеры Docker, Apple App Sandbox, Windows Sandbox. Даже при компрометации процесса, вред ограничен песочницей.',
12, 30, 'Изоляция программы от системы', 'Schreuders Z.C., "The State of the Art of Application Restrictions and Sandboxes", 2013'),

(8, 'os_security', 'hard',
'Что такое атака Return-to-libc?',
'["Возврат к предыдущей версии библиотеки", "Эксплойт, перенаправляющий выполнение на существующие функции стандартной библиотеки (libc) для обхода DEP/NX", "Перезагрузка библиотеки в памяти", "Удаление libc из системы"]'::jsonb,
1, 'Return-to-libc обходит DEP (Data Execution Prevention), которая запрещает выполнение кода в стеке. Вместо внедрения shellcode, атакующий вызывает system("/bin/sh") из libc. Развитие: ROP (Return-Oriented Programming).',
20, 35, 'Использование существующего кода вместо внедрения нового', 'Solar Designer, "Getting around non-executable stack", Bugtraq, 1997'),

(8, 'os_security', 'hard',
'Что такое SELinux?',
'["Дистрибутив Linux для серверов", "Модуль ядра Linux, реализующий мандатный контроль доступа (MAC) через политики безопасности", "Графическая оболочка Linux", "Антивирус для Linux"]'::jsonb,
1, 'SELinux (Security-Enhanced Linux) — разработан NSA. Реализует MAC (Mandatory Access Control) поверх стандартного DAC. Каждый процесс и файл имеют контекст безопасности. Даже root ограничен политиками. Альтернатива: AppArmor.',
20, 35, 'Мандатный контроль доступа от NSA', 'NSA, "Security-Enhanced Linux"; Red Hat SELinux Guide'),

(8, 'os_security', 'hard',
'Что такое "privilege escalation" и какие бывают типы?',
'["Обновление прав администратора", "Получение более высоких привилегий: вертикальная (user→root) и горизонтальная (user_A→user_B)", "Удаление привилегий", "Создание нового пользователя"]'::jsonb,
1, 'Vertical escalation: обычный пользователь получает права root/admin через эксплойт ядра, SUID-бинарник, misconfiguration. Horizontal: доступ к данным другого пользователя того же уровня. Защита: патчи, PoLP, мониторинг.',
20, 35, 'Вверх (повышение) и вбок (к другому пользователю)', 'MITRE ATT&CK — Privilege Escalation (TA0004)'),

-- ===== КОМНАТА 9: Безопасность Wi-Fi =====
(9, 'wireless', 'medium',
'Какой протокол безопасности Wi-Fi считается актуальным стандартом?',
'["WEP", "WPA", "WPA2", "WPA3"]'::jsonb,
3, 'WPA3 (2018) — актуальный стандарт. Использует SAE (Simultaneous Authentication of Equals) вместо PSK, устойчив к офлайн-атакам на пароль. WPA2 всё ещё распространён. WEP — взломан за минуты. WPA — имеет уязвимости TKIP.',
12, 25, 'Самый новый стандарт', 'Wi-Fi Alliance, "WPA3 Specification", 2018'),

(9, 'wireless', 'medium',
'Что такое атака Evil Twin?',
'["Создание копии сервера", "Создание поддельной точки доступа Wi-Fi с таким же SSID как легитимная для перехвата трафика", "Двойное шифрование трафика", "Клонирование SIM-карты"]'::jsonb,
1, 'Evil Twin: атакующий создаёт точку доступа с именем «Starbucks_WiFi» (как настоящая). Жертва подключается к сильнейшему сигналу. Весь трафик проходит через атакующего. Защита: VPN, проверка сертификатов, 802.1X.',
15, 30, '«Злой близнец» легитимной точки доступа', 'Wright J., Cache J., "Hacking Exposed: Wireless", 3rd Ed., McGraw-Hill'),

(9, 'wireless', 'hard',
'Почему WEP считается полностью небезопасным?',
'["Слишком медленный", "Использует RC4 с коротким вектором инициализации (24 бит), что приводит к повторению ключевого потока и позволяет восстановить ключ за минуты", "Не поддерживает пароли", "Был запрещён законом"]'::jsonb,
1, 'WEP использует RC4 с 24-битным IV (всего 16 млн комбинаций). После ~40,000 пакетов IVs повторяются. Атака FMS/PTW восстанавливает ключ за 1-2 минуты. Инструменты: aircrack-ng. WEP не используйте НИКОГДА.',
20, 35, 'Проблема в слишком коротком векторе инициализации', 'Fluhrer S., Mantin I., Shamir A., "Weaknesses in the Key Scheduling Algorithm of RC4", SAC 2001'),

(9, 'wireless', 'hard',
'Что такое KRACK-атака на WPA2?',
'["Взлом пароля WPA2 перебором", "Атака переустановки ключа: манипуляция четырёхсторонним рукопожатием для переиспользования nonce и дешифрования трафика", "Отключение шифрования WPA2", "DDoS на точку доступа"]'::jsonb,
1, 'KRACK (Key Reinstallation Attack, 2017): атакующий заставляет клиента переустановить уже использованный ключ, обнулив nonce. Это позволяет дешифровать и подделывать пакеты. Исправлено патчами. WPA3 устойчив к KRACK.',
20, 35, 'Key Reinstallation Attack, 2017', 'Vanhoef M., Piessens F., "Key Reinstallation Attacks", CCS 2017'),

(9, 'wireless', 'medium',
'Что такое 802.1X аутентификация?',
'["Стандарт Wi-Fi 6", "Фреймворк контроля доступа к сети на уровне порта, использующий RADIUS-сервер для аутентификации устройств", "Протокол шифрования Bluetooth", "Стандарт скорости Ethernet"]'::jsonb,
1, '802.1X обеспечивает enterprise-аутентификацию: Supplicant (клиент) → Authenticator (точка доступа) → Authentication Server (RADIUS). Каждый пользователь имеет уникальные учётные данные. Используется в WPA2/WPA3-Enterprise.',
15, 30, 'Enterprise-аутентификация через RADIUS', 'IEEE 802.1X-2020 Standard'),

-- ===== КОМНАТА 10: Пентест и этичный хакинг =====
(10, 'pentesting', 'medium',
'Какие 5 фаз включает методология пентеста по PTES?',
'["Сканирование, Взлом, Отчёт, Оплата, Повтор", "Разведка, Сканирование, Получение доступа, Поддержание доступа, Сокрытие следов", "Планирование, Разведка, Эксплуатация, Пост-эксплуатация, Отчётность", "Установка Kali, Nmap, Metasploit, Взлом, Уход"]'::jsonb,
2, 'PTES (Penetration Testing Execution Standard): 1) Pre-engagement (договор), 2) Intelligence Gathering (OSINT), 3) Threat Modeling, 4) Vulnerability Analysis, 5) Exploitation, 6) Post-Exploitation, 7) Reporting.',
15, 30, 'Этапы от планирования до отчёта', 'PTES — Penetration Testing Execution Standard, www.pentest-standard.org'),

(10, 'pentesting', 'medium',
'Что такое Nmap и для чего он используется?',
'["Антивирус", "Инструмент для сканирования портов, обнаружения хостов и определения сервисов в сети", "Текстовый редактор", "Менеджер паролей"]'::jsonb,
1, 'Nmap (Network Mapper) — ключевой инструмент разведки. Определяет открытые порты, версии сервисов (-sV), ОС (-O), имеет скриптовый движок NSE. Типы сканирования: SYN (-sS), TCP (-sT), UDP (-sU), ACK (-sA).',
12, 25, 'Network Mapper — основной инструмент разведки', 'Lyon G., "Nmap Network Scanning", Nmap Project, 2009'),

(10, 'pentesting', 'hard',
'Что такое Metasploit Framework?',
'["Фреймворк для веб-разработки", "Платформа для разработки, тестирования и выполнения эксплойтов с модулями: exploits, payloads, encoders, auxiliary", "Система мониторинга сети", "Файрвол нового поколения"]'::jsonb,
1, 'Metasploit — крупнейшая база эксплойтов (2000+). Компоненты: exploit (код эксплуатации), payload (полезная нагрузка: meterpreter, reverse shell), encoder (обход AV), auxiliary (сканирование, brute-force). Msfconsole — основной интерфейс.',
20, 35, 'Exploit + Payload = атака', 'Kennedy D. et al., "Metasploit: The Penetration Tester''s Guide", No Starch Press'),

(10, 'pentesting', 'hard',
'Что такое OWASP ZAP?',
'["Протокол сжатия данных", "Бесплатный прокси-инструмент для автоматизированного тестирования безопасности веб-приложений (DAST)", "Операционная система", "Антивирусная программа"]'::jsonb,
1, 'OWASP ZAP (Zed Attack Proxy) — DAST-инструмент. Работает как перехватывающий прокси: Spider (обход сайта), Active Scan (автоматический поиск уязвимостей), Fuzzer, Ajax Spider для SPA. Альтернатива Burp Suite.',
15, 30, 'Zed Attack Proxy — бесплатная альтернатива Burp Suite', 'OWASP ZAP Documentation, https://www.zaproxy.org'),

(10, 'pentesting', 'hard',
'Что такое "Red Team" vs "Blue Team"?',
'["Разные отделы разработки", "Red Team — имитация атак для проверки защиты; Blue Team — команда защиты, обнаружения и реагирования", "Red Team — разработка; Blue Team — тестирование", "Это термины из гейм-дизайна"]'::jsonb,
1, 'Red Team — наступательная безопасность: имитирует APT (Advanced Persistent Threat), тестирует физическую и цифровую безопасность. Blue Team — оборонительная: SOC, SIEM, IR. Purple Team — совместная работа Red и Blue для улучшения.',
15, 30, 'Нападение vs Защита', 'MITRE ATT&CK Framework; NIST Cybersecurity Framework'),

-- ===== КОМНАТА 11: Forensics (Компьютерная криминалистика) =====
(11, 'forensics', 'medium',
'Что такое цифровая криминалистика (Digital Forensics)?',
'["Удаление следов преступления", "Процесс сбора, сохранения, анализа и представления цифровых доказательств с соблюдением правовых норм", "Программирование для полиции", "Шифрование улик"]'::jsonb,
1, 'Digital Forensics следует принципам: идентификация, сохранение (chain of custody), анализ, документирование, представление. Ключевое: неизменность доказательств (write-blocker), создание точной копии (imaging) перед анализом.',
12, 30, 'Сбор цифровых улик по правилам', 'Casey E., "Digital Evidence and Computer Crime", 3rd Ed., Academic Press'),

(11, 'forensics', 'medium',
'Что такое "chain of custody" в цифровой криминалистике?',
'["Блокчейн для хранения улик", "Документированная непрерывная цепочка владения доказательством от момента сбора до представления в суде", "Алгоритм хэширования", "Цепочка серверов для передачи данных"]'::jsonb,
1, 'Chain of custody — документ, фиксирующий: КТО получил доказательство, КОГДА, КАК хранилось, КТО имел доступ. Нарушение цепочки может привести к признанию доказательства недопустимым в суде.',
15, 30, 'Непрерывная документация «кто, когда, как» для улик', 'NIST SP 800-86 "Guide to Integrating Forensic Techniques into Incident Response"'),

(11, 'forensics', 'hard',
'Какой инструмент используется для создания побитовой копии диска?',
'["cp / xcopy", "dd (или dc3dd/dcfldd) и FTK Imager — создают точный побитовый образ, включая удалённые файлы и свободное пространство", "WinRAR / 7-Zip", "Git clone"]'::jsonb,
1, 'dd — UNIX-утилита для побитового копирования. dc3dd — форк с хэшированием на лету. FTK Imager — GUI для Windows. Формат образа: RAW (dd), E01 (EnCase), AFF. Верификация: хэш SHA-256 оригинала = хэш копии.',
20, 35, 'Побитовая копия — включая «пустое» пространство', 'Carrier B., "File System Forensic Analysis", Addison-Wesley, 2005'),

(11, 'forensics', 'hard',
'Что такое volatile data и почему важен порядок сбора доказательств?',
'["Данные на жёстком диске", "Данные в оперативной памяти (RAM), процессы, сетевые соединения — теряются при выключении, собираются в первую очередь (Order of Volatility)", "Зашифрованные данные", "Данные в облаке"]'::jsonb,
1, 'Order of Volatility (RFC 3227): 1) Регистры/кэш CPU, 2) RAM, 3) Сетевые соединения, 4) Запущенные процессы, 5) Диск, 6) Резервные копии. RAM содержит ключи шифрования, пароли, malware в памяти — теряется при выключении!',
20, 35, 'Что пропадёт первым при отключении питания?', 'RFC 3227 — "Guidelines for Evidence Collection and Archiving"'),

(11, 'forensics', 'hard',
'Что такое стеганография и как она отличается от криптографии?',
'["Стеганография — более сильное шифрование", "Криптография скрывает содержимое сообщения, стеганография скрывает сам факт существования сообщения", "Это одно и то же", "Стеганография — это протокол сжатия"]'::jsonb,
1, 'Стеганография прячет данные внутри обычных файлов: LSB (Least Significant Bit) в изображениях, данные в аудио/видео, whitespace стеганография в тексте. Инструменты обнаружения: StegDetect, zsteg, binwalk.',
20, 35, 'Скрытие не содержания, а самого факта существования секрета', 'Johnson N.F., Jajodia S., "Exploring Steganography: Seeing the Unseen", IEEE Computer, 1998'),

-- ===== КОМНАТА 12: Облачная безопасность =====
(12, 'cloud', 'medium',
'Что такое модель разделённой ответственности (Shared Responsibility Model) в облаке?',
'["Провайдер отвечает за всё", "Провайдер отвечает за безопасность инфраструктуры (OF the cloud), клиент — за безопасность своих данных и конфигураций (IN the cloud)", "Клиент отвечает за всё", "Ответственность делится поровну"]'::jsonb,
1, 'AWS/Azure/GCP: провайдер защищает физическую инфраструктуру, гипервизор, сеть ЦОД. Клиент: IAM, шифрование данных, конфигурация сервисов, сетевые правила, патчи ОС (IaaS). Чем выше абстракция (SaaS), тем больше ответственности у провайдера.',
15, 30, 'Кто за что отвечает: провайдер vs клиент', 'AWS Shared Responsibility Model Documentation; NIST SP 800-145'),

(12, 'cloud', 'medium',
'Что такое SSRF (Server-Side Request Forgery) в контексте облака?',
'["Подделка клиентских запросов", "Атака, заставляющая сервер делать запросы к внутренним ресурсам, например к metadata API (169.254.169.254) для кражи облачных credentials", "Перенаправление DNS", "Шифрование серверного трафика"]'::jsonb,
1, 'SSRF в облаке: атакующий заставляет приложение обратиться к http://169.254.169.254/latest/meta-data/iam/ — metadata API облака, получая IAM credentials. Capital One breach (2019) — 100 млн записей через SSRF. Защита: IMDSv2, WAF, сетевые политики.',
20, 35, 'Волшебный IP-адрес 169.254.169.254', 'Capital One Data Breach Report, 2019; AWS IMDSv2 Documentation'),

(12, 'cloud', 'hard',
'Что такое IAM (Identity and Access Management) в облаке?',
'["Антивирус для облака", "Система управления цифровыми идентификациями, ролями, политиками и правами доступа к облачным ресурсам", "Протокол мониторинга", "Система резервного копирования"]'::jsonb,
1, 'IAM: Users (идентичности), Groups (группы), Roles (роли для сервисов), Policies (JSON-документы с разрешениями). Принцип PoLP: минимальные права. Не используйте root-аккаунт! Включите MFA для всех IAM-пользователей.',
15, 30, 'Кто, что и где может делать', 'AWS IAM Best Practices; Google Cloud IAM Documentation'),

(12, 'cloud', 'hard',
'Что такое Container Escape?',
'["Удаление Docker-контейнера", "Атака, позволяющая вырваться из изоляции контейнера и получить доступ к хост-системе или другим контейнерам", "Перенос контейнера на другой сервер", "Масштабирование контейнеров"]'::jsonb,
1, 'Container Escape: уязвимость в runtime (runc CVE-2019-5736), misconfiguration (privileged mode, mounted docker.sock), kernel exploits. Защита: не запускать контейнеры от root, seccomp, AppArmor/SELinux, read-only filesystem.',
20, 35, 'Выход за границы изоляции контейнера', 'NIST SP 800-190 "Application Container Security Guide"'),

(12, 'cloud', 'hard',
'Что такое S3 Bucket Misconfiguration и почему это критично?',
'["Ошибка в названии бакета", "Неправильная настройка политик доступа к хранилищу S3, делающая приватные данные публично доступными через интернет", "Медленная скорость загрузки", "Ограничение размера файлов"]'::jsonb,
1, 'Публичные S3 бакеты — причина множества утечек: Twitch (2021), US DoD, Accenture. Ошибки: public ACL, неправильная bucket policy, отключённый Block Public Access. Защита: S3 Block Public Access, CloudTrail аудит, AWS Config rules.',
20, 35, 'Когда приватное хранилище случайно становится публичным', 'AWS S3 Security Best Practices; Krebs on Security S3 Breach Reports'),

-- ===== КОМНАТА 13: Безопасность приложений =====
(13, 'appsec', 'medium',
'Что такое SAST и DAST?',
'["Типы шифрования", "SAST — статический анализ исходного кода, DAST — динамическое тестирование работающего приложения", "Протоколы аутентификации", "Типы баз данных"]'::jsonb,
1, 'SAST (Static) — анализ кода без запуска: SonarQube, Semgrep, CodeQL. Находит: SQL injection, XSS, hardcoded secrets. DAST (Dynamic) — тестирование запущенного приложения: OWASP ZAP, Burp Suite. Находит: runtime уязвимости, misconfig.',
15, 30, 'Статический (код) vs Динамический (приложение)', 'OWASP Testing Guide v4'),

(13, 'appsec', 'medium',
'Что такое CORS и зачем он нужен?',
'["Протокол сжатия", "Cross-Origin Resource Sharing — механизм, позволяющий серверу указать, какие домены могут обращаться к его API", "Система кэширования", "Алгоритм маршрутизации"]'::jsonb,
1, 'CORS ослабляет Same-Origin Policy. Заголовки: Access-Control-Allow-Origin, Access-Control-Allow-Methods. Ошибка: Allow-Origin: * с Allow-Credentials: true — позволяет любому сайту читать приватные данные авторизованного пользователя.',
12, 30, 'Cross-Origin Resource Sharing — кому можно обращаться', 'MDN Web Docs — CORS; OWASP CORS Misconfiguration'),

(13, 'appsec', 'hard',
'Что такое десериализация и почему она опасна?',
'["Преобразование данных в JSON", "Восстановление объекта из байтовой последовательности; небезопасная десериализация позволяет выполнить произвольный код (RCE)", "Удаление данных из базы", "Сжатие файлов"]'::jsonb,
1, 'Insecure Deserialization (OWASP A08:2021): при десериализации непроверенных данных атакующий может внедрить объект, выполняющий произвольный код. Примеры: Java (ObjectInputStream), Python (pickle), PHP (unserialize). Защита: не десериализовать пользовательский ввод!',
20, 35, 'Восстановление объекта = выполнение кода', 'Frohoff C., "Marshalling Pickles", AppSec California 2015; OWASP A08:2021'),

(13, 'appsec', 'hard',
'Что такое JWT и какие уязвимости с ним связаны?',
'["Java Web Token — плагин для Java", "JSON Web Token — формат токенов аутентификации; уязвимости: algorithm confusion (none/HS256→RS256), отсутствие проверки подписи, утечка секрета", "JavaScript Web Technology", "JSON Wireless Transfer"]'::jsonb,
1, 'JWT: Header.Payload.Signature. Уязвимости: alg:none (без подписи), HMAC/RSA confusion (использование публичного ключа как HMAC-секрета), слабый секрет (brute-force), отсутствие проверки exp/iss. Используйте проверенные библиотеки!',
20, 35, 'Три части: Header.Payload.Signature', 'Auth0 "Critical Vulnerabilities in JSON Web Token Libraries", 2015; RFC 7519'),

(13, 'appsec', 'hard',
'Что такое Supply Chain Attack в контексте ПО?',
'["Атака на логистическую цепочку", "Компрометация зависимости, библиотеки или инструмента сборки для внедрения вредоносного кода в целевое ПО", "DDoS на CDN", "Атака на DNS провайдера"]'::jsonb,
1, 'Supply Chain Attack: SolarWinds (2020) — 18000+ организаций. event-stream (npm) — 2018. Codecov (2021). Атакующий внедряет код в зависимость, которая автоматически попадает в тысячи проектов. Защита: lock-файлы, Dependabot, SBOM, подпись пакетов.',
20, 35, 'Взлом библиотеки, которую используют тысячи проектов', 'ENISA "Threat Landscape for Supply Chain Attacks", 2021'),

-- ===== КОМНАТА 14: Мониторинг и SIEM =====
(14, 'monitoring', 'medium',
'Что такое SIEM?',
'["Протокол шифрования", "Security Information and Event Management — платформа для сбора, корреляции и анализа событий безопасности из множества источников", "Антивирусная система", "Система резервного копирования"]'::jsonb,
1, 'SIEM собирает логи со всех систем (файрволы, серверы, endpoints), нормализует их и применяет правила корреляции для обнаружения угроз. Примеры: Splunk, IBM QRadar, Elastic SIEM, Microsoft Sentinel. Ключевая роль в SOC.',
15, 30, 'Единое окно для всех событий безопасности', 'Chuvakin A., "Logging and Log Management", Syngress; Gartner Magic Quadrant for SIEM'),

(14, 'monitoring', 'medium',
'Что такое IOC (Indicator of Compromise)?',
'["Международная организация по кибербезопасности", "Артефакт, указывающий на возможную компрометацию: подозрительный IP, хэш вредоносного файла, необычный домен, аномальный сетевой трафик", "Протокол мониторинга", "Тип шифрования"]'::jsonb,
1, 'IOC — «улики» компрометации: IP/домены C2-серверов, хэши malware, подозрительные ключи реестра, необычные процессы. Форматы обмена: STIX/TAXII, OpenIOC. Threat Intelligence платформы агрегируют IOC для проактивной защиты.',
12, 30, 'Цифровые «отпечатки» атаки', 'MITRE ATT&CK; Mandiant "IOC Concepts"'),

(14, 'monitoring', 'hard',
'Что такое MITRE ATT&CK Framework?',
'["Антивирусная программа", "Глобально доступная база знаний тактик, техник и процедур (TTP) злоумышленников, основанная на реальных наблюдениях", "Операционная система для пентеста", "Стандарт шифрования"]'::jsonb,
1, 'MITRE ATT&CK: 14 тактик (Reconnaissance → Impact), 200+ техник, 600+ подтехник. Используется для: маппинга обнаруженных угроз, оценки покрытия защиты, планирования пентестов, обучения. Enterprise, Mobile, ICS матрицы.',
20, 35, 'Тактики, Техники и Процедуры реальных атак', 'MITRE ATT&CK Framework, https://attack.mitre.org'),

(14, 'monitoring', 'hard',
'Что такое SOC (Security Operations Center)?',
'["Стандартный операционный код", "Центр мониторинга безопасности: команда аналитиков 24/7 анализирует события, обнаруживает угрозы и координирует реагирование на инциденты", "Серверная комната", "Социальная сеть для хакеров"]'::jsonb,
1, 'SOC уровни аналитиков: L1 (triage — первичная сортировка алертов), L2 (Investigation — углублённый анализ), L3 (Threat Hunting — проактивный поиск). Инструменты: SIEM, EDR, SOAR, Threat Intel. KPI: MTTD (время обнаружения), MTTR (время реагирования).',
15, 30, 'Команда 24/7 которая следит за безопасностью', 'SANS "Building a World-Class Security Operations Center"'),

(14, 'monitoring', 'hard',
'Что такое Threat Hunting?',
'["Охота на хакеров в даркнете", "Проактивный поиск скрытых угроз в сети, которые обошли автоматические средства защиты, на основе гипотез и аналитики", "Автоматическое сканирование антивирусом", "Поиск уязвимостей в коде"]'::jsonb,
1, 'Threat Hunting ≠ ожидание алертов. Аналитик формулирует гипотезу (например: «APT мог закрепиться через PowerShell»), ищет аномалии в логах, поведении, сетевом трафике. Методологии: PEAK, Sqrrl, MITRE-based hunting.',
20, 35, 'Не ждать алерт, а активно искать скрытые угрозы', 'Lee R., "The Who, What, Where, When, Why and How of Effective Threat Hunting", SANS'),

-- ===== КОМНАТА 15: Правовые аспекты =====
(15, 'legal', 'hard',
'Что такое GDPR и какой максимальный штраф за нарушение?',
'["Антивирусный стандарт; штраф $1000", "Регламент ЕС о защите персональных данных; штраф до 20 млн EUR или 4% мирового годового оборота", "Американский закон о хакерах; штраф до $100,000", "Протокол шифрования; штрафов нет"]'::jsonb,
1, 'GDPR (General Data Protection Regulation, 2018) — регламент ЕС. Ключевые принципы: согласие на обработку, право на удаление (right to erasure), data minimization, privacy by design. Штрафы: Amazon — €746M (2021), Meta — €1.2B (2023).',
15, 30, 'Европейский регламент о данных', 'Regulation (EU) 2016/679 — GDPR; European Data Protection Board'),

(15, 'legal', 'hard',
'Что такое программа Bug Bounty?',
'["Награда за поимку хакера", "Официальная программа организации, вознаграждающая этичных хакеров за обнаружение и ответственное раскрытие уязвимостей", "Антивирусная программа", "Система штрафов за баги"]'::jsonb,
1, 'Bug Bounty: организация (Google, Apple, Microsoft) публикует scope (что можно тестировать), правила и вознаграждения. Платформы: HackerOne, Bugcrowd, Intigriti. Вознаграждения: от $100 до $1M+ (Apple). Responsible disclosure — обязательно!',
15, 30, 'Официальная программа: нашёл баг — получи награду', 'HackerOne "The Hacker-Powered Security Report", 2023'),

(15, 'legal', 'hard',
'В чём разница между Black Hat, White Hat и Grey Hat хакерами?',
'["Разные цвета униформы", "White Hat — этичные (с разрешением), Black Hat — злоумышленники (без разрешения), Grey Hat — находят уязвимости без разрешения, но не используют злонамеренно", "Разные уровни навыков", "Разные операционные системы"]'::jsonb,
1, 'White Hat: пентестеры, Bug Bounty Hunter — действуют с разрешением и в правовом поле. Black Hat: киберпреступники — нарушают закон. Grey Hat: находят уязвимости без авторизации, сообщают владельцу. Grey Hat — юридически незаконно, даже с добрыми намерениями.',
15, 30, 'Цвет шляпы = этичность', 'EC-Council "Certified Ethical Hacker" curriculum; Computer Fraud and Abuse Act (CFAA)'),

(15, 'legal', 'hard',
'Что такое PCI DSS?',
'["Протокол шифрования платежей", "Payment Card Industry Data Security Standard — стандарт безопасности данных платёжных карт, обязательный для всех организаций, обрабатывающих карточные данные", "Платёжная система", "Программа сертификации хакеров"]'::jsonb,
1, 'PCI DSS — 12 требований: файрвол, шифрование данных карт, управление уязвимостями, контроль доступа, мониторинг, тестирование безопасности. 4 уровня соответствия по объёму транзакций. Несоответствие = штрафы + отзыв права принимать карты.',
15, 30, 'Обязательный стандарт для тех, кто работает с банковскими картами', 'PCI Security Standards Council, https://www.pcisecuritystandards.org'),

(15, 'legal', 'expert',
'Что такое Zero Trust Architecture?',
'["Архитектура без доверия к антивирусам", "Модель безопасности, предполагающая отсутствие доверия по умолчанию — каждый запрос проверяется независимо от расположения в сети (Never trust, always verify)", "Сеть без файрвола", "Полный запрет удалённого доступа"]'::jsonb,
1, 'Zero Trust (NIST SP 800-207): нет «доверенной» внутренней сети. Каждый запрос аутентифицируется и авторизуется. Принципы: verify explicitly, least privilege, assume breach. Технологии: micro-segmentation, IAM, continuous monitoring, BeyondCorp.',
25, 40, 'Never Trust, Always Verify', 'NIST SP 800-207 "Zero Trust Architecture"; Google BeyondCorp, 2014'),

-- ===== КОМНАТА 16: Реагирование на инциденты =====
(16, 'incident_response', 'hard',
'Какие 6 фаз реагирования на инцидент по NIST?',
'["Обнаружение, Взлом, Паника, Восстановление, Отчёт, Увольнение", "Подготовка, Обнаружение и анализ, Сдерживание, Устранение, Восстановление, Post-Incident Activity", "Мониторинг, Логирование, Алертинг, Блокировка, Отчёт, Архивирование", "Сканирование, Тестирование, Эксплуатация, Отчёт, Ретест, Закрытие"]'::jsonb,
1, 'NIST SP 800-61: 1) Preparation (планы, команда), 2) Detection & Analysis (SIEM, IOC), 3) Containment (краткосрочное/долгосрочное), 4) Eradication (удаление угрозы), 5) Recovery (восстановление), 6) Lessons Learned (отчёт, улучшения).',
20, 35, '6 шагов от подготовки до извлечения уроков', 'NIST SP 800-61 Rev. 2 "Computer Security Incident Handling Guide"'),

(16, 'incident_response', 'hard',
'Что такое "containment" (сдерживание) при реагировании на инцидент?',
'["Удаление вируса", "Изоляция скомпрометированных систем для предотвращения распространения атаки при сохранении доказательств", "Выключение всех серверов", "Смена всех паролей"]'::jsonb,
1, 'Containment: краткосрочное (изоляция хоста из сети, блокировка IP) и долгосрочное (применение патчей, усиление защиты). Важно: НЕ выключать систему — потеряются volatile данные! Сначала сбор forensic-данных, затем изоляция.',
20, 35, 'Изолировать, но не уничтожить доказательства', 'SANS Incident Handler''s Handbook'),

(16, 'incident_response', 'hard',
'Что такое Playbook / Runbook в контексте IR?',
'["Игровой сценарий", "Пошаговая документированная процедура реагирования на конкретный тип инцидента (фишинг, ransomware, DDoS)", "Список контактов", "Антивирусная база"]'::jsonb,
1, 'Playbook — детальный план действий для конкретного сценария. Пример Playbook для Ransomware: 1) Изолировать хост, 2) Определить вариант ransomware, 3) Проверить наличие декриптора, 4) Оценить масштаб, 5) Восстановление из бэкапов.',
15, 30, 'Пошаговая инструкция «что делать если...»', 'CISA "Cybersecurity Incident & Vulnerability Response Playbooks", 2021'),

(16, 'incident_response', 'expert',
'Что такое SOAR (Security Orchestration, Automation and Response)?',
'["Антивирусное решение", "Платформа автоматизации процессов безопасности: оркестрация инструментов, автоматизация типовых задач IR и документирование workflow", "Социальная сеть для SOC", "Стандарт шифрования"]'::jsonb,
1, 'SOAR автоматизирует рутинные задачи SOC: автоматическое обогащение IOC, блокировка IP через API файрвола, создание тикета в JIRA, уведомление команды. Примеры: Splunk SOAR, IBM Resilient, Palo Alto XSOAR. Снижает MTTR.',
25, 40, 'Автоматизация рутинных задач безопасности', 'Gartner "Market Guide for SOAR Solutions"'),

(16, 'incident_response', 'expert',
'Какая организация в Казахстане отвечает за реагирование на киберинциденты национального масштаба?',
'["ФБР Казахстана", "KZ-CERT (Национальная служба реагирования на компьютерные инциденты при ГТС КНБ РК)", "Kaspersky Lab", "Интерпол"]'::jsonb,
1, 'KZ-CERT — казахстанский CERT (Computer Emergency Response Team). Координирует реагирование на киберинциденты, публикует advisory, взаимодействует с международными CERT. Аналоги: US-CERT (США), CERT-EU (Европа), JPCERT (Япония).',
25, 35, 'Казахстанский CERT', 'KZ-CERT, https://www.cert.gov.kz; Закон РК "Об информатизации"'),

-- ===== КОМНАТА 17: IoT и промышленная безопасность =====
(17, 'iot', 'hard',
'Почему устройства IoT особенно уязвимы?',
'["Они слишком маленькие для вирусов", "Слабые процессоры, дефолтные пароли, отсутствие обновлений, незашифрованные протоколы, огромная поверхность атаки", "Они не подключены к интернету", "Они защищены аппаратно"]'::jsonb,
1, 'IoT проблемы: дефолтные credentials (admin:admin), нет механизма обновлений (OTA), слабое/отсутствие шифрования, insecure protocols (MQTT без TLS, Telnet), огромное количество устройств. Mirai ботнет (2016) — 600K+ заражённых IoT устройств → DDoS 1.2 Tbps.',
20, 35, 'Дефолтные пароли и отсутствие обновлений', 'OWASP IoT Top 10; Antonakakis M. et al., "Understanding the Mirai Botnet", USENIX 2017'),

(17, 'iot', 'hard',
'Что такое SCADA и почему её безопасность критична?',
'["Антивирус для промышленности", "Supervisory Control and Data Acquisition — система управления промышленными процессами (электростанции, водоснабжение); атака может вызвать физические разрушения", "Сетевой протокол", "Система резервного копирования"]'::jsonb,
1, 'SCADA управляет критической инфраструктурой: энергосети, водоочистка, нефтепроводы. Атаки: Stuxnet (центрифуги Ирана), BlackEnergy (электросеть Украины 2015), Triton/TRISIS (системы безопасности). Протоколы: Modbus, DNP3 — изначально без аутентификации.',
25, 40, 'Системы управления реальным физическим миром', 'ICS-CERT; Lee R.M., "Industrial Cybersecurity", Packt, 2017'),

(17, 'iot', 'hard',
'Что такое Shodan и чем он опасен для IoT?',
'["Поисковик для покупки IoT-устройств", "Поисковая система, индексирующая устройства, подключённые к интернету (камеры, роутеры, SCADA), показывая их открытые порты и сервисы", "Антивирус для IoT", "Социальная сеть для разработчиков"]'::jsonb,
1, 'Shodan сканирует весь интернет и индексирует баннеры сервисов. Можно найти: незащищённые веб-камеры, базы данных без пароля, промышленные контроллеры, принтеры. Полезен для пентеста и обнаружения своих уязвимых устройств.',
20, 35, '«Google для хакеров» — поиск подключённых устройств', 'Matherly J., "Complete Guide to Shodan", Leanpub, 2016'),

(17, 'iot', 'expert',
'Что такое протокол MQTT и какие у него проблемы безопасности?',
'["Протокол шифрования для IoT", "Легковесный publish/subscribe протокол для IoT; по умолчанию без аутентификации и шифрования, что позволяет перехват и инъекцию сообщений", "Протокол маршрутизации", "Протокол резервного копирования"]'::jsonb,
1, 'MQTT (Message Queuing Telemetry Transport): publish/subscribe, легковесный для IoT. Проблемы: по умолчанию порт 1883 без TLS, анонимный доступ к брокеру, отсутствие авторизации на топики. Защита: TLS (порт 8883), аутентификация, ACL на топики.',
25, 40, 'Publish/Subscribe протокол без встроенной безопасности', 'OWASP IoT Top 10; HiveMQ MQTT Security Fundamentals'),

(17, 'iot', 'expert',
'Какая атака на IoT создала крупнейший на тот момент DDoS (1.2 Tbps)?',
'["Stuxnet", "Mirai Botnet — ботнет из заражённых IoT-устройств (камеры, DVR, роутеры) с дефолтными паролями", "WannaCry", "NotPetya"]'::jsonb,
1, 'Mirai (2016): сканировал интернет на устройства с дефолтными credentials (admin:admin, root:root — 62 пары). Заразил 600K+ устройств. DDoS на Dyn DNS → недоступность Twitter, Netflix, GitHub. Исходный код опубликован на HackForums.',
25, 40, 'Ботнет из камер и роутеров с паролем admin:admin', 'Antonakakis M. et al., "Understanding the Mirai Botnet", USENIX Security 2017'),

-- ===== КОМНАТА 18: Продвинутая криптография =====
(18, 'advanced_crypto', 'hard',
'Что такое гомоморфное шифрование?',
'["Шифрование одинаковых данных одинаковым образом", "Шифрование, позволяющее выполнять вычисления над зашифрованными данными без предварительной дешифрации", "Шифрование с одним ключом", "Шифрование только текстовых данных"]'::jsonb,
1, 'Гомоморфное шифрование: E(a) + E(b) = E(a+b). Можно отправить зашифрованные данные в облако, облако выполнит вычисления, вернёт зашифрованный результат — без доступа к исходным данным. Применения: медицинские данные, голосование, ML на зашифрованных данных.',
25, 40, 'Вычисления БЕЗ расшифровки', 'Gentry C., "A Fully Homomorphic Encryption Scheme", Stanford PhD Thesis, 2009'),

(18, 'advanced_crypto', 'hard',
'Что такое квантовая угроза для криптографии (Harvest Now, Decrypt Later)?',
'["Квантовые компьютеры уже всё взломали", "Злоумышленники записывают зашифрованный трафик сейчас, чтобы дешифровать его в будущем с помощью квантового компьютера, способного сломать RSA/ECC", "Квантовые компьютеры ускоряют AES", "Квантовая угроза — это миф"]'::jsonb,
1, 'Алгоритм Шора на квантовом компьютере ломает RSA, DSA, ECC за полиномиальное время. Стратегия «Harvest Now, Decrypt Later»: записать TLS-трафик сейчас, дешифровать через 10-20 лет. NIST PQC: стандартизованы ML-KEM (Kyber), ML-DSA (Dilithium).',
25, 40, 'Записать сейчас — расшифровать квантовым компьютером потом', 'NIST Post-Quantum Cryptography Standardization, 2024; Shor P., "Polynomial-Time Algorithms for Prime Factorization", 1994'),

(18, 'advanced_crypto', 'expert',
'Что такое Zero-Knowledge Proof (ZKP)?',
'["Доказательство отсутствия знаний", "Криптографический протокол, позволяющий доказать знание секрета без раскрытия самого секрета", "Тест на знание криптографии", "Пароль, который невозможно запомнить"]'::jsonb,
1, 'ZKP: доказывающий убеждает верификатора, что знает секрет (пароль, решение), не раскрывая его. Свойства: completeness (честный докажет), soundness (мошенник не докажет), zero-knowledge (верификатор ничего не узнает). Применения: zk-SNARKs в блокчейне, аутентификация.',
30, 45, 'Докажи, что знаешь секрет, не рассказывая его', 'Goldwasser S., Micali S., Rackoff C., "The Knowledge Complexity of Interactive Proof Systems", 1985'),

(18, 'advanced_crypto', 'expert',
'Чем отличается блочный шифр от потокового?',
'["Блочный сильнее", "Блочный шифрует фиксированные блоки данных (AES — 128 бит), потоковый генерирует ключевой поток и XOR-ит с открытым текстом побитово (ChaCha20)", "Потоковый сильнее", "Они идентичны"]'::jsonb,
1, 'Блочный (AES): делит данные на блоки 128 бит, каждый блок шифруется. Режимы: ECB, CBC, CTR, GCM. Потоковый (ChaCha20, бывший RC4): генерирует псевдослучайный поток, XOR с данными. ChaCha20-Poly1305 используется в TLS 1.3, WireGuard.',
25, 40, 'Блоки данных vs непрерывный поток', 'Bernstein D.J., "ChaCha, a variant of Salsa20", 2008; Ferguson N., "Cryptography Engineering"'),

(18, 'advanced_crypto', 'expert',
'Что такое протокол Диффи-Хеллмана и в чём его уязвимость?',
'["Протокол аутентификации", "Протокол обмена ключами через незащищённый канал; уязвим к MITM-атаке без аутентификации сторон", "Протокол шифрования файлов", "Протокол сжатия данных"]'::jsonb,
1, 'DH (1976) — первый протокол обмена ключами: два участника вычисляют общий секрет через открытый канал (дискретное логарифмирование). Уязвимость: без аутентификации атакующий может провести MITM, подменив обе стороны. Решение: подпись параметров DH (как в TLS).',
30, 45, 'Обмен ключами через открытый канал — но кто на другом конце?', 'Diffie W., Hellman M., "New Directions in Cryptography", IEEE IT, 1976'),

-- ===== КОМНАТА 19: APT и продвинутые угрозы =====
(19, 'apt', 'expert',
'Что такое APT (Advanced Persistent Threat)?',
'["Обычный вирус", "Длительная целенаправленная атака, проводимая высококвалифицированной группой (часто государственной) с использованием множества векторов и скрытного присутствия в сети", "Быстрая автоматическая атака", "Тип DDoS"]'::jsonb,
1, 'APT: Advanced (сложные инструменты, zero-days), Persistent (месяцы/годы в сети), Threat (конкретная цель). Примеры: APT28/Fancy Bear (Россия), APT1 (Китай), Lazarus Group (КНДР), Equation Group (США/NSA). Lifecycle: Initial Access → Execution → Persistence → Lateral Movement → Exfiltration.',
25, 40, 'Месяцы и годы скрытного присутствия в сети', 'Mandiant "APT1: Exposing One of China''s Cyber Espionage Units", 2013; MITRE ATT&CK Groups'),

(19, 'apt', 'expert',
'Что такое Lateral Movement и какие техники используются?',
'["Горизонтальное масштабирование серверов", "Перемещение внутри сети после первоначальной компрометации: Pass-the-Hash, PsExec, RDP, WMI, Golden Ticket для доступа к другим системам", "Переезд в другой дата-центр", "Физическое перемещение серверов"]'::jsonb,
1, 'Lateral Movement (MITRE TA0008): после компрометации одного хоста атакующий «перемещается» к другим. Техники: Pass-the-Hash/Ticket (NTLM/Kerberos), PsExec/WMI (удалённое выполнение), RDP, SSH pivoting, exploitation of trust (Domain Admin). Обнаружение: аномалии аутентификации, EDR.',
30, 45, 'Движение «вбок» от одной машины к другой', 'MITRE ATT&CK TA0008; CrowdStrike "Lateral Movement Techniques"'),

(19, 'apt', 'expert',
'Что такое C2 (Command and Control) инфраструктура?',
'["Система управления серверами", "Каналы связи между вредоносным ПО и серверами злоумышленника для получения команд и эксфильтрации данных", "Пара контроллеров отказоустойчивости", "Система управления версиями кода"]'::jsonb,
1, 'C2/C&C: malware связывается с C2-сервером для получения инструкций. Каналы: HTTP/HTTPS (маскировка под легитимный трафик), DNS tunneling, социальные сети, cloud storage, Tor. Обнаружение: аномалии DNS, beaconing (периодические запросы), JA3/JA3S fingerprint.',
30, 45, 'Как вредоносное ПО «звонит домой»', 'MITRE ATT&CK TA0011; Recorded Future "Command and Control"'),

(19, 'apt', 'expert',
'Что такое Living off the Land (LotL)?',
'["Автономное выживание без интернета", "Использование легитимных инструментов ОС (PowerShell, WMI, certutil, rundll32) для выполнения вредоносных действий, избегая обнаружения", "Программирование без библиотек", "Работа оффлайн"]'::jsonb,
1, 'LotL (LOLBins): атакующий использует встроенные инструменты Windows/Linux вместо загрузки вредоносного ПО. PowerShell для загрузки/выполнения, certutil для декодирования, rundll32 для запуска DLL. Антивирус не реагирует на легитимные инструменты. Обновуление: AMSI, Script Block Logging.',
30, 45, 'Использование системных инструментов для вредоносных целей', 'LOLBAS Project, https://lolbas-project.github.io; Symantec "Living off the Land"'),

(19, 'apt', 'expert',
'Что произошло в атаке SolarWinds (2020)?',
'["DDoS на серверы SolarWinds", "APT внедрил вредоносный код (SUNBURST) в обновление ПО Orion; ~18000 организаций (включая US Treasury, Microsoft) получили заражённое обновление через supply chain", "Ransomware зашифровал данные SolarWinds", "Фишинговая атака на сотрудников SolarWinds"]'::jsonb,
1, 'SolarWinds (APT29/Cozy Bear): злоумышленники скомпрометировали процесс сборки ПО Orion, внедрив backdoor SUNBURST. ~18000 организаций установили заражённое обновление, включая правительственные агентства США. Обнаружено FireEye через 9+ месяцев.',
30, 45, 'Крупнейшая supply chain атака в истории', 'FireEye "Highly Evasive Attacker Leverages SolarWinds Supply Chain", 2020; CISA Emergency Directive 21-01'),

-- ===== КОМНАТА 20: Финальный экзамен =====
(20, 'final_exam', 'expert',
'Какие ТРИ ключевых элемента включает модель Zero Trust?',
'["Файрвол, антивирус, VPN", "Verify explicitly, Least privilege access, Assume breach", "Шифрование, аутентификация, авторизация", "IDS, IPS, SIEM"]'::jsonb,
1, 'Zero Trust: 1) Verify explicitly — каждый запрос аутентифицируется и авторизуется на основе всех доступных данных. 2) Least privilege — минимальные права с JIT/JEA. 3) Assume breach — минимизация blast radius, сегментация, сквозное шифрование.',
30, 45, 'Три столпа архитектуры нулевого доверия', 'Microsoft Zero Trust Architecture; NIST SP 800-207'),

(20, 'final_exam', 'expert',
'Какой алгоритм NIST стандартизировал в 2024 году как постквантовый для обмена ключами?',
'["RSA-4096", "ML-KEM (ранее CRYSTALS-Kyber) — основан на задаче обучения с ошибками (Module Learning with Errors)", "AES-512", "SHA-3-512"]'::jsonb,
1, 'NIST PQC (2024): ML-KEM (Kyber) для Key Encapsulation (замена RSA/ECDH), ML-DSA (Dilithium) для цифровых подписей, SLH-DSA (SPHINCS+) — подписи на хэшах. Основаны на решётках (lattice-based cryptography), устойчивы к алгоритму Шора.',
30, 45, 'Постквантовый стандарт 2024 года от NIST', 'NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), 2024'),

(20, 'final_exam', 'expert',
'Расположите события кибербезопасности в хронологическом порядке: Stuxnet, Morris Worm, WannaCry, SolarWinds.',
'["WannaCry, Stuxnet, Morris Worm, SolarWinds", "Morris Worm (1988), Stuxnet (2010), WannaCry (2017), SolarWinds (2020)", "Stuxnet, Morris Worm, SolarWinds, WannaCry", "SolarWinds, WannaCry, Stuxnet, Morris Worm"]'::jsonb,
1, 'Хронология: Morris Worm (1988) — первый интернет-червь, заразил ~6000 машин. Stuxnet (2010) — первое кибероружие, центрифуги Ирана. WannaCry (2017) — ransomware, EternalBlue, 200K+ систем. SolarWinds (2020) — supply chain APT.',
30, 45, 'От самого старого к самому новому', '각 incident имеет свою документацию; Greenberg A., "Sandworm", Doubleday, 2019'),

(20, 'final_exam', 'expert',
'Вы обнаружили ransomware на корпоративном сервере. Какое ПЕРВОЕ действие?',
'["Немедленно выключить сервер", "Заплатить выкуп", "Изолировать сервер от сети (отключить сетевой кабель / VLAN isolation) без выключения для сохранения volatile данных", "Запустить антивирусное сканирование"]'::jsonb,
2, 'Правильный порядок: 1) Изолировать (НЕ выключать — RAM содержит ключи, процессы). 2) Документировать (скриншоты, логи). 3) Собрать volatile data. 4) Определить вариант ransomware (ID Ransomware). 5) Проверить наличие декриптора. 6) Оценить масштаб. 7) Восстановление из бэкапов.',
30, 45, 'Изоляция ≠ выключение', 'CISA "Stop Ransomware" Guide; NIST SP 800-61'),

(20, 'final_exam', 'expert',
'Какой полный путь проходит HTTPS-запрос от ввода URL до получения ответа?',
'["URL → Сервер → Ответ", "DNS resolution → TCP 3-way handshake → TLS handshake (ClientHello, ServerHello, Certificate, Key Exchange) → HTTP request → HTTP response", "URL → HTTPS → HTML", "Браузер → Провайдер → Сайт"]'::jsonb,
1, 'Полный путь: 1) DNS (рекурсивный резолвинг → IP), 2) TCP SYN → SYN-ACK → ACK (порт 443), 3) TLS: ClientHello (supported ciphers) → ServerHello → Certificate → Key Exchange (ECDHE) → Finished, 4) HTTP GET → HTTP 200 OK + HTML. При TLS 1.3: 1-RTT handshake.',
30, 45, 'DNS → TCP → TLS → HTTP', 'RFC 8446 (TLS 1.3); Stevens W.R., "TCP/IP Illustrated"');

-- 1.6 Обнови таблицу missions
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT,
  xp_reward INTEGER DEFAULT 100,
  chapter INTEGER DEFAULT 1,
  is_locked BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_select_auth" ON missions FOR SELECT TO authenticated USING (true);

INSERT INTO missions (id, title, description, difficulty, xp_reward, chapter, is_locked, order_index) VALUES
('m1', 'Digital Onboarding', 'Изучите базовые концепции: CIA Triad, типы вредоносного ПО, HTTPS. Первый шаг в мир кибербезопасности.', 'easy', 100, 1, false, 0),
('m2', 'Password Fortress', 'Проникните в систему аутентификации. Изучите MFA, хэширование паролей, атаки credential stuffing и Rainbow Tables.', 'easy', 120, 1, false, 1),
('m3', 'Network Recon', 'Изучите основы сетей: OSI модель, TCP/UDP, DHCP, NAT. Знание сетей — фундамент кибербезопасности.', 'easy', 130, 1, false, 2),
('m4', 'Web Exploit Lab', 'Веб-уязвимости: SQL Injection, XSS (Stored/Reflected), CSP, CSRF. Разберите OWASP Top 10.', 'easy', 150, 1, false, 3),
('m5', 'Malware Analysis', 'Анализ вредоносного ПО: вирусы vs черви, ransomware, руткиты, полиморфизм. Разберите Stuxnet.', 'easy', 170, 1, true, 4),
('m6', 'Social Engineering Ops', 'Социальная инженерия: vishing, pretexting, tailgating, Watering Hole. Человек — самое слабое звено.', 'medium', 200, 2, true, 5),
('m7', 'Crypto Foundation', 'Основы криптографии: симметричное/асимметричное шифрование, AES, цифровые подписи, ECB пингвин, PFS.', 'medium', 220, 2, true, 6),
('m8', 'Attack Vectors', 'Сетевые атаки: ARP-spoofing, SYN Flood, DNS Cache Poisoning, IDS vs IPS, BGP Hijacking.', 'medium', 250, 2, true, 7),
('m9', 'OS Hardening', 'Безопасность ОС: ASLR, Sandbox, Return-to-libc, SELinux, Privilege Escalation.', 'medium', 280, 2, true, 8),
('m10', 'Wireless Assault', 'Безопасность Wi-Fi: WPA3, Evil Twin, WEP-взлом, KRACK, 802.1X Enterprise аутентификация.', 'medium', 300, 2, true, 9),
('m11', 'Pentest Academy', 'Этичный хакинг: методология PTES, Nmap, Metasploit, OWASP ZAP, Red Team vs Blue Team.', 'medium', 350, 3, true, 10),
('m12', 'Digital Forensics', 'Компьютерная криминалистика: chain of custody, dd/FTK Imager, volatile data, стеганография.', 'medium', 370, 3, true, 11),
('m13', 'Cloud Breach', 'Облачная безопасность: Shared Responsibility, SSRF → metadata API, IAM, Container Escape, S3 misconfig.', 'hard', 400, 3, true, 12),
('m14', 'AppSec Deep Dive', 'Безопасность приложений: SAST/DAST, CORS, Insecure Deserialization, JWT атаки, Supply Chain Attack.', 'hard', 420, 3, true, 13),
('m15', 'SOC Operations', 'Мониторинг: SIEM, IOC, MITRE ATT&CK, SOC, Threat Hunting. Стань аналитиком безопасности.', 'hard', 450, 3, true, 14),
('m16', 'Legal & Compliance', 'Правовые аспекты: GDPR, Bug Bounty, Hat classification, PCI DSS, Zero Trust Architecture.', 'hard', 480, 4, true, 15),
('m17', 'Incident Response', 'Реагирование на инциденты: 6 фаз NIST, Containment, Playbooks, SOAR, KZ-CERT.', 'hard', 500, 4, true, 16),
('m18', 'IoT & ICS Security', 'IoT и промышленная безопасность: SCADA, Shodan, MQTT, Mirai ботнет. Когда хакер атакует реальный мир.', 'hard', 550, 4, true, 17),
('m19', 'Advanced Cryptography', 'Продвинутая криптография: гомоморфное шифрование, постквантовая криптография, ZKP, блочные vs потоковые, DH.', 'expert', 600, 4, true, 18),
('m20', 'APT Simulation', 'Продвинутые угрозы: APT lifecycle, Lateral Movement, C2 инфраструктура, Living off the Land, SolarWinds разбор.', 'expert', 700, 4, true, 19),
('m21', 'Final Exam: Cyber Guardian', 'Финальный экзамен: Zero Trust, постквантовая криптография, хронология кибератак, IR сценарии, полный путь HTTPS. Докажи что ты кибер-страж!', 'expert', 1000, 4, true, 20);
