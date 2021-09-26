import express from 'express';

import { config } from '../../config';
import * as controller from './controller';

export const blockchainRouter = express.Router();

blockchainRouter.route('/chart/:address').get(controller.getChart);
blockchainRouter.route('/assets/:address').get(controller.getAssets);
blockchainRouter.route('/profit/:address').get(controller.getProfit);
blockchainRouter.route('/profitSlice/:address').get(controller.getProfitSlice);
blockchainRouter.route('/profitSliceV2/:address').get(controller.getProfitSliceV2);
blockchainRouter.route('/profitSliceStep/:address').get(controller.getProfitSliceStep);
