import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { avitoApiRequest } from '../GenericFunctions';

/**
 * Получение списка отчетов автозагрузки с пагинацией
 * API: GET /autoload/v2/reports
 * Scope: autoload:reports
 * Пагинация: page/per_page (page с 1)
 */
export async function getReports(this: IExecuteFunctions, itemIndex: number) {
	const startTime = Date.now();

	// Базовые параметры
	const page = this.getNodeParameter('page', itemIndex) as number;
	const perPage = this.getNodeParameter('perPage', itemIndex) as number;

	// Параметры пагинации
	const enablePagination = this.getNodeParameter('enablePagination', itemIndex, false) as boolean;
	const paginationType = this.getNodeParameter('paginationType', itemIndex, 'all') as 'all' | 'limit';
	const maxPages = this.getNodeParameter('maxPages', itemIndex, 10) as number;
	const enableDelay = this.getNodeParameter('enableDelay', itemIndex, false) as boolean;
	const requestDelay = this.getNodeParameter('requestDelay', itemIndex, 200) as number;

	// Валидация параметров
	if (page < 1) {
		throw new NodeOperationError(this.getNode(), 'Номер страницы должен быть больше 0', { itemIndex });
	}
	if (perPage < 1 || perPage > 200) {
		throw new NodeOperationError(this.getNode(), 'Количество на странице должно быть от 1 до 200', { itemIndex });
	}

	// Если пагинация отключена - выполняем простой запрос
	if (!enablePagination) {
		return await executeSingleReportsRequest(this, page, perPage, itemIndex, startTime);
	}

	// Выполняем пагинированный запрос
	return await executePaginatedReportsRequest(
		this,
		page,
		perPage,
		paginationType,
		maxPages,
		enableDelay,
		requestDelay,
		itemIndex,
		startTime,
	);
}

/**
 * Выполнение одного запроса отчетов (без пагинации)
 */
async function executeSingleReportsRequest(
	context: IExecuteFunctions,
	page: number,
	perPage: number,
	itemIndex: number,
	startTime: number,
): Promise<any> {
	const response = await avitoApiRequest.call(
		context,
		'GET',
		'/autoload/v2/reports',
		undefined,
		{ page, per_page: perPage },
		itemIndex,
	);

	if (!response || !Array.isArray(response.reports)) {
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
 * Выполнение пагинированного запроса отчетов
 */
async function executePaginatedReportsRequest(
	context: IExecuteFunctions,
	startPage: number,
	perPage: number,
	paginationType: 'all' | 'limit',
	maxPages: number,
	enableDelay: boolean,
	requestDelay: number,
	itemIndex: number,
	startTime: number,
): Promise<any> {
	let currentPage = startPage;
	let pageCount = 0;
	const allReports: any[] = [];
	let totalAvailable: number | null = null;
	let totalPages: number | null = null;

	// Определяем макс. число страниц
	const effectiveMaxPages = paginationType === 'all' ? 1000 : Math.min(maxPages, 1000);

	try {
		while (pageCount < effectiveMaxPages) {
			// Применяем задержку (кроме первого запроса)
			if (enableDelay && pageCount > 0 && requestDelay > 0) {
				await new Promise(resolve => (globalThis as any).setTimeout(resolve, requestDelay));
			}

			const response = await avitoApiRequest.call(
				context,
				'GET',
				'/autoload/v2/reports',
				undefined,
				{ page: currentPage, per_page: perPage },
				itemIndex,
			);

			if (!response || !Array.isArray(response.reports)) {
				break;
			}

			// Сохраняем мета-информацию из первого запроса
			if (pageCount === 0) {
				totalAvailable = response.meta?.total || null;
				totalPages = response.meta?.pages || null;
			}

			allReports.push(...response.reports);
			pageCount++;

			// Проверяем условия остановки
			const receivedCount = response.reports.length;
			const isLastPage = receivedCount < perPage;
			
			// Останавливаемся если получили меньше записей чем лимит
			if (isLastPage) {
				break;
			}

			// Останавливаемся если достигли общего количества страниц
			if (totalPages !== null && currentPage >= totalPages) {
				break;
			}

			currentPage++;
		}

		const executionTime = Date.now() - startTime;

		return {
			reports: allReports,
			meta: {
				pagination_enabled: true,
				pagination_type: paginationType,
				pages_processed: pageCount,
				start_page: startPage,
				current_page: currentPage,
				per_page: perPage,
				total_fetched: allReports.length,
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
			'Критическая ошибка при выполнении пагинированного запроса отчетов',
			{
				itemIndex,
				description: `${error.message || 'Неизвестная ошибка'}. Получено ${allReports.length} отчетов до ошибки.`,
			},
		);
	}
}