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
	/**
	 * @returns {string} - Ссылка на уведомления
	 */
	notifications: () => 'https://lootdog.io/api/notifications/?format=json&hidden=0&limit=40',
	/**
	 * @returns {string} - Ссылка на очистку уведомлений
	 */
	clearNotifications: () => 'https://lootdog.io/api/notifications/close_notification_all/'
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
				/**
				 * Предмет
				 *
				 * @type {Item}
				 */
				const item = new Item(data.body.data.product, -1, data.body.data.price.RU.RUB.amount,
					'', data.body.data.best_order_id);

				const itemInfo = await getItemInfo(item.id);
				item.name = itemInfo && itemInfo.name;

				await item.checkItemToBuy();
			}
		});
	}

	/**
	 * GET запрос
	 *
	 * @param {string} path - Ссылка для запроса
	 * @param {object} params - Параметры запроса
	 * @param {boolean} [isLDQuery=true] - Запрос к Lootdog?
	 * @returns {Promise<object>} - Результат запроса
	 */
	static get(path, params = {}, isLDQuery = true)
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
				} else if (isLDQuery && res.status === 403 && res.json().code === 'SecondFactorNeeded')
				{
					console.warn('Необходимо авторизоваться через телефон');
					sendPushover('LD.marketWS', 'Необходимо авторизоваться через телефон');
					showMessage({
						message: 'Необходимо авторизоваться через телефон',
						color: errorColor,
						timeout: timeoutHideMessage,
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
	 * @param {object} [params={}] - Параметры запроса
	 * @param {boolean} [isLDQuery=true] - Запрос к Lootdog?
	 * @returns {Promise<object>} - Результат запроса
	 */
	static post(path, params = {}, isLDQuery = true)
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

			const headers = {
				'Content-Type': 'application/x-www-form-urlencoded'
			};

			if (isLDQuery) {
				headers['X-CSRFToken'] = getCSRF();
			}

			fetch(path, {
				method: 'POST',
				headers,
				body: paramsList,
			})
			.then((res) =>
			{
				if (res.status >= 200 && res.status < 300)
				{
					return res.json();
				} else if (isLDQuery && res.status === 403 && res.json().code === 'SecondFactorNeeded')
				{
					console.warn('Необходимо авторизоваться через телефон');
					sendPushover('LD.marketWS', 'Необходимо авторизоваться через телефон');
					showMessage({
						message: 'Необходимо авторизоваться через телефон',
						color: errorColor,
						timeout: timeoutHideMessage,
					});
				}
				reject(res);
			})
			.then(resolve)
			.catch(reject);
		});
	}
}
