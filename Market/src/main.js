window.addEventListener('load', async () =>
{
	/**
	 * Блок для сообщений
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
	await Item.checkNotifications();
});
