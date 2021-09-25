import { NextFunction, Request, Response } from 'express';

import {getAssetsOfUser, getChartsInfo} from '../../utils/zerionFetcher';

export const getChart = async (req: Request, res: Response, next: NextFunction) => {
	let address: string = req.params.address;

	let chartData = await getChartsInfo(address);
	return res.json(chartData)
};

export const getAssets = async (req: Request, res: Response, next: NextFunction) => {
	let address: string = req.params.address;

	let data = await getAssetsOfUser(address);
	return res.json(data)
};
