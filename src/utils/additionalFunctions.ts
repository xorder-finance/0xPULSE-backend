// Traders assets
// 0xf41feb3d6610138f4731e4397a6313e225171a9b
// 0x7d535ffeb4325623c57aca30b882c7911ee40e53
// 0xae7861c80d03826837a50b45aecf11ec677f6586
// 0x931b23DaC01EF88BE746d752252D831464a3834C
// 0x9BD3C249Ac698159E997f28E275F85aB39Fd862D
// 0xdFfb9b70CD43Ba0dDf3B1a95Cf704e7e9135137f
// 0xc2090311dd1671a4afd8e0b4cd1255f15109369d
// 0x297a63B59F768d2b7F29a2C931e08460009bF453
// 0xAfd712E0dA07c6EC6617d5f9FAD474cFD8dDdDad
// 0x5F9162d7B8A796E1aD41Df768fa633bd4de065eC
// 0x132DB8234171Cc9D8A65853cf03D5C0f46C8867e
// 0x66c45f787FA88964F0980e82872c560FC07Eea17
// 0x08103E240B6bE73e29319d9B9DBe9268e32a0b02
// 0x442DCCEe68425828C106A3662014B4F131e3BD9b
// 0xc803698a4BE31F0B9035B6eBA17623698f3E2F82
// 0x13257586918a972a886b370678a877a12f31552b

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

let Snaps: Array<Snap>;

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
    Snaps = snaps;
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

function getPortfolioBalance(_blockTime: number): number {
    // Returns portfolio balance in USD at current _blockTime
    let balance: number = 0;
    let snap: Snap = getSnapByTimestamp(Snaps, _blockTime);
    let token: string;
    for(token in snap.balance) {
        balance += snap.balance[token].amount * snap.balance[token].price;
    }
    return balance;
}

function getPortfolioBalanceForTx(_txOffset: number): number {
    // Returns portfolio balance in USD at specific txOffset
    let balance: number = 0;
    let snap: Snap = Snaps[_txOffset];
    let token: string;
    for(token in snap.balance) {
        balance += snap.balance[token].amount * snap.balance[token].price;
    }
    return balance;
}

function getReceivedAssets(_blockTime: number): number {
    // Returns accumulated assets amount in USD which was received by account
    let snap: Snap = getSnapByTimestamp(Snaps, _blockTime);
    return snap.receive;
}

function getReceivedAssetsByTx(_txOffset: number): number {
    // Returns accumulated assets amount in USD which was received by account
    let snap: Snap = Snaps[_txOffset];
    return snap.receive;
}

function getSentAssets(_blockTime: number, _includeFees: boolean): number {
    // Returns accumulated assets amount in USD which was sended from account 
    let snap: Snap = getSnapByTimestamp(Snaps, _blockTime);
    return snap.send + (_includeFees ? snap.fee : 0);
}

function getSentAssetsByTx(_txOffset: number, _includeFees: boolean): number {
    // Returns accumulated assets amount in USD which was sended from account 
    let snap: Snap = Snaps[_txOffset];
    return snap.send + (_includeFees ? snap.fee : 0);
}

function getAssetsPriceForTime(_blockTime: number) : number {
    return getPortfolioBalance(_blockTime);
}

function getAssetsPriceForTx(_txOffset: number) : number {
    return getPortfolioBalanceForTx(_txOffset);
}

function getAssetsInput(_periodStart: number, _periodEnd: number) : number {
    let assetsAtStart: number = getReceivedAssets(_periodStart);
    let assetsAtEnd: number = getReceivedAssets(_periodEnd);
    return assetsAtStart - assetsAtEnd;
}

function getAssetsInputForTx(_txStartOffset: number, _txEndOffset: number) : number {
    let assetsAtStart: number = getReceivedAssetsByTx(_txStartOffset);
    let assetsAtEnd: number = getReceivedAssetsByTx(_txEndOffset);
    return assetsAtStart - assetsAtEnd;
}

function getAssetsOutput(_periodStart: number, _periodEnd: number, _includeFees: boolean) : number {
    let assetsAtStart: number = getSentAssets(_periodStart, _includeFees);
    let assetsAtEnd: number = getSentAssets(_periodEnd, _includeFees);
    return assetsAtStart - assetsAtEnd;
}

function getAssetsOutputForTx(_txStartOffset: number, _txEndOffset: number, _includeFees: boolean) : number {
    let assetsAtStart: number = getSentAssetsByTx(_txStartOffset, _includeFees);
    let assetsAtEnd: number = getSentAssetsByTx(_txEndOffset, _includeFees);
    return assetsAtStart - assetsAtEnd;
}

export const calcProfitForPeriod = function(_periodStart: number, _periodEnd: number, _includeFees: boolean, _transactions: any, _assets: any) : number {
    // Using equation from https://help.tinkoff.ru/pulse/profile/yield/#:~:text=%D0%A4%D0%BE%D1%80%D0%BC%D1%83%D0%BB%D0%B0%20%D1%80%D0%B0%D1%81%D1%87%D0%B5%D1%82%D0%B0%20%D0%B4%D0%BE%D1%85%D0%BE%D0%B4%D0%BD%D0%BE%D1%81%D1%82%D0%B8%20%D0%B2%20%D0%9F%D1%83%D0%BB%D1%8C%D1%81%D0%B5,%D0%94%D0%BE%D1%85%D0%BE%D0%B4%D0%BD%D0%BE%D1%81%D1%82%D1%8C%20%D0%B7%D0%B0%20%D0%BF%D0%B5%D1%80%D0%B8%D0%BE%D0%B4%20%D0%B2%20%D0%BF%D1%80%D0%BE%D1%86%D0%B5%D0%BD%D1%82%D0%B0%D1%85.&text=%D0%92%D0%B0%D0%B6%D0%BD%D0%BE%3A,b
    prepareData(_transactions, _assets);

    let x: number = getAssetsPriceForTime(_periodEnd);
    console.log("X: " + x);
    let y: number = getAssetsPriceForTime(_periodStart);
    if (y < 0) y = 0;
    console.log("Y: " + y);
    let a: number = getAssetsOutput(_periodStart, _periodEnd, _includeFees);
    console.log("A: " + a);
    let b: number = getAssetsInput(_periodStart, _periodEnd);
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
    prepareData(_transactions, _assets);

    if ((_txStartOffset > Snaps.length - 1) || (_txStartOffset === -1)) {
        _txStartOffset = Snaps.length - 1;
    }

    let x: number = getAssetsPriceForTx(_txEndOffset);
    //console.log("X: " + x);
    let y: number = getAssetsPriceForTx(_txStartOffset);
    if (y < 0) y = 0;
    //console.log("Y: " + y);
    let a: number = getAssetsOutputForTx(_txStartOffset, _txEndOffset, _includeFees);
    //console.log("A: " + a);
    let b: number = getAssetsInputForTx(_txStartOffset, _txEndOffset);
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