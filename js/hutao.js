// ===== 生日倒计时：7月15日 =====
(function() {
    const BIRTHDAY_MONTH = 7;
    const BIRTHDAY_DAY = 15;

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    function getNextBirthday() {
        const now = new Date();
        let year = now.getFullYear();
        let birthday = new Date(year, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY);
        if (now > birthday) {
            birthday = new Date(year + 1, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY);
        }
        return birthday;
    }

    function updateCountdown() {
        const now = new Date();
        const next = getNextBirthday();
        const diff = Math.max(0, next - now);

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
})();