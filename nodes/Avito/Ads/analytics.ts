import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { avitoApiRequest } from '../GenericFunctions';
import {
	toYYYYMMDD,
	daysDiffInclusiveUTC,
	addDaysUTC,
	safeJsonParse,
	isStrictYYYYMMDD,
} from '../utils/date_normalize';

/**
 * Запрос статистики по объявлениям (Analytics) с поддержкой пагинации (вариант B)
 * Документация Авито: /stats/v2/accounts/{userId}/items
 */
export async function analytics(this: IExecuteFunctions, itemIndex: number) {
	const startTime = Date.now();

	// Параметры ноды
	const userId = this.getNodeParameter('userId', itemIndex) as number;
	const dateFromRaw = this.getNodeParameter('analyticsDateFrom', itemIndex) as string;
	const dateToRaw = this.getNodeParameter('analyticsDateTo', itemIndex) as string;
	const grouping = this.getNodeParameter('analyticsGrouping', itemIndex) as string;
	const metrics = this.getNodeParameter('analyticsMetrics', itemIndex) as string[];

	// Параметры пагинации
	const enablePagination = this.getNodeParameter('analyticsEnablePagination', itemIndex, false) as boolean;
	const paginationType = this.getNodeParameter('analyticsPaginationType', itemIndex, 'all') as 'all' | 'limit';
	const maxRequests = this.getNodeParameter('analyticsMaxRequests', itemIndex, 10) as number;
	const customLimit = this.getNodeParameter('analyticsLimit', itemIndex, 1000) as number;
	const startOffset = this.getNodeParameter('analyticsOffset', itemIndex, 0) as number;

	const additionalFields = this.getNodeParameter('analyticsAdditionalFields', itemIndex, {}) as {
		filter?: string;
		sort?: string;
	};

	// Базовые проверки
	if (!userId || typeof userId !== 'number' || !Number.isFinite(userId) || userId <= 0) {
		throw new NodeOperationError(this.getNode(), 'Укажите корректный ID пользователя (> 0)', { itemIndex });
	}
	if (!dateFromRaw || !dateToRaw) {
		throw new NodeOperationError(this.getNode(), 'Укажите дату начала и окончания', { itemIndex });
	}

	// Нормализация дат к YYYY-MM-DD
	let dateFrom: string;
	let dateTo: string;
	try {
		dateFrom = toYYYYMMDD(dateFromRaw);
		dateTo = toYYYYMMDD(dateToRaw);
	} catch (e: any) {
		throw new NodeOperationError(this.getNode(), e?.message || 'Некорректная дата', { itemIndex });
	}

	// Строгий формат
	if (!isStrictYYYYMMDD(dateFrom) || !isStrictYYYYMMDD(dateTo)) {
		throw new NodeOperationError(
			this.getNode(),
			'Дата должна быть в формате YYYY-MM-DD (без времени)',
			{ itemIndex },
		);
	}

	// Порядок дат
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

	// Базовое тело запроса
	const baseRequestBody: Record<string, any> = {
		dateFrom,
		dateTo,
		grouping,
		metrics,
	};

	// Доп. параметры (валидируем JSON)
	if (additionalFields?.filter) {
		try {
			baseRequestBody.filter = safeJsonParse(additionalFields.filter, 'Некорректный JSON в поле "Фильтр По Объявлениям"');
		} catch (e: any) {
			throw new NodeOperationError(this.getNode(), e.message, { itemIndex });
		}
	}
	if (additionalFields?.sort) {
		try {
			baseRequestBody.sort = safeJsonParse(additionalFields.sort, 'Некорректный JSON в поле "Сортировка"');
		} catch (e: any) {
			throw new NodeOperationError(this.getNode(), e.message, { itemIndex });
		}
	}

	// Без пагинации — простой запрос
	if (!enablePagination) {
		return await executeSingleAnalyticsRequest(
			this,
			baseRequestBody,
			userId,
			customLimit,
			startOffset,
			itemIndex,
			startTime,
		);
	}

	// Для grouping = totals пагинация не нужна
	if (grouping === 'totals') {
		return await executeSingleAnalyticsRequest(
			this,
			baseRequestBody,
			userId,
			customLimit,
			startOffset,
			itemIndex,
			startTime,
		);
	}

	// Пагинированный сценарий — возвращаем МАССИВ результатов по страницам
	return await executePaginatedAnalyticsRequest(
		this,
		baseRequestBody,
		userId,
		paginationType,
		maxRequests,
		customLimit,
		startOffset,
		itemIndex,
		startTime,
	);
}

/**
 * Выполнение одного запроса аналитики (без пагинации)
 * Возвращает один объект (как и раньше).
 */
async function executeSingleAnalyticsRequest(
	context: IExecuteFunctions,
	baseRequestBody: Record<string, any>,
	userId: number,
	limit: number,
	offset: number,
	itemIndex: number,
	startTime: number,
): Promise<any> {
	const requestBody = {
		...baseRequestBody,
		limit: Math.min(limit, 1000), // Авито максимум 1000
		offset,
	};

	const response = await avitoApiRequest.call(
		context,
		'POST',
		`/stats/v2/accounts/${userId}/items`,
		requestBody,
		undefined,
		itemIndex,
	);

	const executionTime = Date.now() - startTime;

	const result = response.result || {};
	const groupings = result.groupings || [];

	return {
		result: {
			...result,
			meta: {
				pagination_enabled: false,
				total_fetched: groupings.length,
				execution_time_ms: executionTime,
				single_request: true,
				limit: requestBody.limit,
				offset: requestBody.offset,
			},
		},
	};
}

/**
 * Выполнение пагинированного запроса аналитики
 * Вариант B: возвращаем массив объектов по каждой «странице».
 */
async function executePaginatedAnalyticsRequest(
	context: IExecuteFunctions,
	baseRequestBody: Record<string, any>,
	userId: number,
	paginationType: 'all' | 'limit',
	maxRequests: number,
	customLimit: number,
	startOffset: number,
	itemIndex: number,
	startTime: number,
): Promise<any[]> {
	const maxRequestLimit = 1000; // Авито API максимум за один запрос
	const delayBetweenRequests = 61000; // 61 секунда (больше минимума 60 сек)
	const maxRetriesFor429 = 3;

	// Определяем макс. число запросов
	const effectiveMaxRequests = paginationType === 'all' ? 50 : Math.min(maxRequests, 50);

	// Лимит на страницу — используем пользовательский, но не выше лимита API
	const effectiveLimit = Math.min(customLimit, maxRequestLimit);

	let currentOffset = startOffset;
	let requestCount = 0;
	let totalDataCount: number | null = null;
	let dataTotalCountMissing = false;
	let hasMoreData = true;

	// Массив результатов по страницам
	const pageResults: any[] = [];

	const doRequestWith429Retry = async (body: Record<string, any>) => {
		let retryCount = 0;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			try {
				const resp = await avitoApiRequest.call(
					context,
					'POST',
					`/stats/v2/accounts/${userId}/items`,
					body,
					undefined,
					itemIndex,
				);
				return resp;
			} catch (error: any) {
				if (error.response?.status === 429 && retryCount < maxRetriesFor429) {
					retryCount++;
					// увеличиваем задержку с каждым ретраем, но не более 3 минут
					const retryDelay = Math.min(180000, delayBetweenRequests * (retryCount + 1));
					await new Promise(resolve => (globalThis as any).setTimeout(resolve, retryDelay));
					continue;
				}
				throw error;
			}
		}
	};

	try {
		// ================= ПЕРВЫЙ ЗАПРОС =================
		const firstRequestBody = {
			...baseRequestBody,
			limit: effectiveLimit,
			offset: currentOffset,
		};

		const firstResponse: any = await doRequestWith429Retry(firstRequestBody);

		if (!firstResponse || !firstResponse.result) {
			throw new NodeOperationError(
				context.getNode(),
				'Получен некорректный ответ от Avito API',
				{ itemIndex },
			);
		}

		const firstResult = firstResponse.result;
		const firstGroupings = firstResult.groupings || [];
		requestCount = 1;

		// Определяем общее количество, если есть
		if (firstResult.dataTotalCount !== undefined && firstResult.dataTotalCount !== null) {
			totalDataCount = firstResult.dataTotalCount;
		} else {
			dataTotalCountMissing = true;
		}

		// Добавляем «страницу» №1
		pageResults.push({
			result: {
				...firstResult,
				groupings: firstGroupings,
				meta: {
					pagination_enabled: true,
					pagination_needed: firstGroupings.length >= effectiveLimit, // нужна ли потенциально ещё одна страница
					pagination_type: paginationType,
					page: 1,
					limit: effectiveLimit,
					offset: currentOffset,
					total_fetched: firstGroupings.length,
					total_available: totalDataCount,
					data_total_count_missing: dataTotalCountMissing,
					execution_time_ms: Date.now() - startTime,
				},
			},
		});

		// Если дополнительная пагинация не нужна — выходим массивом из одной страницы
		let paginationNeeded = firstGroupings.length >= effectiveLimit;
		if (!dataTotalCountMissing && totalDataCount !== null) {
			if (startOffset + firstGroupings.length >= totalDataCount) {
				paginationNeeded = false;
			}
		}
		if (!paginationNeeded) {
			return pageResults;
		}

		// Обновляем offset
		currentOffset += effectiveLimit;

		// ================= ПРОДОЛЖАЕМ ПАГИНАЦИЮ =================
		while (hasMoreData && requestCount < effectiveMaxRequests) {
			const requestBody = {
				...baseRequestBody,
				limit: effectiveLimit,
				offset: currentOffset,
			};

			// Обязательная задержка между запросами
			await new Promise(resolve => (globalThis as any).setTimeout(resolve, delayBetweenRequests));

			const response: any = await doRequestWith429Retry(requestBody);

			if (!response || !response.result) {
				throw new NodeOperationError(
					context.getNode(),
					'Получен некорректный ответ от Avito API',
					{ itemIndex },
				);
			}

			const result = response.result;
			const groupings = result.groupings || [];
			requestCount++;

			// Если раньше был dataTotalCount, но теперь пропал — делаем пометку в meta текущей страницы
			const pageDataTotalCountMissing =
				result.dataTotalCount === undefined || result.dataTotalCount === null;

			// Добавляем текущую «страницу»
			pageResults.push({
				result: {
					...result,
					groupings,
					// Выровняем dataTotalCount по первому запросу, если он пропал дальше
					dataTotalCount: !pageDataTotalCountMissing && result.dataTotalCount != null
						? result.dataTotalCount
						: totalDataCount,
					meta: {
						pagination_enabled: true,
						pagination_needed: true,
						pagination_type: paginationType,
						page: pageResults.length + 1, // следующая страница
						limit: effectiveLimit,
						offset: currentOffset,
						total_fetched: groupings.length,
						total_available: totalDataCount,
						data_total_count_missing: pageDataTotalCountMissing,
						execution_time_ms: Date.now() - startTime,
						delay_between_requests_ms: delayBetweenRequests,
						...(pageDataTotalCountMissing && {
							warning:
								'dataTotalCount отсутствует в этом ответе API — условия остановки определяются по длине страницы',
						}),
					},
				},
			});

			// Условия остановки:
			const stopByRecordCount = groupings.length < effectiveLimit;
			let stopByTotalCount = false;
			if (!dataTotalCountMissing && totalDataCount !== null) {
				// текущий оффсет указывает на начало текущей страницы
				// если следующая страница начнётся за пределом total — останавливаемся
				stopByTotalCount = currentOffset + effectiveLimit >= totalDataCount;
			}

			if (stopByRecordCount || stopByTotalCount) {
				hasMoreData = false;
			} else {
				currentOffset += effectiveLimit;
			}
		}

		return pageResults;
	} catch (error: any) {
		if (error instanceof NodeOperationError) {
			throw error;
		}
		throw new NodeOperationError(
			context.getNode(),
			'Критическая ошибка при выполнении пагинированного запроса аналитики',
			{
				itemIndex,
				description: `${error.message || 'Неизвестная ошибка'}. Успешно получено страниц: ${requestCount}.`,
			},
		);
	}
}
