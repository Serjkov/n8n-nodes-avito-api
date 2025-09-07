import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Импорт операций с объявлениями
import { analytics } from '../Ads/analytics';
import { applyVas } from '../Ads/applyVas';
import { callsStats } from '../Ads/callsStats';
import { getItemInfo } from '../Ads/getItemInfo';
import { getItems } from '../Ads/getItems';
import { getVasPrices } from '../Ads/getVasPrices';
import { statsShallow } from '../Ads/statsShallow';
import { updatePrice } from '../Ads/updatePrice';

// Импорт операций продвижения
import { getBids } from '../Promotion/getBids';
import { getPromotionsByItemIds } from '../Promotion/getPromotionsByItemIds';
import { remove } from '../Promotion/removePromotion';
import { setAuto } from '../Promotion/setAuto';
import { setManual } from '../Promotion/setManual';

// Импорт операций с рейтингами и отзывами
import { getRatingInfo } from '../Ratings/getRatingInfo';
import { getReviews } from '../Ratings/getReviews';
import { createAnswer } from '../Ratings/createAnswer';
import { removeAnswer } from '../Ratings/removeAnswer';

// Импорт операций автозагрузки
import { getCategoryTree } from '../Autoload/getCategoryTree';
import { getCategoryFields } from '../Autoload/getCategoryFields';
import { getProfile } from '../Autoload/getProfile';
import { createOrUpdateProfile } from '../Autoload/createOrUpdateProfile';
import { getReports } from '../Autoload/getReports';
import { getLastReport } from '../Autoload/getLastReport';
import { getReportById } from '../Autoload/getReportById';
import { getReportItems } from '../Autoload/getReportItems';
import { getReportItemsFees } from '../Autoload/getReportItemsFees';
import { uploadFile } from '../Autoload/uploadFile';
import { getAutoloadItemsInfoV2 } from '../Autoload/getAutoloadItemsInfoV2';
import { getAdIdsByAvitoIds } from '../Autoload/getAdIdsByAvitoIds';
import { getAvitoIdsByAdIds } from '../Autoload/getAvitoIdsByAdIds';

export async function routeItemOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	switch (operation) {
		case 'getItems':
			return await getItems.call(this, itemIndex);
		case 'getItemInfo':
			return await getItemInfo.call(this, itemIndex);
		case 'updatePrice':
			return await updatePrice.call(this, itemIndex);
		case 'applyVas':
			return await applyVas.call(this, itemIndex);
		case 'getVasPrices':
			return await getVasPrices.call(this, itemIndex);
		case 'callsStats':
			return await callsStats.call(this, itemIndex);
		case 'statsShallow':
			return await statsShallow.call(this, itemIndex);
		case 'analytics':
			return await analytics.call(this, itemIndex);
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown item operation: ${operation}`,
				{ itemIndex },
			);
	}
}

export async function routePromotionOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	switch (operation) {
		case 'getBids':
			return await getBids.call(this, itemIndex);
		case 'getPromotionsByItemIds':
			return await getPromotionsByItemIds.call(this, itemIndex);
		case 'setManual':
			return await setManual.call(this, itemIndex);
		case 'setAuto':
			return await setAuto.call(this, itemIndex);
		case 'remove':
			return await remove.call(this, itemIndex);
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown promotion operation: ${operation}`,
				{ itemIndex },
			);
	}
}

/**
 * Роутер для операций с рейтингами и отзывами
 */
export async function routeRatingsOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	switch (operation) {
		case 'getRatingInfo':
			return await getRatingInfo.call(this, itemIndex);
		case 'getReviews':
			return await getReviews.call(this, itemIndex);
		case 'createAnswer':
			return await createAnswer.call(this, itemIndex);
		case 'removeAnswer':
			return await removeAnswer.call(this, itemIndex);
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown ratings operation: ${operation}`,
				{ itemIndex },
			);
	}
}

/**
 * Роутер для операций автозагрузки
 */
export async function routeAutoloadOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<any> {
	switch (operation) {
		case 'getCategoryTree':
			return await getCategoryTree.call(this, itemIndex);
		case 'getProfile':
			return await getProfile.call(this, itemIndex);
		case 'createOrUpdateProfile':
			return await createOrUpdateProfile.call(this, itemIndex);
		case 'getReports':
			return await getReports.call(this, itemIndex);
		case 'getLastReport':
			return await getLastReport.call(this, itemIndex);
		case 'getReportById':
			return await getReportById.call(this, itemIndex);
		case 'getReportItems':
			return await getReportItems.call(this, itemIndex);
		case 'getReportItemsFees':
			return await getReportItemsFees.call(this, itemIndex);
		case 'uploadFile':
			return await uploadFile.call(this, itemIndex);
		case 'getCategoryFields':
			return await getCategoryFields.call(this, itemIndex);
		case 'getAutoloadItemsInfoV2':
			return await getAutoloadItemsInfoV2.call(this, itemIndex);
		case 'getAdIdsByAvitoIds':
			return await getAdIdsByAvitoIds.call(this, itemIndex);
		case 'getAvitoIdsByAdIds':
			return await getAvitoIdsByAdIds.call(this, itemIndex);
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown autoload operation: ${operation}`,
				{ itemIndex },
			);
	}
}