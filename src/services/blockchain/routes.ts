import express from 'express';

import { config } from '../../config';
import * as controller from './controller';

export const blockchainRouter = express.Router();

blockchainRouter.route('/chart/:address').get(controller.getChart);
blockchainRouter.route('/assets/:address').get(controller.getChart);
blockchainRouter.route('/profit/:address').get(controller.getProfit);
