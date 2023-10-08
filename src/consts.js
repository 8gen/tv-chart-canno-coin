export const API_KEY = process.env.BITQUERY_API_KEY
export const GET_PAIR_INFO_QUERY = `
query ($pairAddress: String!) {
  ethereum(network: bsc) {
    dexTrades(
      smartContractAddress: {is: $pairAddress}
      options: {limit: 1}
    ) {
      smartContract {
        address {
          address
          annotation
        }
        contractType
        protocolType
        currency {
          name
          symbol
          tokenType
          decimals
        }
      }
      sellCurrency: buyCurrency {
        address
        symbol
        tokenType
        properties
        name
        decimals
        tokenId
      }
      exchange {
        name
      }
      buyCurrency: sellCurrency {
        address
        decimals
        name
        properties
        symbol
        tokenId
        tokenType
      }
    }
  }
}
`;
export const GET_PAIR_BARS_QUERY = `
query ($from: ISO8601DateTime!, $to: ISO8601DateTime!, $interval: Int!, $token0Address: String!, $token1Address: String!, $exchange: String) {
  ethereum(network: bsc) {
    dexTrades(
      options: {asc: "timeInterval.minute"}
      date: {since: $from, till: $to}
      exchangeName: {is: $exchange}
      any: [
        {baseCurrency: {is: $token0Address}, quoteCurrency: {is: $token1Address}}
      ]
      tradeAmountUsd: {gt: 10}
    ) {
      timeInterval {
        minute(count: $interval, format: "%Y-%m-%dT%H:%M:%SZ")
      }
      quotePrice
      high: quotePrice(calculate: maximum)
      low: quotePrice(calculate: minimum)
      open: minimum(of: block, get: quote_price)
      close: maximum(of: block, get: quote_price)
      volume: quoteAmount
      quoteCurrency{
        name
        symbol
      }
      baseCurrency{
        name
        symbol
      }
    }
  }
}
`;

export const configurationData = {
    supported_resolutions: [
        '5',
        '15',
        '30',
        '60',
        '240',
        '720',
        '1D',
        '1W',
    ],
};
