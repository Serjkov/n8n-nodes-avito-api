import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { avitoApiRequest, validateRequiredFields } from '../GenericFunctions';

/**
 * Детализированные результаты выгрузки объявлений с пагинацией
 * API: GET /autoload/v2/reports/{report_id}/items
 * Scope: autoload:reports
 * Пагинация: page/per_page (page с 1)
 */
export async function getReportItems(this: IExecuteFunctions, itemIndex: number) {
	const startTime = Date.now();

	// Базовые параметры
	const reportId = this.getNodeParameter('reportId', itemIndex) as number;
	const page = this.getNodeParameter('itemsPage', itemIndex) as number;
	const perPage = this.getNodeParameter('itemsPerPage', itemIndex) as number;

	// Дополнительные фильтры
	const filters = this.getNodeParameter('itemsFilters', itemIndex, {}) as any;

	// Параметры пагинации
	const enablePagination = this.getNodeParameter('itemsEnablePagination', itemIndex, false) as boolean;
	const paginationType = this.getNodeParameter('itemsPaginationType', itemIndex, 'all') as 'all' | 'limit';
	const maxPages = this.getNodeParameter('itemsMaxPages', itemIndex, 20) as number;

	// Валидация
	validateRequiredFields.call(this, this, itemIndex, { reportId });

	if (page < 1) {
		throw new NodeOperationError(this.getNode(), 'Номер страницы должен быть больше 0', { itemIndex });
	}
	if (perPage < 1 || perPage > 200) {
		throw new NodeOperationError(this.getNode(), 'Количество на странице должно быть от 1 до 200', { itemIndex });
	}

	// Формируем параметры запроса
	const queryParams: any = { page, per_page: perPage };
	if (filters.ad_ids) queryParams.ad_ids = filters.ad_ids;
	if (filters.avito_ids) queryParams.avito_ids = filters.avito_ids;

	// Если пагинация отключена - выполняем простой запрос
	if (!enablePagination) {
		return await executeSingleItemsRequest(this, reportId, queryParams, itemIndex, startTime);
	}

	// Выполняем пагинированный запрос
	return await executePaginatedItemsRequest(
		this,
		reportId,
		queryParams,
		paginationType,
		maxPages,
		itemIndex,
		startTime,
	);
}

/**
 * Выполнение одного запроса объявлений (без пагинации)
 */
async function executeSingleItemsRequest(
	context: IExecuteFunctions,
	reportId: number,
	queryParams: any,
	itemIndex: number,
	startTime: number,
): Promise<any> {
	// ✅ ИСПРАВЛЕНО: Правильная версия API v2 вместо v1
	const response = await avitoApiRequest.call(
		context,
		'GET',
		`/autoload/v2/reports/${reportId}/items`, 
		undefined,
		queryParams,
		itemIndex,
	);

	if (!response || !Array.isArray(response.items)) {
		throw new NodeOperationError(context.getNode(), 'Получен некорректный ответ от Avito API', {
			itemIndex,
		});
	}

	const executionTime = Date.now() - startTime;

	return {
		...response,
		meta: {
			...response.meta,
			pagination_enabled: false,
			execution_time_ms: executionTime,
			single_request: true,
		},
	};
}

/**
 * Выполнение пагинированного запроса объявлений
 */
async function executePaginatedItemsRequest(
	context: IExecuteFunctions,
	reportId: number,
	baseQueryParams: any,
	paginationType: 'all' | 'limit',
	maxPages: number,
	itemIndex: number,
	startTime: number,
): Promise<any> {
	let currentPage = baseQueryParams.page;
	let pageCount = 0;
	const allItems: any[] = [];
	let totalAvailable: number | null = null;
	let totalPages: number | null = null;

	// Определяем макс. число страниц
	const effectiveMaxPages = paginationType === 'all' ? 1000 : Math.min(maxPages, 1000);

	try {
		while (pageCount < effectiveMaxPages) {
			const queryParams = {
				...baseQueryParams,
				page: currentPage,
			};

			// ✅ ИСПРАВЛЕНО: Правильная версия API v2 вместо v1
			const response = await avitoApiRequest.call(
				context,
				'GET',
				`/autoload/v2/reports/${reportId}/items`,  // Было: `/autoload/v1/reports/${reportId}/items`
				undefined,
				queryParams,
				itemIndex,
			);

			if (!response || !Array.isArray(response.items)) {
				break;
			}

			// Сохраняем мета-информацию из первого запроса
			if (pageCount === 0) {
				totalAvailable = response.meta?.total || null;
				totalPages = response.meta?.pages || null;
			}

			allItems.push(...response.items);
			pageCount++;

			// Проверяем условия остановки
			const receivedCount = response.items.length;
			const isLastPage = receivedCount < baseQueryParams.per_page;
			
			if (isLastPage) {
				break;
			}

			if (totalPages !== null && currentPage >= totalPages) {
				break;
			}

			currentPage++;
		}

		const executionTime = Date.now() - startTime;

		return {
			items: allItems,
			meta: {
				pagination_enabled: true,
				pagination_type: paginationType,
				pages_processed: pageCount,
				start_page: baseQueryParams.page,
				current_page: currentPage,
				per_page: baseQueryParams.per_page,
				total_fetched: allItems.length,
				total_available: totalAvailable,
				total_pages: totalPages,
				execution_time_ms: executionTime,
				max_pages_reached: pageCount >= effectiveMaxPages,
			},
		};
	} catch (error: any) {
		if (error instanceof NodeOperationError) {
			throw error;
		}

		throw new NodeOperationError(
			context.getNode(),
			'Критическая ошибка при выполнении пагинированного запроса объявлений',
			{
				itemIndex,
				description: `${error.message || 'Неизвестная ошибка'}. Получено ${allItems.length} объявлений до ошибки.`,
			},
		);
	}
}