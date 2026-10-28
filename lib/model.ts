export type Role='owner'|'manager'|'kitchen';
export const states=['accepted','cooking','ready','delivering','completed'] as const;
export type State=typeof states[number];
export type Member={id:string;merchantId:string;role:Role;enabled:boolean;accountOnly?:boolean};
export type Merchant={id:string;name:string;phone:string;address:string;active:boolean;ownerId?:string;archived?:boolean};
export type Dish={id:string;name:string;price:number;active:boolean};
export type Day={id:string;date:string;label:string;status:string;revision:string};
export type Binding={id:string;merchantId:string;date:string};
export type Order={id:string;dish:string;quantity:number;price:number;note:string;cancelled:boolean;updatedAt:string};
export type Fulfillment={state:State;note:string;orderHash:string;updatedAt:string;merchantId:string};
export type Activity={id:string;kind:string;message:string;createdAt:string;actorId:string};
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;}
export const money=(n:number,locale:'vi'|'en'='vi')=>new Intl.NumberFormat(locale==='en'?'en-GB':'vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
export function validMenu(items:Pick<Dish,'name'|'price'>[]){
 items=items.map(i=>({...i,name:i.name.normalize('NFC').trim()}));
 if(items.length<1||items.length>60||items.some(i=>!i.name.trim()||i.name.trim().length>160||!Number.isInteger(i.price)||i.price<1000||i.price>1000000)||new Set(items.map(i=>i.name.trim().toLowerCase())).size!==items.length)throw new Error('Thực đơn cần 1–60 món, tên khác nhau và giá từ 1.000 đến 1.000.000 đ.');
 return items.map(i=>({name:i.name.normalize('NFC').trim(),price:i.price}));
}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export const dishId=(name:string)=>digest(name.normalize('NFC').trim().toLowerCase());
export function kitchenRows(orders:Order[]){
 const groups=new Map<string,{dish:string;price:number;quantity:number;notes:{text:string;quantity:number}[]}>();
 for(const o of orders.filter(o=>!o.cancelled)){
  const key=JSON.stringify([o.dish,o.price]),g=groups.get(key)||{dish:o.dish,price:o.price,quantity:0,notes:[]};g.quantity+=o.quantity;
  const text=o.note.trim();if(text){const note=g.notes.find(n=>n.text===text);if(note)note.quantity+=o.quantity;else g.notes.push({text,quantity:o.quantity});}groups.set(key,g);
 }
 return [...groups.values()].sort((a,b)=>a.dish.localeCompare(b.dish,'vi')||a.price-b.price);
}
export function orderFingerprint(orders:Order[]){return digest(JSON.stringify([...orders].sort((a,b)=>a.id.localeCompare(b.id)).map(o=>[o.id,o.dish,o.quantity,o.price,o.note,o.cancelled])));}
export function canAdvance(role:Role,from:State|'new',to:State,changed=false){
 if(to==='accepted'&&from!=='new'&&changed)return role!=='kitchen';
 return states[states.indexOf(from as State)+1]===to&&(role!=='kitchen'||(from==='accepted'&&to==='cooking')||(from==='cooking'&&to==='ready'));
}
export function snapshot(date:string,orders:Order[]){if(!validDate(date))throw new Error('Ngày chưa hợp lệ.');return {version:1,date,generatedAt:new Date().toISOString(),rows:orders.filter(o=>!o.cancelled).map(o=>({dish:o.dish,quantity:o.quantity,unitPrice:o.price,note:o.note}))};}
export function explain(error:unknown){const e=error as {code?:string;message?:string};if(e.code==='permission-denied')return 'Chưa có quyền hoặc Rules chưa được Publish. Kiểm tra quyền nhân sự và hướng dẫn kết nối.';if(e.code==='auth/unauthorized-domain')return 'Domain này chưa được thêm vào Firebase Authentication → Authorized domains.';if(e.code==='auth/popup-closed-by-user')return 'Cửa sổ đăng nhập đã đóng.';return e.message||'Chưa thực hiện được. Vui lòng thử lại.';}
