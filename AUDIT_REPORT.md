# HackShield Play Nexus — Audit Report

## 0. Executive Summary

**Общая оценка проекта: 7/10**

Проект представляет собой качественную основу для геймифицированной обучающей платформы. Архитектура в целом следует современным React-практикам, но имеет признаки быстрого прототипирования, которые могут затруднить масштабирование и сопровождение в production.

### Оценки по областям (1-10):
- **Безопасность:** 6/10 (Отсутствие CSP, уязвимые зависимости, небезопасный localStorage)
- **Логика:** 7/10 (Есть race conditions и потенциальные утечки XP)
- **Архитектура:** 6/10 (Смешивание слоев данных и UI, God-компоненты)
- **База данных:** 5/10 (Текущая реализация на localStorage не пригодна для production)
- **Качество кода:** 7/10 (Много type assertions 'as', отсутствие строгой валидации)
- **Производительность:** 7/10 (Большой размер бандла, отсутствие code-splitting)

### Топ-10 критических находок:
1. **[High]** Уязвимость Open Redirect в `@remix-run/router` (через `react-router-dom`).
2. **[High]** Отсутствие Content Security Policy (CSP), что делает проект уязвимым к XSS.
3. **[High]** Использование `dangerouslySetInnerHTML` в `chart.tsx` без санитайзера.
4. **[High]** Небезопасная работа с `localStorage`: данные парсятся без валидации схемы (Zod).
5. **[Medium]** Утечки памяти: отсутствие очистки `AudioContext` и некоторых интервалов в мини-играх.
6. **[Medium]** Race conditions в `useScenarioEngine`: таймеры и обратная связь могут перекрываться.
7. **[Medium]** God-компонент `ScenarioMap.tsx` (~600 строк) требует декомпозиции.
8. **[Medium]** Отсутствие Code Splitting: бандл > 900KB, что замедляет первую загрузку.
9. **[Medium]** Баг спавна гвардов: при повторном срабатывании тревоги массив объектов растет бесконечно.
10. **[Low]** Чрезмерное использование `as` вместо Type Guards в TypeScript.

**Рекомендуемый порядок исправлений:** Безопасность (CSP/Зависимости) -> Валидация данных (Zod) -> Архитектурный рефакторинг (Repository pattern) -> Миграция на Supabase.

---

## 1. Безопасность

### 1.1 Найденные уязвимости
| # | Файл:строка | Тип | Severity | Описание | Решение |
|---|---|---|---|---|---|
| 1 | index.html | Missing CSP | High | Нет заголовков безопасности | Добавить `<meta http-equiv="Content-Security-Policy">` |
| 2 | chart.tsx:123 | XSS | High | `dangerouslySetInnerHTML` | Использовать санитайзер (DOMPurify) или уйти от HTML |
| 3 | dataService.ts | Injection | Medium | Доверие данным из localStorage | Валидировать данные через Zod при чтении |
| 4 | package.json | Dependency | High | Уязвимый роутер (Open Redirect) | Обновить `react-router-dom` до >= 6.30.2 |

### 1.2 Зависимости
- **Результат `npm audit`:** 19 уязвимостей (9 high, 7 moderate, 3 low).
- **Ключевые устаревшие пакеты:** `react-router-dom`, `vite`, `postcss`, `rollup`, `lodash`.
- **Рекомендации:**
    - Срочно обновить `react-router-dom` до версии с фиксом XSS.
    - Обновить `vite` до v6 для устранения уязвимостей в dev-сервере.
    - Использовать `npm audit fix` для патча минорных версий.

### 1.3 Что хорошо
- Используется TypeScript, что предотвращает ряд ошибок типизации.
- Подключен `lucide-react` и `shadcn/ui`, что обеспечивает качественный UI.
- Есть базовая структура для i18n.

---

## 2. Логика

### 2.1 Найденные баги
| # | Файл:строка | Описание | Сценарий воспроизведения | Предлагаемый фикс |
|---|---|---|---|---|
| 1 | gameLogic.ts:160 | Бесконечный спавн | Спровоцировать тревогу несколько раз подряд | Добавить проверку `if (gs.alarmActive) return` |
| 2 | useScenarioEngine.ts | Race condition | Быстро кликать по вариантам ответа | Деактивировать кнопки после первого клика |
| 3 | GameScene.tsx:90 | Double XP | Завершить комнату и быстро нажать "Далее" несколько раз | Добавить флаг `isProcessing` в стейт |

### 2.2 Edge cases которые не обработаны
- **Отрицательный XP:** В `addXp` нет проверки на минимальное значение (хотя сейчас передаются только положительные).
- **Потеря сессии:** Если localStorage очищен во время игры, `dataService` просто создаст нового юзера, прогресс будет потерян без уведомления.
- **Level Cap:** Нет логики ограничения максимального уровня (Level 100+).

---

## 3. Clean Code & Architecture

### 3.1 God Components / Long Files
| Файл | Строки | Проблема | Рекомендация |
|---|---|---|---|
| `ScenarioMap.tsx` | 598 | Слишком много логики отрисовки карты и модалок | Вынести `RoomModal` и `MapNode` в отдельные файлы |
| `Profile.tsx` | 464 | Смешивание логики профиля и статистики | Разбить на мелкие UI-виджеты |
| `mockData.ts` | 594 | Слишком большой файл данных | Разбить по категориям (missions.ts, scenarios.ts) |

### 3.2 Антипаттерны
- **Prop drilling:** В `GameScene` данные прокидываются глубоко в контролы. Рекомендуется Context API.
- **Magic numbers:** В `gameLogic.ts` много хардкодных констант (скорость гвардов 110, дистанция 45). Нужно вынести в `constants.ts`.
- **any в TypeScript:** Встречается в `useUser.ts` (authUser: any) и `ScenarioPlayer.tsx` (choice: any).
- **Дубликаты кода:** Логика завершения миссии дублируется в `GameScene` и `ScenarioMap`.

---

## 4. База данных и масштабируемость

### 4.1 Текущее состояние
Данные хранятся в `localStorage` и `mockData.ts`. Это не позволяет синхронизировать прогресс между устройствами и делает данные легко подменяемыми пользователем.

### 4.2 Рекомендуемая схема БД (PostgreSQL/Supabase)

```sql
-- Profiles: Расширенная информация о пользователе
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Missions: Статичные данные миссий
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title JSONB, -- {ru: "...", en: "..."}
  difficulty TEXT,
  xp_reward INTEGER
);

-- Progress: Прогресс прохождения
CREATE TABLE user_progress (
  user_id UUID REFERENCES profiles(id),
  mission_id TEXT REFERENCES missions(id),
  completed BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, mission_id)
);
```

### 4.3 Стратегия миграции
1. Внедрить Zod для валидации текущего `localStorage`.
2. Создать Repository интерфейсы.
3. Реализовать `SupabaseRepository`.
4. При логине проверять наличие данных в `localStorage` и предлагать "синхронизацию" (импорт в БД).

---

## 5. Найденные ошибки в коде

### 5.1 По категориям
- **Memory leaks:** В `HackingMinigames.tsx` интервалы очищаются в `useEffect` return, но тайм-ауты внутри интервалов — нет. `AudioContext` создается при каждом бипе, но не закрывается.
- **React bugs:** `useEffect` в `ScenarioPlayer` для вызова `onComplete` может сработать дважды в StrictMode.
- **Async bugs:** `dataService.getScenarioRooms` импортирует `mockData` динамически, что может вызвать мигание контента без скелетона.

### 5.2 Полный реестр
| # | Файл:строка | Категория | Severity | Описание | Фикс |
|---|---|---|---|---|---|
| 1 | gameLogic.ts:35 | Memory Leak | Medium | AudioContext не закрывается | Использовать синглтон или закрывать ctx |
| 2 | useScenarioEngine:66 | Race | Medium | Timer не сбрасывается при ошибке | Сбрасывать `timeRemaining` в стейте |
| 3 | GameScene.tsx:300 | Performance | Low | Нет мемоизации пропсов | Обернуть хендлеры в `useCallback` |

---

## 6. Roadmap улучшений

### 6.1 Критическое (Must Have) — ~8 часов
- Исправление зависимостей (npm audit fix) - 1ч.
- Внедрение CSP и санитайзера для HTML - 2ч.
- Добавление Zod-валидации для всех данных профиля - 3ч.
- Фикс багов логики (спавн, race conditions) - 2ч.

### 6.2 Важное (Should Have) — ~16 часов
- Рефакторинг `ScenarioMap` и `GameScene` (декомпозиция) - 6ч.
- Внедрение Repository Pattern и Context для стейта - 6ч.
- Настройка Code Splitting (React.lazy) - 4ч.

### 6.3 Желательное (Nice to Have) — ~12 часов
- Покрытие тестами (Vitest) - 6ч.
- Улучшение a11y (клавиатурное управление в игре) - 4ч.
- Storybook для UI компонентов - 2ч.

---

## 7. Конкретные рекомендации

### 7.1 Что делать в первую очередь
1. Обновить `react-router-dom` и `vite`.
2. Создать файл `src/utils/validators.ts` со схемами Zod.
3. Добавить `DOMPurify` для вывода динамического контента.

### 7.2 Что НЕ нужно делать
- Не переписывать 2D движок на Three.js/Phaser сейчас. Текущего Canvas достаточно, если его оптимизировать.
- Не внедрять Redux/Zustand пока Context API справляется.

### 7.3 Готовые сниппеты для копирования

**Zod Schema для Профиля:**
```typescript
export const PlayerProfileSchema = z.object({
  id: z.string(),
  xp: z.number().min(0),
  level: z.number().int().min(1),
  completedMissions: z.array(z.string())
});
```

---

## Приложения

### A. Метрики проекта
- **Файлов в src:** 108
- **Строк кода:** ~11,500
- **Топ-3 больших файлов:**
    1. `sidebar.tsx` (637)
    2. `ScenarioMap.tsx` (598)
    3. `mockData.ts` (594)

### B. Использованные инструменты
- `npm audit`
- `tsc --noEmit`
- `eslint`
- `vite build` (анализ чанков)
