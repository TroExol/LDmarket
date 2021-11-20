// ==UserScript==
// @name         LD.market
// @version      1.0.0
// @author       TroExol
// @match        https://lootdog.io/*
// ==/UserScript==

const DEBUG = false;
const DEBUG_BUY = DEBUG || false;
const DEBUG_ORDER = DEBUG || false;

/**
 * Настройки
 */
const settings = {
	/**
	 * Включена ли покупка
	 *
	 * @type {boolean}
	 */
	isBuyEnabled: true,
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
			return 15;
		else if (sum <= 300)
			return 10;
		else if (sum <= 700)
			return 8;
		else if (sum <= 1000)
			return 8;
		else
			return 7;
	},
	/**
	 * Комиссия маркета
	 *
	 * @type {number}
	 */
	commission: 15,
	/**
	 * Минимальная стоимость покупки
	 *
	 * @type {number}
	 */
	minCostBuy: 0,
	/**
	 * Максимальная стоимость покупки
	 *
	 * @type {number}
	 */
	maxCostBuy: 1500,
	/**
	 * Максимальное кол-во невыгодных предметов на продаже, если больше, то не покупать. Максимальное значение 4
	 *
	 * @type {number}
	 */
	countMaxNotProfitOrders: 2,
	/**
	 * Кол-во дней, которых прошло с появления предмета
	 *
	 * @type {number}
	 */
	daysWent: 15,
	/**
	 * Кол-во дней для анализа продаж
	 *
	 * @type {number}
	 */
	daysSells: 8,
	/**
	 * Кол-во продаж за 3 дня, если >=, то среднюю цену брать за 3 дня
	 *
	 * @type {number}
	 */
	countSalesByThreeDays: 90,
	/**
	 * Максимальное количество одинаковых предметов для покупки
	 *
	 * @type {number}
	 */
	countMaxSameItemsToBuy: 2,
	/**
	 * Минимальное количество продаж за неделю
	 *
	 * @type {number}
	 */
	minSalesByWeek: 20,

	//------------ Orders ------------
	/**
	 * Включены ли заказы
	 *
	 * @type {boolean}
	 */
	isOrderEnabled: true,
	/**
	 * Минимальный профит от покупки в зависимости от цены предмета
	 *
	 * @param {number} sum - Цена покупки
	 * @returns {number} - Минимальный процент профита для покупки
	 */
	minProfitOrder: (sum) =>
	{
		if (sum <= 10)
			return 40;
		else if (sum <= 300)
			return 20;
		else if (sum <= 700)
			return 15;
		else if (sum <= 1000)
			return 11;
		else
			return 10;
	},
	/**
	 * Минимальная стоимость заказа
	 *
	 * @type {number}
	 */
	minCostOrder: 100,
	/**
	 * Максимальная стоимость заказа
	 *
	 * @type {number}
	 */
	maxCostOrder: 1500,
	/**
	 * Максимальное количество ордеров
	 *
	 * @type {number}
	 */
	maxOrders: 20,
	/**
	 * Максимум страниц для просмотра предметов
	 *
	 * @type {number}
 	 */
	maxPages: 3,
	/**
	 * Интервал для перевыставления ордера для перебивания других пользователей (в минутах)
	 *
	 * @type {number}
	 */
	intervalToReOrder: 15,
	/**
	 * Интервал для создания ордеров
	 *
	 * @type {number}
	 */
	intervalToCreateOrders: 15,
	/**
	 * Максимальное количество одинаковых предметов для заказа
	 *
	 * @type {number}
	 */
	countMaxSameItemsToOrder: 1,
};

// noinspection JSMismatchedCollectionQueryUpdate
/**
 * Черный список для покупок
 *
 * @type {string[]}
 */
const blackList = [];

/**
 * Отправка сообщений в Pushover
 *
 * @param {string} title - Заголовок сообщения
 * @param {string} message - Текст сообщения
 * @param {number} priority - Приоритет сообщения
 * @param {string} sound - Звук сообщения
 */
const sendPushover = (title, message, priority = -1, sound = 'pushover') =>
{
	const formData = new FormData();
	formData.append('token', 'asut8ef3yeqi13xeyu6h1fuznvoegs');
	formData.append('user', 'uqaa2eubah1hc4228c6pw816ar4nhc');
	formData.append('title', title);
	formData.append('message', message);
	formData.append('priority', priority.toString());
	formData.append('sound', sound);
	fetch('https://api.pushover.net/1/messages.json', {
		method: 'post',
		body: formData,
	});
};

const successColor = 'green';
const warningColor = '#c4b512';
const errorColor = 'red';

/**
 * Показ сообщения
 *
 * @param {string} message - Сообщение
 * @param {string} [color='white'] - Цвет текста
 * @param {number} [timeout=3000] - Время в милисекундах до удаления сообщения
 */
const showMessage = ({message, color = 'white', timeout = 3000}) =>
{
	const messageBlock = document.createElement('div');
	messageBlock.style.color = color;
	messageBlock.style.fontSize = '13px';
	messageBlock.style.padding = '15px 15px 15px 15px';
	messageBlock.style.marginBottom = '5px';
	messageBlock.style.borderRadius = '4px';
	messageBlock.style.backgroundColor = 'rgba(0,0,0,.6)';
	messageBlock.innerText = message;
	messageBlock.style.cursor = 'pointer';
	messageBlock.addEventListener('click', messageBlock.remove);

	document.querySelector('#tr_messageDiv').appendChild(messageBlock);

	setTimeout(() => messageBlock.remove(), timeout);
};

/**
 * Ссылки
 */
const Url = {
	/**
	 * @param {number} id - ID предмета
	 * @returns {string} - Ссылка на историю продажи предмета
	 */
	sellHistory: (id) => `https://lootdog.io/api/products/${id}/average_price_stats/?format=json&id=${id}&currency=RUB`,
	/**
	 * @param {number} id - ID предмета
	 * @returns {string} - Ссылка на информацию о предмете
	 */
	itemInfo: (id) => `https://lootdog.io/api/products/${id}/?format=json&id=${id}`,
	/**
	 * @param {number} id - ID предмета
	 * @returns {string} - Ссылка на информацию о ценах пердмета
	 */
	itemCostInfo: (id) => `https://lootdog.io/api/products/${id}/market_info/?format=json&id=${id}`,
	/**
	 * @param {number} id - ID предмета
	 * @returns {string} - Ссылка на информацию о запросах пердмета на покупку/продажу
	 */
	itemOrdersInfo: (id) => `https://lootdog.io/api/products/${id}/depth_of_market_stats/?format=json&id=${id}&currency=RUB`,
	/**
	 * @returns {string} - Ссылка на информацию о пользователе
	 */
	userInfo: () => 'https://lootdog.io/api/current_user/?format=json',
	/**
	 * @param {number} page - Страница
	 * @returns {string} - Ссылка на инвентарь
	 */
	myOnSells: (page) => `https://lootdog.io/api/orders/?format=json&is_buy=0&kind=&sorting=date&page=${page}&limit=20`,
	/**
	 * @param {number} page - Страница
	 * @returns {string} - Ссылка на инвентарь
	 */
	myInventory: (page) => `https://lootdog.io/api/user_inventory/?format=json&status=remaining&limit=35&page=${page}`,
	/**
	 * @returns {string} - Ссылка для запроса покупки
	 */
	buy: () => 'https://lootdog.io/api/instant_buy/',
	/**
	 * @returns {string} - Ссылка для запроса продажи
	 */
	sell: () => 'https://lootdog.io/api/orders/',
	/**
	 * @returns {string} - Ссылка на вебсокет LootDog
	 */
	ldWebSocket: () => 'wss://lootdog.io/connection/websocket',
	/**
	 * @returns {string} - Ссылка на список предметов на торговой площадке
	 */
	items: () => 'https://lootdog.io/api/products',
	/**
	 * @returns {string} - Ссылка на список ордеров
	 */
	buyBooks: () => 'https://lootdog.io/api/buybooks/',
	/**
	 * @returns {string} - Ссылка на удаление ордера
	 */
	removeOrder: () => 'https://lootdog.io/api/buybooks/close/',
};

/**
 * Класс для отправки запросов
 */
class Sender
{
	static connectWS()
	{
		// ID запроса на сервер
		let uidPing = 3;
		let socket = new WebSocket(Url.ldWebSocket());
		// Интервал для отправки пинга на сервер
		let pingInterval;

		// При открытии вебсокета
		socket.addEventListener('open', function()
		{
			socket.send(JSON.stringify({
				'method': 'connect',
				'params': {
					'user': '',
					'info': '',
					'timestamp': '1616961631',
					'token': '7ed06e5ac700ea84e0af417ac0855b17a9fd32ee77cf4a3a586c37bdd82f0569',
				},
				'uid': '1',
			}));
			// Отправка пинга на сервер каждые 30 секунд
			pingInterval = setInterval(() =>
			{
				socket.send(JSON.stringify({method: 'ping', uid: uidPing.toString()}));
				uidPing++;
			}, 30000);
		});

		// При закрытии вебсокета
		socket.addEventListener('close', () =>
		{
			clearInterval(pingInterval);
			Sender.connectWS();
		});

		// При получении сообщения
		socket.addEventListener('message', async (event) =>
		{
			const data = JSON.parse(event.data);
			if (data.method === 'connect')
			{
				socket.send(JSON.stringify({
					method: 'subscribe',
					params: {channel: 'public:broadcast'},
					uid: '2',
				}));
			} else if (data.method === 'message' &&
				data.body.data.type === 'product_price_changed' &&
				data.body.best_order_id !== '')
			{
				const item = new Item(data.body.data.product, -1, data.body.data.price.RU.RUB.amount,
					'', data.body.data.best_order_id);
				let itemInfo;

				if (!itemsInfo[item.id]) {
					itemInfo = await Sender.get(Url.itemInfo(item.id));

					if (itemInfo) {
						itemsInfo[item.id] = {};
						itemsInfo[item.id].name = itemInfo.name;
					}
				} else {
					itemInfo = itemsInfo[item.id];
				}

				item.name = itemInfo && itemInfo.name;

				await item.checkItemToBuy();
			}
		});
	}

	/**
	 * GET запрос
	 *
	 * @param {string} path - Ссылка для запроса
	 * @param {object=} params - Параметры запроса
	 * @returns {Promise<object>} - Результат запроса
	 */
	static get(path, params = {})
	{
		return new Promise((resolve, reject) =>
		{
			let url = new URL(path);

			// Добавление параметров
			try
			{
				Object.entries(params).forEach(([key, value = '']) =>
				{
					if ({}.hasOwnProperty.call(params, key))
					{
						url.searchParams.append(key, value);
					}
				});
			} catch(e)
			{
				reject(e);
			}

			// Отправка запроса
			fetch(url.toString())
			.then((res) =>
			{
				if (res.status >= 200 && res.status < 300)
				{
					return res.json();
				} else if (res.status === 403 && res.json().code === 'SecondFactorNeeded')
				{
					console.warn('Необходимо авторизоваться через телефон');
					sendPushover('LD.marketWS', 'Необходимо авторизоваться через телефон');
					showMessage({
						message: 'Необходимо авторизоваться через телефон',
						color: errorColor,
						timeout: 30000,
					});
				}
				reject(res);
			})
			.then(resolve)
			.catch(reject);
		});
	}

	/**
	 * POST запрос
	 *
	 * @param {string} path - Ссылка для запроса
	 * @param {object=} params - Параметры запроса
	 * @returns {Promise<object>} - Результат запроса
	 */
	static post(path, params = {})
	{
		const getCSRF = () =>
		{
			const matches = document.cookie.match(new RegExp('(?:^|; )csrftoken=([^;]*)'));
			return matches.length > 1 ? decodeURIComponent(matches[1]) : undefined;
		};

		return new Promise((resolve, reject) =>
		{
			let paramsList = new URLSearchParams();

			try
			{
				Object.entries(params).forEach(([key, value = '']) =>
				{
					if ({}.hasOwnProperty.call(params, key))
					{
						paramsList.append(key, value);
					}
				});
			} catch(e)
			{
				reject(e);
			}

			fetch(path, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-CSRFToken': getCSRF(),
				},
				body: paramsList,
			})
			.then((res) =>
			{
				if (res.status >= 200 && res.status < 300)
				{
					return res.json();
				} else if (res.status === 403 && res.json().code === 'SecondFactorNeeded')
				{
					console.warn('Необходимо авторизоваться через телефон');
					sendPushover('LD.marketWS', 'Необходимо авторизоваться через телефон');
					showMessage({
						message: 'Необходимо авторизоваться через телефон',
						color: errorColor,
						timeout: 30000,
					});
				}
				reject(res);
			})
			.then(resolve)
			.catch(reject);
		});
	}
}

/**
 * Удаление верхних выбросов из выборки
 *
 * @param {number[]} numbers - Массив чисел
 * @returns {number[]} - Массив без выбросов
 */
const removeOutliers = (numbers) =>
{
	// Клонируем массив
	const values = numbers.concat();

	// Сортируем
	values.sort(function(a, b)
	{
		return a - b;
	});

	const q1 = values[Math.floor((values.length / 4))];
	const q3 = values[Math.ceil((values.length * (3 / 4))) - 1];
	const iqr = q3 - q1;

	const maxValue = q3 + iqr * 1.5;
	// const minValue = q1 - iqr*1.5;

	return values.filter(function(x)
	{
		// return (x <= maxValue) && (x >= minValue);
		return (x <= maxValue);
	});
};

/**
 * Вычисление профита
 *
 * @param {number} buy - Цена покупки
 * @param {number} sell - Цена продажи
 * @returns {number} - Профит в %
 */
const calcProfit = (buy, sell) => Math.round(((sell * (1 - settings.commission / 100) - buy) / buy) * 100);

/**
 * Вычисление стандартного отклонения
 *
 * @param {number[]} array - массив чисел
 * @param {(number|null)} [average=null] - средняя
 * @returns {number} - стандартное отклонение
 */
const calculateStandardDeviation = (array, average = null) =>
{
	const length = array.length;

	if (average == null)
	{
		average = array.reduce((sum, value) => sum + value, 0) / length;
	}
	const squareOfDistance = array
	.map(num =>
	{
		let distance = num - average;
		return distance * distance;
	})
	.reduce((sum, value) => sum + value);

	const numToSQRT = squareOfDistance / length;
	let standardDeviation;
	if (numToSQRT >= 0)
	{
		standardDeviation = Number(Math.sqrt(numToSQRT).toFixed(2));
	}
	return standardDeviation;
};

/**
 * Распределение Стьюдента с n степенями свободы
 *
 * @param {number} n - Степень свободы
 * @returns {number} - Квантиль
 */
const getStudentDistribution = (n) =>
{
	const table = [
		12.71,
		4.3,
		3.18,
		2.78,
		2.57,
		2.45,
		2.36,
		2.31,
		2.26,
		2.23,
		2.2,
		2.18,
		2.16,
		2.14,
		2.13,
		2.12,
		2.11,
		2.1,
		2.09,
		2.09,
		2.08,
		2.07,
		2.07,
		2.06,
		2.06,
		2.06,
		2.05,
		2.05,
		2.05,
		2.04,
		2.04,
		2.04,
		2.03,
		2.03,
		2.03,
		2.03,
		2.03,
		2.02,
		2.02,
		2.02,
		2.02,
		2.02,
		2.02,
		2.02,
		2.01,
		2.01,
		2.01,
		2.01,
		2.01,
		2.01,
		2.01,
		2.01,
		2.01,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.99,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.98,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.97,
		1.96
	];

	return n <= 200 ? table[n - 1] : table[table.length - 1];
};

/**
 * Вычисление доверительного интервала
 *
 * @param {number[]} array - Массив чисел
 * @param {number} average - Средняя
 * @returns {number} - Значение доверительного интервала
 */
const confInterval = (array, average) =>
{
	const zLevel975 = getStudentDistribution(array.length > 1 ? array.length - 1 : 1);
	return zLevel975 * calculateStandardDeviation(array, average) / Number(Math.sqrt(array.length));
};

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
 * Запросы на продажу и покупку предметов с ключом по id предмета
 *
 * @type {{date: number, orders: {selling: {number: number, percent: number, price: {currency: string, amount: number, caption: string}}[]}, buying: {number: number, percent: number, price: {currency: string, amount: number, caption: string}}[]}}}
 */
let itemsOrders = {};

/**
 * Предмет с маркета LootDog
 */
class Item
{
	/**
	 * Предмет
	 * @typedef {object} ItemType
	 * @property {number} id - ID предмета
	 * @property {number} popularity - Популярность предмета
	 * @property {number} amount - Цена поупки
	 * @property {string} name - Название предмета
	 * @property {string} bestOrderId - ID ордера на самую дешевую продажу
	 */

	/**
	 * @param {number} id - ID предмета
	 * @param {number} popularity - Популярность предмета
	 * @param {number} amount - Цена поупки
	 * @param {string} name - Название предмета
	 * @param {string} bestOrderId - ID ордера на самую дешевую продажу
	 * @return {ItemType} - Предмет
	 */
	constructor(id, popularity, amount, name, bestOrderId)
	{
		this.id = id;
		this.popularity = popularity;
		this.amount = amount;
		this.name = name;
		this.bestOrderId = bestOrderId;
	}

	/**
	 * Элементы истории о продажах
	 * @typedef {object} PriceHistoryType
	 * @property {number} point - Дата продажи (unix timestamp / 1000)
	 * @property {number} count_sales - Кол-во продаж по какой-то цене
	 * @property {number} price - Цена продажи
	 */

	/**
	 * История о продажах предмета
	 * @typedef {object} SellHistoryType
	 * @property {Array<PriceHistoryType>} by_all_time - Продажи за все время (возможны пропуски продаж)
	 * @property {Array<PriceHistoryType>} by_month - Продажи за месяц
	 * @property {Array<PriceHistoryType>} by_week - Продажи за неделю
	 */

	/**
	 * Получение истории продаж
	 *
	 * @returns {(Promise<SellHistoryType>|Promise<{error: boolean, text: string, exception: string}>)} - История продаж
	 */
	async getSellHistory()
	{
		return await Sender.get(Url.sellHistory(this.id)).catch((e) => ({
			error: true,
			text: 'Не удалось получить историю покупок предмета ' + this.id,
			exception: e,
		}));
	}

	/**
	 * Покупки предмета
	 *
	 * @returns {Promise<Object>} - Результат запроса
	 */
	async buy()
	{
		return await Sender.post(Url.buy(), {
			order: this.bestOrderId,
			buy_price: this.amount,
			source: 'buying.popular',
			is_gift: false,
		});
	}

	/**
	 * Продажа предмета
	 *
	 * @param {(number|string)} transactionItemId - ID предмета из транзакции покупки
	 * @param {(number|string)} price - Цена продажи
	 * @returns {Promise<Object>} - Результат запроса
	 */
	async sell(transactionItemId, price)
	{
		return await Sender.post(Url.sell(), {
			is_buy: false,
			item: transactionItemId,
			price_val: Number(price).toFixed(2),
		});
	}

	/**
	 * Получает среднюю цену продаж за определенный период
	 *
	 * @param {(number|null)} [days=null] - За сколько дней считать среднюю цену
	 * @returns {number} - Средняя цена продажи
	 */
	async getAverageByWeek(days = null)
	{
		/**
		 * История продаж
		 *
		 * @type {SellHistoryType}
		 */
		let sellHistory;

		// Получение истории продаж
		// Если была получена история продаж в течении 4 часов
		if (sellHistories[this.id] && sellHistories[this.id].date >= new Date().getTime() - 2 * 60 * 60 * 1000)
		{
			sellHistory = sellHistories[this.id].history;
		} else
		{
			sellHistory = await this.getSellHistory();
			sellHistories[this.id] = {};
			sellHistories[this.id].history = sellHistory;
			sellHistories[this.id].date = new Date().getTime();
		}

		if (!sellHistory || sellHistory.error)
		{
			console.log('Не удалось получить историю продаж', sellHistory.text, sellHistory.exception);
			return -1;
		}

		// Проверка, что предмет недавно появился на тп
		if (!sellHistory.by_all_time || !sellHistory.by_all_time[0] ||
			new Date().getTime() - sellHistory.by_all_time[0].point * 1000 < settings.daysWent * 24 * 60 * 60 * 1000)
		{
			showMessage({
				message: `Проверка предмета ${this.name} с ценой покупки ${this.amount}
					Предмет недавно появился на маркете, его стоит избегать`,
				color: warningColor,
				timeout: 15000,
			});
			return -1;
		}

		// Проверка наличия покупок за неделю
		if (!sellHistory.by_week || !sellHistory.by_week[0])
		{
			showMessage({
				message: `Проверка предмета ${this.name} с ценой покупки ${this.amount}
					Нет продаж за неделю`, color: warningColor, timeout: 15000,
			});
			return -1;
		}

		/**
		 * Количество продаж за неделю
		 *
		 * @type {number}
		 */
		const countSalesByWeek = sellHistory.by_week.reduce((count, price) => count + price.count_sales, 0);

		if (countSalesByWeek < settings.minSalesByWeek)
		{
			showMessage({
				message: `Проверка предмета ${this.name} с ценой покупки ${this.amount}
					Количество продаж за неделю меньше, указанного в настройках`, color: warningColor, timeout: 15000,
			});
			return -1;
		}

		// Получение кол-ва продаж за 3 дня
		const countSalesByThreeDays = sellHistory.by_week
		.filter(({point}) => point * 1000 > new Date().getTime() - 3 * 24 * 3600000)
		.reduce((count, price) => count + price.count_sales, 0);

		// Продажи за определенный период или за 3 дня
		const numbers = sellHistory.by_week
		.filter(({point}) => days === null ||
			point * 1000 >=
			new Date().getTime() - (countSalesByThreeDays > settings.countSalesByThreeDays ? 3 : days) * 24 * 3600000)
		.reduce((acc, number) =>
		{
			for(let i = 0; i < number.count_sales; i++)
				acc.push(number.price);

			return acc;
		}, []);

		// Если нет подходящих продаж за неделю
		if (numbers.length < 1)
		{
			return -1;
		}

		/**
		 * Продажи без выбросов
		 *
		 * @type {number[]}
		 */
		const numbersWithoutOutliers = removeOutliers(numbers);
		/**
		 * Средняя цена продаж
		 *
		 * @type {number}
		 */
		const average = numbersWithoutOutliers.reduce((a, b) => a + b, 0) / numbersWithoutOutliers.length;

		// Если не удалось вычислить среднюю
		if (!isFinite(average))
		{
			if (DEBUG)
			{
				console.log(`Средняя цена - бесконечность: ${average}. Предмет ${this.name} с ценой покупки ${this.amount}`);
			}
			return -1;
		}

		const ci = confInterval(numbersWithoutOutliers, average);
		const totalAverage = average - ci;

		// Если не удалось вычислить доверительный диапазон
		if (totalAverage == null || !isFinite(totalAverage))
		{
			if (DEBUG)
			{
				console.log(`Предмет ${this.name} с ценой покупки ${this.amount}: totalAverage is undefined: ${totalAverage}, average: ${average}, ci: ${ci}`,
					numbers,
					numbersWithoutOutliers);
			}

			return -1;
		}

		return totalAverage;
	}

	/**
	 * Проверка выгодности и вычисление цены продажи предмета
	 *
	 * @param {'Buy' | 'Order'} [type='Buy'] - Для чего проверка цены
	 * @returns {Promise<number>} - Если успешно, то число > 0, иначе -1
	 */
	async calcSellPrice(type)
	{
		/**
		 * Задержка до удаления сообщения об ошибке
		 *
		 * @type {number}
		 */
		const timeoutHideMessage = 60 * 1000;
		const {id, amount, name} = this;

		// Проверка на черный список
		if (blackList.findIndex(blackListName => name.includes(blackListName)) !== -1)
		{
			showMessage({
				message: `Проверка предмета ${name} с ценой покупки ${amount}
					Предмет находится в черном списке`, color: warningColor, timeout: timeoutHideMessage,
			});
			return -1;
		}

		/**
		 * Средняя цена продаж за указанный период
		 *
		 * @type {number}
		 */
		const averagePrice = await this.getAverageByWeek(settings.daysSells);

		if (averagePrice < 0)
		{
			return -1;
		}

		const profit = calcProfit(amount, averagePrice);

		// Проверка, что профит получен
		if (profit == null || !isFinite(profit))
		{
			showMessage({
				message: `Проверка предмета ${name} с ценой покупки ${amount}
					Не удалось вычислить профит предмета`, color: warningColor, timeout: timeoutHideMessage,
			});
			console.log(`Проверка предмета ${name} с ценой покупки ${amount}` +
				'\nНе удалось вычислить профит предмета');
			return -1;
		}

		// Проверка, что профит удовлетворяет настройкам
		if (profit < settings[`minProfit${type}`](averagePrice))
		{
			showMessage({
				message: `Проверка предмета ${name} с ценой покупки ${amount}
					Профит меньше указанного в настройках (${profit}%)`,
				color: warningColor,
				timeout: timeoutHideMessage,
			});
			return -1;
		}

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
			const userInfo = await Sender.get(Url.userInfo());
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

		// Проверка стоимости предмета в соответствии с настройками и текущим балансом
		if (amount < settings[`minCost${type}`] || amount > settings[`maxCost${type}`] || amount > balance)
		{
			showMessage({
				message: `Проверка предмета ${name} с ценой покупки ${amount}
					Цена не входит в диапазон покупки или баланс мал`, color: warningColor, timeout: timeoutHideMessage,
			});
			return -1;
		}

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
					timeout: 15000,
				});
				console.error('Не удалось получить список предметов на продаже', e);
			});

			// Не удалось получить список предметов на продаже
			if (!myOnSells)
			{
				return -1;
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
					timeout: 15000,
				});
				console.error('Не удалось получить инвентарь', e);
			});

			// Не удалось получить инвентарь
			if (!myInventory)
			{
				return -1;
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

		if (countSameItems >= settings[`countMaxSameItemsTo${type}`])
		{
			showMessage({
				message: `Проверка предмета ${name} с ценой покупки ${amount}
				Достигнут предел максимального количества одинаковых предметов в инвентаре`,
				color: warningColor,
				timeout: 15000,
			});
			console.log(`Проверка предмета ${name} с ценой покупки ${amount}` +
				'\nДостигнут предел максимального количества одинаковых предметов в инвентаре');
			return -1;
		}

		// Проверка, что кол-во цен на продаже удовлетворяет настройкам, если такая настройка указана
		if (settings.countMaxNotProfitOrders > 0)
		{
			// Получение списка ордеров на продажу
			// Если список не был получен в течении 1 минуты
			if (!itemsOrders[id] || itemsOrders[id].date < new Date().getTime() - 60 * 1000)
			{
				const itemOrdersInfo = await Sender.get(Url.itemOrdersInfo(id));

				// Проверка, что список предметов на продаже получен
				if (!itemOrdersInfo)
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
						Не удалось получить список предметов на продаже`,
						color: errorColor,
						timeout: timeoutHideMessage,
					});
					console.error(`Проверка предмета ${name} с ценой покупки ${amount}` +
						'\nНе удалось получить список предметов на продаже');
					sendPushover('LD.market', `Проверка предмета ${name} с ценой покупки ${amount}\nНе удалось получить список предметов на продаже`);
					return -1;
				}

				itemsOrders[id] = {};
				itemsOrders[id].orders = itemOrdersInfo;
				itemsOrders[id].date = new Date().getTime();
			}

			// noinspection JSValidateTypes
			/**
			 * Кол-во выставленных продаж с невыгодной ценой
			 *
			 * @type {number}
			 */
			const countNotProfitOrders = itemsOrders[id].orders.selling.reverse()
			.reduce((countNotProfitOrders, currentOrder) =>
			{
				const profit = calcProfit(amount, currentOrder.price.amount);

				if (isNaN(profit))
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
							Не удалось вычислить профит выставленной продажи с ценой ${currentOrder.price.amount}`,
						color: warningColor, timeout: timeoutHideMessage,
					});
					console.log(`Проверка предмета ${name} с ценой покупки ${amount}` + '\n' +
						`Не удалось вычислить профит выставленной продажи с ценой ${currentOrder.price.amount}`);
					return (countNotProfitOrders + currentOrder.number);
				}

				if (profit < settings[`minProfit${type}`](averagePrice))
				{
					return (countNotProfitOrders + currentOrder.number);
				}

				return countNotProfitOrders;
			}, 0);

			// Проверка, что неудовлетворяющих цен на продаже меньше указанного в настройках
			if (countNotProfitOrders > settings.countMaxNotProfitOrders)
			{
				showMessage({
					message: `Проверка предмета ${name} с ценой покупки ${amount}
						Выставлено много продаж с невыгодной ценой (${countNotProfitOrders} шт.)`,
					color: warningColor,
					timeout: timeoutHideMessage,
				});
				if (DEBUG)
				{
					console.log(`Проверка предмета ${name} с ценой покупки ${amount}` + '\n' +
						`Выставлено много продаж с невыгодной ценой (${countNotProfitOrders} шт.)`);
				}

				return -1;
			}
		}

		return averagePrice;
	}

	/**
	 * Покупка и продажа предмета, если предмет выгодный
	 *
	 * @returns {Promise<boolean>}
	 */
	async checkItemToBuy()
	{
		if (!settings.isBuyEnabled)
		{
			return false;
		}

		/**
		 * Задержка до удаления сообщения об ошибке
		 *
		 * @type {number}
		 */
		const timeoutHideMessage = 30 * 60 * 1000;

		const {amount, name} = this;

		/**
		 * Цена продажи предмета
		 *
		 * @type {number}
		 */
		const sellPrice = await this.calcSellPrice('Buy');

		if (sellPrice < 0)
		{
			return false;
		}

		const profit = calcProfit(amount, sellPrice);
		/**
		 * Чистый профит в рублях
		 *
		 * @type {string}
		 */
		const profitInRub = Number(sellPrice * (1 - settings.commission / 100) - amount).toFixed(2);

		showMessage({
			message: `Проверка предмета ${name} с ценой покупки ${amount}
					Предмет выгодный +${profitInRub} руб чистыми (${profit}%)`,
			color: successColor,
			timeout: timeoutHideMessage,
		});
		console.log(`Проверка предмета ${name} с ценой покупки ${amount}` +
			`\nПредмет выгодный +${profitInRub} руб чистыми (${profit}%)`);

		if (DEBUG_BUY)
		{
			sendPushover('LD.market', `Проверка предмета ${name} с ценой покупки ${amount}\nПредмет выгодный +${profitInRub} руб чистыми (${profit}%)`);
		}

		if (!DEBUG_BUY)
		{
			// Покупка
			const infoBuy = await this.buy();

			// Если не купили
			if (!infoBuy)
			{
				showMessage({
					message: `Покупка предмета ${name} с ценой покупки ${amount}
			 Не удалось купить предмет, возможно его кто-то купил
			 ${profitInRub} руб чистыми (${profit}%)`,
					color: errorColor,
					timeout: timeoutHideMessage,
				});
				console.log(`Покупка предмета ${name} с ценой покупки ${amount}` +
					'\nНе удалось купить предмет, возможно его кто-то купил\n' +
					`${profitInRub} руб чистыми (${profit}%)`);
				sendPushover('LD.market', `Покупка предмета ${name} с ценой покупки ${amount}\nНе удалось купить предмет, возможно его кто-то купил\n+${profitInRub} руб чистыми (${profit}%)`);
				return false;
			}

			showMessage({
				message: `Покупка предмета ${name} с ценой покупки ${amount}
			 Успешно куплен`, color: successColor, timeout: timeoutHideMessage,
			});
			console.log(`Покупка предмета ${name} с ценой покупки ${amount}` +
				'\nУспешно куплен');

			settings.balance.balance -= amount;

			setTimeout(async () =>
			{
				const sellPriceWithFraction = Number(sellPrice).toFixed(2);

				// Продажа
				let infoSell = this.sell(infoBuy.transaction.item.id, sellPriceWithFraction);

				// Если не продали
				if (!infoSell)
				{
					showMessage({
						message: `Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}
				 Не удалось выставить предмет на продажу`, color: errorColor, timeout: timeoutHideMessage,
					});
					console.log(`Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}` +
						'\nНе удалось выставить предмет на продажу');
					sendPushover('LD.market', `Покупка предмета ${name} с ценой покупки ${amount}\nУспешно куплен, но не выставлен на продажу\n+${profitInRub} руб чистыми (${profit}%)`);
					return false;
				}

				showMessage({
					message: `Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}
					Успешно выставлено на продажу`, color: successColor, timeout: timeoutHideMessage,
				});
				console.log(`Покупка предмета ${name} с ценой продажи ${sellPriceWithFraction}` +
					'Успешно выставлено на продажу');
				sendPushover('LD.market', `Покупка предмета ${name} с ценой покупки ${amount}\nУспешно куплен и выставлен на продажу\n+${profitInRub} руб чистыми (${profit}%)`);
			}, 5000);
		}

		return true;
	}

	/**
	 * Создание ордеров
	 *
	 * @param {boolean} recursive - Рекурсивный вызов
	 * @returns {Promise<boolean>}
	 */
	static async createOrders(recursive = true)
	{
		if (!settings.isOrderEnabled)
		{
			// Рекурсия
			if (recursive)
			{
				setTimeout(async () => await Item.createOrders(), settings.intervalToCreateOrders * 60 * 1000);
			}

			return false;
		}

		/**
		 * Задержка до удаления сообщения об ошибке
		 *
		 * @type {number}
		 */
		const timeoutHideMessage = 30 * 60 * 1000;

		// Список ордеров на покупку
		const buyBooks = await Sender.get(Url.buyBooks(), {
			format: 'json',
			page: 1,
			limit: settings.maxOrders,
			sorting: 'date',
			is_finished: false,
		})
		.catch((e) =>
		{
			showMessage({
				message: 'Не удалось получить список ордеров',
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить список ордеров', e);
		});

		if (!buyBooks)
		{
			return false;
		}

		/**
		 * Количество выставленных ордеров
		 *
		 * @type {number}
		 */
		let countBuyBooks = buyBooks.count;

		// Уже максимальное количество ордеров
		if (countBuyBooks >= settings.maxOrders)
		{
			// Рекурсия
			if (recursive)
			{
				setTimeout(async () => await Item.createOrders(), settings.intervalToCreateOrders * 60 * 1000);
			}

			return false;
		}

		/**
		 * Предметы на тп
		 *
		 * @type {Object[]}
		 */
		let items = [];
		let itemsTemp;

		for(let page = 1; page <= settings.maxPages && (page === 1 || itemsTemp?.next); page++)
		{
			itemsTemp = await Sender.get(Url.items(), {
				format: 'json',
				on_sale: 1,
				price_min: settings.minCostOrder * (1 + settings.commission / 100 + settings.minProfitOrder(settings.minCostOrder) / 100),
				price_max: settings.maxCostOrder * (1 - settings.commission / 100 - settings.minProfitOrder(settings.minCostOrder) / 100),
				sorting: 'popular',
				page: page,
				limit: 72,
			})
			.catch((e) =>
			{
				showMessage({
					message: 'Не удалось получить список предметов',
					color: errorColor,
					timeout: timeoutHideMessage,
				});
				console.error('Не удалось получить список предметов', e);
			});

			if (itemsTemp)
			{
				items = items.concat(itemsTemp.results);
			}
		}

		// Не удалось получить список предметов
		if (items.length === 0)
		{
			// Рекурсия
			if (recursive)
			{
				setTimeout(async () => await Item.createOrders(), settings.intervalToCreateOrders * 60 * 1000);
			}

			return false;
		}

		// Ордера на покупку
		const buyBook = buyBooks.results;

		for(const item of items)
		{
			// Вспомогательная проверка, что все проверки идут хорошо
			let isSuccess = true;

			// Если достигнут предел заказов
			if (countBuyBooks >= settings.maxOrders)
			{
				break;
			}

			// Задержка между проверками 1 секунда
			await new Promise(async (resolve) =>
			{
				const itemOrder = new Item(item.id, item.popularity, -1, item.name, '');
				const {id, name} = itemOrder;

				// Если есть заказ на такой предмет
				if (buyBook?.some(order => order.product_id === id))
				{
					showMessage({
						message: `Проверка предмета ${name}
								Заказ на этот предмет уже есть`,
						color: warningColor,
						timeout: timeoutHideMessage,
					});
					if (DEBUG_ORDER)
					{
						console.log(`Проверка предмета ${name}` +
							'\nЗаказ на этот предмет уже есть');
					}
					isSuccess = false;
				}

				// Получение списка ордеров на продажу
				// Если список не был получен в течении 1 минуты
				if (isSuccess && (!itemsOrders[id] || itemsOrders[id].date < new Date().getTime() - 60 * 1000))
				{
					const itemOrdersInfo = await Sender.get(Url.itemOrdersInfo(id));

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
						isSuccess = false;
					}

					itemsOrders[id] = {};
					itemsOrders[id].orders = itemOrdersInfo;
					itemsOrders[id].date = new Date().getTime();
				}

				if (isSuccess)
				{
					/**
					 * Средняя цена продажи
					 *
					 * @type {number}
					 */
					const averagePrice = await itemOrder.getAverageByWeek();
					/**
					 * Цена выставления заказа
					 *
					 * @type {number}
					 */
					let priceToOrder;

					// Если нет запросов на покупку
					if (!itemsOrders[id].orders.buying[0])
					{
						priceToOrder = averagePrice * (1 - settings.commission / 100 - settings.minProfitOrder(averagePrice) / 100);
					}
					// Если максимальная цена запроса на покупку подходит под профит
					else if (calcProfit(itemsOrders[id].orders.buying[0].price.amount + 0.01, averagePrice) >= settings.minProfitOrder(averagePrice))
					{
						priceToOrder = itemsOrders[id].orders.buying[0].price.amount + 0.01;
					} else
					{
						// Проверка остальных запросов на покупку, если их меньше трех
						for(const buying of itemsOrders[id].orders.buying.slice(0, 3))
						{
							if (buying.number >= 2)
							{
								break;
							}

							if (calcProfit(buying.price.amount + 0.01, averagePrice) >= settings.minProfitOrder(averagePrice))
							{
								priceToOrder = buying.price.amount + 0.01;
								break;
							}
						}
					}

					if (!priceToOrder)
					{
						showMessage({
							message: `Проверка предмета ${name}
						Предмет не имеет выгодный профит`,
							color: warningColor,
							timeout: timeoutHideMessage,
						});
						if (DEBUG_ORDER)
						{
							console.log(`Проверка предмета ${name}` +
								'\nПредмет не имеет выгодный профит');
						}
						isSuccess = false;
					}

					if (isSuccess)
					{
						itemOrder.amount = priceToOrder;
						// Дополнительная проверка предмета
						const orderPrice = await itemOrder.calcSellPrice('Order');

						// Если предмет прошел проверку
						if (itemOrder.amount && orderPrice !== -1)
						{
							const profit = calcProfit(itemOrder.amount, averagePrice);

							/**
							 * Чистый профит в рублях
							 *
							 * @type {string}
							 */
							const profitInRub = Number(averagePrice * (1 - settings.commission / 100) - itemOrder.amount)
							.toFixed(2);

							if (!DEBUG_ORDER)
							{
								const isPosted = await Sender.post(Url.buyBooks(), {
									product_id: id,
									quantity: 1,
									price_val: (itemOrder.amount).toFixed(2),
									is_gift: false,
								})
								.catch((e) =>
								{
									showMessage({
										message: `Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
								Не удалось поставить ордер, +${profitInRub} руб чистыми (${profit})%`,
										color: errorColor,
										timeout: timeoutHideMessage,
									});
									console.error(`Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
							\nНе удалось поставить ордер, +${profitInRub} руб чистыми (${profit})%`, e);
								});

								if (isPosted)
								{
									countBuyBooks++;

									showMessage({
										message: `Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
										Выставлен ордер, +${profitInRub} руб чистыми (${profit})%`,
										color: successColor,
										timeout: timeoutHideMessage,
									});
									console.log(`Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
									\nВыставлен ордер, +${profitInRub} руб чистыми (${profit})%`);
								}
							} else
							{
								sendPushover('LD.market', `Заказ предмета ${name} с ценой покупки ${itemOrder.amount}\nУспешно заказано \n+${profitInRub} руб чистыми (${profit}%)`);
							}
						}
					}
				}

				setTimeout(resolve, 1000);
			});
		}

		// Рекурсия
		if (recursive)
		{
			setTimeout(async () => await Item.createOrders(), settings.intervalToCreateOrders * 60 * 1000);
		}

		return true;
	}

	/**
	 * Проверка ордеров для перебивания других пользователей
	 *
	 * @param {boolean} recursive - Рекурсивный вызов
	 * @returns {Promise<boolean>}
	 */
	static async reOrder(recursive = true)
	{
		/**
		 * Задержка до удаления сообщения об ошибке
		 *
		 * @type {number}
		 */
		const timeoutHideMessage = 30 * 60 * 1000;

		// Список ордеров на покупку
		const buyBooks = await Sender.get(Url.buyBooks(), {
			format: 'json',
			page: 1,
			limit: settings.maxOrders,
			sorting: 'date',
			is_finished: false,
		})
		.catch((e) =>
		{
			showMessage({
				message: 'Не удалось получить список ордеров',
				color: errorColor,
				timeout: timeoutHideMessage,
			});
			console.error('Не удалось получить список ордеров', e);
		});

		if (!buyBooks)
		{
			return false;
		}

		for(const order of buyBooks.results)
		{
			if (!settings.isOrderEnabled)
			{
				await Sender.post(Url.removeOrder(), {id_slug: order.id})
				.catch((e) =>
				{
					showMessage({
						message: 'Не удалось убрать ордер',
						color: errorColor,
						timeout: timeoutHideMessage,
					});
					console.error('Не удалось убрать ордер', e);
				});
				continue;
			}

			const itemOrder = new Item(order.product_id, order.product.popularity, -1, order.product.name, '');
			const {id, name} = itemOrder;

			// Получение списка ордеров на продажу
			// Если список не был получен в течении 1 минуты
			if (!itemsOrders[id] || itemsOrders[id].date < new Date().getTime() - 60 * 1000)
			{
				const itemOrdersInfo = await Sender.get(Url.itemOrdersInfo(id));

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

					await Sender.post(Url.removeOrder(), {id_slug: order.id})
					.catch((e) =>
					{
						showMessage({
							message: `Проверка предмета ${name}
							Не удалось убрать ордер`,
							color: errorColor,
							timeout: timeoutHideMessage,
						});
						console.error(`Проверка предмета ${name}
						\nНе удалось убрать ордер`, e);
					});

					continue;
				}

				itemsOrders[id] = {};
				itemsOrders[id].orders = itemOrdersInfo;
				itemsOrders[id].date = new Date().getTime();
			}

			/**
			 * Средняя цена продажи
			 *
			 * @type {number}
			 */
			const averagePrice = await itemOrder.getAverageByWeek();
			/**
			 * Цена выставления заказа
			 *
			 * @type {number}
			 */
			let priceToOrder;

			// Если нет запросов на покупку
			if (!itemsOrders[id].orders.buying[0])
			{
				priceToOrder = averagePrice * (1 - settings.commission / 100 - settings.minProfitOrder(averagePrice) / 100);
			}
			// Если максимальная цена запроса на покупку подходит под профит
			else if (calcProfit(itemsOrders[id].orders.buying[0].price.amount + 0.01, averagePrice) >= settings.minProfitOrder(averagePrice))
			{
				priceToOrder = itemsOrders[id].orders.buying[0].price.amount + 0.01;
			} else
			{
				// Проверка остальных запросов на покупку, если их меньше трех
				for(const buying of itemsOrders[id].orders.buying.slice(0, 3))
				{
					if (buying.number >= 2)
					{
						break;
					}

					if (calcProfit(buying.price.amount + 0.01, averagePrice) >= settings.minProfitOrder(averagePrice))
					{
						priceToOrder = buying.price.amount + 0.01;
						break;
					}
				}
			}

			itemOrder.amount = priceToOrder;
			// Дополнительная проверка предмета
			const orderPrice = await itemOrder.calcSellPrice('Order');

			if (!DEBUG_ORDER)
			{
				if (orderPrice === -1 || !itemOrder.amount || // Если предмет не выгодный, то убрать ордер
					itemOrder.amount !== order.price.amount + 0.01) // Если предмет выгодный и цена ордера изменилась
				{
					const removeOrder = await Sender.post(Url.removeOrder(), {id_slug: order.id})
					.catch((e) =>
					{
						showMessage({
							message: `Проверка предмета ${name}
							Не удалось убрать ордер`,
							color: errorColor,
							timeout: timeoutHideMessage,
						});
						console.error(`Проверка предмета ${name}
						\nНе удалось убрать ордер`, e);
					});

					if (!removeOrder)
					{
						continue;
					}

					// Если предмет выгодный
					if (orderPrice !== -1 && itemOrder.amount && itemOrder.amount !== order.price.amount + 0.01)
					{
						await Sender.post(Url.buyBooks(), {
							product_id: order.product_id,
							quantity: 1,
							price_val: itemOrder.amount,
							is_gift: false,
						})
						.catch((e) =>
						{
							showMessage({
								message: `Проверка предмета ${name}
							Не удалось выставить ордер`,
								color: errorColor,
								timeout: timeoutHideMessage,
							});
							console.error(`Проверка предмета ${name}
							\nНе удалось выставить ордер`, e);
						});
					}
				}
			}
		}

		// Рекурсия
		if (recursive)
		{
			setTimeout(async () => await Item.reOrder(), settings.intervalToReOrder * 60 * 1000);
		}
	}
}

window.addEventListener('load', async () =>
{
	/**
	 * Блок для собщений
	 * @type {HTMLDivElement}
	 */
	const messageDiv = document.createElement('div');
	messageDiv.style.position = 'fixed';
	messageDiv.style.right = '5px';
	messageDiv.style.bottom = '5px';
	messageDiv.style.zIndex = '100';
	messageDiv.id = 'tr_messageDiv';
	document.body.appendChild(messageDiv);

	/**
	 * Кнопка для включения/выключения бота
	 * @type {HTMLDivElement}
	 */
	const toggleButton = document.createElement('div');
	toggleButton.style.position = 'fixed';
	toggleButton.style.left = '5px';
	toggleButton.style.bottom = '5px';
	toggleButton.style.zIndex = '100';
	toggleButton.id = 'tr_toggleButton';
	toggleButton.style.color = 'white';
	toggleButton.style.padding = '7px';
	toggleButton.style.borderRadius = '4px';
	toggleButton.style.backgroundColor = 'rgba(0,0,0,.7)';
	toggleButton.style.cursor = 'pointer';

	// Включение/выключение бота
	if (localStorage.getItem('tr_windowIsAlreadyOpenedForMarket'))
	{
		showMessage({
			message: 'Страница открыта в новой вкладке, запуск бота запрещен',
			color: warningColor,
			timeout: 40000,
		});
		toggleButton.innerHTML = 'Включить бота';
		toggleButton.addEventListener('click', () =>
		{
			localStorage.removeItem('tr_windowIsAlreadyOpenedForMarket');
			location.reload();
		});
		document.body.appendChild(toggleButton);

		return 0;
	} else
	{
		const removeFlag = () => localStorage.removeItem('tr_windowIsAlreadyOpenedForMarket');

		toggleButton.innerHTML = 'Выключить бота';
		window.addEventListener('beforeunload', removeFlag);
		toggleButton.addEventListener('click', () =>
		{
			localStorage.setItem('tr_windowIsAlreadyOpenedForMarket', 'true');
			window.removeEventListener('beforeunload', removeFlag);
			location.reload();
		});
		document.body.appendChild(toggleButton);
	}

	await Sender.connectWS();
	await Item.reOrder();
	await Item.createOrders();
});
