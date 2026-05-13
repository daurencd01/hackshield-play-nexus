import { GameObject } from '@/data/roomGenerator';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenColor(hex: string, amount: number) {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function drawFirewall(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  const { x, y, width: w, height: h, hacked } = obj;
  if (hacked) {
    ctx.fillStyle = '#222'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#555'; ctx.strokeRect(x, y, w, h);
    return;
  }
  for (let i = 0; i < h; i += 4) {
    const flameOffset = Math.sin(time * 8 + i * 0.3) * 3;
    const hue = 10 + Math.sin(time * 5 + i * 0.1) * 20;
    ctx.fillStyle = `hsl(${hue}, 100%, ${50 + Math.random() * 20}%)`;
    ctx.fillRect(x + flameOffset, y + i, w, 4);
  }
  ctx.fillStyle = 'rgba(255, 100, 0, 0.4)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('FIREWALL', x + w / 2, y + h / 2 + 3); ctx.textAlign = 'left';
}

export function drawDatabase(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  const { x, y, width: w, height: h, hacked } = obj;
  for (let i = 0; i < 3; i++) {
    const cylY = y + i * 12;
    ctx.fillStyle = hacked ? '#003300' : '#001a4a';
    ctx.beginPath(); ctx.ellipse(x + w / 2, cylY + 4, w / 2, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x, cylY + 4, w, 8);
    const blink = Math.sin(time * 3 + i) > 0;
    ctx.fillStyle = hacked ? '#00ff88' : blink ? '#00aaff' : '#003366';
    ctx.fillRect(x + 4, cylY + 7, 4, 2);
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('DB', x + w / 2, y - 4); ctx.textAlign = 'left';
}

export function drawCamera(ctx: CanvasRenderingContext2D, cam: GameObject, time: number) {
  const cx = cam.x + cam.width / 2;
  const cy = cam.y + cam.height / 2;

  // === КОНУС ВИДИМОСТИ ===
  if (!cam.hacked) {
    const coneColor =
      cam.detectionState === 'detected'  ? '#ff0000' :
      cam.detectionState === 'suspicious' ? '#ffaa00' :
      '#ff4444';

    const coneAlpha =
      cam.detectionState === 'detected'  ? 0.35 :
      cam.detectionState === 'suspicious' ? 0.25 :
      0.12;

    const range = cam.detectionCone?.range ?? 150;
    const angle = cam.detectionCone?.angle ?? Math.PI/3;

    // Градиент от камеры
    const grad = ctx.createRadialGradient(
      cx, cy, 5,
      cx, cy, range
    );
    grad.addColorStop(0, hexToRgba(coneColor, coneAlpha));
    grad.addColorStop(1, hexToRgba(coneColor, 0));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy,
      range,
      (cam.rotationAngle ?? 0) - angle / 2,
      (cam.rotationAngle ?? 0) + angle / 2
    );
    ctx.closePath();
    ctx.fill();

    // Контурные линии конуса
    ctx.strokeStyle = hexToRgba(coneColor, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos((cam.rotationAngle ?? 0) - angle / 2) * range,
      cy + Math.sin((cam.rotationAngle ?? 0) - angle / 2) * range
    );
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos((cam.rotationAngle ?? 0) + angle / 2) * range,
      cy + Math.sin((cam.rotationAngle ?? 0) + angle / 2) * range
    );
    ctx.stroke();

    // Сканирующий луч (центральная линия)
    const scanX = cx + Math.cos(cam.rotationAngle ?? 0) * range;
    const scanY = cy + Math.sin(cam.rotationAngle ?? 0) * range;
    ctx.strokeStyle = hexToRgba(coneColor, 0.7);
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -time * 30;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(scanX, scanY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // === КОРПУС КАМЕРЫ ===
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(cam.rotationAngle ?? 0);

  // Подставка
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  // Корпус
  ctx.fillStyle = cam.hacked ? '#444' : '#666';
  ctx.fillRect(0, -5, 16, 10);

  // Линза (мигает)
  const lensColor = cam.hacked
    ? '#003300'
    : cam.detectionState === 'detected' ? '#ff0000'
    : cam.detectionState === 'suspicious' ? '#ffaa00'
    : '#ff4444';

  const blink = !cam.hacked && Math.sin(time * 8) > 0;
  ctx.fillStyle = blink ? lensColor : darkenColor(lensColor, 0.5);
  ctx.beginPath();
  ctx.arc(13, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // === ИНДИКАТОР DETECTION (полоска заполнения) ===
  if (cam.detectionLevel && cam.detectionLevel > 0 && !cam.hacked) {
    const barW = 30;
    const barH = 4;
    const bx = cx - barW / 2;
    const by = cam.y - 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(bx, by, barW, barH);

    const fillColor =
      cam.detectionLevel > 80 ? '#ff0000' :
      cam.detectionLevel > 50 ? '#ffaa00' :
      '#ffff00';
    ctx.fillStyle = fillColor;
    ctx.fillRect(bx, by, (cam.detectionLevel / 100) * barW, barH);

    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
  }

  // === ВОПРОСИТЕЛЬНЫЙ/ВОСКЛИЦАТЕЛЬНЫЙ ЗНАК ===
  if (cam.detectionState !== 'idle' && !cam.hacked) {
    const symbol = cam.detectionState === 'detected' ? '!' : '?';
    const color = cam.detectionState === 'detected' ? '#ff0000' : '#ffaa00';

    ctx.fillStyle = color;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(symbol, cx, cam.y - 20);
    ctx.textAlign = 'left';
  }

  if (cam.hacked) {
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('OFFLINE', cx, cy + 22); ctx.textAlign = 'left';
  }
}

export function drawLaserTrap(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  const { x, y, width: w, height: h, period = 2, animPhase = 0 } = obj;
  ctx.fillStyle = '#444'; ctx.fillRect(x, y, 6, h); ctx.fillRect(x + w - 6, y, 6, h);
  const cycleTime = (time + animPhase) % period;
  const isActive = cycleTime < period * 0.7;
  obj.active = isActive;
  if (isActive) {
    const pulse = 0.6 + Math.sin(time * 20) * 0.4;
    ctx.fillStyle = `rgba(255, 0, 80, ${pulse})`; ctx.fillRect(x + 6, y + h / 2 - 1, w - 12, 2);
    const glow = ctx.createLinearGradient(x, y + h / 2 - 8, x, y + h / 2 + 8);
    glow.addColorStop(0, `rgba(255, 0, 80, ${pulse * 0.5})`); glow.addColorStop(1, 'rgba(255, 0, 80, 0)');
    ctx.fillStyle = glow; ctx.fillRect(x + 6, y + h / 2 - 8, w - 12, 16);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(x + 1, y + h / 2 - 1, 4, 2); ctx.fillRect(x + w - 5, y + h / 2 - 1, 4, 2);
  } else {
    const warningProgress = (cycleTime - period * 0.7) / (period * 0.3);
    if (warningProgress > 0) {
      ctx.fillStyle = `rgba(255, 200, 0, ${warningProgress * 0.5})`; ctx.fillRect(x + 6, y + h / 2 - 1, w - 12, 2);
    }
  }
}

export function drawTurret(ctx: CanvasRenderingContext2D, obj: GameObject, time: number, playerX: number, playerY: number) {
  const { x, y, width: w, height: h, destroyed } = obj;
  const cx = x + w / 2; const cy = y + h / 2;
  ctx.fillStyle = destroyed ? '#222' : '#444'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = destroyed ? '#555' : '#ff6600'; ctx.lineWidth = 2; ctx.stroke();
  if (destroyed) {
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'; ctx.font = '14px monospace'; ctx.fillText('×', cx - 4, cy + 4); return;
  }
  const angle = Math.atan2(playerY - cy, playerX - cx);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.fillStyle = '#888'; ctx.fillRect(0, -2, 16, 4); ctx.restore();
  const dist = Math.hypot(playerX - cx, playerY - cy);
  if (dist < (obj.range ?? 200)) {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(playerX, playerY); ctx.stroke(); ctx.setLineDash([]);
  }
}

export function drawHealthPack(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  if (obj.collected) return;
  const { x, y, width: w, height: h } = obj;
  const float = Math.sin(time * 3) * 3;
  const glow = ctx.createRadialGradient(x + w / 2, y + h / 2 + float, 4, x + w / 2, y + h / 2 + float, 20);
  glow.addColorStop(0, 'rgba(0, 255, 100, 0.6)'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(x - 8, y + float - 8, w + 16, h + 16);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y + float, w, h);
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.strokeRect(x, y + float, w, h);
  ctx.fillStyle = '#00ff88'; const cx = x + w / 2; const cy = y + h / 2 + float;
  ctx.fillRect(cx - 6, cy - 2, 12, 4); ctx.fillRect(cx - 2, cy - 6, 4, 12);
}

export function drawKeyCard(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  if (obj.collected) return;
  const { x, y, width: w, height: h } = obj;
  const rotation = Math.sin(time * 2) * 0.3;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rotation);
  const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
  glow.addColorStop(0, 'rgba(255, 200, 0, 0.6)'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(-25, -25, 50, 50);
  ctx.fillStyle = '#ffaa00'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#000'; ctx.fillRect(-w / 4, -h / 4, w / 4, h / 2);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) { ctx.fillRect(-w / 4 + 2, -h / 4 + 2 + i * 4, w / 4 - 4, 1); }
  ctx.restore();
}

export function drawDataChip(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  if (obj.collected) return;
  const { x, y } = obj;
  const float = Math.sin(time * 4 + (obj.animPhase || 0)) * 4;
  const rotation = time * 1.5;
  ctx.save(); ctx.translate(x + 8, y + 8 + float); ctx.rotate(rotation);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
  glow.addColorStop(0, 'rgba(0, 200, 255, 0.8)'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(-16, -16, 32, 32);
  ctx.fillStyle = '#00ddff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

export function drawEnergyCell(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  if (obj.collected) return;
  const { x, y } = obj;
  const pulse = 0.7 + Math.sin(time * 6) * 0.3;
  ctx.fillStyle = '#222'; ctx.fillRect(x, y + 4, 16, 16); ctx.fillRect(x + 5, y, 6, 4);
  ctx.fillStyle = `rgba(170, 0, 255, ${pulse})`; ctx.fillRect(x + 2, y + 6, 12, 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('⚡', x + 8, y + 16); ctx.textAlign = 'left';
}

export function drawLockedDoor(ctx: CanvasRenderingContext2D, obj: GameObject, hasKey: boolean, time: number) {
  const { x, y, width: w, height: h } = obj;
  ctx.fillStyle = hasKey ? '#003300' : '#330000'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = hasKey ? '#00ff88' : '#ff4444'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = hasKey ? '#00ff88' : '#ff4444'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  ctx.fillText(hasKey ? '🔓' : '🔒', x + w / 2, y + h / 2 + 6); ctx.textAlign = 'left';
  if (!hasKey && Math.sin(time * 5) > 0) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; ctx.fillRect(x, y, w, h);
  }
}

export function drawServerRack(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  const { x, y, width: w, height: h } = obj;
  ctx.fillStyle = '#0a1a0a'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  for (let i = 0; i < 6; i++) {
    const ledY = y + 6 + i * 9;
    const blink = Math.sin(time * 3 + i * 0.7) > 0;
    ctx.fillStyle = blink ? (i % 2 === 0 ? '#00ff88' : '#ffaa00') : '#222';
    ctx.fillRect(x + 4, ledY, 4, 4);
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x + 12, y + 6 + i * 9, w - 16, 4);
  }
}

export function drawMonitor(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  const { x, y, width: w, height: h } = obj;
  ctx.fillStyle = '#222'; ctx.fillRect(x + w / 2 - 4, y + h, 8, 6); ctx.fillRect(x + w / 2 - 12, y + h + 6, 24, 2);
  ctx.fillStyle = '#001a00'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#00ff88'; ctx.font = '6px monospace';
  const codeOffset = (time * 10) % h;
  for (let i = 0; i < 5; i++) {
    const lineY = y + 4 + ((i * 6 + codeOffset) % (h - 4));
    ctx.fillText('01101001', x + 2, lineY);
  }
}

export function drawGuard(ctx: CanvasRenderingContext2D, guard: GameObject, time: number) {
  const { x, y, width: w, height: h } = guard;

  // Тень
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h, w / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Корпус (красный пиксельный человечек)
  ctx.fillStyle = '#aa0000';
  ctx.fillRect(x + 4, y + 8, w - 8, h - 12);

  // Голова
  ctx.fillStyle = '#cc4444';
  ctx.fillRect(x + 6, y + 2, w - 12, 8);

  // Глаза (мигают)
  if (Math.sin(time * 10) > -0.5) {
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(x + 7, y + 4, 2, 2);
    ctx.fillRect(x + w - 9, y + 4, 2, 2);
  }

  // Бронежилет
  ctx.fillStyle = '#660000';
  ctx.fillRect(x + 5, y + 12, w - 10, 8);

  // Ноги (анимация шагов)
  const step = Math.sin(time * 8) * 2;
  ctx.fillStyle = '#330000';
  ctx.fillRect(x + 5, y + h - 4, 4, 4 + step);
  ctx.fillRect(x + w - 9, y + h - 4, 4, 4 - step);

  // Свечение угрозы
  const glow = ctx.createRadialGradient(
    x + w / 2, y + h / 2, 5,
    x + w / 2, y + h / 2, 30
  );
  glow.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
  glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 15, y - 15, w + 30, h + 30);

  // Восклицательный знак над головой
  ctx.fillStyle = '#ff0000';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  const bobY = Math.sin(time * 4) * 2;
  ctx.fillText('!', x + w / 2, y - 6 + bobY);
  ctx.textAlign = 'left';

  // Линия на игрока (если chasing)
  if (guard.state === 'chasing' && guard.targetX !== undefined && guard.targetY !== undefined) {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h / 2);
    ctx.lineTo(guard.targetX, guard.targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawHidingSpot(ctx: CanvasRenderingContext2D, spot: GameObject) {
  const grad = ctx.createRadialGradient(
    spot.x + spot.width / 2, spot.y + spot.height / 2, 0,
    spot.x + spot.width / 2, spot.y + spot.height / 2, spot.width
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(spot.x - 20, spot.y - 20, spot.width + 40, spot.height + 40);

  // Иконка
  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('👤', spot.x + spot.width / 2, spot.y + spot.height / 2 + 4);
  ctx.textAlign = 'left';
}

export function drawHoloTag(ctx: CanvasRenderingContext2D, obj: GameObject, text: string, time: number) {
  const x = obj.x + obj.width / 2;
  const y = obj.y - 20;
  const padding = 6;

  ctx.font = '10px monospace';
  const textWidth = ctx.measureText(text).width;

  const flicker = 0.8 + Math.sin(time * 30) * 0.2;
  ctx.globalAlpha = flicker;

  ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.fillRect(x - textWidth / 2 - padding, y - 10, textWidth + padding * 2, 14);

  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 1;
  const x1 = x - textWidth / 2 - padding;
  const x2 = x + textWidth / 2 + padding;
  const y1 = y - 10;
  const y2 = y + 4;

  ctx.beginPath();
  ctx.moveTo(x1, y1 + 4); ctx.lineTo(x1, y1); ctx.lineTo(x1 + 4, y1);
  ctx.moveTo(x2 - 4, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + 4);
  ctx.moveTo(x1, y2 - 4); ctx.lineTo(x1, y2); ctx.lineTo(x1 + 4, y2);
  ctx.moveTo(x2 - 4, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - 4);
  ctx.stroke();

  ctx.fillStyle = '#00ff88';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

export function drawAlarmEffect(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.3,
    width / 2, height / 2, height * 0.8
  );
  vignette.addColorStop(0, 'rgba(255, 0, 0, 0)');
  vignette.addColorStop(1, `rgba(255, 0, 0, ${0.3 + Math.sin(time * 3) * 0.15})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 5; i++) {
    const y = Math.random() * height;
    const sliceH = 1 + Math.random() * 4;
    ctx.fillStyle = `rgba(255, 0, 0, ${0.2 + Math.random() * 0.3})`;
    ctx.fillRect(0, y, width, sliceH);
  }

  if (Math.sin(time * 6) > 0) {
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ ТРЕВОГА ⚠', width / 2, 50);
    ctx.textAlign = 'left';
  }
}
export function drawWarningSign(ctx: CanvasRenderingContext2D, obj: GameObject, time: number) {
  const { x, y, width: w, height: h } = obj;
  const float = Math.sin(time * 4) * 4;
  const pulse = 0.8 + Math.sin(time * 8) * 0.2;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + float);
  ctx.scale(pulse, pulse);

  // Triangle
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Exclamation mark
  ctx.fillStyle = '#000';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', 0, h / 2 - 4);

  ctx.restore();
}
