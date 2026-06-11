# Terminal Hacking (Hack Challenge)

> **Status**: Implemented
> **Author**: daurencd01
> **Implements Pillar**: "Learn real cybersecurity by doing"

## Summary
Each terminal in the 2D stealth game is hacked by solving a short, themed
cybersecurity challenge (multiple choice). Solving it marks the terminal hacked,
awards XP, and advances the mission. Hacking the ★ TARGET terminal disables the
NULL SECTOR C2 and unlocks extraction (the EXIT).

> **Quick reference** — Layer: `Core` · Priority: `Vertical Slice` · Key deps: `AlertSystem`, `ObjectiveSystem`, `gameState.terminals`

## Player Fantasy
The player feels like an incident responder under pressure: reach a console
while avoiding guards/cameras, then prove they know the security answer to
"crack" it. Right answers feel earned; wrong answers raise the alarm.

## Core Rules
1. Press **E** within range of a terminal to open its Hack Challenge.
2. The game world pauses while the challenge is open (`gameState.showQuiz`).
3. A challenge is one multiple-choice question chosen deterministically from the
   terminal id (stable per terminal), drawn from `hackChallenges.ts`.
4. **Correct** → terminal `isHacked = true`, award `xpReward`, show explanation.
5. **Wrong** → raise alert by `FAIL_ALERT` (AlertSystem), show explanation, the
   terminal stays unhacked (player may retry).
6. The ★ main-objective terminal, once hacked, unlocks the EXIT.
7. Reaching the EXIT with the ★ terminal hacked → `missionStatus = 'success'`.

## States and Transitions
| State | Entry | Exit | Behavior |
|-------|-------|------|----------|
| Closed | default | press E near terminal | world runs |
| Open | E near terminal | answer chosen | world paused, question shown |
| Resolved | answer chosen | press Continue | shows correct/explanation |

## Tuning Knobs
| Parameter | Current | Safe Range | Notes |
|-----------|---------|-----------|-------|
| xpReward (per terminal) | 60–120 | 20–300 | scales with difficulty |
| FAIL_ALERT | 20 | 5–50 | alert added on wrong answer |
| interactRange | from useGameCollision | — | proximity to open |

## Acceptance Criteria
- [x] Pressing E near a terminal opens a cybersecurity question.
- [x] Correct answer hacks the terminal (turns green) and awards XP.
- [x] Wrong answer raises the alert level and can be retried.
- [x] Hacking the ★ terminal then reaching EXIT completes the mission.
- [x] No hardcoded question text in the component (data in `hackChallenges.ts`).
