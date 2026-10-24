// 后台首页：editor 配额用满时，点击“新建文章”就地提示，不跳转
(function () {
  'use strict';
  const btn = document.querySelector('[data-quota-exhausted]');
  if (!btn) return;
  if (btn.dataset.quotaExhausted !== 'true') return;
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof window.showToast === 'function') {
      window.showToast('提示', '今天已经很肝了 明天再来吧', 'error');
    } else {
      alert('今天已经很肝了 明天再来吧');
    }
  });
})();