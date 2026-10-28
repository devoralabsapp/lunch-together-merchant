import {collection,doc,getDoc,getDocs,query,where,runTransaction,serverTimestamp,Timestamp} from 'firebase/firestore';
import {firebase} from './firebase';import {validDate,validMenu,dishId,type Dish} from './model';
const revision=(v:unknown)=>{const t=v as {toDate?:()=>Date}|null;return t?.toDate?.().toISOString()||'';};
export async function readRestaurantOffer(merchantId:string,date:string){
 const {db}=firebase(),ref=doc(db,'merchants',merchantId,'offers',date),h=await getDoc(ref);if(!h.exists())return {revision:'',items:[] as Dish[]};
 const s=await getDocs(query(collection(ref,'dishes'),where('active','==',true)));return {revision:revision(h.data().updatedAt),items:s.docs.map(d=>({id:d.id,...d.data()}) as Dish)};
}
export async function publishRestaurantOffer(merchantId:string,date:string,items:Pick<Dish,'name'|'price'>[],expectedOffer:string,expectedDay:string){
 if(!validDate(date))throw Error('Ngày chưa hợp lệ.');const menu=validMenu(items),{db,auth}=firebase(),uid=auth.currentUser?.uid;if(!uid)throw Error('Đăng nhập Google đã xác minh để tiếp tục.');
 const ref=doc(db,'merchants',merchantId,'offers',date),previous=await getDoc(ref),old=previous.exists()?await getDocs(query(collection(ref,'dishes'),where('active','==',true))):null;
 const bindings=await getDocs(query(collection(db,'merchantDays'),where('merchantId','==',merchantId))),dayId='day-'+date,linked=bindings.docs.some(d=>d.id===dayId),dayRef=doc(db,'days',dayId),day=linked?await getDoc(dayRef):null,oldDay=day?.exists()?await getDocs(query(collection(dayRef,'dishes'),where('active','==',true))):null,ids=await Promise.all(menu.map(d=>dishId(d.name)));
 await runTransaction(db,async tx=>{
  const header=await tx.get(ref),current=linked?await tx.get(dayRef):null,binding=linked?await tx.get(doc(db,'merchantDays',dayId)):null;
  if(revision(header.data()?.updatedAt)!==expectedOffer||linked&&revision(current?.data()?.updatedAt)!==expectedDay)throw Error('Thực đơn vừa thay đổi ở thiết bị khác. Tải lại danh sách rồi thử lại.');
  if(linked&&binding?.data()?.merchantId!==merchantId)throw Error('Ngày không thuộc nhà hàng này.');
  tx.set(ref,{date,menuCount:menu.length,createdAt:header.data()?.createdAt||serverTimestamp(),createdBy:header.data()?.createdBy||uid,updatedAt:serverTimestamp(),updatedBy:uid});
  for(const d of old?.docs||[])if(!ids.includes(d.id))tx.update(d.ref,{active:false,updatedAt:serverTimestamp()});
  menu.forEach((item,i)=>tx.set(doc(ref,'dishes',ids[i]),{...item,active:true,updatedAt:serverTimestamp()}));
  if(linked){if(current?.exists())tx.update(dayRef,{menuCount:menu.length,updatedAt:serverTimestamp()});else tx.set(dayRef,{date,label:'Ngày '+date,status:'auto',menuCount:menu.length,cutoffAt:Timestamp.fromDate(new Date(date+'T09:30:00+07:00')),updatedAt:serverTimestamp()});for(const d of oldDay?.docs||[])if(!ids.includes(d.id))tx.update(d.ref,{active:false,updatedAt:serverTimestamp()});menu.forEach((item,i)=>tx.set(doc(dayRef,'dishes',ids[i]),{...item,active:true,updatedAt:serverTimestamp()}));}
  tx.set(doc(db,'merchants',merchantId,'events',crypto.randomUUID().replaceAll('-','')),{kind:'menu.offer',message:'Đăng thực đơn '+menu.length+' món',dayId,actorId:uid,createdAt:serverTimestamp()});
 });return {linked};
}
