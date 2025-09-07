import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { 
	avitoApiRequest, 
	validateRequiredFields, 
	validateItemIds 
} from '../GenericFunctions';

import {
	toYYYYMMDD,
	isStrictYYYYMMDD,
	daysDiffInclusiveUTC,
	addDaysUTC,
} from '../utils/date_normalize';

export async function callsStats(this: IExecuteFunctions, itemIndex: number) {
	const userId = this.getNodeParameter('userId', itemIndex) as number;
	const itemIdsParam = this.getNodeParameter('itemIds', itemIndex) as string;
	
	// Получаем «сырые» даты из UI
	const dateFromRaw = this.getNodeParameter('dateFrom', itemIndex) as string;
	const dateToRaw = this.getNodeParameter('dateTo', itemIndex) as string;

	// Валидация обязательных полей
	validateRequiredFields.call(this, this, itemIndex, { 
		userId, 
		dateFrom: dateFromRaw, 
		dateTo: dateToRaw 
	});

	// Нормализуем даты к YYYY-MM-DD
	let dateFrom = '';
	let dateTo = '';
	try {
		dateFrom = toYYYYMMDD(dateFromRaw);
		dateTo = toYYYYMMDD(dateToRaw);
	} catch (e: any) {
		throw new NodeOperationError(this.getNode(), e?.message || 'Некорректная дата', { itemIndex });
	}

	// Строгая проверка формата YYYY-MM-DD (без времени)
	if (!isStrictYYYYMMDD(dateFrom) || !isStrictYYYYMMDD(dateTo)) {
		throw new NodeOperationError(
			this.getNode(),
			'Дата должна быть в формате YYYY-MM-DD (без времени)',
			{ itemIndex },
		);
	}

	// Проверка порядка дат
	if (dateFrom > dateTo) {
		throw new NodeOperationError(
			this.getNode(),
			`Дата начала (${dateFrom}) позже даты окончания (${dateTo}). Пожалуйста, выберите более раннюю дату начала.`,
			{ itemIndex },
		);
	}

	// Ограничение глубины периода: максимум 270 дней (включительно)
	const span = daysDiffInclusiveUTC(dateFrom, dateTo);
	if (span > 270) {
		const recommendedFrom = addDaysUTC(dateTo, -269);
		const recommendedTo = addDaysUTC(dateFrom, 269);
		throw new NodeOperationError(
			this.getNode(),
			`Выбранный диапазон — ${span} дней, что больше максимально допустимых 270.
Рекомендация: при выбранной дате окончания ${dateTo} установите дату начала не ранее ${recommendedFrom}.
Либо при дате начала ${dateFrom} установите дату окончания не позднее ${recommendedTo}.`,
			{ itemIndex },
		);
	}

	// Валидация ID объявлений
	const itemIds = validateItemIds.call(this, this, itemIndex, itemIdsParam);

	return await avitoApiRequest.call(
		this,
		'POST',
		`/core/v1/accounts/${userId}/calls/stats/`,
		{
			itemIds,
			dateFrom,
			dateTo,
		},
		undefined,
		itemIndex,
	);
}