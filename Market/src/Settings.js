const DEBUG = false;
const DEBUG_BUY = DEBUG || false;
const DEBUG_ORDER = DEBUG || false;

/**
 * Настройки
 */
const settings = {
	/**
	 * Баланс пользователя
	 *
	 * @type {{date: number, balance: number}}
	 */
	balance: {},
	/**
	 * Минимальный профит от покупки в зависимости от цены предмета
	 *
	 * @param {number} sum - Цена покупки
	 * @returns {number} - Минимальный процент профита для покупки
	 */
	minProfitBuy: (sum) =>
	{
		if (sum <= 10)
			return settings.percentsBuy[0];
		else if (sum <= 300)
			return settings.percentsBuy[1];
		else if (sum <= 700)
			return settings.percentsBuy[2];
		else if (sum <= 1000)
			return settings.percentsBuy[3];
		else
			return settings.percentsBuy[4];
	},

	//------------ Orders ------------
	/**
	 * Минимальный профит от покупки в зависимости от цены предмета
	 *
	 * @param {number} sum - Цена покупки
	 * @returns {number} - Минимальный процент профита для покупки
	 */
	minProfitOrder: (sum) =>
	{
		if (sum <= 10)
			return settings.percentsOrder[0];
		else if (sum <= 300)
			return settings.percentsOrder[1];
		else if (sum <= 700)
			return settings.percentsOrder[2];
		else if (sum <= 1000)
			return settings.percentsOrder[3];
		else
			return settings.percentsOrder[4];
	 },
};

/**
 * Задержка до удаления сообщения об ошибке
 *
 * @type {number}
 */
const timeoutHideMessage = 60 * 1000;

// Загрузка и ожидание изменений в бд общих настроек
await firestore.collection("global_settings").onSnapshot((settingsData) => {
	settingsData.forEach(setting => {
		settings[setting.id] = setting.data().value;
	});
});

// Загрузка и ожидание изменений в бд настроек для покупок
await firestore.collection("buy_settings").onSnapshot((settingsData) => {
	settingsData.forEach(setting => {
		if (setting.id !== 'minProfitBuy') {
			settings[setting.id] = setting.data().value;
		} else {
			settings.percentsBuy = setting.data().percents.map(percent => percent.value);
		}
	});
});

// Загрузка и ожидание изменений в бд настроек для заказов
await firestore.collection("order_settings").onSnapshot((settingsData) => {
	settingsData.forEach(setting => {
		if (setting.id !== 'minProfitOrder') {
			settings[setting.id] = setting.data().value;
		} else {
			settings.percentsOrder = setting.data().percents.map(percent => percent.value);
		}
	});
});
