(function () {
  var toggle = document.getElementById('filterToggle');
  var close = document.getElementById('filterClose');
  var panel = document.getElementById('filterPanel');
  var mask = document.getElementById('filterMask');

  function openPanel() {
    if (panel) panel.classList.add('open');
    if (mask) mask.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closePanel() {
    if (panel) panel.classList.remove('open');
    if (mask) mask.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (toggle) toggle.addEventListener('click', openPanel);
  if (close) close.addEventListener('click', closePanel);
  if (mask) mask.addEventListener('click', closePanel);

  // 标签折叠
  var expandBtn = document.getElementById('tagExpand');
  var chips = document.getElementById('tagChips');
  if (expandBtn && chips) {
    expandBtn.addEventListener('click', function () {
      var expanded = chips.classList.toggle('expanded');
      expandBtn.innerHTML = expanded
        ? '收起 <i class="fas fa-chevron-up"></i>'
        : '显示全部 <i class="fas fa-chevron-down"></i>';
    });
  }
})();