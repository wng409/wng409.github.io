/**
 * 微信内置浏览器拦截
 * ------------------------------------------------------------
 * 背景：微信内置浏览器（X5/WKWebView）会限制复制、下载、外链跳转等能力，
 *       PC 端微信还会把站点套在自己的窗口里，体验与系统浏览器差异很大。
 *
 * 策略（双端分离）：
 *   - 移动端：显示全屏 CSS 遮罩（#wechat-mobile-mask），只做视觉遮挡 + 箭头指引，
 *             遮罩 pointer-events: none，保证用户能点右上角「…」→「在浏览器打开」。
 *             绝不能在移动端锁 body 滚动，否则用户连页面都拖不动。
 *   - PC 端  ：调用 hm-ui 的全局弹窗（showHmModal），提供「复制链接」按钮。
 *             用户选择「留在此页」后在本次会话内不再打扰（sessionStorage）。
 *
 * 依赖：
 *   - DOM：#wechat-mobile-mask（由 views/layouts/layout.ejs 输出）
 *   - JS ：/js/hm-ui.js（window.showHmModal / window.hmAlert），必须在本文件之前加载
 *
 * CSP 约束：本文件是外部脚本（script-src 'self' 放行），不要在 layout 里写内联脚本。
 */
(function () {
  'use strict';

  var ua = (navigator.userAgent || '').toLowerCase();
  if (ua.indexOf('micromessenger') === -1) return;   // 非微信环境直接退出

  // 微信 PC（WindowsWechat / MacWechat）UA 不含 mobile 系列关键字
  var MOBILE_RE = /android|iphone|ipad|ipod|mobile|windows phone/;
  var isMobile = MOBILE_RE.test(ua);
  var DISMISS_KEY = 'wechat_guard_pc_dismissed';

  function hasDismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (err) { return false; }
  }

  function markDismissed() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (err) { /* 隐私模式忽略 */ }
  }

  // ---------- 移动端：全屏遮罩 ----------
  function showMobileMask() {
    var mask = document.getElementById('wechat-mobile-mask');
    if (!mask) return;
    mask.classList.add('show');
    mask.setAttribute('aria-hidden', 'false');
    // 注意：这里不设置 body overflow，遮罩本身也不接收点击（CSS pointer-events: none）
  }

  // ---------- 复制链接（含旧内核降级） ----------
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  // ---------- PC 端：hm-ui 弹窗 ----------
  function showPcModal() {
    if (hasDismissed()) return;
    if (typeof window.showHmModal !== 'function') return;   // hm-ui 未加载（例如被静态裁剪）则静默跳过

    window.showHmModal({
      title: '请在浏览器中打开',
      desc: '微信内置浏览器会限制复制、下载与外链跳转等功能。为保证完整体验，请复制本页链接，粘贴到系统浏览器中访问。',
      url: window.location.href,
      tone: 'caution',
      actions: [
        { text: '留在此页', value: false, type: 'cancel' },
        { text: '复制链接', value: true, type: 'primary' }
      ]
    }).then(function (confirmed) {
      if (!confirmed) {
        markDismissed();
        return;
      }
      copyText(window.location.href).then(function (copied) {
        if (typeof window.hmAlert !== 'function') return;
        window.hmAlert(
          copied
            ? '链接已复制，粘贴到浏览器地址栏即可打开。'
            : '自动复制失败，请长按或手动选中地址栏链接复制。',
          copied ? '已复制' : '请手动复制',
          { tone: copied ? 'primary' : 'caution' }
        );
      });
    });
  }

  if (isMobile) showMobileMask();
  else showPcModal();
})();