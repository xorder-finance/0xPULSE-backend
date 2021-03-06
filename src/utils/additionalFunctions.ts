// Traders assets
// 0xf41feb3d6610138f4731e4397a6313e225171a9b + lox
// 0x7d535ffeb4325623c57aca30b882c7911ee40e53 + cool
// 0xae7861c80d03826837a50b45aecf11ec677f6586 + slabo
// 0x931b23DaC01EF88BE746d752252D831464a3834C +
// 0xc2090311dd1671a4afd8e0b4cd1255f15109369d + lox
// 0x13257586918a972a886b370678a877a12f31552b + cool

type Token = {
    price: number,
    amount: number,
    decimals: number
}

type Snap = {
    send: number,
    receive: number,
    fee: number,
    balance: Record<string, Token>,
    timestamp: number
}

function cloneSnap(snap: Snap): Snap {
    let newSnap: Snap = {send: snap.send, receive: snap.receive, fee: snap.fee, balance: {}, timestamp: snap.timestamp};
    for (let token in snap.balance) {
        newSnap.balance[token] = {price: snap.balance[token].price, amount: snap.balance[token].amount, decimals: snap.balance[token].decimals};
    }
    return newSnap;
}

function assetInUsd(change: any): number {
    return change.value * change.price / (10 ** change.asset.decimals);
}

function getChanges(tx: any): Array<[string, Token]> {
    let prices: Array<[string, Token]> = [];
    for (let change of tx.changes) {
        let balChange: number = change.value / (10 ** change.asset.decimals);
        if (change.direction == "out") {
            balChange = -balChange;
        }
        prices.push([change.asset.symbol, {price: change.price, amount: balChange, decimals: change.asset.decimals}]);
    }
    return prices;
}

function prepareData(data: any, assets: any): Array<Snap> {
    let snap: Snap = {
        send: 0,
        receive: 0,
        fee: 0,
        balance: {},
        timestamp: 0
    };
    let snaps: Array<Snap> = [];
    for (let key in assets.payload.assets) {
        let asset = assets.payload.assets[key];
        if (!asset.asset.price) {
            continue;
        }
        let symbol = asset.asset.symbol;
        let price = asset.asset.price.value;
        snap.timestamp = Math.round(Date.now() / 1000);
        snap.balance[symbol] = {
            price: price, 
            amount: asset.quantity / (10 ** asset.asset.decimals), 
            decimals: asset.asset.decimals
        };
    }

    snaps.push(cloneSnap(snap));

    for (let tx of data) {
        if (tx.status !== "confirmed") {
            continue;
        }
        let changes: Array<[string, Token]> = getChanges(tx);
        for (let change of changes) {
            if (!snap.balance[change[0]]) { // token not seen
                snap.balance[change[0]] = {price: 0, amount: 0, decimals: 0};
            }
            snap.balance[change[0]].price = change[1].price;
            snap.balance[change[0]].amount -= change[1].amount;
        }
        switch (tx.type) {
            case "receive": { 
                snap.receive += assetInUsd(tx.changes[0]);
                break;
            }
            case "send": {
                snap.send += assetInUsd(tx.changes[0]);
                break;
            }
        }
        if (tx.fee) {
            snap.fee += tx.fee!.value * tx.fee!.price / 1e18;
            snap.balance["ETH"].amount += tx.fee!.value / 1e18;
        }
        snap.timestamp = tx.mined_at;
        snaps.push(cloneSnap(snap));
    }
    return snaps;
}

function getSnapByTimestamp(snaps: Array<Snap>, timestamp: number): Snap {
    let i_min = 0, i_max = snaps.length - 1;
    while(i_max > i_min) {
        let i: number = i_max - ((i_max - i_min) >> 1);
        if (snaps[i].timestamp == timestamp) {
            return snaps[i];
        } else if (snaps[i].timestamp > timestamp) {
            i_min = i;
        } else {
            i_max = i - 1;
        }
    }
    return snaps[i_min];
}

function getPortfolioBalance(snaps: Array<Snap>, _blockTime: number): number {
    // Returns portfolio balance in USD at current _blockTime
    let balance: number = 0;
    let snap: Snap = getSnapByTimestamp(snaps, _blockTime);
    let token: string;
    for(token in snap.balance) {
        balance += snap.balance[token].amount * snap.balance[token].price;
    }
    return balance;
}

function getPortfolioBalanceForTx(snaps: Array<Snap>, _txOffset: number): number {
    // Returns portfolio balance in USD at specific txOffset
    let balance: number = 0;
    let snap: Snap = snaps[_txOffset];
    let token: string;
    for(token in snap.balance) {
        balance += snap.balance[token].amount * snap.balance[token].price;
    }
    return balance;
}

function getReceivedAssets(snaps: Array<Snap>, _blockTime: number): number {
    // Returns accumulated assets amount in USD which was received by account
    let snap: Snap = getSnapByTimestamp(snaps, _blockTime);
    return snap.receive;
}

function getReceivedAssetsByTx(snaps: Array<Snap>, _txOffset: number): number {
    // Returns accumulated assets amount in USD which was received by account
    let snap: Snap = snaps[_txOffset];
    return snap.receive;
}

function getSentAssets(snaps: Array<Snap>, _blockTime: number, _includeFees: boolean): number {
    // Returns accumulated assets amount in USD which was sended from account 
    let snap: Snap = getSnapByTimestamp(snaps, _blockTime);
    return snap.send + (_includeFees ? snap.fee : 0);
}

function getSentAssetsByTx(snaps: Array<Snap>, _txOffset: number, _includeFees: boolean): number {
    // Returns accumulated assets amount in USD which was sended from account 
    let snap: Snap = snaps[_txOffset];
    return snap.send + (_includeFees ? snap.fee : 0);
}

function getAssetsPriceForTime(snaps: Array<Snap>, _blockTime: number) : number {
    return getPortfolioBalance(snaps, _blockTime);
}

function getAssetsPriceForTx(snaps: Array<Snap>, _txOffset: number) : number {
    return getPortfolioBalanceForTx(snaps, _txOffset);
}

function getAssetsInput(snaps: Array<Snap>, _periodStart: number, _periodEnd: number) : number {
    let assetsAtStart: number = getReceivedAssets(snaps, _periodStart);
    let assetsAtEnd: number = getReceivedAssets(snaps, _periodEnd);
    return assetsAtStart - assetsAtEnd;
}

function getAssetsInputForTx(snaps: Array<Snap>, _txStartOffset: number, _txEndOffset: number) : number {
    let assetsAtStart: number = getReceivedAssetsByTx(snaps, _txStartOffset);
    let assetsAtEnd: number = getReceivedAssetsByTx(snaps, _txEndOffset);
    return assetsAtStart - assetsAtEnd;
}

function getAssetsOutput(snaps: Array<Snap>, _periodStart: number, _periodEnd: number, _includeFees: boolean) : number {
    let assetsAtStart: number = getSentAssets(snaps, _periodStart, _includeFees);
    let assetsAtEnd: number = getSentAssets(snaps, _periodEnd, _includeFees);
    return assetsAtStart - assetsAtEnd;
}

function getAssetsOutputForTx(snaps: Array<Snap>, _txStartOffset: number, _txEndOffset: number, _includeFees: boolean) : number {
    let assetsAtStart: number = getSentAssetsByTx(snaps, _txStartOffset, _includeFees);
    let assetsAtEnd: number = getSentAssetsByTx(snaps, _txEndOffset, _includeFees);
    return assetsAtStart - assetsAtEnd;
}

export const calcProfitForPeriod = function(_periodStart: number, _periodEnd: number, _includeFees: boolean, _transactions: any, _assets: any) : number {
    // Using equation from https://help.tinkoff.ru/pulse/profile/yield/#:~:text=%D0%A4%D0%BE%D1%80%D0%BC%D1%83%D0%BB%D0%B0%20%D1%80%D0%B0%D1%81%D1%87%D0%B5%D1%82%D0%B0%20%D0%B4%D0%BE%D1%85%D0%BE%D0%B4%D0%BD%D0%BE%D1%81%D1%82%D0%B8%20%D0%B2%20%D0%9F%D1%83%D0%BB%D1%8C%D1%81%D0%B5,%D0%94%D0%BE%D1%85%D0%BE%D0%B4%D0%BD%D0%BE%D1%81%D1%82%D1%8C%20%D0%B7%D0%B0%20%D0%BF%D0%B5%D1%80%D0%B8%D0%BE%D0%B4%20%D0%B2%20%D0%BF%D1%80%D0%BE%D1%86%D0%B5%D0%BD%D1%82%D0%B0%D1%85.&text=%D0%92%D0%B0%D0%B6%D0%BD%D0%BE%3A,b
    let snaps: Array<Snap> = prepareData(_transactions, _assets);

    let x: number = getAssetsPriceForTime(snaps, _periodEnd);
    console.log("X: " + x);
    let y: number = getAssetsPriceForTime(snaps, _periodStart);
    if (y < 0) y = 0;
    console.log("Y: " + y);
    let a: number = getAssetsOutput(snaps, _periodStart, _periodEnd, _includeFees);
    console.log("A: " + a);
    let b: number = getAssetsInput(snaps, _periodStart, _periodEnd);
    console.log("B: " + b);
    let profit: number = 0;

    if (x < 0 || y < 0) {
        profit = 0;
    } else if (a > b) {
        if (y !== 0) {
            profit = (x + a - y - b) * 100 / y;
        }
        else {
            profit = (x + a - b) * 100;
    }
    } else {
        if ((y + b - a) !== 0) {
            profit = (x + a - y - b) * 100 / (y + b - a);
        }
        else {
            profit = x * 100;
        }
    }
    return profit;
}

export const calcProfitForPeriodInTx = function(_txStartOffset: number, _txEndOffset: number, _includeFees: boolean, _transactions: any, _assets: any) : number {
    // Using equation from https://help.tinkoff.ru/pulse/profile/yield/#:~:text=%D0%A4%D0%BE%D1%80%D0%BC%D1%83%D0%BB%D0%B0%20%D1%80%D0%B0%D1%81%D1%87%D0%B5%D1%82%D0%B0%20%D0%B4%D0%BE%D1%85%D0%BE%D0%B4%D0%BD%D0%BE%D1%81%D1%82%D0%B8%20%D0%B2%20%D0%9F%D1%83%D0%BB%D1%8C%D1%81%D0%B5,%D0%94%D0%BE%D1%85%D0%BE%D0%B4%D0%BD%D0%BE%D1%81%D1%82%D1%8C%20%D0%B7%D0%B0%20%D0%BF%D0%B5%D1%80%D0%B8%D0%BE%D0%B4%20%D0%B2%20%D0%BF%D1%80%D0%BE%D1%86%D0%B5%D0%BD%D1%82%D0%B0%D1%85.&text=%D0%92%D0%B0%D0%B6%D0%BD%D0%BE%3A,b
    let snaps: Array<Snap> = prepareData(_transactions, _assets);

    if ((_txStartOffset > snaps.length - 1) || (_txStartOffset === -1)) {
        _txStartOffset = snaps.length - 1;
    }

    let x: number = getAssetsPriceForTx(snaps, _txEndOffset);
    //console.log("X: " + x);
    let y: number = getAssetsPriceForTx(snaps, _txStartOffset);
    if (y < 0) y = 0;
    //console.log("Y: " + y);
    let a: number = getAssetsOutputForTx(snaps, _txStartOffset, _txEndOffset, _includeFees);
    //console.log("A: " + a);
    let b: number = getAssetsInputForTx(snaps, _txStartOffset, _txEndOffset);
    //console.log("B: " + b);
    let profit: number = 0;

    if (x < 0 || y < 0) {
        profit = 0;
    } else if (a > b) {
        if (y !== 0) {
            profit = (x + a - y - b) * 100 / y;
        }
        else {
            profit = (x + a - b) * 100;
    }
    } else {
        if ((y + b - a) !== 0) {
            profit = (x + a - y - b) * 100 / (y + b - a);
        }
        else {
            profit = x * 100;
        }
    }
    return profit;
}

function getProfitForTxPeriod(snaps: Array<Snap>, _txStartOffset: number, _txEndOffset: number, _includeFees: boolean) : any {
    if (_txStartOffset > snaps.length - 1) {
        return "Not enough data";
    }

    let x: number = getAssetsPriceForTx(snaps, _txEndOffset);
    let y: number = getAssetsPriceForTx(snaps, _txStartOffset);
    if (y < 0) y = 0;
    let a: number = getAssetsOutputForTx(snaps, _txStartOffset, _txEndOffset, _includeFees);
    let b: number = getAssetsInputForTx(snaps, _txStartOffset, _txEndOffset);
    let profit: number = 0;

    if (x < 0 || y < 0) {
        profit = 0;
    } else if (a > b) {
        if (y !== 0) {
            profit = (x + a - y - b) * 100 / y;
        }
        else {
            profit = (x + a - b) * 100;
    }
    } else {
        if ((y + b - a) !== 0) {
            profit = (x + a - y - b) * 100 / (y + b - a);
        }
        else {
            profit = x * 100;
        }
    }
    return profit;
}

export const calcProfitRelativeChange = function(_includeFees: boolean, _transactions: any, _assets: any) : any {
    let snaps: Array<Snap> = prepareData(_transactions, _assets);    let result = [];
    for (let i: number = 5; i <= 100; i += 5) {
        result.push(getProfitForTxPeriod(snaps, i, 0, _includeFees));  
    }
    //result.push(getProfitForTxPeriod(10, 0, _includeFees));
    //result.push(getProfitForTxPeriod(25, 0, _includeFees));
    //result.push(getProfitForTxPeriod(50, 0, _includeFees));
    //result.push(getProfitForTxPeriod(100, 0, _includeFees));
    return result;
}

export const calcProfitRelativeChangeV2 = function(_includeFees: boolean, _transactions: any, _assets: any) : any {
    let snaps: Array<Snap> = prepareData(_transactions, _assets);
    let result = [];
    for (let i: number = 5; i <= 100; i += 5) {
        result.push(getProfitForTxPeriod(snaps, i, i - 5, _includeFees));  
    }
    return result;
}

export const calcProfitRelativeChangeStep = function(_step: number, _includeFees: boolean, _transactions: any, _assets: any) : any {
    let snaps: Array<Snap> = prepareData(_transactions, _assets);
    let result = [];
    for (let i: number = _step; i <= 100; i += _step) {
        result.push(getProfitForTxPeriod(snaps, i, i - _step, _includeFees));  
    }
    return result;
}