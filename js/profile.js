/**
 * 我的资料页：改密流程的鸿蒙弹窗（hm-ui.js 的 window.showHmModal）
 * ------------------------------------------------------------
 * 覆盖两类一次性提示，均只保留一个蓝色「我知道了」按钮：
 *
 *   1) 改密成功 —— URL 携带 ?action=password_changed（POST /admin/profile/password
 *      成功后重定向而来）。弹「密码修改成功」，随后清理 URL 参数，刷新不重复弹。
 *   2) 强制改密 —— body[data-force-password-change="1"]。覆盖全部场景：
 *      · 主号仍使用默认弱口令 admin123（登录时落库 + session 标记）
 *      · 新建用户首次登录（建号即 force_password_change=1）
 *      · 管理员重置密码后再次登录（重置即 force_password_change=1）
 *
 * 设计约束：
 *   - CSP 严格模式：外部脚本 + data 属性，不使用内联 script / 行内事件；
 *   - 依赖 hm-ui.js 的 window.showHmModal（admin-shell-end 先加载，defer 顺序保证）；
 *   - 与 hm-ui 的 ?err= 提示去重：强制改密时后端会带同义 err 重定向，
 *     这里先抹掉该参数，避免两个弹窗互相顶掉（openModal 并发会 close 前一个）。
 */
(function () {
  'use strict';

  var ACTION_PASSWORD_CHANGED = 'password_changed';

  var FORCE_TIP = {
    title: '安全提示',
    desc: '检测到您当前使用的是初始密码或系统默认密码。为了您的账号安全，请立即在下方修改密码。'
  };

  var SUCCESS_TIP = {
    title: '密码修改成功',
    desc: '为了您的账号安全，请牢记新密码。如忘记密码，请联系系统管理员进行重置。'
  };

  function parseUrl() {
    try {
      return new URL(window.location.href);
    } catch (e) {
      return null;
    }
  }

  function replaceQuery(url) {
    try {
      window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    } catch (e) { /* 浏览器限制时忽略：最多多弹一次同义提示，不影响改密结果 */ }
  }

  function isForceChange() {
    var body = document.body;
    return !!body && body.getAttribute('data-force-password-change') === '1';
  }

  // 后端 authOnly 的强制改密提示只有这两种文案：
  //   「为了账号安全，请先修改初始密码」
  //   「检测到主账号仍在使用默认密码 admin123，请立即修改」
  function isForceChangeErr(err) {
    return !!err && (err.indexOf('初始密码') !== -1 || err.indexOf('默认密码') !== -1);
  }

  function readAction(url) {
    return url ? url.searchParams.get('action') : null;
  }

  function dropDuplicateForceErr() {
    var url = parseUrl();
    if (!url) return;
    if (!isForceChangeErr(url.searchParams.get('err'))) return;

    url.searchParams.delete('err');
    replaceQuery(url);
  }

  // 一次性 action：先清理地址栏再弹窗，保证刷新页面不会重复提示
  function consumeAction(url) {
    url.searchParams.delete('action');
    // 历史版本改密成功用的是 ?msg=密码已修改…，一并抹掉避免与成功弹窗重复
    if (url.searchParams.get('msg') === '密码已修改，其它设备已退出登录') {
      url.searchParams.delete('msg');
    }
    replaceQuery(url);
  }

  function focusNewPassword() {
    var input = document.querySelector('input[name="newPassword"]');
    if (!input) return;
    try {
      input.focus({ preventScroll: false });
    } catch (e) {
      try { input.focus(); } catch (e2) { /* 忽略 */ }
    }
  }

  function showTip(tip, afterClose) {
    if (typeof window.showHmModal !== 'function') return;
    var p = window.showHmModal({
      title: tip.title,
      desc: tip.desc,
      tone: 'primary',
      actions: [{ text: '我知道了', value: true, type: 'primary' }]
    });
    if (p && typeof p.then === 'function') p.then(afterClose || function () {});
  }

  function boot() {
    var url = parseUrl();
    var action = readAction(url);

    // 1) 改密成功：只弹成功提示（此时 force_password_change 必然已为 0）
    if (action === ACTION_PASSWORD_CHANGED) {
      // defer 脚本执行早于 DOMContentLoaded，此刻清参数早于 hm-ui 的 drainFlash
      consumeAction(url);
      // 让出一轮事件循环，避免与 hm-ui 的其它一次性提示抢占同一个弹窗
      setTimeout(function () {
        // 关闭后停留在当前资料页（不做跳转、不刷新，避免重复提示）
        showTip(SUCCESS_TIP, function () {});
      }, 0);
      return;
    }

    // 2) 强制改密：首次登录 / 新用户 / 管理员重置后再次登录
    if (!isForceChange()) return;
    dropDuplicateForceErr();
    setTimeout(function () {
      showTip(FORCE_TIP, focusNewPassword);
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();