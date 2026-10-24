(function () {
  var toggle = document.getElementById('logFilterToggle');
  var close = document.getElementById('logFilterClose');
  var panel = document.getElementById('logFilterPanel');
  var mask = document.getElementById('logFilterMask');

  if (!toggle || !panel) return;

  function openPanel() {
    panel.classList.add('open');
    if (mask) mask.classList.add('show');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
  }

  function closePanel() {
    panel.classList.remove('open');
    if (mask) mask.classList.remove('show');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', openPanel);
  if (close) close.addEventListener('click', closePanel);
  if (mask) mask.addEventListener('click', closePanel);
})();