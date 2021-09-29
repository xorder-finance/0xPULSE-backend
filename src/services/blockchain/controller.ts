import { NextFunction, Request, Response } from 'express';

import {getAssetsOfUser, getChartsInfo, getProfitsInfo, getProfitsSlice, getProfitsSliceV2, getProfitsSliceStep} from '../../utils/zerionFetcher';

const parseAllTxs = (req: Request): boolean => {
	let allTxs: boolean = false;
	if (req.query.allTxs == "true" || req.query.allTxs == "1") {
		allTxs = true;
	}
	return allTxs;
}

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
	let txStartOffset: number = -1;
	let txEndOffset: number = 0;
	let allTxs: boolean = parseAllTxs(req);

	if (req.query.txStartOffset && req.query.txStartOffset != "") {
		txStartOffset = Number.parseInt(req.query.txStartOffset!.toString());
	}
	if (req.query.txEndOffset && req.query.txEndOffset != "") {
		txEndOffset = Number.parseInt(req.query.txEndOffset!.toString());
	} 
	
	let data = await getProfitsInfo(address, txStartOffset, txEndOffset, allTxs);
	return res.json(data)
};

export const getProfitSlice = async (req: Request, res: Response, next: NextFunction) => {
	let address: string = req.params.address;
	let allTxs: boolean = parseAllTxs(req);

	let data = await getProfitsSlice(address, allTxs);
	return res.json(data)
};

export const getProfitSliceV2 = async (req: Request, res: Response, next: NextFunction) => {
	let address: string = req.params.address;
	let allTxs: boolean = parseAllTxs(req);

	let data = await getProfitsSliceV2(address, allTxs);
	return res.json(data)
};

export const getProfitSliceStep = async (req: Request, res: Response, next: NextFunction) => {
	let address: string = req.params.address;
	let allTxs: boolean = parseAllTxs(req);
	let step: number = Number.parseInt(req.query.step!.toString());
	if (!req.query.step || req.query.step == "") {
		step = 5;
	}
	
	let data = await getProfitsSliceStep(address, step, allTxs);
	return res.json(data)
};