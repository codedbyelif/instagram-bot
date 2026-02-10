const cron = require('node-cron');

/**
 * Schedules distributed background checks every 30 minutes.
 * @param {function} checkCallback - The function to execute batch checks.
 */
function scheduleDistributedChecks(checkCallback) {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', () => {
        console.log('Arka plan kontrolü çalıştırılıyor (Her 30 dakikada bir)...');
        checkCallback();
    });
}

/**
 * Schedules the daily report.
 * @param {string} timeString - Report time (HH:MM).
 * @param {function} reportCallback - Function to generate and send report.
 */
function scheduleDailyReport(timeString, reportCallback) {
    const [hour, minute] = timeString.split(':');

    if (!hour || !minute || isNaN(hour) || isNaN(minute)) {
        console.error('Geçersiz saat formatı. Lütfen HH:MM formatını kullanın.');
        return;
    }

    const cronExpression = `${minute} ${hour} * * *`;
    console.log(`${timeString} saatine günlük rapor planlanıyor (Avrupa/İstanbul saati)`);

    cron.schedule(cronExpression, () => {
        console.log('Günlük rapor hazırlanıyor...');
        reportCallback();
    }, {
        scheduled: true,
        timezone: "Europe/Istanbul"
    });
}

module.exports = { scheduleDistributedChecks, scheduleDailyReport };
