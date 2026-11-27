(function () {
  'use strict';

  function notify(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg, 'success');
  }


  /* ==================== 侧边栏：菜单 / 折叠 / 移动抽屉 ==================== */
  var sidebar = document.getElementById('sidebar');
  var sidebarMask = document.getElementById('sidebarMask');
  var menuBtn = document.getElementById('menuBtn');
  var collapseBtn = document.getElementById('collapseBtn');
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  var pageTitle = document.getElementById('pageTitle');

  function closeMobileMenu() {
    sidebar.classList.remove('mobile-open');
    sidebarMask.classList.remove('show');
    document.body.style.overflow = '';
  }

  var newUserBtn = document.getElementById('newUserBtn');

  function updateHeaderActions(panel) {
    if (!newUserBtn) return;
    newUserBtn.hidden = panel !== 'users';
  }
  updateHeaderActions('posts');

  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var target = item.dataset.panel;
      navItems.forEach(function (n) { n.classList.toggle('active', n === item); });
      panels.forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + target); });
      pageTitle.textContent = item.dataset.title || '';
      updateHeaderActions(target);
      closeMobileMenu();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      sidebar.classList.add('mobile-open');
      sidebarMask.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
  }
  if (sidebarMask) sidebarMask.addEventListener('click', closeMobileMenu);

  if (collapseBtn) {
    collapseBtn.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
    });
  }

  /* ==================== 演示操作统一拦截 ==================== */
  function bindDemoActions(root) {
    (root || document).querySelectorAll('[data-demo-action]').forEach(function (el) {
      if (el.dataset.demoBound === '1') return;
      el.dataset.demoBound = '1';
      el.addEventListener('click', function (e) {
        if (el.tagName === 'A') e.preventDefault();
        notify('演示环境：' + el.dataset.demoAction + '未真实执行');
      });
    });
  }
  bindDemoActions();

  /* ==================== 鸿蒙风下拉框 ==================== */
  function initHarmonySelect(container) {
    if (!container || container.dataset.ready === '1') return;
    var select = container.querySelector('select');
    var trigger = container.querySelector('.hm-select-trigger');
    var triggerText = container.querySelector('.trigger-text');
    var optionsList = container.querySelector('.hm-select-options');
    if (!select || !trigger || !triggerText || !optionsList) return;
    container.dataset.ready = '1';

    function syncTrigger() {
      var opt = select.options[select.selectedIndex];
      triggerText.textContent = opt ? opt.text : '（无可选项）';
      Array.prototype.forEach.call(optionsList.children, function (li) {
        li.classList.toggle('is-selected', !!opt && li.dataset.value === opt.value);
      });
    }

    function clearFixedPosition() {
      optionsList.classList.remove('fixed-options');
      optionsList.removeAttribute('style');
    }

    function closeOptions() {
      container.classList.remove('is-open');
      container.classList.remove('drop-up');
      clearFixedPosition();
    }
    container._hmClose = closeOptions;

    function render() {
      optionsList.innerHTML = '';
      Array.prototype.forEach.call(select.options, function (opt) {
        var li = document.createElement('li');
        li.textContent = opt.text;
        li.dataset.value = opt.value;

        li.addEventListener('click', function (e) {
          e.stopPropagation();
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          syncTrigger();
          closeOptions();
        });

        optionsList.appendChild(li);
      });
      syncTrigger();
    }

    render();
    select.addEventListener('change', syncTrigger);

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !container.classList.contains('is-open');

      document.querySelectorAll('.hm-select-container.is-open').forEach(function (c) {
        if (c !== container) {
          if (typeof c._hmClose === 'function') c._hmClose();
          else c.classList.remove('is-open');
        }
      });

      if (!willOpen) {
        closeOptions();
        return;
      }

      container.classList.add('is-open');
      container.classList.remove('drop-up');
      clearFixedPosition();

      var isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        optionsList.classList.add('fixed-options');
        var menuH = Math.min(optionsList.scrollHeight || 250, 250);
        var rect = trigger.getBoundingClientRect();
        var width = Math.min(rect.width, window.innerWidth - 16);
        var left = Math.max(8, Math.min(rect.left, window.innerWidth - 8 - width));
        var top = rect.bottom + 8;
        if (top + menuH > window.innerHeight - 8) {
          top = Math.max(8, rect.top - 8 - menuH);
        }
        optionsList.style.position = 'fixed';
        optionsList.style.left = left + 'px';
        optionsList.style.top = top + 'px';
        optionsList.style.width = width + 'px';
        optionsList.style.right = 'auto';
        optionsList.style.bottom = 'auto';
        optionsList.style.maxHeight = menuH + 'px';
        optionsList.style.zIndex = '1500';
      } else {
        var triggerRect = trigger.getBoundingClientRect();
        if (triggerRect.bottom + 8 + 250 > window.innerHeight - 8) {
          container.classList.add('drop-up');
        }
      }
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });
  }

  function initAllSelects(root) {
    (root || document).querySelectorAll('.hm-select-container').forEach(initHarmonySelect);
  }
  initAllSelects();

  function closeAllSelects() {
    document.querySelectorAll('.hm-select-container.is-open').forEach(function (c) {
      if (typeof c._hmClose === 'function') c._hmClose();
      else c.classList.remove('is-open');
    });
  }

  window.addEventListener('scroll', function (e) {
    var target = e.target;
    if (target && target.closest && target.closest('.hm-select-options')) return;
    closeAllSelects();
  }, true);
  window.addEventListener('resize', closeAllSelects);
  document.addEventListener('click', closeAllSelects);
/* ==================== Banner 拖拽排序（PC + 触摸） ==================== */
  var bannerList = document.getElementById('bannerList');
  var dragRow = null;

  function bannerRows() {
    return bannerList ? Array.prototype.slice.call(bannerList.querySelectorAll('.banner-row')) : [];
  }

  function updateSummaries() {
    bannerRows().forEach(function (row, i) {
      row.dataset.index = String(i);
      var input = row.querySelector('input[name="title"]');
      var title = (input && input.value.trim()) || '（未命名 Banner）';
      var summary = row.querySelector('.banner-summary-title');
      if (summary) summary.textContent = title;
    });
  }

  function bindDrag(row) {
    if (row.dataset.dragBound === '1') return;
    row.dataset.dragBound = '1';

    row.addEventListener('dragstart', function (e) {
      dragRow = row;
      row.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });

    row.addEventListener('dragend', function () {
      row.classList.remove('dragging');
      dragRow = null;
      updateSummaries();
      notify('排序已更新（演示环境）');
    });

    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (dragRow && dragRow !== row) row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', function () {
      row.classList.remove('drag-over');
    });

    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (!dragRow || dragRow === row) return;
      var rows = bannerRows();
      if (rows.indexOf(dragRow) < rows.indexOf(row)) {
        bannerList.insertBefore(dragRow, row.nextSibling);
      } else {
        bannerList.insertBefore(dragRow, row);
      }
      updateSummaries();
    });

    var handle = row.querySelector('.drag-handle');
    if (handle && handle.dataset.touchBound !== '1') {
      handle.dataset.touchBound = '1';
      var pressTimer = null;
      var touching = false;
      var startY = 0;

      handle.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        startY = e.clientY;
        pressTimer = setTimeout(function () {
          touching = true;
          row.classList.add('dragging');
          if (handle.setPointerCapture) {
            try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          }
        }, 300);
      });

      handle.addEventListener('pointermove', function (e) {
        if (!touching) {
          if (Math.abs(e.clientY - startY) > 10) clearTimeout(pressTimer);
          return;
        }
        e.preventDefault();
        var under = document.elementFromPoint(e.clientX, e.clientY);
        var target = under ? under.closest('.banner-row') : null;
        if (target && target !== row) {
          var rows = bannerRows();
          if (rows.indexOf(row) < rows.indexOf(target)) bannerList.insertBefore(row, target.nextSibling);
          else bannerList.insertBefore(row, target);
          updateSummaries();
        }
      });

      function endTouch() {
        clearTimeout(pressTimer);
        if (touching) {
          touching = false;
          row.classList.remove('dragging');
          updateSummaries();
          notify('排序已更新（演示环境）');
        }
      }
      handle.addEventListener('pointerup', endTouch);
      handle.addEventListener('pointercancel', endTouch);
      handle.addEventListener('contextmenu', function (e) { if (touching) e.preventDefault(); });
    }
  }

  bannerRows().forEach(bindDrag);

  /* ==================== Banner 编辑抽屉 ==================== */
  var sheet = document.getElementById('bannerSheet');
  var sheetBody = document.getElementById('sheetBody');
  var sheetMask = document.getElementById('sheetMask');
  var sheetHost = null;

  function openSheet(row) {
    var fields = row.querySelector('.banner-fields');
    if (!fields) return;

    sheetHost = { row: row, fields: fields, parent: fields.parentNode, next: fields.nextSibling };
    sheetBody.appendChild(fields);
    sheet.classList.add('open');
    sheetMask.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    if (sheetHost) {
      if (sheetHost.next) sheetHost.parent.insertBefore(sheetHost.fields, sheetHost.next);
      else sheetHost.parent.appendChild(sheetHost.fields);
      sheetHost = null;
    }
    sheet.classList.remove('open');
    sheetMask.classList.remove('show');
    document.body.style.overflow = '';
    closeAllSelects();
  }

  if (bannerList) {
    bannerList.addEventListener('click', function (e) {
      var row = e.target.closest('.banner-row');
      if (!row) return;

      if (e.target.closest('[data-open-sheet]')) {
        openSheet(row);
        return;
      }

      if (e.target.closest('.banner-remove')) {
        if (sheetHost && sheetHost.row === row) closeSheet();
        row.parentNode.removeChild(row);
        updateSummaries();
        notify('已删除 Banner（演示环境）');
      }
    });

    bannerList.addEventListener('input', function (e) {
      if (e.target.matches('input[name="title"]')) updateSummaries();
    });
  }

  if (sheetMask) sheetMask.addEventListener('click', closeSheet);
  var sheetClose = document.getElementById('sheetClose');
  var sheetCancel = document.getElementById('sheetCancel');
  var sheetSave = document.getElementById('sheetSave');
  if (sheetClose) sheetClose.addEventListener('click', closeSheet);
  if (sheetCancel) sheetCancel.addEventListener('click', closeSheet);
  if (sheetSave) sheetSave.addEventListener('click', closeSheet);

  var addBannerBtn = document.getElementById('addBannerBtn');
  if (addBannerBtn) {
    addBannerBtn.addEventListener('click', function () {
      var rows = bannerRows();
      if (!rows.length) return;

      var row = rows[0].cloneNode(true);
      row.dataset.dragBound = '';
      row.classList.remove('dragging', 'drag-over');
      row.dataset.index = String(rows.length);

      var titleInput = row.querySelector('input[name="title"]');
      var imageInput = row.querySelector('input[name="image"]');
      if (titleInput) titleInput.value = '新的 Banner';
      if (imageInput) imageInput.value = '/uploads/demo-banner.jpg';

      row.querySelectorAll('.hm-select-container').forEach(function (c) {
        delete c.dataset.ready;
        var options = c.querySelector('.hm-select-options');
        if (options) options.innerHTML = '';
      });

      var handle = row.querySelector('.drag-handle');
      if (handle) delete handle.dataset.touchBound;

      bannerList.appendChild(row);
      initAllSelects(row);
      bindDrag(row);
      updateSummaries();
      notify('已添加 Banner（演示环境）');
    });
  }

  updateSummaries();

  /* ==================== 推荐文章胶囊 ==================== */
  var featuredChips = document.getElementById('featuredChips');
  var featuredCandidates = document.getElementById('featuredCandidates');
  var featuredSearch = document.getElementById('featuredSearch');

  function selectedTitles() {
    return Array.prototype.slice.call(featuredChips.querySelectorAll('.chip')).map(function (chip) {
      var text = chip.querySelector('span');
      return text ? text.textContent : '';
    });
  }

  function syncCandidates() {
    var selected = selectedTitles();
    featuredCandidates.querySelectorAll('.candidate-chip').forEach(function (chip) {
      chip.classList.toggle('is-added', selected.indexOf(chip.dataset.title) !== -1);
    });
  }

  if (featuredCandidates) {
    featuredCandidates.addEventListener('click', function (e) {
      var candidate = e.target.closest('.candidate-chip');
      if (!candidate || candidate.classList.contains('is-added')) return;

      var chip = document.createElement('span');
      chip.className = 'chip';

      var text = document.createElement('span');
      text.textContent = candidate.dataset.title;
      chip.appendChild(text);

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'chip-remove';
      remove.setAttribute('aria-label', '移除');
      remove.innerHTML = '<i class="fas fa-times"></i>';
      chip.appendChild(remove);

      featuredChips.appendChild(chip);
      syncCandidates();
      notify('已添加推荐（演示环境）');
    });
  }

  if (featuredChips) {
    featuredChips.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip-remove');
      if (!btn) return;
      var chip = btn.closest('.chip');
      if (chip) chip.parentNode.removeChild(chip);
      syncCandidates();
      notify('已移除推荐（演示环境）');
    });
  }

  if (featuredSearch) {
    featuredSearch.addEventListener('input', function () {
      var keyword = featuredSearch.value.trim().toLowerCase();
      featuredCandidates.querySelectorAll('.candidate-chip').forEach(function (chip) {
        var hit = !keyword || chip.dataset.title.toLowerCase().indexOf(keyword) !== -1;
        chip.style.display = hit ? '' : 'none';
      });
    });
  }

  /* ==================== 用户管理 ==================== */
  document.querySelectorAll('.toggle-user').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.user-row');
      if (!row) return;

      var active = row.dataset.active === '1';
      var next = !active;
      var stateText = row.querySelector('.state-text');
      var state = row.querySelector('.user-state');
      var dot = row.querySelector('.status-dot');

      row.dataset.active = next ? '1' : '0';
      if (stateText) stateText.textContent = next ? '启用' : '已禁用';
      if (state) state.classList.toggle('is-disabled', !next);
      if (dot) {
        dot.classList.toggle('status-active', next);
        dot.classList.toggle('status-inactive', !next);
      }

      btn.innerHTML = next
        ? '<i class="fas fa-ban"></i>'
        : '<i class="fas fa-check-circle"></i>';
      btn.title = next ? '禁用' : '启用';

      notify(next ? '用户已启用（演示环境）' : '用户已禁用（演示环境）');
    });
  });

  /* ==================== 系统日志：UA / 搜索 / 筛选 / 详情 / 清空 ==================== */
  var OS_RULES = [
    { name: 'HarmonyOS', icon: 'fa-mobile-alt', re: /OpenHarmony|HarmonyOS|ArkWeb/i },
    { name: 'Android', icon: 'fa-mobile-alt', re: /Android/i },
    { name: 'iOS', icon: 'fa-mobile-alt', re: /iPhone|iPad|iPod|iOS/i },
    { name: 'Windows', icon: 'fa-desktop', re: /Windows NT|Windows/i },
    { name: 'macOS', icon: 'fa-laptop', re: /Macintosh|Mac OS X/i },
    { name: 'Linux', icon: 'fa-linux', re: /Linux|X11/i }
  ];
  var BROWSER_RULES = [
    { name: 'ArkWeb', re: /ArkWeb/i },
    { name: 'Edge', re: /Edg\//i },
    { name: 'Chrome', re: /Chrome\/|CriOS/i },
    { name: 'Firefox', re: /Firefox\/|FxiOS/i },
    { name: 'Safari', re: /Safari\//i },
    { name: 'curl', re: /curl\//i },
    { name: 'Node', re: /node|axios|undici/i }
  ];

  function detectOS(ua) {
    for (var i = 0; i < OS_RULES.length; i++) {
      if (OS_RULES[i].re.test(ua)) return OS_RULES[i];
    }
    return { name: '未知系统', icon: 'fa-question-circle' };
  }

  function detectBrowser(ua) {
    for (var i = 0; i < BROWSER_RULES.length; i++) {
      if (BROWSER_RULES[i].re.test(ua)) return BROWSER_RULES[i].name;
    }
    return '未知浏览器';
  }

    function fillUA() {
    document.querySelectorAll('.log-ua').forEach(function (el) {
      var ua = el.getAttribute('data-ua') || '';
      var os = detectOS(ua);
      var br = detectBrowser(ua);
      var icon = el.querySelector('i');
      
      if (icon) {
        // 1. 鸿蒙专属：替换为你提供的标准完整版 SVG
        if (os.name === 'HarmonyOS') {
          const harmonySvg = `<svg role="img" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align: -2px; margin-right: 6px;" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.861 0H3.59v3.548h3.861V0H9.19v8.883H7.458V5.136H3.59v3.746H1.858Zm8.248 8.883ZM13.854 0h1.706l2.809 4.7h.1L21.278 0h1.719v8.883h-1.719v-4.38l.1-1.489h-.1l-2.334 3.983h-1.039l-2.347-3.983h-.1l.1 1.489v4.38h-1.706Zm4.702 21.648a4.082 4.082 0 0 1-1.154-.161 3.417 3.417 0 0 1-1.01-.484 3.5 3.5 0 0 1-.8-.782 3.817 3.817 0 0 1-.538-1.092l1.666-.62a2.411 2.411 0 0 0 .643 1.116 1.683 1.683 0 0 0 1.207.434 2.173 2.173 0 0 0 .524-.062 1.749 1.749 0 0 0 .459-.2 1.02 1.02 0 0 0 .328-.335.88.88 0 0 0 .118-.459 1.052 1.052 0 0 0-.092-.447 1.031 1.031 0 0 0-.315-.373 2.538 2.538 0 0 0-.564-.335 8.135 8.135 0 0 0-.852-.335l-.577-.2a4.753 4.753 0 0 1-.774-.335 3.44 3.44 0 0 1-.7-.509 2.662 2.662 0 0 1-.525-.695 2.093 2.093 0 0 1-.2-.918 2.248 2.248 0 0 1 .21-.968 2.433 2.433 0 0 1 .616-.794 2.87 2.87 0 0 1 .957-.533 3.726 3.726 0 0 1 1.246-.2 3.57 3.57 0 0 1 1.22.186 2.783 2.783 0 0 1 .879.459 2.468 2.468 0 0 1 .59.608 2.9 2.9 0 0 1 .328.633l-1.56.62a1.55 1.55 0 0 0-.485-.67 1.387 1.387 0 0 0-.944-.3 1.655 1.655 0 0 0-.957.261.754.754 0 0 0-.38.658.843.843 0 0 0 .367.682 4.232 4.232 0 0 0 1.167.534l.59.186a6.271 6.271 0 0 1 1.023.434 2.948 2.948 0 0 1 .8.57 2.191 2.191 0 0 1 .511.769 2.44 2.44 0 0 1 .183.98 2.317 2.317 0 0 1-.3 1.2 2.559 2.559 0 0 1-.747.819 3.361 3.361 0 0 1-1.036.484 4.184 4.184 0 0 1-1.128.161Zm-13.028 0a4.441 4.441 0 0 1-3.23-1.34 4.757 4.757 0 0 1-.956-1.476 4.912 4.912 0 0 1-.339-1.824 4.813 4.813 0 0 1 .339-1.811 4.569 4.569 0 0 1 .956-1.477 4.38 4.38 0 0 1 1.427-.992 4.5 4.5 0 0 1 1.8-.36 4.417 4.417 0 0 1 1.79.36 4.343 4.343 0 0 1 1.44.992 4.418 4.418 0 0 1 .944 1.477 4.67 4.67 0 0 1 .351 1.811 4.765 4.765 0 0 1-.351 1.824 4.589 4.589 0 0 1-.944 1.476 4.495 4.495 0 0 1-3.23 1.34Zm0-1.588a2.822 2.822 0 0 0 1.125-.223 2.761 2.761 0 0 0 .92-.621 2.723 2.723 0 0 0 .617-.955 3.321 3.321 0 0 0 .23-1.253 3.227 3.227 0 0 0-.23-1.24 2.7 2.7 0 0 0-.617-.968 2.759 2.759 0 0 0-.92-.62 2.821 2.821 0 0 0-1.125-.223 2.856 2.856 0 0 0-2.057.844 2.946 2.946 0 0 0-.617.968 3.388 3.388 0 0 0-.218 1.24 3.488 3.488 0 0 0 .218 1.253 2.972 2.972 0 0 0 .617.955 2.856 2.856 0 0 0 2.057.843Zm4.972 1.389Zm-8.269 1.039h6.5V24h-6.5Z"/>
          </svg>`;
          icon.outerHTML = harmonySvg;
        } 
        // 2. 其他系统：保持原样，修复 Linux 前缀
        else {
          var prefix = (os.icon === 'fa-linux') ? 'fab' : 'fas';
          icon.className = prefix + ' ' + os.icon;
        }
      }
      
      var label = el.querySelector('.ua-label');
      if (label) label.textContent = os.name + ' / ' + br;
    });
  }
  fillUA();

  var logSearch = document.getElementById('logSearch');
  var filterAction = document.getElementById('filterAction');
  var filterUser = document.getElementById('filterUser');
  var filterIp = document.getElementById('filterIp');

  function applyLogFilters() {
    var keyword = ((logSearch && logSearch.value) || '').trim().toLowerCase();
    var action = (filterAction && filterAction.value) || '';
    var user = ((filterUser && filterUser.value) || '').trim().toLowerCase();
    var ip = ((filterIp && filterIp.value) || '').trim().toLowerCase();

    document.querySelectorAll('#logList .log-row').forEach(function (row) {
      var visible = true;
      if (keyword && (row.dataset.search || '').toLowerCase().indexOf(keyword) === -1) visible = false;
      if (action && row.dataset.action !== action) visible = false;
      if (user && (row.dataset.user || '').toLowerCase().indexOf(user) === -1) visible = false;
      if (ip && (row.dataset.ip || '').toLowerCase().indexOf(ip) === -1) visible = false;
      row.style.display = visible ? '' : 'none';
    });
  }
  if (logSearch) logSearch.addEventListener('input', applyLogFilters);

  function openOverlay(panel, mask) {
    if (!panel) return;
    panel.classList.add('open');
    if (mask) mask.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeOverlay(panel, mask) {
    if (panel) panel.classList.remove('open');
    if (mask) mask.classList.remove('show');
    document.body.style.overflow = '';
  }

  var logFilterPanel = document.getElementById('logFilterPanel');
  var logFilterMask = document.getElementById('logFilterMask');
  var logDetailSheet = document.getElementById('logDetailSheet');
  var logDetailMask = document.getElementById('logDetailMask');

  function closeLogFilter() { closeOverlay(logFilterPanel, logFilterMask); }
  function closeLogDetail() { closeOverlay(logDetailSheet, logDetailMask); }

  var logFilterToggle = document.getElementById('logFilterToggle');
  if (logFilterToggle) {
    logFilterToggle.addEventListener('click', function () {
      openOverlay(logFilterPanel, logFilterMask);
    });
  }
  var logFilterClose = document.getElementById('logFilterClose');
  if (logFilterClose) logFilterClose.addEventListener('click', closeLogFilter);
  if (logFilterMask) logFilterMask.addEventListener('click', closeLogFilter);

  var applyLogFilterBtn = document.getElementById('applyLogFilter');
  if (applyLogFilterBtn) {
    applyLogFilterBtn.addEventListener('click', function () {
      applyLogFilters();
      closeLogFilter();
      notify('筛选已应用（演示环境）');
    });
  }

  var clearLogFilterBtn = document.getElementById('clearLogFilter');
  if (clearLogFilterBtn) {
    clearLogFilterBtn.addEventListener('click', function () {
      if (filterAction) filterAction.value = '';
      if (filterUser) filterUser.value = '';
      if (filterIp) filterIp.value = '';
      applyLogFilters();
      closeLogFilter();
      notify('筛选已清除（演示环境）');
    });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value || '—';
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  var logList = document.getElementById('logList');
  if (logList) {
    logList.addEventListener('click', function (e) {
      if (!isMobileViewport()) return;
      var row = e.target.closest('.log-row');
      if (!row) return;

      var ua = row.getAttribute('data-ua') || '';
      setText('detailId', row.dataset.id);
      setText('detailUser', row.dataset.user);
      setText('detailAction', row.dataset.action);
      setText('detailTarget', row.dataset.target);
      setText('detailIp', row.dataset.ip);
      setText('detailTime', row.dataset.time);
      setText('detailDevice', detectOS(ua).name + ' / ' + detectBrowser(ua));
      setText('detailUa', ua);
      openOverlay(logDetailSheet, logDetailMask);
    });
  }

  var logDetailClose = document.getElementById('logDetailClose');
  if (logDetailClose) logDetailClose.addEventListener('click', closeLogDetail);
  if (logDetailMask) logDetailMask.addEventListener('click', closeLogDetail);

  var clearLogsBtn = document.getElementById('clearLogsBtn');
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', function () {
      if (logList) {
        logList.innerHTML = '<div class="log-empty"><i class="fas fa-inbox"></i>暂无日志</div>';
      }
      clearLogsBtn.disabled = true;
      notify('日志已清空（演示环境）');
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeLogFilter();
      closeLogDetail();
      closeAllSelects();
    }
  });

  /* ==================== 沙盒主题色引擎 ==================== */
  var root = document.documentElement;
  var brandValue = document.getElementById('brandValue');
  var customColor = document.getElementById('customColor');
  var swatches = Array.prototype.slice.call(document.querySelectorAll('.swatch[data-color]'));

  function setBrand(color) {
    if (!color) return;
    root.style.setProperty('--brand-color', color);
    if (brandValue) brandValue.textContent = color.toLowerCase();
    swatches.forEach(function (s) {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === color.toLowerCase());
    });
    if (customColor && /^#[0-9a-f]{6}$/i.test(color)) customColor.value = color;
  }

  swatches.forEach(function (s) {
    s.addEventListener('click', function () { setBrand(s.dataset.color); });
  });
  if (customColor) {
    customColor.addEventListener('input', function () { setBrand(customColor.value); });
  }
  setBrand(document.body.getAttribute('data-initial-brand') || '#e60012');

  /* ==================== 保存拦截 / 全局关闭 ==================== */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-save]')) {
      notify('演示环境：数据未真实保存');
      return;
    }
    if (e.target.closest('.img-link-btn')) {
      notify('演示环境：图片上传未接入');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSheet();
      closeMobileMenu();
      closeLogFilter();
      closeLogDetail();
      closeAllSelects();
    }
  });
})();
