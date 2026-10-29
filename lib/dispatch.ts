import type {Day,Fulfillment} from './model';
export function released(day:Day|null){return day?.status==='closed'&&!day.changing&&!!day.closedAt&&/^[a-f0-9]{32}$/.test(day.dispatchId||'');}
export function currentFulfillment(day:Day|null,value:Fulfillment|null){return released(day)&&day?.dispatchId===value?.dispatchId?value:null;}
