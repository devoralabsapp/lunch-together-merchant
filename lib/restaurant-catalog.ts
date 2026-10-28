import {collection,doc,getDoc,getDocs,query,where,onSnapshot,runTransaction,serverTimestamp} from 'firebase/firestore';
import {firebase} from './firebase';
import {dishId,validMenu,type Dish,type Merchant,type Role} from './model';
export const catalogBusinessId=(store:Merchant)=>store.ownerId||store.id;
export function legacyCatalogCandidates(items:Array<Dish&{modified:number;storeId:string}>){
 const map=new Map<string,Dish&{modified:number;storeId:string}>();
 for(const item of [...items].sort((a,b)=>b.modified-a.modified||a.storeId.localeCompare(b.storeId))){const key=item.name.normalize('NFC').trim().toLowerCase();if(!map.has(key))map.set(key,item);}
 return [...map.values()].map(({name,price,active})=>({name:name.normalize('NFC').trim(),price,active}));
}
async function access(store:Merchant){const {auth,db}=firebase(),uid=auth.currentUser?.uid;if(!uid)throw Error('Đăng nhập Google đã xác minh để tiếp tục.');const businessId=catalogBusinessId(store);await runTransaction(db,async tx=>{tx.set(doc(db,'merchantCatalogAccess',businessId+'~'+uid),{businessId,uid,storeId:store.id,updatedAt:serverTimestamp()});});return {db,uid,businessId};}
export async function initializeRestaurantCatalog(store:Merchant,canImport:boolean){
 const {db,uid,businessId}=await access(store),ref=doc(db,'merchantCatalogs',businessId),header=await getDoc(ref);
 if(!canImport){if(!header.exists()||header.data().initialized!==true)throw Error('Chủ nhà hàng hoặc quản trị cần mở Danh mục món một lần để gộp danh mục cũ.');return businessId;}
 await runTransaction(db,async tx=>{const h=await tx.get(ref);if(!h.exists())tx.set(ref,{version:1,initialized:false,createdAt:serverTimestamp(),createdBy:uid,updatedAt:serverTimestamp(),updatedBy:uid});});
 const siblings=store.ownerId?(await getDocs(query(collection(db,'merchants'),where('ownerId','==',store.ownerId)))).docs.filter(d=>d.data().active===true&&!d.data().archived).map(d=>d.id):[store.id];
 const imported=await getDocs(collection(ref,'imports')),done=new Set(imported.docs.map(d=>d.id)),pending=siblings.filter(id=>!done.has(id)),candidates:Array<Dish&{modified:number;storeId:string}>=[];
 for(let i=0;i<pending.length;i+=6){const groups=await Promise.all(pending.slice(i,i+6).map(async id=>{const s=await getDocs(collection(db,'merchants',id,'catalog'));return s.docs.map(d=>({id:d.id,...d.data(),modified:d.data().updatedAt?.toMillis?.()||0,storeId:id}) as Dish&{modified:number;storeId:string});}));candidates.push(...groups.flat());}
 const menu=legacyCatalogCandidates(candidates),ids=await Promise.all(menu.map(d=>dishId(d.name)));
 for(let i=0;i<menu.length;i+=100)await runTransaction(db,async tx=>{const rows=await Promise.all(menu.slice(i,i+100).map((_,n)=>tx.get(doc(ref,'dishes',ids[i+n]))));rows.forEach((row,n)=>{if(!row.exists())tx.set(row.ref,{...menu[i+n],updatedAt:serverTimestamp()});});});
 for(const id of pending)await runTransaction(db,async tx=>{const p=doc(ref,'imports',id);if(!(await tx.get(p)).exists())tx.set(p,{storeId:id,importedAt:serverTimestamp(),importedBy:uid});});
 await runTransaction(db,async tx=>{const h=await tx.get(ref);if(h.data()?.initialized!==true)tx.update(ref,{initialized:true,updatedAt:serverTimestamp(),updatedBy:uid});});return businessId;
}
export function watchRestaurantCatalog(store:Merchant,admin:boolean,role:Role,callback:(items:Dish[])=>void,error:(e:unknown)=>void){
 let active=true,stop=()=>{};void initializeRestaurantCatalog(store,admin||role==='owner').then(id=>{if(!active)return;stop=onSnapshot(collection(firebase().db,'merchantCatalogs',id,'dishes'),s=>callback(s.docs.map(d=>({id:d.id,...d.data()}) as Dish).sort((a,b)=>a.name.localeCompare(b.name,'vi'))),error);}).catch(e=>{if(active)error(e);});return()=>{active=false;stop();};
}
export async function saveRestaurantDish(store:Merchant,item:{name:string;price:number;active:boolean}){
 const {db,uid,businessId}=await access(store),[clean]=validMenu([item]),id=await dishId(clean.name),eventId=crypto.randomUUID().replaceAll('-','');
 await runTransaction(db,async tx=>{tx.set(doc(db,'merchantCatalogs',businessId,'dishes',id),{...clean,active:item.active,updatedAt:serverTimestamp()});tx.set(doc(db,'merchants',store.id,'events',eventId),{kind:'catalog.save',message:(item.active?'Lưu món: ':'Ngừng món: ')+clean.name,dayId:'',actorId:uid,createdAt:serverTimestamp()});});
}
