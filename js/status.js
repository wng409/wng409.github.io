(function () {
  if (location.pathname !== '/status') return;

  // ==================== 工具 ====================
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = pct + '%';
  }
  function fmtSpeed(bps) {
    if (!bps || bps < 0) bps = 0;
    const u = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let i = 0, v = bps;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toFixed(1) + ' ' + u[i];
  }

  // ==================== Canvas ====================
  const canvas = document.getElementById('statusChart');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const PAD_LEFT = 40, PAD_TOP = 10, PAD_BOTTOM = 10, PAD_RIGHT = 10;

  function fitCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawGrid() {
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.font = '10px sans-serif';
    ctx.textBaseline = 'middle';

    [0, 25, 50, 75, 100].forEach(p => {
      const y = h - PAD_BOTTOM - (p / 100) * (h - PAD_TOP - PAD_BOTTOM);
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(w - PAD_RIGHT, y);
      ctx.stroke();

      ctx.fillStyle = '#bbb';
      ctx.textAlign = 'right';
      ctx.fillText(p + '%', PAD_LEFT - 6, y);
    });

    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, PAD_TOP);
    ctx.lineTo(PAD_LEFT, h - PAD_BOTTOM);
    ctx.stroke();
  }

  function drawLine(data, color, maxVal) {
    if (!canvas || !data || data.length < 2) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const n = data.length;
    const chartW = w - PAD_LEFT - PAD_RIGHT;
    const chartH = h - PAD_TOP - PAD_BOTTOM;
    const max = maxVal || 100;

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    data.forEach((v, i) => {
      const x = PAD_LEFT + (i / (n - 1)) * chartW;
      const pct = Math.max(0, Math.min(1, v / max));
      const y = h - PAD_BOTTOM - pct * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function redraw(hist) {
    if (!canvas || !hist) return;
    drawGrid();
    const NET_MAX  = 1024 * 1024;         // 1 MB/s
    const DISK_MAX = 100 * 1024 * 1024;   // 100 MB/s（和告警阈值一致）
    drawLine(hist.disk,      '#10b981', 100);
    drawLine(hist.mem,       '#3b82f6', 100);
    drawLine(hist.cpu,       '#e60012', 100);
    drawLine(hist.netRx,     '#f59e0b', NET_MAX);
    drawLine(hist.diskWrite, '#8b5cf6', DISK_MAX);
  }

  // ==================== 异常 Toast 提示 ====================
  const ANOMALY_LABELS = {
    mem:       '内存占用超过 80%',
    cpu:       'CPU 超过 90%',
    netDrop:   '网络丢包率过高',
    disk:      '磁盘占用超过 90%',
    diskRead:  '磁盘读取持续高负载',
    diskWrite: '磁盘写入持续高负载'
  };

  let lastAnomalySet = null;

  function notifyAnomalyChanges(anomalies) {
    const current = new Set();
    Object.keys(ANOMALY_LABELS).forEach(k => {
      if (anomalies[k]) current.add(k);
    });

    // 首次请求不弹
    if (lastAnomalySet === null) {
      lastAnomalySet = current;
      return;
    }

    if (typeof window.showToast !== 'function') {
      lastAnomalySet = current;
      return;
    }

    // 新增异常
    current.forEach(k => {
      if (!lastAnomalySet.has(k)) {
        window.showToast('检测到异常', ANOMALY_LABELS[k], 'error');
      }
    });

    // 恢复
    lastAnomalySet.forEach(k => {
      if (!current.has(k)) {
        window.showToast('已恢复正常', ANOMALY_LABELS[k], 'success');
      }
    });

    lastAnomalySet = current;
  }

  // ==================== 最近异常卡片动态渲染 ====================
  const ANOM_LABELS = {
    system_anomaly_disk:       '磁盘占用超过 90%',
    system_anomaly_diskRead:   '磁盘读取持续高负载',
    system_anomaly_diskWrite:  '磁盘写入持续高负载',
    system_anomaly_mem:        '内存占用超过 80%',
    system_anomaly_cpu:        'CPU 超过 90%',
    system_anomaly_netDrop:    '网络丢包率过高',
    system_recover_disk:       '磁盘占用恢复正常',
    system_recover_diskRead:   '磁盘读取恢复正常',
    system_recover_diskWrite:  '磁盘写入恢复正常',
    system_recover_mem:        '内存占用恢复正常',
    system_recover_cpu:        'CPU 恢复正常',
    system_recover_netDrop:    '网络丢包率恢复'
  };

  function fmtAnomTarget(action, target) {
    const v = parseFloat(target);
    if (isNaN(v)) return target || '';
    if (/_disk$/.test(action)) return v + '%';
    if (/_(mem|cpu|netDrop)$/.test(action)) {
      return /_netDrop$/.test(action) ? v.toFixed(1) + '%' : v.toFixed(0) + '%';
    }
    if (/(Read|Write)$/.test(action)) {
      if (v < 1024) return v.toFixed(0) + ' B/s';
      if (v < 1024 * 1024) return (v / 1024).toFixed(1) + ' KB/s';
      return (v / 1024 / 1024).toFixed(1) + ' MB/s';
    }
    return target || '';
  }

  let lastAnomalyTopId = null;

  function renderAnomalies(list) {
    const box = document.getElementById('anomalyCardInner');
    if (!box) return;

    if (!list || list.length === 0) {
      if (lastAnomalyTopId !== 0) {
        box.innerHTML = '<div class="anomaly-mini-empty">无异常记录</div>';
        lastAnomalyTopId = 0;
      }
      return;
    }

    const topId = list[0].id;
    if (topId === lastAnomalyTopId) return;
    lastAnomalyTopId = topId;

    let html = '<div class="anomaly-mini-list">';
    list.forEach(a => {
      const isRecover = a.action.indexOf('recover') !== -1;
      const label = ANOM_LABELS[a.action] || a.action;
      const targetStr = fmtAnomTarget(a.action, a.target);
      html += '<div class="anomaly-mini-item">'
        + '<span class="anomaly-mini-tag ' + (isRecover ? 'recover' : 'anomaly') + '">'
        + (isRecover ? '恢复' : '异常')
        + '</span>'
        + '<div class="anomaly-mini-body">'
        + '<div class="anomaly-mini-text">' + label + '</div>'
        + '<div class="anomaly-mini-meta">' + targetStr + ' · ' + (a.timeStr || '') + '</div>'
        + '</div></div>';
    });
    html += '</div>';
    box.innerHTML = html;
  }

  // ==================== 备份状态卡片 ====================
  function renderBackupStatus(bs) {
    if (!bs) return;

    const lastRunEl = document.getElementById('backupLastRunAgo');
    if (lastRunEl && bs.lastRun) {
      lastRunEl.textContent = bs.lastRun.ago;
      lastRunEl.classList.toggle('stale', !!bs.lastRun.stale);
    }
    const lastRunTimeEl = document.getElementById('backupLastRun');
    if (lastRunTimeEl && bs.lastRun) {
      lastRunTimeEl.textContent = bs.lastRun.time || '—';
    }

    const dataEl = document.getElementById('backupDataStatus');
    if (dataEl) {
      dataEl.textContent = bs.data.status;
      dataEl.className = 'backup-value ' + (
        bs.data.status === 'OK' ? 'ok' :
        bs.data.status === 'FAIL' ? 'fail' : 'unknown'
      );
    }
    const dataAgo = document.getElementById('backupDataAgo');
    if (dataAgo) dataAgo.textContent = bs.data.ago;

    const codeEl = document.getElementById('backupCodeCommit');
    if (codeEl) codeEl.textContent = bs.code.commit;
    const codeAgo = document.getElementById('backupCodeAgo');
    if (codeAgo) codeAgo.textContent = bs.code.ago;

    const swEl = document.getElementById('backupSwitchPeriod');
    if (swEl) swEl.textContent = bs.switch.period;

    const swAgoEl = document.getElementById('backupSwitchAgo');
    if (swAgoEl && bs.switch) {
      swAgoEl.textContent = bs.switch.ago;
      swAgoEl.classList.toggle('stale', !!bs.switch.stale);
    }
  }

  // ==================== 备份异常 Toast（仅首次加载时检查） ====================
  let firstBackupCheck = true;

  function checkBackupToast(bs) {
    if (!bs) return;
    if (!firstBackupCheck) return;
    firstBackupCheck = false;

    const errors = [];
    if (bs.data && bs.data.status === 'FAIL') {
      errors.push('数据备份失败');
    }
    if (bs.lastRun && bs.lastRun.stale) {
      errors.push('备份脚本超时未运行');
    }
    if (bs.switch && bs.switch.stale) {
      errors.push('换仓脚本超时未运行');
    }

    if (errors.length > 0 && typeof window.showToast === 'function') {
      window.showToast('备份系统异常', errors.join(' · '), 'error');
    }
  }

  // ==================== 拉数据 ====================
  let latestHistory = null;

  function update() {
    fetch('/status/data', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;

        // 基础数字
        setText('loadPct', d.loadPct);
        setText('loadText', d.load1 + ' / ' + d.load5 + ' / ' + d.load15);
        setText('memPct', d.memPct);
        setText('memUsed', d.memUsed);
        setText('diskPct', d.diskPct);
        setText('diskUsed', d.diskUsed);
        setText('uptime', d.uptime);
        setText('updatedAt', d.updatedAt);
        setText('procRss', d.procRss);

        // 进度条
        setWidth('loadBar', d.loadPct);
        setWidth('memBar',  d.memPct);
        setWidth('diskBar', d.diskPct);

        // 网络
        if (d.net) {
          setText('netRx', fmtSpeed(d.net.rx));
          setText('netTx', fmtSpeed(d.net.tx));
          setText('netConn', d.net.connections);
          setText('netDropRate', (d.net.dropRate || 0));
          setText('netIfaceLabel', d.net.iface || '');
        }

        // 磁盘读写
        if (d.diskIO) {
          setText('diskRead',  fmtSpeed(d.diskIO.read));
          setText('diskWrite', fmtSpeed(d.diskIO.write));
        }

        // 异常 Toast 提示
        if (d.anomalies) {
          notifyAnomalyChanges(d.anomalies);
        }

        // 最近异常卡片
        if (d.recentAnomalies) {
          renderAnomalies(d.recentAnomalies);
        }

        // 备份状态卡片 + 首次加载异常 Toast
        if (d.backupStatus) {
          renderBackupStatus(d.backupStatus);
          checkBackupToast(d.backupStatus);
        } else {
          const card = document.querySelector('.status-card-backup');
          if (card) card.style.display = 'none';
        }

        // 绘图
        if (d.history) {
          latestHistory = d.history;
          redraw(latestHistory);
        }
      })
      .catch(() => {});
  }

  // ==================== 启动 ====================
  window.addEventListener('resize', () => {
    fitCanvas();
    if (latestHistory) redraw(latestHistory);
  });

  fitCanvas();
  update();
  setInterval(update, 1000);
})();