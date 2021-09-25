import { client } from "defi-sdk";

// export const endpoint = "wss://api-staging.zerion.io";
// export const API_TOKEN = "Zerion.0JOY6zZTTw6yl5Cvz9sdmXc7d5AhzVMG";

export const endpoint = "wss://api-v4.zerion.io";
export const API_TOKEN = "Zerion.oSQAHALTonDN9HYZiYSX5k6vnm4GZNcM";

client.configure({ url: endpoint, apiToken: API_TOKEN });

export const getAssetsOfUser = (address: string) => {
	return new Promise((resolve, reject) => {
		let unsubscribe = client.subscribe({
			namespace: "address",
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

export const getLastTransactions = (address: string, transactions_limit: number = 100) => {
	return new Promise((resolve, reject) => {
		let unsubscribe = client.subscribe({
			namespace: "address",
			body: {
				scope: ["transactions"],
				payload: {
					address: address,
					currency: "usd",
					transactions_limit: transactions_limit
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
