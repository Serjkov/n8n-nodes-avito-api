import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	avitoApiRequest,
	validateRequiredFields,
	validateItemIds,
} from '../GenericFunctions';

import {
	toYYYYMMDD,
	isStrictYYYYMMDD,
	daysDiffInclusiveUTC,
	addDaysUTC,
} from '../utils/date_normalize';

export async function statsShallow(this: IExecuteFunctions, itemIndex: number) {
	const userId = this.getNodeParameter('userId', itemIndex) as number;
	const itemIds = this.getNodeParameter('itemIds', itemIndex) as string;

	// «сырые» даты из UI
	const dateFromRaw = this.getNodeParameter('dateFrom', itemIndex) as string;
	const dateToRaw   = this.getNodeParameter('dateTo', itemIndex) as string;

	// опции с дефолтами
	const fields = this.getNodeParameter('statsFields', itemIndex, [
		'uniqViews',
		'uniqContacts',
		'uniqFavorites',
	]) as string[];

	const periodGrouping = this.getNodeParameter('periodGrouping', itemIndex, 'day') as string;

	// обязательные поля
	validateRequiredFields.call(this, this, itemIndex, {
		userId,
		dateFrom: dateFromRaw,
		dateTo: dateToRaw,
	});

	// 1) нормализуем даты к YYYY-MM-DD
	let dateFrom = '';
	let dateTo = '';
	try {
		dateFrom = toYYYYMMDD(dateFromRaw);
		dateTo   = toYYYYMMDD(dateToRaw);
	} catch (e: any) {
		throw new NodeOperationError(this.getNode(), e?.message || 'Некорректная дата', { itemIndex });
	}

	// 2) строгая проверка формата YYYY-MM-DD (без времени)
	if (!isStrictYYYYMMDD(dateFrom) || !isStrictYYYYMMDD(dateTo)) {
		throw new NodeOperationError(
			this.getNode(),
			'Дата должна быть в формате YYYY-MM-DD (без времени)',
			{ itemIndex },
		);
	}

	// 3) бизнес-валидация диапазона с подсказкой
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


	// 4) валидируем список ID
	const validItemIds = validateItemIds.call(this, this, itemIndex, itemIds, 200);

	// тело запроса
	const requestBody: Record<string, any> = {
		itemIds: validItemIds,
		dateFrom,
		dateTo,
	};

	if (fields && fields.length > 0) requestBody.fields = fields;
	if (periodGrouping) requestBody.periodGrouping = periodGrouping;

	return await avitoApiRequest.call(
		this,
		'POST',
		`/stats/v1/accounts/${userId}/items`,
		requestBody,
		undefined,
		itemIndex,
	);
}