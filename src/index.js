import {datafeed} from './datafeed'

const pair = '0xe92fb6d86d17c562e601a339af750b48fc655153'
console.log('TradingView Charts Version:', TradingView.version())

window.tvWidget = new TradingView.widget({
    fullscreen: true,
    symbol: `Pancake v2:${pair}`,
    interval: '240',
    container: 'tv_chart_container',
    datafeed,
    library_path: 'charting_library/',
    locale: 'en',
    disabled_features: ['use_localstorage_for_settings'],
    theme: 'Dark',
})

