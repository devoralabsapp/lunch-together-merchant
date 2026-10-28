import {collection,doc,query,where,onSnapshot,runTransaction,serverTimestamp,type Unsubscribe} from 'firebase/firestore';
import {firebase} from './firebase';import {watchStaff} from './client';import {catalogBusinessId} from './restaurant-catalog';import {resolveMerchantIdentity} from './merchant-directory';import type {Merchant,Member,Role} from './model';
export type RestaurantMember={uid:string;email:string;role:Role;enabled:boolean;scope:'restaurant'|'legacy'|'owner';roles:Role[]};
export type TeamGrant={uid:string;email:string;role:Role;enabled:boolean};
export function aggregateRestaurantTeam(legacy:Member[],shared:TeamGrant[],ownerUid=''):RestaurantMember[]{
 const values=new Map<string,RestaurantMember>();for(const item of legacy){const old=values.get(item.id),roles=[...new Set([...(old?.roles||[]),item.role])];values.set(item.id,{uid:item.id,email:'',role:roles.includes('kitchen')?'kitchen':roles.includes('manager')?'manager':'owner',roles,enabled:!!old?.enabled||item.enabled,scope:'legacy'});}
 for(const item of shared)values.set(item.uid,{...item,scope:'restaurant',roles:[item.role]});
 if(ownerUid)values.set(ownerUid,{uid:ownerUid,email:values.get(ownerUid)?.email||'',role:'owner',roles:['owner'],enabled:true,scope:'owner'});
 return [...values.values()].sort((a,b)=>a.scope==='owner'?-1:b.scope==='owner'?1:(a.email||a.uid).localeCompare(b.email||b.uid));
}
export function watchRestaurantTeam(store:Merchant,callback:(values:RestaurantMember[])=>void,error:(e:unknown)=>void){
 const {db}=firebase(),businessId=catalogBusinessId(store);let shared:TeamGrant[]=[],legacy=new Map<string,Member[]>(),stops=new Map<string,Unsubscribe>();const emit=()=>callback(aggregateRestaurantTeam([...legacy.values()].flat(),shared,store.ownerId));
 const a=onSnapshot(query(collection(db,'merchantTeamUsers'),where('businessId','==',businessId)),s=>{shared=s.docs.map(d=>d.data() as TeamGrant);emit();},error);
 const setStores=(ids:string[])=>{for(const [id,stop] of stops)if(!ids.includes(id)){stop();stops.delete(id);legacy.delete(id);}for(const id of ids)if(!stops.has(id))stops.set(id,watchStaff(id,items=>{legacy.set(id,items);emit();},error));emit();};
 const b=store.ownerId?onSnapshot(query(collection(db,'merchants'),where('ownerId','==',store.ownerId)),s=>setStores(s.docs.filter(d=>d.data().active===true&&!d.data().archived).map(d=>d.id)),error):(()=>{setStores([store.id]);return()=>{};})();
 return()=>{a();b();stops.forEach(stop=>stop());};
}
export async function saveRestaurantMember(store:Merchant,target:string,role:Role,enabled:boolean,admin:boolean){
 const {auth,db}=firebase(),actorId=auth.currentUser?.uid;if(!actorId)throw Error('Đăng nhập Google đã xác minh để tiếp tục.');
 const person=await resolveMerchantIdentity(db,target,admin,actorId,store.id),businessId=catalogBusinessId(store);if(person.uid===actorId||person.uid===store.ownerId)throw Error('Không thể thay đổi quyền của chính bạn hoặc chủ nhà hàng.');
 const ref=doc(db,'merchantTeamUsers',businessId+'~'+person.uid),event=doc(collection(db,'merchants',store.id,'events'),crypto.randomUUID().replaceAll('-',''));
 await runTransaction(db,async tx=>{const old=await tx.get(ref);tx.set(ref,{businessId,uid:person.uid,sourceStoreId:store.id,email:person.email||old.data()?.email||'',role,enabled,createdAt:old.data()?.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:actorId});tx.set(event,{kind:'member.update',message:'Cập nhật nhân sự '+person.uid.slice(0,8),dayId:'',actorId,createdAt:serverTimestamp()});});
}
