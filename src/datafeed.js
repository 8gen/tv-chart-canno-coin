import axios from 'axios'

import {API_KEY, configurationData, GET_PAIR_INFO_QUERY, GET_PAIR_BARS_QUERY} from './consts'


const client = axios.create({
    baseURL: 'https://graphql.bitquery.io',
    headers: {'X-API-KEY': API_KEY},
})
const queries = {
    getPairInfo: (pairAddress) =>
        client.post('/', {
            query: GET_PAIR_INFO_QUERY,
            variables: {
                pairAddress,
            },
        }),
    getTokenBars: (
        from,
        to,
        interval,
        token0Address,
        token1Address,
        exchange
    ) =>
        client.post('/', {
            query: GET_PAIR_BARS_QUERY,
            variables: {
                from: new Date(from * 1000).toISOString(),
                to: new Date(to * 1000).toISOString(),
                interval: Number(interval),
                token0Address,
                token1Address,
                exchange,
            },
        }),
};
const lastBarsCache = new Map();
const subscriptions = new Map();

export const datafeed = {
    onReady: (callback) => {
        try {
            console.log('Datafeed onReady')
            setTimeout(() => callback(configurationData));
        } catch (err) {
            console.error(err)
        }
    },
    searchSymbols: async (
        userInput,
        exchange,
        symbolType,
        onResultReadyCallback,
    ) => {
        console.log('[searchSymbols]: Method call', userInput, exchange, symbolType);
    },
    resolveSymbol: async (
        symbolName,
        onSymbolResolvedCallback,
        onResolveErrorCallback,
        extension
    ) => {
        console.log('[resolveSymbol]: Method call', symbolName);
        if (!symbolName.includes(':')) {
            return;
        }
        const [, pair] = symbolName.split(":");
        let data;
        try {
            data = await queries.getPairInfo(pair);
        } catch (err) {
            console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
            onResolveErrorCallback('cannot resolve symbol');
            return;
        }
        const {data: info} = data;
        const {data: {ethereum: {dexTrades: [symbolItem]}}} = info;
        const {buyCurrency, sellCurrency, exchange, smartContract} = symbolItem;
        console.log('[resolveSymbol]: Bitquery.io API response', symbolItem);
        // Symbol information object
        const symbolInfo = {
            ticker: symbolName,
            buyAddress: buyCurrency.address,
            sellAddress: sellCurrency.address,
            name: symbolItem.smartContract.currency.name,
            description: `${buyCurrency.symbol}/${sellCurrency.symbol}`,
            type: symbolItem.smartContract.currency.tokenType,
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: symbolItem.exchange.name,
            minmov: 1,
            pricescale: 10000,
            has_no_volume: false,
            has_intraday: true,
            has_weekly_and_monthly: false,
            supported_resolutions: configurationData.supported_resolutions,
            volume_precision: 2,
            data_status: 'streaming',
        };

        console.log('[resolveSymbol]: Symbol resolved', symbolName);
        onSymbolResolvedCallback(symbolInfo);
    },

    getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        const {from, to, firstDataRequest} = periodParams;
        console.log('[getBars]: Method call', symbolInfo, resolution, from, to);
        resolution === '1D' && (resolution = 1440)
        try {
            const {data} = await queries.getTokenBars(from, to, resolution, symbolInfo.buyAddress, symbolInfo.sellAddress, symbolInfo.exchange);
            let bars = [];
            const {data: {ethereum: {dexTrades}}} = data;
            if (dexTrades.length === 0) {
                onHistoryCallback([], {
                    noData: true,
                });
                return;
            }
            dexTrades.forEach(bar => {
                const time = new Date(bar.timeInterval.minute);
                const timeSeconds = time.getTime() / 1000;
                if (timeSeconds >= from && timeSeconds < to) {
                    bars = [...bars, {
                        ...bar,
                        time,
                    }];
                }
            });
            if (firstDataRequest) {
                lastBarsCache.set(symbolInfo.full_name, {
                    ...bars[bars.length - 1],
                });
            }
            console.log(`[getBars]: returned ${bars.length} bar(s)`);
            onHistoryCallback(bars, {
                noData: false,
            });
        } catch (error) {
            console.log('[getBars]: Get error', error);
            onErrorCallback(error);
        }
    },

    subscribeBars: (
        symbolInfo,
        resolution,
        onRealtimeCallback,
        subscriberUID,
        onResetCacheNeededCallback,
    ) => {
        console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
        const id = setInterval(async () => {
            const lastBar = lastBarsCache.get(symbolInfo.full_name);
            console.log('[subscribeBars]: Requesting new bar', symbolInfo.full_name);
            const timeSeconds = lastBar.time.getTime() / 1000;
            try {
                const {data} = await queries.getTokenBars(timeSeconds, timeSeconds + 60, 1, symbolInfo.buyAddress, symbolInfo.sellAddress, symbolInfo.exchange);
                const {data: {ethereum: {dexTrades}}} = data;
                if (dexTrades.length === 0) {
                    return;
                }
                dexTrades.forEach(item => {
                    const time = new Date(item.timeInterval.minute);
                    const bar = {
                        time,
                        ...item
                    };
                    if(lastBar.time.getTime() >= bar.time.getTime()) {
                        return;
                    }

                    lastBarsCache.set(symbolInfo.full_name, {...bar});
                    console.log('[subscribeBars]: Update bar', bar);

                    onRealtimeCallback(bar);
                });
            } catch (error) {
                console.log('[getBars]: Get error', error);
            }
        }, 5000);
        subscriptions.set(subscriberUID, id);
    },

    unsubscribeBars: (subscriberUID) => {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
        clearInterval(subscriptions.get(subscriberUID));
        subscriptions.delete(subscriberUID);
    },
};
