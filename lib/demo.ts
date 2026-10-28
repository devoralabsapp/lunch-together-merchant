import {today,type Order,type Dish,type Merchant} from './model';
export const demoMerchant:Merchant={id:'sample-restaurant',name:'Bếp Nhà · Demo',phone:'',address:'Không gian bếp mẫu',active:true};
export const demoDishes:Dish[]=[{id:'sample-chicken',name:'Cơm gà nướng',price:40000,active:true},{id:'sample-fish',name:'Cơm cá kho',price:45000,active:true},{id:'sample-salad',name:'Salad gà',price:50000,active:true}];
export function demoOrders():Order[]{return [
 {id:'sample-1',dish:'Cơm gà nướng',quantity:7,price:40000,note:'',cancelled:false,updatedAt:today()+'T02:00:00Z'},
 {id:'sample-2',dish:'Cơm gà nướng',quantity:1,price:40000,note:'Ít cơm, không hành',cancelled:false,updatedAt:today()+'T02:01:00Z'},
 {id:'sample-3',dish:'Cơm cá kho',quantity:3,price:45000,note:'Không cay',cancelled:false,updatedAt:today()+'T02:02:00Z'},
 {id:'sample-4',dish:'Salad gà',quantity:2,price:50000,note:'Để sốt riêng',cancelled:false,updatedAt:today()+'T02:03:00Z'},
 ];}
