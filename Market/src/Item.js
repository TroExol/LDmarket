/**
 * Предмет с маркета LootDog
 */
class Item {
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
    constructor(id, popularity, amount, name, bestOrderId) {
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
     * @returns {(Promise<SellHistoryType>|Promise<{error: boolean, text: string, exception: string}>)} -
     *     История продаж
     */
    async getSellHistory() {
        return await Sender.get(Url.sellHistory(this.id))
                           .catch((e) => {
                               showMessage({
                                   message: 'Не удалось получить историю покупок предмета ' + this.id,
                                   color: errorColor,
                                   timeout: timeoutHideMessage,
                               });
                               console.error('Не удалось получить историю покупок предмета ' + this.id, e);
                           });
    }

    /**
     * Покупки предмета
     *
     * @returns {Promise<Object>} - Результат запроса
     */
    async buy() {
        return await Sender.post(Url.buy(), {
            order: this.bestOrderId,
            buy_price: this.amount,
            source: 'buying.popular',
            is_gift: false,
        })
                           .catch((e) => {
                               showMessage({
                                   message: 'Не удалось купить предмет',
                                   color: errorColor,
                                   timeout: timeoutHideMessage,
                               });
                               console.error('Не удалось купить предмет', e);
                           });
    }

    /**
     * Продажа предмета
     *
     * @param {(number|string)} transactionItemId - ID предмета из транзакции покупки
     * @param {(number|string)} price - Цена продажи
     * @returns {Promise<Object>} - Результат запроса
     */
    async sell(transactionItemId, price) {
        return await Sender.post(Url.sell(), {
            is_buy: false,
            item: transactionItemId,
            price_val: Number(price).toFixed(2),
        })
                           .catch((e) => {
                               showMessage({
                                   message: 'Не удалось продать предмет',
                                   color: errorColor,
                                   timeout: timeoutHideMessage,
                               });
                               console.error('Не удалось продать предмет', e);
                           });
    }

    /**
     * Получает среднюю цену продаж за определенный период
     *
     * @param {(number|null)} [days=null] - За сколько дней считать среднюю цену
     * @returns {number} - Средняя цена продажи
     */
    async getAverageByWeek(days = null) {
        /**
         * История продаж
         *
         * @type {SellHistoryType}
         */
        const sellHistory = await getSellHistory(this);

        if (!sellHistory || sellHistory.error) {
            return -1;
        }

        // Проверка, что предмет недавно появился на тп
        if (!sellHistory.by_all_time || !sellHistory.by_all_time[0] ||
            new Date().getTime() - sellHistory.by_all_time[0].point * 1000 < settings.daysWent * 24 * 60 * 60 * 1000) {
            showMessage({
                message: `Проверка предмета ${this.name} с ценой покупки ${this.amount}
					Предмет недавно появился на маркете, его стоит избегать`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            return -1;
        }

        // Проверка наличия покупок за неделю
        if (!sellHistory.by_week || !sellHistory.by_week[0]) {
            showMessage({
                message: `Проверка предмета ${this.name} с ценой покупки ${this.amount}
					Нет продаж за неделю`, color: warningColor, timeout: timeoutHideMessage,
            });
            return -1;
        }

        /**
         * Количество продаж за неделю
         *
         * @type {number}
         */
        const countSalesByWeek = sellHistory.by_week.reduce((count, price) => count + price.count_sales, 0);

        if (countSalesByWeek < settings.minSalesByWeek) {
            showMessage({
                message: `Проверка предмета ${this.name} с ценой покупки ${this.amount}
					Количество продаж за неделю меньше, указанного в настройках`, color: warningColor,
                timeout: timeoutHideMessage,
            });
            return -1;
        }

        // Получение кол-ва продаж за 3 дня
        const countSalesByThreeDays = sellHistory.by_week
                                                 .filter(({ point }) => point * 1000 > new Date().getTime() - 3 * 24 * 3600000)
                                                 .reduce((count, price) => count + price.count_sales, 0);

        // Продажи за определенный период или за 3 дня
        const numbers = sellHistory.by_week
                                   .filter(({ point }) => days === null ||
                                       point * 1000 >=
                                       new Date().getTime() - (countSalesByThreeDays > settings.countSalesByThreeDays ? 3 : days) * 24 * 3600000)
                                   .reduce((acc, number) => {
                                       for(let i = 0; i < number.count_sales; i++)
                                           acc.push(number.price);

                                       return acc;
                                   }, []);

        // Если нет подходящих продаж за неделю
        if (numbers.length < 1) {
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
        if (!isFinite(average)) {
            if (DEBUG) {
                console.log(`Средняя цена - бесконечность: ${average}. Предмет ${this.name} с ценой покупки ${this.amount}`);
            }
            return -1;
        }

        const ci = confInterval(numbersWithoutOutliers, average);
        const totalAverage = average - ci;

        // Если не удалось вычислить доверительный диапазон
        if (totalAverage == null || !isFinite(totalAverage)) {
            if (DEBUG) {
                console.log(`Предмет ${this.name} с ценой покупки ${this.amount}: totalAverage is undefined: ${totalAverage}, average: ${average}, ci: ${ci}`,
                    numbers,
                    numbersWithoutOutliers);
            }

            return -1;
        }

        return totalAverage;
    }

    /**
     * Проверка выгодности и вычисление цены продажи предмета для покупки
     *
     * @returns {Promise<number>} - Если успешно, то число > 0, иначе -1
     */
    async calcSellPriceBuy() {
        const { id, amount, name } = this;

        // Проверка на черный список
        if (isBlackList(name)) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${amount}
					Предмет находится в черном списке`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            return -1;
        }

        /**
         * Средняя цена продаж за указанный период
         *
         * @type {number}
         */
        const averagePrice = await this.getAverageByWeek(settings.daysSells);

        if (averagePrice < 0) {
            return -1;
        }

        const profit = calcProfit(amount, averagePrice);

        // Проверка, что профит получен
        if (profit === undefined) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${amount}
					Не удалось вычислить профит предмета`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            console.log(`Проверка предмета ${name} с ценой покупки ${amount}` +
                '\nНе удалось вычислить профит предмета');
            return -1;
        }

        // Проверка, что профит удовлетворяет настройкам
        if (!checkProfit(profit, settings.minProfitBuy(averagePrice))) {
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
        const balance = await getBalance();

        // Проверка стоимости предмета в соответствии с настройками и текущим балансом
        if (!checkItemCost(amount, settings.minCostBuy, settings.maxCostBuy, balance)) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${amount}
					Цена не входит в диапазон покупки или баланс мал`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            return -1;
        }

        // Проверка на такие же предметы в инвентаре
        if (!(await checkCountSameItems(id, settings.countMaxSameItemsToBuy))) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${amount}
				Достигнут предел максимального количества одинаковых предметов в инвентаре`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            console.log(`Проверка предмета ${name} с ценой покупки ${amount}` +
                '\nДостигнут предел максимального количества одинаковых предметов в инвентаре');
            return -1;
        }

        // Проверка, что кол-во цен на продаже удовлетворяет настройкам, если такая настройка указана
        if (!(await isMaxNotProfitOrdersLess(this, settings.minProfitBuy, settings.countMaxNotProfitOrders))) {
            return -1;
        }

        return averagePrice;
    }

    /**
     * Проверка выгодности и вычисление цены покупки предмета для ордера
     *
     * @returns {Promise<number>} - Если успешно, то число > 0, иначе -1
     */
    async calcBuyPriceOrder(buyBook) {
        const { id, name } = this;

        // Проверка на черный список
        if (isBlackList(name)) {
            showMessage({
                message: `Проверка предмета ${name}
					Предмет находится в черном списке`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            return -1;
        }

        // Если есть заказ на такой предмет
        if (buyBook?.some(order => order.product_id === id)) {
            showMessage({
                message: `Проверка предмета ${name}
				Заказ на этот предмет уже есть`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            if (DEBUG_ORDER) {
                console.log(`Проверка предмета ${name}` +
                    '\nЗаказ на этот предмет уже есть');
            }
            return -1;
        }

        // Получение списка ордеров на продажу
        const itemOrders = await getItemOrders(this);

        if (itemOrders === undefined) {
            return -1;
        }

        /**
         * Средняя цена продажи
         *
         * @type {number}
         */
        const averagePrice = await this.getAverageByWeek(settings.daysSells);

        if (averagePrice < 0) {
            return -1;
        }

        /**
         * История продаж
         *
         * @type {SellHistoryType}
         */
        const sellHistory = await getSellHistory(this);

        /**
         * Цена выставления заказа
         *
         * @type {number}
         */
        const priceToOrder = sellHistory.by_week.reduce((minPrice, price) => minPrice > price.price ? price.price : minPrice,
            Number.MAX_SAFE_INTEGER);

        const profit = calcProfit(priceToOrder, averagePrice);

        // Проверка, что профит получен
        if (profit === undefined) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${priceToOrder}
					Не удалось вычислить профит предмета`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            console.log(`Проверка предмета ${name} с ценой покупки ${priceToOrder}` +
                '\nНе удалось вычислить профит предмета');
            return -1;
        }

        // Проверка, что профит удовлетворяет настройкам
        if (!checkProfit(profit, settings.minProfitBuy(averagePrice))) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${priceToOrder}
					Профит меньше указанного в настройках (${profit}%)`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            return -1;
        }

        this.amount = priceToOrder;

        /**
         * Баланс пользователя
         *
         * @type {number}
         */
        const balance = await getBalance();

        // Проверка стоимости предмета в соответствии с настройками и текущим балансом
        if (!checkItemCost(this.amount, settings.minCostOrder, settings.maxCostOrder, balance)) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${this.amount}
						Цена не входит в диапазон покупки или баланс мал`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            return -1;
        }

        // Проверка на такие же предметы в инвентаре
        if (!(await checkCountSameItems(id, settings.countMaxSameItemsToOrder))) {
            showMessage({
                message: `Проверка предмета ${name} с ценой покупки ${this.amount}
						Достигнут предел максимального количества одинаковых предметов в инвентаре`,
                color: warningColor,
                timeout: timeoutHideMessage,
            });
            console.log(`Проверка предмета ${name} с ценой покупки ${this.amount}` +
                '\nДостигнут предел максимального количества одинаковых предметов в инвентаре');
            return -1;
        }

        // Проверка, что кол-во цен на продаже удовлетворяет настройкам, если такая настройка указана
        if (!(await isMaxNotProfitOrdersLess(this, settings.minProfitOrder, settings.countMaxNotProfitOrders))) {
            return -1;
        }

        return this.amount;
    }

    /**
     * Покупка и продажа предмета, если предмет выгодный
     *
     * @returns {Promise<boolean>}
     */
    async checkItemToBuy() {
        if (!settings.isBuyEnabled) {
            return false;
        }

        const { amount, name } = this;

        /**
         * Цена продажи предмета
         *
         * @type {number}
         */
        const sellPrice = await this.calcSellPriceBuy();

        if (sellPrice < 0) {
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

        if (DEBUG_BUY) {
            sendPushover('LD.market', `Проверка предмета ${name} с ценой покупки ${amount}\nПредмет выгодный +${profitInRub} руб чистыми (${profit}%)`);
        }

        if (!DEBUG_BUY) {
            // Покупка
            const infoBuy = await this.buy();

            // Если не купили
            if (!infoBuy) {
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
                return false;
            }

            showMessage({
                message: `Покупка предмета ${name} с ценой покупки ${amount}
			 Успешно куплен`, color: successColor, timeout: timeoutHideMessage,
            });
            console.log(`Покупка предмета ${name} с ценой покупки ${amount}` +
                '\nУспешно куплен');

            settings.balance.balance -= amount;

            setTimeout(async () => {
                const sellPriceWithFraction = Number(sellPrice).toFixed(2);

                // Продажа
                let infoSell = this.sell(infoBuy.transaction.item.id, sellPriceWithFraction);

                // Если не продали
                if (!infoSell) {
                    showMessage({
                        message: `Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}
				 Не удалось выставить предмет на продажу`, color: errorColor, timeout: timeoutHideMessage,
                    });
                    console.log(`Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}` +
                        '\nНе удалось выставить предмет на продажу');
                    return false;
                }

                showMessage({
                    message: `Продажа предмета ${name} с ценой продажи ${sellPriceWithFraction}
					Успешно выставлено на продажу`, color: successColor, timeout: timeoutHideMessage,
                });
                console.log(`Покупка предмета ${name} с ценой продажи ${sellPriceWithFraction}` +
                    'Успешно выставлено на продажу');
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
    static async createOrders(recursive = true) {
        if (!settings.isOrderEnabled) {
            // Рекурсия
            if (recursive) {
                setTimeout(async () => await Item.createOrders(), settings.intervalToCreateOrders * 60 * 1000);
            }

            return false;
        }

        // Список ордеров на покупку
        const buyBooks = await Sender.get(Url.buyBooks(), {
            format: 'json',
            page: 1,
            limit: settings.maxOrders,
            sorting: 'date',
            is_finished: false,
        })
                                     .catch((e) => {
                                         showMessage({
                                             message: 'Не удалось получить список ордеров',
                                             color: errorColor,
                                             timeout: timeoutHideMessage,
                                         });
                                         console.error('Не удалось получить список ордеров', e);
                                     });

        if (!buyBooks) {
            // Рекурсия
            if (recursive) {
                setTimeout(async () => await Item.createOrders(), settings.intervalToCreateOrders * 60 * 1000);
            }

            return false;
        }

        /**
         * Количество выставленных ордеров
         *
         * @type {number}
         */
        let countBuyBooks = buyBooks.count;

        // Уже максимальное количество ордеров
        if (countBuyBooks >= settings.maxOrders) {
            // Рекурсия
            if (recursive) {
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

        for(let page = 1; page <= settings.maxPages && (page === 1 || itemsTemp?.next); page++) {
            itemsTemp = await Sender.get(Url.items(), {
                format: 'json',
                on_sale: 1,
                price_min: settings.minCostOrder * (1 + settings.commission / 100 + settings.minProfitOrder(settings.minCostOrder) / 100),
                price_max: settings.maxCostOrder * (1 - settings.commission / 100 - settings.minProfitOrder(settings.minCostOrder) / 100),
                sorting: 'popular',
                page: page,
                limit: 72,
            })
                                    .catch((e) => {
                                        showMessage({
                                            message: 'Не удалось получить список предметов',
                                            color: errorColor,
                                            timeout: timeoutHideMessage,
                                        });
                                        console.error('Не удалось получить список предметов', e);
                                    });

            if (itemsTemp) {
                items = items.concat(itemsTemp.results);
            }
        }

        // Не удалось получить список предметов
        if (items.length === 0) {
            // Рекурсия
            if (recursive) {
                setTimeout(async () => await Item.createOrders(), settings.intervalToCreateOrders * 60 * 1000);
            }

            return false;
        }

        for(const item of items) {
            // Если достигнут предел заказов
            if (countBuyBooks >= settings.maxOrders) {
                break;
            }

            // Задержка между проверками 1 секунда
            await new Promise(async (resolve) => {
                const itemOrder = new Item(item.id, item.popularity, -1, item.name, '');
                const { id, name } = itemOrder;

                const orderPrice = await itemOrder.calcBuyPriceOrder(buyBooks.results);
                itemOrder.amount = orderPrice;

                // Если предмет прошел проверку
                if (orderPrice !== -1) {
                    if (!DEBUG_ORDER) {
                        const isPosted = await Sender.post(Url.buyBooks(), {
                            product_id: id,
                            quantity: 1,
                            price_val: (itemOrder.amount).toFixed(2),
                            is_gift: false,
                        })
                                                     .catch((e) => {
                                                         showMessage({
                                                             message: `Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
								Не удалось поставить ордер`,
                                                             color: errorColor,
                                                             timeout: timeoutHideMessage,
                                                         });
                                                         console.error(`Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
							\nНе удалось поставить ордер`, e);
                                                     });

                        if (isPosted) {
                            countBuyBooks++;

                            showMessage({
                                message: `Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
										Выставлен ордер`,
                                color: successColor,
                                timeout: timeoutHideMessage,
                            });
                            console.log(`Проверка предмета ${name} с ценой покупки ${(itemOrder.amount).toFixed(2)}
									\nВыставлен ордер`);
                        }
                    } else {
                        sendPushover('LD.market', `Заказ предмета ${name} с ценой покупки ${itemOrder.amount}\nУспешно заказан`);
                    }
                }

                setTimeout(resolve, 1000);
            });
        }

        // Рекурсия
        if (recursive) {
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
    static async reOrder(recursive = true) {
        // Список ордеров на покупку
        const buyBooks = await Sender.get(Url.buyBooks(), {
            format: 'json',
            page: 1,
            limit: settings.maxOrders,
            sorting: 'date',
            is_finished: false,
        })
                                     .catch((e) => {
                                         showMessage({
                                             message: 'Не удалось получить список ордеров',
                                             color: errorColor,
                                             timeout: timeoutHideMessage,
                                         });
                                         console.error('Не удалось получить список ордеров', e);
                                     });

        if (!buyBooks) {
            if (recursive) {
                setTimeout(async () => await Item.reOrder(), settings.intervalToReOrder * 60 * 1000);
            }

            return false;
        }

        for(const order of buyBooks.results) {
            if (!settings.isOrderEnabled) {
                await Sender.post(Url.removeOrder(), { id_slug: order.id })
                            .catch((e) => {
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
            const { name } = itemOrder;

            const orderPrice = await itemOrder.calcBuyPriceOrder(buyBooks.results);
            itemOrder.amount = orderPrice;

            // Если предмет прошел проверку
            if (orderPrice === -1) {
                continue;
            }

            if (!DEBUG_ORDER) {
                if (orderPrice === -1 || // Если предмет не выгодный, то убрать ордер
                    orderPrice !== order.price.amount + 0.01) // Если предмет выгодный и цена ордера
                                                              // изменилась
                {
                    const removeOrder = await Sender.post(Url.removeOrder(), { id_slug: order.id })
                                                    .catch((e) => {
                                                        showMessage({
                                                            message: `Проверка предмета ${name}
							Не удалось убрать ордер`,
                                                            color: errorColor,
                                                            timeout: timeoutHideMessage,
                                                        });
                                                        console.error(`Проверка предмета ${name}
						\nНе удалось убрать ордер`, e);
                                                    });

                    if (!removeOrder) {
                        continue;
                    }

                    // Если предмет выгодный
                    if (orderPrice !== -1 && orderPrice !== order.price.amount + 0.01) {
                        await Sender.post(Url.buyBooks(), {
                            product_id: order.product_id,
                            quantity: 1,
                            price_val: orderPrice.toFixed(2),
                            is_gift: false,
                        })
                                    .catch((e) => {
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
        if (recursive) {
            setTimeout(async () => await Item.reOrder(), settings.intervalToReOrder * 60 * 1000);
        }
    }

    /**
     * Проверка уведомлений
     *
     * @param {boolean} recursive - Рекурсивный вызов
     * @returns {Promise<boolean>}
     */
    static async checkNotifications(recursive = true) {
        // Новые уведомления
        const { results } = await Sender.get(Url.notifications());

        if (results?.length) {
            // От старых к новым уведомлениям
            const resultsRevert = results.reverse();

            for(const notification of resultsRevert) {
                if (!notification) {
                    continue;
                }

                switch(notification.kind) {
                    // Покупка предмета
                    case 'ocompleted': {
                        const { name, id } = notification.params.product;
                        const date = notification.added.date;
                        const price_buy = notification.params.price_caption.amount;

                        await firestore.collection('buys').add({
                            item_id: id,
                            item_name: name,
                            date: new Date(date),
                            price_buy,
                            price_sell: 0,
                            sold: false,
                        }).catch(error => {
                            console.error('Не удалось отправить новую покупку в БД', error);
                        });

                        sendPushover('LD.market', `Покупка предмета ${name} с ценой покупки ${price_buy} руб`);

                        break;
                    }
                    // Продажа предмета
                    case 'osold': {
                        // Купленный предмет
                        let bought;

                        await firestore
                        .collection('buys')
                        .where('item_id', '==', notification.params.product.id)
                        .where('sold', '==', false)
                        .orderBy('date')
                        .limit(1)
                        .get()
                        .then((querySnapshot) => {
                            if (!querySnapshot.empty) {
                                bought = querySnapshot.docs[0];
                            }
                        });

                        // Если нет записи о покупке в БД
                        if (!bought) {
                            continue;
                        }

                        // Цена продажи поступает с учетом комиссии (вычисляем без сумму комиссии)
                        const price_sell = notification.params.price_caption.amount * 100 / 85;

                        // Профит в рублях
                        const profitInRub = (price_sell * 0.85 - item.price_buy).toFixed(2);
                        // Профит в процентах
                        const profitInPercent = (profitInRub / (item.price_buy / 100)).toFixed(2);

                        // Изменение записи о покупке
                        await firestore.collection('buys').doc(bought.id).update({
                            price_sell,
                            sold: true,
                        }).then(async () => {
                            const item = bought.data();

                            const { item_id, item_name, price_buy } = item;

                            sendPushover('LD.market',
                                `Продажа предмета ${item_name}\nПрофит ${profitInRub} руб (${profitInPercent}%)`);

                            // Добавление продажи в БД
                            await firestore.collection('sells').add({
                                item_id,
                                item_name,
                                date: new Date(notification.added.date),
                                price_buy,
                                price_sell,
                            }).catch((error) => {
                                console.error('Не удалось отправить новую продажу в БД', error);
                            });
                        }).catch(error => {
                            console.error('Не удалось изменить информацию о покупке в БД', error);
                        });
                        break;
                    }
                }
            }

            try {
                // Очищение уведомлений
                await Sender.post(Url.clearNotifications(), { newest_id: results[0].id });
            }
            catch (error) {
                console.error('Не удалось очистить уведомления', error);
            }
        }

        // Рекурсия
        if (recursive) {
            setTimeout(async () => await Item.checkNotifications(), settings.intervalToCheckNewSells * 60 * 1000);
        }
    }
}
