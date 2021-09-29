import { client } from "defi-sdk";
import { calcProfitForPeriodInTx, calcProfitRelativeChange, calcProfitRelativeChangeV2, calcProfitRelativeChangeStep } from "./additionalFunctions";

// export const endpoint = "wss://api-staging.zerion.io";
// export const API_TOKEN = "Zerion.0JOY6zZTTw6yl5Cvz9sdmXc7d5AhzVMG";

export const endpoint = "wss://api-v4.zerion.io";
export const API_TOKEN = "Zerion.oSQAHALTonDN9HYZiYSX5k6vnm4GZNcM";
export const TRANSACTIONS_LIMIT = 100;

client.configure({ url: endpoint, apiToken: API_TOKEN });

export const getAssetsOfUser = (address: string) => {
	return new Promise((resolve, reject) => {
		let unsubscribe = client.subscribe({
			namespace: "address",
			method: "get",
			body: {
				scope: ["assets"],
				payload: {
					address: address,
					currency: "usd"
				}
			},

			onMessage: (event: any, data: any) => {
				unsubscribe();
				resolve(data);
			}
		});
	});
}

export const getLastTransactions = (address: string, transactions_limit: number = TRANSACTIONS_LIMIT, transactions_offset: number = 0): Promise<Array<any>> => {
	return new Promise((resolve, reject) => {
		let unsubscribe = client.subscribe({
			namespace: "address",
			method: "get",
			body: {
				scope: ["transactions"],
				payload: {
					address: address,
					currency: "usd",
					transactions_limit,
					transactions_offset,
				}
			},

			onMessage: (event: any, data: any) => {
				unsubscribe();

				let transactions = data["payload"]["transactions"]
				resolve(transactions);
			}
		});
	});
}

export const getTransactions = async (address: string, allTxs: boolean): Promise<Array<any>> => {
	let userTx = await getLastTransactions(address);
	if (!allTxs) {
		return userTx;
	}

	let userTxs: Array<any> = userTx;
	let offset = TRANSACTIONS_LIMIT;
	while (userTx.length == TRANSACTIONS_LIMIT) {
		userTx = await getLastTransactions(address, TRANSACTIONS_LIMIT, offset);
		userTxs.push.apply(userTxs, userTx);
		offset += TRANSACTIONS_LIMIT;
	}
	return userTxs;
}

export const getChartsInfo = (address: string) => {
	return new Promise((resolve, reject) => {
		let unsubscribe = client.subscribe({
			namespace: "address",
			method: "get",
			body: {
				scope: ["charts"],
				payload: {
					address: address,
					currency: "usd",
					charts_max_assets: 0,
					charts_min_percentage: 100,
					charts_type: "d"
				}
			},

			onMessage: (event: any, data: any) => {
				unsubscribe();

				let charts = data["payload"]["charts"]
				resolve(charts);
			}
		});
	});
}

export const getProfitsInfo = async (address: string, txStartOffset: number, txEndOffset: number, allTxs: boolean) => {

	let userAssets = await getAssetsOfUser(address);
	let userTx = await getTransactions(address, allTxs);
	//let profit = caclProfitForPeriod(0, 1700000000, false, data2, data);
	let profit: number = calcProfitForPeriodInTx(txStartOffset, txEndOffset, false, userTx, userAssets);
	return profit;
}

export const getProfitsSlice = async (address: string, allTxs: boolean) => {

	let userAssets = await getAssetsOfUser(address);
	let userTx = await getTransactions(address, allTxs);

	let profitSlice = calcProfitRelativeChange(false, userTx, userAssets);
	return profitSlice;
}

export const getProfitsSliceV2 = async (address: string, allTxs: boolean) => {

	let userAssets = await getAssetsOfUser(address);
	let userTx = await getTransactions(address, allTxs);

	let profitSlice = calcProfitRelativeChangeV2(false, userTx, userAssets);
	return profitSlice;
}

export const getProfitsSliceStep = async (address: string, step: number, allTxs: boolean) => {

	let userAssets = await getAssetsOfUser(address);
	let userTx = await getTransactions(address, allTxs);

	let profitSlice = calcProfitRelativeChangeStep(step, false, userTx, userAssets);
	return profitSlice;
}

// (async () => {
//
// 	let address = "0x7712bdab7c9559ec64a1f7097f36bc805f51ff1a";
//
// 	console.log("Start work with", address)
//
// 	let data = await getChartsInfo(address);
// 	console.log("Chart", data);
//
// 	// let data = await getAssetsOfUser(address);
// 	// console.log(JSON.stringify(data, null, 2));
// 	//
// 	// let data2 = await getLastTransactions(address);
// 	// console.log(JSON.stringify(data2, null, 2));
// 	//
// 	// data2 = await getLastTransactions(address);
// 	// console.log(JSON.stringify(data2, null, 2));
//
// })();
