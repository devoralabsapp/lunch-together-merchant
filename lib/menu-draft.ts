import type {Dish} from './model';
export function catalogMenuDraft(previous:Pick<Dish,'name'|'price'>[],catalog:Dish[]){
 const key=(name:string)=>name.normalize('NFC').trim().toLowerCase();
 const active=catalog.filter(d=>d.active),known=new Set(catalog.map(d=>key(d.name)));
 // Catalog prices are loaded only when a draft is opened; published snapshots stay fixed.
 return [...active.map(d=>({name:d.name,price:d.price})),...previous.filter(d=>!known.has(key(d.name))).map(d=>({name:d.name,price:d.price}))];
}
