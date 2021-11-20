// ==UserScript==
// @name         LD.marketWS
// @version      1.1.0
// @author       TroExol
// @match        https://lootdog.io/*
// ==/UserScript==

(async function()
{
	/**
	 * Настройки
	 */
	const settings = {
		/**
		 * Минимальная популярность предмета
		 *
		 * @type {number}
		 */
		minPopularity: 11,
		/**
		 * Минимальный профит от покупки в зависимости от цены предмета
		 *
		 * @param {number} sum - Цена покупки
		 * @returns {number} - Минимальный процент профита для покупки
		 */
		minProfit: (sum) => sum <= 500 ? 10: sum <= 1000 ? 7 : 5,
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
		maxCostBuy: 5000,
		/**
		 * Если больше такого кол-ва предметов на продажу меньше необходимого профита, то не покупать. Максимум 5 (4)
		 *
		 * @type {number}
		 */
		countOrdersOnSaleToCheck: 1,
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
	};

	// noinspection JSMismatchedCollectionQueryUpdate
	/**
	 * Черный список для покупок
	 *
	 * @type {string[]}
	 */
	const blackList = [];

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
	};

	window.onload = async () =>
	{
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
		if (localStorage.getItem('tr_windowIsAlreadyOpenedForMarketWS'))
		{
			showMessage({
				message: 'Страница открыта в новой вкладке, запуск бота запрещен',
				color: warningColor,
				timeout: 40000,
			});
			toggleButton.innerHTML = 'Включить бота';
			toggleButton.addEventListener('click', () =>
			{
				localStorage.removeItem('tr_windowIsAlreadyOpenedForMarketWS');
				location.reload();
			});
			document.body.appendChild(toggleButton);

			return;
		} else
		{
			toggleButton.innerHTML = 'Выключить бота';
			localStorage.setItem('tr_windowIsAlreadyOpenedForMarketWS', 'true');
			toggleButton.addEventListener('click', () =>
			{
				location.reload();
			});
			document.body.appendChild(toggleButton);
		}

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
						const itemInfo = await Sender.get(Url.itemInfo(item.id));
						item.name = itemInfo?.name;
						item.popularity = itemInfo?.popularity;
						await item.checkItem();
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
		const removeOutliers = (numbers) => {
			// Клонируем массив
			const values = numbers.concat();

			// Сортируем
			values.sort( function(a, b) {
				return a - b;
			});

			/* Then find a generous IQR. This is generous because if (values.length / 4)
			 * is not an int, then really you should average the two elements on either
			 * side to find q1.
			 */
			const q1 = values[Math.floor((values.length / 4))];
			// Likewise for q3.
			const q3 = values[Math.ceil((values.length * (3 / 4))) - 1];
			const iqr = q3 - q1;

			// Then find min and max values
			const maxValue = q3 + iqr*1.5;
			// const minValue = q1 - iqr*1.5;

			// Then filter anything beyond or beneath these values.
			// Then return
			return values.filter(function(x)
			{
				// return (x <= maxValue) && (x >= minValue);
				return (x <= maxValue);
			});
		}

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
			 * Вычисление профита
			 *
			 * @param {number} buy - Цена покупки
			 * @param {number} sell - Цена продажи
			 * @returns {number} - Профит в %
			 */
			static calcProfit(buy, sell)
			{
				return Math.round(((sell * (1 - settings.commission / 100) - buy) / buy) * 100);
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
			async getAverageByMonth(days = null)
			{
				const sellHistory = await this.getSellHistory();

				if (sellHistory.error)
				{
					console.log("Не удалось получить продажи", sellHistory.text, sellHistory.exception);
					return -1;
				}

				if (!sellHistory?.by_week || !sellHistory?.by_week[0])
				{
					return -1;
				}

				const countPricesByThreeDays = sellHistory.by_week
				.filter(({point}) => point * 1000 > new Date().getTime() - 3 * 24 * 3600000)
				.reduce((count, price) => count + price.count_sales, 0);

				const numbers = sellHistory.by_week
				.filter(({point}) => days === null || point * 1000 > new Date().getTime() - (countPricesByThreeDays >= 200 ? 3 : days) * 24 * 3600000)
				.reduce((acc, number) => {
					for (let i=0; i < number.count_sales; i++)
						acc.push(number.price)

					return acc;
				}, []);

				if (numbers.length < 1)
				{
					return -1;
				}

				const numbersWithoutOutliers = removeOutliers(numbers);
				const average = numbersWithoutOutliers.reduce((a, b) => a + b, 0) / numbersWithoutOutliers.length;

				if (!isFinite(average))
				{
					console.log(`Средняя цена - бесконечность: ${average}. Предмет ${this.name} с ценой покупки ${this.amount}`, numbers, numbersWithoutOutliers);
					return -1;
				}

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
					let stdev;
					if (numToSQRT >= 0)
					{
						stdev = Number(Math.sqrt(numToSQRT).toFixed(2));
					}
					return stdev;
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
					const zLevel95 = 2.09;
					return zLevel95 * calculateStandardDeviation(array, average) / Number(Math.sqrt(array.length));
				};

				const ci = confInterval(numbersWithoutOutliers, average);
				const totalAverage = average - ci;
				if (totalAverage == null || isNaN(totalAverage))
				{
					console.log(`Предмет ${this.name} с ценой покупки ${this.amount}: totalAverage is undefined: ${totalAverage}, average: ${average}, ci: ${ci}`,
						numbers,
						numbersWithoutOutliers);
				}
				return totalAverage;
			}

			/**
			 * Проверка выгодности и вычисление цены продажи предмета
			 *
			 * @returns {Promise<number>} - Если успешно, то число > 0, иначе -1
			 */
			async calcSellPrice()
			{
				/**
				 * Задержка до удаления сообщения об ошибке
				 *
				 * @type {number}
				 */
				const timeoutHideMessage = 1 * 60 * 1000;
				const {id, amount, popularity, name} = this;

				if (blackList.findIndex(blackListName => name.includes(blackListName)) !== -1)
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Предмет находится в черном списке`, color: warningColor, timeout: timeoutHideMessage,
					});
					// console.log(`Проверка предмета ${name} с ценой покупки ${amount}
					// Предмет находится в черном списке`);
					return -1;
				}

				/**
				 * Информация о пользователе
				 *
				 * @type {{balance: {currency: string, amount: number, caption: string}}}
				 */
				/*const userInfo = await Sender.get(Url.userInfo());
				 const myBalance = userInfo?.balance?.amount;

				 if (!myBalance)
				 {
				 showMessage({
				 message: 'Не удалось получить баланс пользователя', color: errorColor,
				 timeout: timeoutHideMessage,
				 });
				 console.error('Не удалось получить баланс пользователя');
				 sendPushover('LD.marketWS', 'Не удалось получить баланс пользователя');
				 return -1;
				 }*/

				// Проверка стоимости предмета в соответствии с настройками и текущим балансом
				if (amount < settings.minCostBuy || amount > settings.maxCostBuy /*|| amount > myBalance*/)
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Цена не входит в диапазон покупки или баланс мал`, color: warningColor, timeout: timeoutHideMessage,
					});
					// console.log(`Проверка предмета ${name} с ценой покупки ${amount}
					// Цена не входит в диапазон покупки или баланс мал`);
					return -1;
				}

				/**
				 * История продаж предмета
				 *
				 * @type {SellHistoryType}
				 */
				const sellHistory = await this.getSellHistory();

				if (!sellHistory?.by_week[0])
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Нет продаж за неделю`, color: warningColor, timeout: timeoutHideMessage,
					});
					// console.log(`Проверка предмета ${name} с ценой покупки ${amount}
					// Нет продаж за неделю`);
					return -1;
				}

				if (new Date().getTime() - sellHistory.by_all_time[0]?.point * 1000 < settings.daysWent * 24 * 60 * 60 * 1000)
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Предмет недавно появился на тп, его стоит избегать`,
						color: warningColor,
						timeout: timeoutHideMessage,
					});
					// console.log(`Проверка предмета ${name} с ценой покупки ${amount}
					// Предмет недавно появился на тп, его стоит избегать`);
					return -1;
				}

				/**
				 * Рекомендуемая маркетом цена покупки
				 *
				 * @type {number}
				 */
				const suggestedBuyPrice = (await Sender.get(Url.itemCostInfo(id)))?.suggested_buy_price.amount * 0.95;
				/**
				 * Средняя цена продаж за указанный период
				 *
				 * @type {number}
				 */
				const averagePriceByMonth = await this.getAverageByMonth(settings.daysSells);

				/**
				 * Средняя цена
				 *
				 * @type {number}
				 */
				const averagePrice = averagePriceByMonth;
				/*let averagePrice;
				 if (suggestedBuyPrice != null && !isNaN(suggestedBuyPrice) && averagePriceByMonth != null && !isNaN(averagePriceByMonth))
				 {
				 averagePrice = suggestedBuyPrice < averagePriceByMonth ? suggestedBuyPrice * 0.95 : averagePriceByMonth;
				 } else if (suggestedBuyPrice != null && !isNaN(suggestedBuyPrice))
				 {
				 averagePrice = suggestedBuyPrice;
				 console.log(`averagePriceByMonth is undefined: ${averagePriceByMonth}`);
				 } else if (averagePriceByMonth != null && !isNaN(averagePriceByMonth))
				 {
				 averagePrice = averagePriceByMonth;
				 console.log(`suggestedBuyPrice is undefined: ${suggestedBuyPrice}`);
				 }*/

				if (averagePrice == null)
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Не удалось получить среднюю цену продажи`, color: errorColor,
						timeout: timeoutHideMessage,
					});
					console.error(`Проверка предмета ${name} с ценой покупки ${amount}`+
						"\nНе удалось получить среднюю цену продажи");
					sendPushover('LD.marketWS', `Проверка предмета ${name} с ценой покупки ${amount}\nНе удалось получить среднюю цену продажи`);
					return -1;
				}

				const profit = Item.calcProfit(amount, averagePrice);

				if (isNaN(profit))
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Не удалось вычислить профит предмета`, color: warningColor, timeout: timeoutHideMessage,
					});
					console.log(`Проверка предмета ${name} с ценой покупки ${amount}`+
						"\nНе удалось вычислить профит предмета");
					return -1;
				}

				if (profit < settings.minProfit(amount))
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Профит меньше указанного в настройках (${profit}%)`, color: warningColor, timeout: timeoutHideMessage,
					});
					// console.log(`Проверка предмета ${name} с ценой покупки ${amount}
					// Профит меньше указанного в настройках`);
					return -1;
				}

				if (popularity < settings.minPopularity)
				{
					showMessage({
						message: `Проверка предмета ${name} с ценой покупки ${amount}
					Популярность меньше указанного в настройках`, color: warningColor, timeout: timeoutHideMessage,
					});
					// console.log(`Проверка предмета ${name} с ценой покупки ${amount}
					// Популярность меньше указанного в настройках`);
					return -1;
				}

				if (settings.countOrdersOnSaleToCheck > 0)
				{
					/**
					 *
					 * @type {{number: number, percent: number, price: {currency: string, amount: number, caption: string}}[]}
					 */
					const itemSellOrders = (await Sender.get(Url.itemOrdersInfo(id)))?.selling;

					if (!itemSellOrders)
					{
						showMessage({
							message: `Проверка предмета ${name} с ценой покупки ${amount}
						Не удалось получить список предметов на продаже`,
							color: errorColor,
							timeout: timeoutHideMessage,
						});
						console.error(`Проверка предмета ${name} с ценой покупки ${amount}`+
							"\nНе удалось получить список предметов на продаже");
						sendPushover('LD.marketWS', `Проверка предмета ${name} с ценой покупки ${amount}\nНе удалось получить список предметов на продаже`);
						return -1;
					}

					/**
					 * Кол-во выставленных продаж с невыгодной ценой
					 *
					 * @type {number}
					 */
					const countNotProfitOrders = itemSellOrders.reverse().reduce((countNotProfitOrders, currentOrder) =>
					{
						const profit = Item.calcProfit(amount, currentOrder.price.amount);

						if (isNaN(profit))
						{
							showMessage({
								message: `Проверка предмета ${name} с ценой покупки ${amount}
							Не удалось вычислить профит выставленной продажи с ценой ${currentOrder.price.amount}`,
								color: warningColor, timeout: timeoutHideMessage,
							});
							console.log(`Проверка предмета ${name} с ценой покупки ${amount}`+
								`\nНе удалось вычислить профит выставленной продажи с ценой ${currentOrder.price.amount}`);
							return (countNotProfitOrders + currentOrder.number);
						}

						if (profit < settings.minProfit(amount))
						{
							return (countNotProfitOrders + currentOrder.number);
						}
					}, 0);

					if (countNotProfitOrders > settings.countOrdersOnSaleToCheck)
					{
						showMessage({
							message: `Проверка предмета ${name} с ценой покупки ${amount}
						Выставлено много продаж с невыгодной ценой (${countNotProfitOrders} шт.)`,
							color: warningColor,
							timeout: timeoutHideMessage,
						});
						// console.log(`Проверка предмета ${name} с ценой покупки ${amount}
						// Выставлено много продаж с невыгодной ценой (${countNotProfitOrders} шт.)`);
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
			async checkItem()
			{
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
				const sellPrice = await this.calcSellPrice();

				if (sellPrice < 0)
				{
					return false;
				}

				const profit = Item.calcProfit(amount, sellPrice);
				const profitInRub = sellPrice * (1 - settings.commission / 100) - amount;

				showMessage({
					message: `Проверка предмета ${name} с ценой покупки ${amount}
					Предмет выгодный +${profitInRub} руб чистыми (${profit}%)`,
					color: successColor,
					timeout: timeoutHideMessage,
				});
				console.log(`Проверка предмета ${name} с ценой покупки ${amount}`+
					`\nПредмет выгодный +${profitInRub} руб чистыми (${profit}%)`);

				// Покупка
				/*const infoBuy = await this.buy();

				 // Если не купили
				 if (!infoBuy)
				 {
				 showMessage({
				 message: `Покупка предмета ${name} с ценой покупки ${amount}
				 Не удалось купить предмет, возможно его кто-то купил`,
				 color: errorColor,
				 timeout: timeoutHideMessage,
				 });
				 console.log(`Покупка предмета ${name} с ценой покупки ${amount}`+
				 "\nНе удалось купить предмет, возможно его кто-то купил");
				 return false;
				 }

				 showMessage({
				 message: `Покупка предмета ${name} с ценой покупки ${amount}
				 Успешно куплен`, color: successColor, timeout: timeoutHideMessage,
				 });
				 console.log(`Покупка предмета ${name} с ценой покупки ${amount}`+
				 "\nУспешно куплен");*/

				setTimeout(async () =>
				{
					const sellPriceWithFraction = Number(sellPrice).toFixed(2);
					// Продажа
					/*let infoSell = this.sell(infoBuy.transaction.item.id, sellPriceWithFraction);

					 // Если не продали
					 if (!infoSell)
					 {
					 showMessage({
					 message: `Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}
					 Не удалось выставить предмет на продажу`, color: errorColor, timeout: timeoutHideMessage,
					 });
					 console.log(`Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}`+
					 "\nНе удалось выставить предмет на продажу");
					 sendPushover('LD.marketWS', `Покупка предмета ${name} с ценой покупки ${amount}\nУспешно куплен, но не выставлен на продажу\n+${profitInRub} руб чистыми (${profit}%)`);
					 return false;
					 }*/

					showMessage({
						message: `Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}
					Успешно выставлено на продажу`, color: successColor, timeout: timeoutHideMessage,
					});
					console.log(`Покупка предмета ${name} с ценой продажи ${sellPriceWithFraction}`+
						"Успешно выставлено на продажу");
					sendPushover('LD.marketWS', `Покупка предмета ${name} с ценой покупки ${amount}\nУспешно куплен и выставлен на продажу\n+${profitInRub} руб чистыми (${profit}%)`);
				}, 5000);

				return true;
			}
		}

		await Sender.connectWS();
	};

})();
