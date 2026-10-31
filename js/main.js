// 静态站标识（layout 注入 data-static="true"；动态站无此属性）
const IS_STATIC = document.body && document.body.dataset.static === 'true';
const POSTS_URL = IS_STATIC ? '/posts.html' : '/posts';

document.addEventListener('DOMContentLoaded', function () {
  // 汉堡菜单（全屏）
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const mobileMenu = document.getElementById('mobileMenu');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      mobileMenu.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
  }

  if (menuClose && mobileMenu) {
    menuClose.addEventListener('click', function () {
      mobileMenu.classList.remove('show');
      document.body.style.overflow = '';
    });
  }

  // 点菜单里的链接后自动关闭
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('show');
        document.body.style.overflow = '';
      });
    });
  }

  // 顶部搜索按钮
  const searchToggle = document.getElementById('searchToggle');
  if (searchToggle) {
    searchToggle.addEventListener('click', function () {
      window.location.href = POSTS_URL + '?focus=1';
    });
  }

  // 文章列表页搜索（静态站由 /js/static-search.js 接管，避免与其 SPA 冲突）
  if (!IS_STATIC) {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (searchInput) {
      searchInput.addEventListener('keypress', function (e) {
        // /private 页放行原生表单提交（不 preventDefault、不调 doSearch）
        if (e.key === 'Enter' && window.location.pathname !== '/private') {
          e.preventDefault();
          doSearch();
        }
      });
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('focus')) {
        searchInput.focus();
        searchInput.select();
      }
    }
    if (searchBtn) searchBtn.addEventListener('click', doSearch);
  }

  // 通用确认框
  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', function (e) {
      if (!confirm(form.dataset.confirm)) e.preventDefault();
    });
  });
  document.querySelectorAll('button[data-confirm], a[data-confirm]').forEach(el => {
    el.addEventListener('click', function (e) {
      if (!confirm(el.dataset.confirm)) e.preventDefault();
    });
  });
});

function doSearch() {
  if (window.location.pathname === '/private') {
    return; // /private 页面走原生表单提交，避免被全局逻辑劫持到 /posts
  }
  const keyword = document.getElementById('searchInput')?.value.trim();
  window.location.href = keyword ? POSTS_URL + '?search=' + encodeURIComponent(keyword) : POSTS_URL;
}

// ==================== 轮播（无界平移） ====================
let currentSlide = 0;
let trackIndex = 1;
let slides = [];
let dots = [];
let track = null;
let autoPlayInterval = null;
let isTransitioning = false;
let isResetting = false;

const TRANSITION_MS = 500;
const TRANSITION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const AUTOPLAY_MS = 5000;

function setTrackTransform(index, animate) {
  if (!track) return;
  if (animate) {
    track.style.transition = 'transform ' + TRANSITION_MS + 'ms ' + TRANSITION_EASING;
  } else {
    track.style.transition = 'none';
  }
  track.style.transform = 'translateX(-' + (index * 100) + '%)';
}

document.addEventListener('DOMContentLoaded', function () {
  track = document.getElementById('carouselTrack');
  if (!track) return;

  const realSlides = track.querySelectorAll('.carousel-slide');
  if (realSlides.length === 0) return;
  if (realSlides.length === 1) {
    track.style.transform = 'translateX(0)';
    return;
  }

  // 克隆首尾，实现无界平移
  const firstClone = realSlides[0].cloneNode(true);
  const lastClone = realSlides[realSlides.length - 1].cloneNode(true);
  firstClone.classList.add('clone');
  lastClone.classList.add('clone');
  track.appendChild(firstClone);
  track.insertBefore(lastClone, track.firstChild);

  slides = track.querySelectorAll('.carousel-slide');
  dots = document.querySelectorAll('.dot');

  // 初始位置：从克隆后的真实第一张开始
  setTrackTransform(1, false);
  // 强制 reflow 后再启用 transition
  void track.offsetWidth;
  setTimeout(function () {
    setTrackTransform(1, true);
  }, 50);

  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  if (prevBtn) prevBtn.addEventListener('click', function () { moveSlide(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { moveSlide(1); });

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { goToSlide(i); });
  });

  // 关键修复 1：只处理 track 自己的 transform 事件，过滤子元素冒泡
  track.addEventListener('transitionend', function (e) {
    if (e.target !== track) return;
    if (e.propertyName !== 'transform') return;

    const atRightClone = (trackIndex === slides.length - 1);
    const atLeftClone = (trackIndex === 0);

    if (atRightClone || atLeftClone) {
      // 关键修复 2：重置窗口期锁住点击
      isResetting = true;

      if (atRightClone) {
        trackIndex = 1;
      } else {
        trackIndex = slides.length - 2;
      }

      setTrackTransform(trackIndex, false);
      // 强制 reflow
      void track.offsetWidth;

      setTimeout(function () {
        setTrackTransform(trackIndex, true);
        isResetting = false;
        isTransitioning = false;
      }, 50);
    } else {
      isTransitioning = false;
    }
  });

  updateDots(0);
  startAutoPlay();

  const wrapper = track.closest('.carousel-wrapper');
  if (wrapper) {
    wrapper.addEventListener('mouseenter', stopAutoPlay);
    wrapper.addEventListener('mouseleave', startAutoPlay);
  }

  // 关键修复 3：页面可见性变化时暂停/恢复，防止 setInterval 累积执行
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopAutoPlay();
    } else {
      // 强制中断状态，重置到安全位置
      isTransitioning = false;
      isResetting = false;
      trackIndex = 1;
      setTrackTransform(1, false);
      void track.offsetWidth;
      setTimeout(function () {
        setTrackTransform(1, true);
        startAutoPlay();
      }, 50);
      updateDots(0);
      currentSlide = 0;
    }
  });
});

function moveSlide(direction) {
  if (isTransitioning || isResetting) return;

  // 关键修复 4：越界直接拒绝，交给 transitionend 处理
  const nextIndex = trackIndex + direction;
  if (nextIndex < 0 || nextIndex > slides.length - 1) return;

  isTransitioning = true;
  trackIndex = nextIndex;

  setTrackTransform(trackIndex, true);

  let realIndex;
  if (trackIndex === 0) {
    realIndex = slides.length - 3;
  } else if (trackIndex === slides.length - 1) {
    realIndex = 0;
  } else {
    realIndex = trackIndex - 1;
  }
  currentSlide = realIndex;
  updateDots(realIndex);

  // 关键修复 5：用户手动操作后重置 autoplay 计时
  startAutoPlay();
}

function goToSlide(realIndex) {
  if (isTransitioning || isResetting) return;

  isTransitioning = true;
  trackIndex = realIndex + 1;

  setTrackTransform(trackIndex, true);

  currentSlide = realIndex;
  updateDots(realIndex);

  startAutoPlay();
}

function updateDots(realIndex) {
  if (dots) {
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === realIndex);
    });
  }
}

function startAutoPlay() {
  if (autoPlayInterval) clearInterval(autoPlayInterval);
  autoPlayInterval = setInterval(function () {
    moveSlide(1);
  }, AUTOPLAY_MS);
}

function stopAutoPlay() {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
  }
}

// ==================== 首页 / 隐私页：滚动后切换毛玻璃导航 ====================
(function () {
  var header = document.querySelector('header');
  if (!header || !document.body.classList.contains('has-hero')) return;
  function onScroll() {
    header.classList.toggle('glass-header', window.scrollY > 50);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ==================== Hero：默认全屏 → 下滑收起 / 上滑唤出（1:1 跟手） ====================
(function () {
  var hero = document.getElementById('homeHero') || document.getElementById('privateHero');
  var header = document.querySelector('header');
  var logo = document.querySelector('header .logo');
  if (!hero || !header) return;

  // 【防闪烁】关闭浏览器滚动位置恢复，保证每次进入都从全屏首屏开始
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  var screenH = window.innerHeight;
  var state = 'full';          // full = 全屏（默认） | off = 藏在屏幕上方
  var startY = 0;
  var startX = 0;
  var startTime = 0;
  var dragY = 0;
  var isDragging = false;

  function lock(v) { document.body.style.overflow = v ? 'hidden' : ''; }
  function bg(on) { header.classList.toggle('transparent-header', on); }
  function mark(on) { document.body.classList.toggle('has-hero', on); }

  function toFull() {
    state = 'full';
    hero.style.display = 'flex';
    hero.style.transition = 'transform .4s ease-out';
    hero.style.transform = 'translateY(0)';
    lock(true); bg(true); mark(true);
    header.classList.remove('glass-header');
  }

  function toOff() {
    state = 'off';
    hero.style.display = 'flex';
    hero.style.transition = 'transform .3s ease-out';
    hero.style.transform = 'translateY(-100%)';
    lock(false); bg(false); mark(false);
  }

  // 默认全屏：脚本位于 body 末尾，DOM 已就绪，立即锁定首屏（不等 DOMContentLoaded）
  toFull();
  window.addEventListener('load', function () {
    if (state === 'full') window.scrollTo(0, 0);
  });

  // 1. 点击 Logo：收起状态下重新唤出全屏
  if (logo) {
    logo.addEventListener('click', function (e) {
      // 如果不是首页，允许正常跳转
      if (window.location.pathname !== '/') return;
      
      e.preventDefault(); // 强行拦截
      e.stopPropagation();

      // 如果已经是全屏状态，就不做处理
      if (state === 'full') return;

      hero.style.display = 'flex';
      hero.style.transition = 'none';
      hero.style.transform = 'translateY(-100%)';
      void hero.offsetHeight;   // 强制重排
      toFull();
    });
  }

  // 2. 手势：off 下拉唤出，full 上滑收起（含速度甩动判定）
  window.addEventListener('touchstart', function (e) {
    if (window.scrollY > 10) return;          // 必须在页面顶部

    if (state === 'off') {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragY = -screenH;
      isDragging = true;
      hero.style.transition = 'none';
      startTime = Date.now();
    } else if (state === 'full') {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragY = 0;
      isDragging = true;
      hero.style.transition = 'none';
      startTime = Date.now();
    }
  }, { passive: false });

  window.addEventListener('touchmove', function (e) {
    if (!isDragging) return;

    var deltaX = e.touches[0].clientX - startX;
    var deltaY = e.touches[0].clientY - startY;

    // 横向位移大于纵向 → 判定为侧滑，不拦截
    if (Math.abs(deltaX) > Math.abs(deltaY)) return;

    if (state === 'full') {
      if (deltaY >= 0) return;                // 全屏：只接上滑
      if (e.cancelable) e.preventDefault();
      dragY = Math.max(-screenH, deltaY);     // 1:1 跟手
    } else {
      if (deltaY <= 0) return;                // off：只接下拉
      if (e.cancelable) e.preventDefault();
      dragY = Math.min(0, -screenH + deltaY); // 1:1 跟手唤出
      mark(true); bg(true);
    }
    hero.style.transform = 'translateY(' + dragY + 'px)';
  }, { passive: false });

  window.addEventListener('touchend', function () {
    if (!isDragging) return;
    isDragging = false;
    var timeDiff = Date.now() - startTime;

    if (state === 'full') {
      // 上滑超过 1/4 屏，或 300ms 内甩动超过 30px
      if (dragY < -(screenH / 4) || (timeDiff < 300 && (0 - dragY) > 30)) toOff();
      else toFull();
    } else {
      // 下拉超过 3/4 屏，或 300ms 内甩动超过 30px
      if (dragY > -(screenH * 0.75) || (timeDiff < 300 && (dragY - (-screenH)) > 30)) toFull();
      else toOff();
    }
    dragY = 0;
  });

  // 3. PC端滚轮兼容
  window.addEventListener('wheel', function (e) {
    // 收起后只要回到页面顶部继续向上滚，就能重新唤出首屏
    if (state === 'off' && window.scrollY <= 10 && e.deltaY < 0) {
      if (e.cancelable) e.preventDefault();
      
      hero.style.display = 'flex';
      hero.style.transition = 'none';
      hero.style.transform = 'translateY(-100%)';
      void hero.offsetHeight; // 强制重排
      toFull(); // 触发全屏动画
      return; // 结束
    }

    // 收起 Hero：如果现在是全屏状态，向下滚直接收起！
    if (state === 'full' && e.deltaY > 0) {
      if (e.cancelable) e.preventDefault();
      toOff(); // 触发收起动画
    }
  }, { passive: false });

  window.addEventListener('resize', function() {
    screenH = window.innerHeight;
  });
})();