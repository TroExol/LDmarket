/**
 * Информация о предметах
 *
 * @type {{name: string}}
 */
const itemsInfo = {};

/**
 * История продаж предметов с ключом по id предмета
 *
 * @type {{date: number, history: SellHistoryType}}
 */
const sellHistories = {};

/**
 * @typedef {object} ItemsOrdersType
 * @property {{date: number, orders: {selling: {number: number, percent: number, price: {currency: string, amount: number, caption: string}}[]}, buying: {number: number, percent: number, price: {currency: string, amount: number, caption: string}}[]}}}
 */

/**
 * Запросы на продажу и покупку предметов с ключом по id предмета
 *
 * @type {ItemsOrdersType}
 */
let itemsOrders = {};

// noinspection JSMismatchedCollectionQueryUpdate
/**
 * Черный список для покупок
 *
 * @type {string[]}
 */
const blackList = [];

/**
 * Находится ли предмет в черном списке
 *
 * @param {string} name - Название предмета
 * @returns {boolean}
 */
const isBlackList = (name) =>
{
	return blackList.some(blackListName => name.includes(blackListName));
};

/**
 * Проверка, что профит удовлетворяет настройкам
 *
 * @param {number} profit - Профит
 * @param {number} minProfit - Минимальный профит
 * @returns {boolean}
 */
const checkProfit = (profit, minProfit) => profit >= minProfit;

/**
 * Получение баланса пользователя
 */
async function getBalance()
{
	/**
	 * Баланс пользователя
	 *
	 * @type {number}
	 */
	let balance;

	// Получение баланса
	// Если баланс был получен в течении 10 минут
	if (settings.balance.date && settings.balance.date >= new Date().getTime() - 10 * 60 * 1000)
	{
		balance = settings.balance.balance;
	} else
	{
		/**
		 * Информация о пользователе
		 *
		 * @type {{balance: {currency: string, amount: number, caption: string}}}
		 */
		const userInfo = await Sender.get(Url.userInfo())
		.catch((e) =>
		{
			showMessage({
				message: 'Не удалось получить информацию о пользователе',
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить информацию о пользователе', e);
		});
		const myBalance = userInfo && userInfo.balance && userInfo.balance.amount;

		if (!myBalance)
		{
			showMessage({
				message: 'Не удалось получить баланс пользователя', color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить баланс пользователя');

			balance = settings.balance.balance;
		} else
		{
			balance = myBalance;
			settings.balance.balance = myBalance;
			settings.balance.date = new Date().getTime();
		}
	}

	return balance;
}

/**
 * Получение списка ордеров на предмет
 *
 * @param {ItemType} item - Предмет
 * @returns {Promise<ItemsOrdersType | undefined>}
 */
async function getItemOrders(item)
{
	const {id, name} = item;

	// Получение списка ордеров
	// Если список не был получен в течении 1 минуты
	if (!itemsOrders[id] || itemsOrders[id].date < new Date().getTime() - 60 * 1000)
	{
		const itemOrdersInfo = await Sender.get(Url.itemOrdersInfo(id))
		.catch((e) =>
		{
			showMessage({
				message: 'Не удалось получить информацию о заказах предмета',
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить информацию о заказах предмета', e);
		});;

		// Проверка, что список предметов на продаже получен
		if (!itemOrdersInfo)
		{
			showMessage({
				message: `Проверка предмета ${name}
						Не удалось получить список предметов на продаже`,
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error(`Проверка предмета ${name}` +
				'\nНе удалось получить список предметов на продаже');
			sendPushover('LD.market', `Проверка предмета ${name}\nНе удалось получить список предметов на продаже`);
			return undefined;
		}

		itemsOrders[id] = {};
		itemsOrders[id].orders = itemOrdersInfo;
		itemsOrders[id].date = new Date().getTime();
	}

	return itemsOrders[id];
}

/**
 * Получение информации о предмете
 *
 * @param {number} id - ID предмета
 * @returns {Promise<object>}
 */
async function getItemInfo(id) {
	if (!itemsInfo[id]) {
		const itemInfo = await Sender.get(Url.itemInfo(id))
		.catch((e) =>
		{
			showMessage({
				message: 'Не удалось получить информацию о предмете',
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить информацию о предмете', e);
		});

		if (itemInfo) {
			itemsInfo[id] = {};
			itemsInfo[id].name = itemInfo.name;
		}
	}

	return itemsInfo[id];
}

/**
 * Получение истории продаж предмета
 *
 * @param {ItemType} item - Предмет
 * @returns {Promise<SellHistoryType>}
 */
async function getSellHistory(item) {
	// Если была получена история продаж в течении 4 часов
	if (!sellHistories[item.id] || sellHistories[item.id].date < new Date().getTime() - 2 * 60 * 60 * 1000)
	{
		sellHistories[item.id] = {};
		sellHistories[item.id].history = await item.getSellHistory();
		sellHistories[item.id].date = new Date().getTime();
	}

	return sellHistories[item.id].history;
}

/**
 * Проверка стоимости предмета
 *
 * @param {number} buyPrice - Цена покупки
 * @param {number} minCost - Минимальная цена покупки
 * @param {number} maxCost - Максимальная цена покупки
 * @param {number} balance - Баланс пользователя
 * @returns {boolean}
 */
const checkItemCost = (buyPrice, minCost, maxCost, balance) =>
	buyPrice >= minCost && buyPrice <= maxCost && buyPrice <= balance;

/**
 * Проверка на количество таких же предметов у пользователя
 *
 * @param {number} id - ID предмета
 * @param {number} countMaxSameItems - Максимальное кол-во таких же предметов
 * @returns {Promise<boolean>}
 */
const checkCountSameItems = async (id, countMaxSameItems) =>
{
	/**
	 * Кол-во таких же предметов в инвентаре
	 *
	 * @type {number}
	 */
	let countSameItems = 0;

	let page = 1;
	let myOnSells;
	do
	{
		myOnSells = await Sender.get(Url.myOnSells(page))
		.catch((e) =>
		{
			showMessage({
				message: 'Не удалось получить список предметов на продаже',
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить список предметов на продаже', e);
		});

		// Не удалось получить список предметов на продаже
		if (!myOnSells)
		{
			return false;
		}

		for(const item of myOnSells.results)
		{
			if (id !== item.product.id)
			{
				continue;
			}

			countSameItems += 1;
		}

		page++;
	} while(myOnSells.next);

	page = 1;
	let myInventory;
	do
	{
		myInventory = await Sender.get(Url.myInventory(page))
		.catch((e) =>
		{
			showMessage({
				message: 'Не удалось получить инвентарь',
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить инвентарь', e);
		});

		// Не удалось получить инвентарь
		if (!myInventory)
		{
			return false;
		}

		for(const item of myInventory.results)
		{
			if (id !== item.product.id)
			{
				continue;
			}

			countSameItems += 1;
		}

		page++;
	} while(myInventory.next);

	return countSameItems < countMaxSameItems;
};

/**
 * Проверка, что кол-во цен на продаже удовлетворяет настройкам, если такая настройка указана
 *
 * @param {ItemType} item - Предмет
 * @param {number} minProfit - Минимальный профит
 * @param {number} countMaxNotProfitOrders - Максимальное количество не профитных предметов
 * @returns {Promise<boolean>}
 */
const isMaxNotProfitOrdersLess = async (item, minProfit, countMaxNotProfitOrders) =>
{
	if (settings.countMaxNotProfitOrders > 0)
	{
		const {name, amount} = item;

		/**
		 * Список ордеров на предмет
		 *
		 * @type {ItemsOrdersType | undefined}
		 */
		const itemOrders = await getItemOrders(item);

		if (itemOrders === undefined)
		{
			return false;
		}

		// noinspection JSValidateTypes
		/**
		 * Кол-во выставленных продаж с невыгодной ценой
		 *
		 * @type {number}
		 */
		const countNotProfitOrders = itemOrders.orders.selling.reverse()
		.reduce((countNotProfitOrders, currentOrder) =>
		{
			const profit = calcProfit(amount, currentOrder.price.amount);

			if (profit === undefined)
			{
				showMessage({
					message: `Проверка предмета ${name}
							Не удалось вычислить профит выставленной продажи с ценой ${currentOrder.price.amount}`,
					color: warningColor, timeout: timeoutHideMessage,
				});
				console.log(`Проверка предмета ${name}` + '\n' +
					`Не удалось вычислить профит выставленной продажи с ценой ${currentOrder.price.amount}`);
				return (countNotProfitOrders + currentOrder.number);
			}

			if (profit < minProfit)
			{
				return (countNotProfitOrders + currentOrder.number);
			}

			return countNotProfitOrders;
		}, 0);

		// Проверка, что неудовлетворяющих цен на продаже меньше указанного в настройках
		if (countNotProfitOrders > countMaxNotProfitOrders)
		{
			showMessage({
				message: `Проверка предмета ${name}
						Выставлено много продаж с невыгодной ценой (${countNotProfitOrders} шт.)`,
				color: warningColor,
				timeout: timeoutHideMessage,
			});
			if (DEBUG)
			{
				console.log(`Проверка предмета ${name}` + '\n' +
					`Выставлено много продаж с невыгодной ценой (${countNotProfitOrders} шт.)`);
			}

			return false;
		}

		return true;
	}
};
