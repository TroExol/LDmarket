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
	})
	.catch(e => console.error(`Не удалось отправить сообщение в Pushover`, e));
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
