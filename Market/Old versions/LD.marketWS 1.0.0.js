// ==UserScript==
// @name         LD.marketWS
// @version      1.0.0
// @author       TroExol
// @match        https://lootdog.io/*
// ==/UserScript==

(async function()
{
	if (localStorage.getItem('tr_windowIsAlreadyOpenedForMarketWS'))
	{
		console.log('Страница открыта новой вкладкой, запуск скрипта запрещен');
		return;
	} else
	{
		localStorage.setItem('tr_windowIsAlreadyOpenedForMarketWS', 'true');
		window.addEventListener('beforeunload', () => localStorage.removeItem('tr_windowIsAlreadyOpenedForMarketWS'));
	}

	const settings = {
		// Минимальная популярность предмета
		minPopularity: 12,
		// Минимальный профит от покупки в зависимости от цены предмета
		minProfit: (sum) => sum <= 500 ? 15 : sum <= 1000 ? 10 : 6,
		// Комиссия сервиса Lootdog
		commission: 15,
		// Минимальная стоимость покупки
		minCostBuy: 100,
		// Максимальная стоимость покупки
		maxCostBuy: 2000,
		// Кол-во дней, которых прошло с появления предмета
		daysWent: 5,
		// Кол-во дней для анализа продаж
		daysSells: 31,
	};

	// function, тк у arrow function this привязан к внешнему блоку
	Object.prototype.forEach = function(callback)
	{
		Object.entries(this).forEach(callback);
	};

	class Url
	{
		// Ссылка на историю продажи предмета
		static sellHistory(id)
		{
			return `https://lootdog.io/api/products/${id}/average_price_stats/?format=json&id=${id}&currency=RUB`;
		}
		// Ссылка на информацию о предмете
		static itemCostInfo(id)
		{
			return `https://lootdog.io/api/products/${id}/market_info/?format=json&id=${id}`;
		}
		static itemInfo(id)
		{
			return `https://lootdog.io/api/products/${id}/?format=json&id=${id}`;
		}
		// Ссылка на информацию о пользователе
		static userInfo()
		{
			return 'https://lootdog.io/api/current_user/?format=json';
		}
		// Ссылка для запроса покупки
		static buy()
		{
			return 'https://lootdog.io/api/instant_buy/';
		}
		// Ссылка для запроса продажи
		static sell()
		{
			return 'https://lootdog.io/api/orders/';
		}
		// Ссылка для запроса к БД
		static db()
		{
			return `https://ld.market.tr/dbquery.php`;
		}
	}

	class Sender
	{
		static connectWS()
		{
			let uidPing = 3;
			// Create WebSocket connection.
			let socket = new WebSocket('wss://lootdog.io/connection/websocket');
			let pingInterval;

			// Connection opened
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
				pingInterval = setInterval(() =>
				{
					socket.send(JSON.stringify({method: 'ping', uid: uidPing.toString()}));
					uidPing++;
				}, 30000);
			});

			socket.addEventListener('close', () =>
			{
				clearInterval(pingInterval);
				Sender.connectWS();
			});

			// Listen for messages
			socket.addEventListener('message', function(event)
			{
				const data = JSON.parse(event.data);
				if (data.method === 'connect')
				{
					socket.send(JSON.stringify({method: 'subscribe', params: {channel: 'public:broadcast'}, uid: '2'}));
				} else if (data.method === 'message' &&
					data.body.data.type === 'product_price_changed' &&
					data.body.best_order_id !== '')
				{
					Item.checkNewItem(new Item(data.body.data.product, -1, data.body.data.price.RU.RUB.amount,
						'', data.body.data.best_order_id));
				}
			});
		}

		/** GET query
		 * @return Promise Результат запроса
		 */
		static get(path, params = {})
		{
			return new Promise((resolve, reject) =>
			{
				let url = new URL(path);

				// Добавление параметров
				try
				{
					params.forEach(([key, value = '']) =>
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
						console.warn('Нужна авторизация через телефона');
						// notifyPushover('LootDog', 'Необходимо авторизоваться через телефон');
					}
					reject(res);
				})
				.then(resolve)
				.catch(reject);
			});
		}

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
						console.warn('Нужна авторизация через телефона');
						// notifyPushover('LootDog', 'Необходимо авторизоваться через телефон');
					}
					reject(res);
				})
				.then(resolve)
				.catch(reject);
			});
		}
	}

	class Item
	{
		/**
		 * @param {number} id ID предмета
		 * @param {number} popularity Популярность предмета
		 * @param {number} amount Цена поупки
		 * @param {string} name Название предмета
		 * @param {string} bestOrderId ID ордера на самую дешевую продажу
		 */
		constructor(id, popularity, amount, name = '', bestOrderId)
		{
			this.id = id;
			this.popularity = popularity;
			this.amount = amount;
			this.name = name;
			this.bestOrderId = bestOrderId;
		}

		/**
		 * Получение истории продаж предмета
		 * Структура объекта:
		 * by_all_time: продажи за все время
		 * by_month: продажи за месяц
		 * by_week: продажи за неделю
		 * Структура элементов
		 * point: unix timestamp / 1000
		 * count_sales: кол-во прадаж по какой-то цене
		 * price: цена продажи
		 */
		static async getSellHistory(id)
		{
			return await Sender.get(Url.sellHistory(id)).catch((e) => ({
				error: true,
				text: 'Не удалось получить историю покупок предмета ' + id,
				exception: e,
			}));
		}

		/**
		 * Получает среднюю цену продаж за определенный период
		 * @param {number} id ID предмета
		 * @param {number} days За сколько дней считать среднюю цену
		 * @returns {number} Средняя цена продажи
		 */
		static async getAverageByMonth(id, days = null)
		{
			const sellHistory = await Item.getSellHistory(id);

			if (sellHistory.error)
			{
				console.log(sellHistory.text, sellHistory.exception);
				return -1;
			}

			if (!sellHistory?.by_month[0])
			{
				console.log(`У предмета с id ${id} нет продаж за месяц`);
				return -1;
			}

			const data = sellHistory.by_month
			.filter(({point}) => days === null || point * 1000 > new Date().getTime() - days * 24 * 3600000)
			.reduce(
				({sum, count}, {price, count_sales}) =>
				{
					sum += price * count_sales;
					count += count_sales;
					return {sum, count};
				},
				{sum: 0, count: 0},
			);

			return Number((data.sum / data.count).toFixed(2));
		}

		static calcProfit(buy, sell)
		{
			return Math.round(((sell * (1 - settings.commission / 100) - buy) / buy) * 100);
		}

		static createItemForBuy(mainItem, profit, bestOrderId, amount, averagePrice = -1)
		{
			const item = Object.assign({}, mainItem);
			item.profit = profit;
			item.best_order_id = bestOrderId;
			item.buy_price = amount;
			// Если цена продажи меньше средней цены продаж, то для продажи берем
			// среднюю цену продаж
			if (item.amount < averagePrice)
			{
				item.amount = averagePrice;
			}

			return item;
		}

		static async checkNewItem(item)
		{
			const userInfo = await Sender.get(Url.userInfo());
			const myBalance = userInfo?.balance?.amount;
			const {id, amount, popularity} = item;
			let profitItem;

			if (amount < settings.minCostBuy ||
				amount > settings.maxCostBuy ||
				amount > myBalance)
			{
				return false;
			}

			/*const settingsDB = await Sender.get(Url.db(), {
			 query_type: 'get_settings'
			 });

			 if (settingsDB.data[9].value != 1){
			 return profitItem;
			 }

			 const dbInfo = await Sender.get(Url.db(), {
			 query_type: 'get_item_info',
			 entity_id: id
			 });

			 if (!dbInfo.data.can_buy){
			 console.log(`Предмет с id ${id} ${item.name} находится в черном списке`);
			 return false;
			 }*/

			const sellHistory = await Item.getSellHistory(id);

			// Нет продаж за неделю
			if (!sellHistory?.by_week[0])
			{
				// console.log(`У предмета с id ${id} нет продаж за неделю`);
				return false;
			}

			// Предмет недавно появился на тп, его стоит избегать
			if (new Date().getTime() - sellHistory.by_month[0]?.point * 1000 < settings.daysWent * 24 * 60 * 60 * 1000)
			{
				console.log(`Предмет с id ${id} недавно появился на тп, его стоит избегать`);
				return false;
			}

			const averagePrice = await Item.getAverageByMonth(id);
			const profit = Item.calcProfit(amount, averagePrice);
			const itemInfo = await Sender.get(Url.itemInfo(id));
			item.popularity = itemInfo.popularity;
			item.name = itemInfo.name;

			if (item.name?.includes("Объект 490"))
			{
				return false;
			}
			if (profit < settings.minProfit(amount) || item.popularity < settings.minPopularity || isNaN(profit))
			{
				return false;
			}

			console.log('Выгодный предмет: ' + profit + '%', averagePrice, item);

			// Покупаем
			let infoBuy = await Sender.post(Url.buy(), {
				order: item.bestOrderId,
				buy_price: amount,
				source: 'buying.popular',
				is_gift: false,
			});

			// Пропускаем, если не купили
			if (!infoBuy)
			{
				console.warn('Не удалось купить предмет, возможно его кто-то купил', item);
				return false;
			}

			console.log('Куплен предмет: ', item, new Date().getHours() + ':' + new Date().getMinutes());

			setTimeout(async () => {
				// Продаем
				let infoSell = await Sender.post(Url.sell(), {
					is_buy: false,
					item: infoBuy.transaction.item.id,
					price_val: Number(averagePrice).toFixed(2),
				});

				// Пропускаем, если не продали
				if (!infoSell)
				{
					console.warn('Не удалось продать предмет', item);
					return false;
				}

				console.log('Выставлен на продажу', item);
			}, 3000);
			return true;
		}
	}

	Sender.connectWS();
})();
