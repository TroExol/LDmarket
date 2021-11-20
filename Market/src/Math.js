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
 * @returns {number | undefined} - Профит в %
 */
const calcProfit = (buy, sell) => {
	const profit = Math.round(((sell * (1 - settings.commission / 100) - buy) / buy) * 100);
	return profit != null && isFinite(profit) ? profit : undefined;
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
