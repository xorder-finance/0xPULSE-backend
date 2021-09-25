import { NextFunction, Request, Response } from 'express';

import {getAssetsOfUser, getChartsInfo, getProfitsInfo, getProfitsSlice} from '../../utils/zerionFetcher';

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

export const getProfit = async (req: Request, res: Response, next: NextFunction) => {
	let address: string = req.params.address;
	let txStartOffset: number;
	let txEndOffset;
	if (!req.query.txStartOffset || req.query.txStartOffset == "") {
		txStartOffset = -1;
	} else {
		txStartOffset = Number.parseInt(req.query.txStartOffset!.toString());
	}
	if (!req.query.txEndOffset || req.query.txStartOffset == "") {
		txEndOffset = 0;
	} else {
		txEndOffset = Number.parseInt(req.query.txEndOffset!.toString());
	}

	let data = await getProfitsInfo(address, txStartOffset, txEndOffset);
	return res.json(data)
};

export const getProfitSlice = async (req: Request, res: Response, next: NextFunction) => {
	let address: string = req.params.address;
	let data = await getProfitsSlice(address);
	return res.json(data)
};