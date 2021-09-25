import express from 'express';
import jwt from 'express-jwt';

import { config } from '../../config';
import * as controller from './controller';

export const blockchainRouter = express.Router();

blockchainRouter.route('/chart/:address').patch(jwt(config), controller.getChart);
blockchainRouter.route('/assets/:address').patch(jwt(config), controller.getChart);
