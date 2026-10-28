import {collection,doc,getDoc,getDocs,query,where,orderBy,limit,onSnapshot,runTransaction,serverTimestamp,Timestamp,type DocumentData,type QueryDocumentSnapshot,type Unsubscribe} from 'firebase/firestore';
import {firebase} from './firebase';
import {validDate,validMenu,dishId,orderFingerprint,canAdvance,type Merchant,type Dish,type Member,type Day,type Binding,type Order,type Fulfillment,type Activity,type State,type Role} from './model';
const time=(v:unknown)=>{const t=v as {toDate?:()=>Date}|null;return t&&typeof t.toDate==='function'?t.toDate().toISOString():'';};
const rows=<T>(snapshot:{docs:QueryDocumentSnapshot<DocumentData>[]})=>snapshot.docs.map(d=>({id:d.id,...d.data()}) as T);
const actor=()=>{const u=firebase().auth.currentUser;if(!u||u.isAnonymous||!u.emailVerified)throw Error('Đăng nhập Google đã xác minh để tiếp tục.');return u.uid;};
function event(merchantId:string,kind:string,message:string,dayId=''){const id=crypto.randomUUID().replaceAll('-','');return {ref:doc(firebase().db,'merchants',merchantId,'events',id),id,data:{kind,message,dayId,actorId:actor(),createdAt:serverTimestamp()}};}
export function watchAccess(uid:string,callback:(v:{admin:boolean;member:Member|null})=>void,error:(e:unknown)=>void):Unsubscribe{
 let admin=false,member:Member|null=null;const db=firebase().db;
 const a=onSnapshot(doc(db,'admins',uid),s=>{admin=s.data()?.enabled===true;callback({admin,member});},error);
 const b=onSnapshot(doc(db,'merchantUsers',uid),s=>{member=s.exists()?{id:s.id,...s.data()} as Member:null;callback({admin,member});},error);
 return ()=>{a();b();};
}
export function watchMerchants(admin:boolean,member:Member|null,callback:(v:Merchant[])=>void,error:(e:unknown)=>void){
 const db=firebase().db;if(admin)return onSnapshot(collection(db,'merchants'),s=>callback(rows<Merchant>(s)),error);
 if(!member?.enabled){callback([]);return ()=>{};}return onSnapshot(doc(db,'merchants',member.merchantId),s=>callback(s.exists()?[{id:s.id,...s.data()} as Merchant]:[]),error);
}
export function watchMerchant(id:string,callback:(v:{bindings?:Binding[];catalog?:Dish[];events?:Activity[]})=>void,error:(e:unknown)=>void){
 const db=firebase().db;
 const a=onSnapshot(query(collection(db,'merchantDays'),where('merchantId','==',id)),s=>callback({bindings:rows<Binding>(s).sort((a,b)=>b.date.localeCompare(a.date))}),error);
 const b=onSnapshot(collection(db,'merchants',id,'catalog'),s=>callback({catalog:rows<Dish>(s).sort((a,b)=>a.name.localeCompare(b.name,'vi'))}),error);
 const c=onSnapshot(query(collection(db,'merchants',id,'events'),orderBy('createdAt','desc'),limit(30)),s=>callback({events:s.docs.map(d=>({id:d.id,...d.data(),createdAt:time(d.data().createdAt)}) as Activity)}),error);
 return ()=>{a();b();c();};
}
export function watchDay(id:string,callback:(v:{day?:Day|null;dishes?:Dish[];orders?:Order[];fulfillment?:Fulfillment|null})=>void,error:(e:unknown)=>void){
 const db=firebase().db;let children:Unsubscribe[]=[];
 const a=onSnapshot(doc(db,'days',id),s=>{
  callback({day:s.exists()?{id:s.id,date:s.data().date,label:s.data().label,status:s.data().status,revision:time(s.data().updatedAt)}:null});
  if(s.exists()&&!children.length)children=[
   onSnapshot(query(collection(db,'days',id,'dishes'),where('active','==',true)),v=>callback({dishes:rows<Dish>(v)}),error),
   onSnapshot(collection(db,'days',id,'orders'),v=>callback({orders:v.docs.map(d=>({id:d.id,dish:d.data().dish,quantity:d.data().quantity,price:d.data().price,note:d.data().note||'',cancelled:d.data().cancelled===true,updatedAt:time(d.data().updatedAt)}))}),error),
  ];
  if(!s.exists()){children.forEach(stop=>stop());children=[];callback({dishes:[],orders:[]});}
 },error);
 const d=onSnapshot(doc(db,'merchantFulfillments',id),s=>callback({fulfillment:s.exists()?{...s.data(),updatedAt:time(s.data().updatedAt)} as Fulfillment:null}),error);
 return ()=>{a();children.forEach(stop=>stop());d();};
}
export function watchStaff(id:string,callback:(v:Member[])=>void,error:(e:unknown)=>void){return onSnapshot(query(collection(firebase().db,'merchantUsers'),where('merchantId','==',id)),s=>callback(rows<Member>(s)),error);}
export async function createMerchant(name:string,ownerUid=''){
 if(!name.trim()||name.trim().length>100||ownerUid&&!/^[A-Za-z0-9_-]{1,128}$/.test(ownerUid))throw Error('Kiểm tra tên nhà hàng và UID chủ cửa hàng.');
 const {db}=firebase(),uid=actor(),id=crypto.randomUUID().replaceAll('-',''),e=event(id,'merchant.create','Tạo nhà hàng: '+name.trim());
 await runTransaction(db,async tx=>{
  if(ownerUid){const member=await tx.get(doc(db,'merchantUsers',ownerUid));if(member.exists())throw Error('UID đã thuộc một nhà hàng. Quản trị hệ thống vẫn có thể quản lý mọi nhà hàng.');}
  tx.set(doc(db,'merchants',id),{name:name.trim(),phone:'',address:'',active:true,createdAt:serverTimestamp(),createdBy:uid,updatedAt:serverTimestamp(),updatedBy:uid});
  if(ownerUid)tx.set(doc(db,'merchantUsers',ownerUid),{merchantId:id,role:'owner',enabled:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:uid});
  tx.set(e.ref,e.data);
 });return id;
}
export async function saveMerchant(merchant:Merchant,input:{name:string;phone:string;address:string}){
 const {db}=firebase(),e=event(merchant.id,'merchant.update','Cập nhật thông tin nhà hàng');
 await runTransaction(db,async tx=>{const s=await tx.get(doc(db,'merchants',merchant.id));if(!s.exists())throw Error('Không tìm thấy nhà hàng.');tx.update(s.ref,{name:input.name.trim(),phone:input.phone.trim(),address:input.address.trim(),updatedAt:serverTimestamp(),updatedBy:actor()});tx.set(e.ref,e.data);});
}
export async function saveDish(merchantId:string,item:{name:string;price:number;active:boolean}){
 const [clean]=validMenu([item]),{db}=firebase(),id=await dishId(clean.name),e=event(merchantId,'catalog.save',(item.active?'Lưu món: ':'Ngừng món: ')+clean.name);
 await runTransaction(db,async tx=>{tx.set(doc(db,'merchants',merchantId,'catalog',id),{...clean,active:item.active,updatedAt:serverTimestamp()});tx.set(e.ref,e.data);});
}
export async function bindDay(merchantId:string,date:string){
 if(!validDate(date))throw Error('Ngày chưa hợp lệ.');const {db}=firebase(),dayId='day-'+date,ref=doc(db,'merchantDays',dayId),e=event(merchantId,'day.bind','Liên kết ngày '+date,dayId);
 await runTransaction(db,async tx=>{if((await tx.get(ref)).exists())throw Error('Ngày này đã liên kết nhà hàng. Liên kết được giữ cố định để bảo toàn lịch sử.');tx.set(ref,{merchantId,date,createdAt:serverTimestamp(),createdBy:actor()});tx.set(e.ref,e.data);});
}
export async function publishMenu(merchantId:string,date:string,items:Pick<Dish,'name'|'price'>[],expectedRevision:string){
 const menu=validMenu(items);if(!validDate(date))throw Error('Ngày chưa hợp lệ.');const {db}=firebase(),dayId='day-'+date,ref=doc(db,'days',dayId),previous=await getDoc(ref);
 // A new day's dishes cannot be queried until its parent exists under the shared Rules.
 const old=previous.exists()?await getDocs(query(collection(ref,'dishes'),where('active','==',true))):null,ids=await Promise.all(menu.map(i=>dishId(i.name))),e=event(merchantId,'menu.publish',`Đăng thực đơn ${menu.length} món`,dayId);
 await runTransaction(db,async tx=>{
  const [binding,day]=await Promise.all([tx.get(doc(db,'merchantDays',dayId)),tx.get(ref)]);
  if(binding.data()?.merchantId!==merchantId)throw Error('Quản trị Cơm Nhà cần liên kết ngày này với nhà hàng trước.');
  if(time(day.data()?.updatedAt)!==expectedRevision)throw Error('Thực đơn vừa thay đổi ở thiết bị khác. Tải lại danh sách rồi thử lại.');
  if(day.exists())tx.update(ref,{menuCount:menu.length,updatedAt:serverTimestamp()});else tx.set(ref,{date,label:'Ngày '+date,status:'auto',menuCount:menu.length,cutoffAt:Timestamp.fromDate(new Date(date+'T09:30:00+07:00')),updatedAt:serverTimestamp()});
  for(const d of old?.docs||[])if(!ids.includes(d.id))tx.update(d.ref,{active:false,updatedAt:serverTimestamp()});
  menu.forEach((item,i)=>tx.set(doc(ref,'dishes',ids[i]),{...item,active:true,updatedAt:serverTimestamp()}));tx.set(e.ref,e.data);
 });
}
export async function advance(merchantId:string,dayId:string,role:Role,to:State,orders:Order[],note:string){
 if(note.length>300)throw Error('Ghi chú tối đa 300 ký tự.');if(!orders.some(o=>!o.cancelled)&&!(to==='accepted'&&orders.length))throw Error('Chưa có đơn đang hiệu lực.');
 const {db}=firebase(),hash=await orderFingerprint(orders),ref=doc(db,'merchantFulfillments',dayId),e=event(merchantId,'status.change','Chuyển trạng thái: '+to,dayId);
 await runTransaction(db,async tx=>{
  const [s,b]=await Promise.all([tx.get(ref),tx.get(doc(db,'merchantDays',dayId))]);
  if(b.data()?.merchantId!==merchantId)throw Error('Ngày không thuộc nhà hàng này.');
  const from=s.data()?.state||'new',changed=!!s.exists()&&s.data()?.orderHash!==hash;
  if(!canAdvance(role,from,to,changed)||(changed&&to!=='accepted'))throw Error('Đơn đã thay đổi hoặc trạng thái không hợp lệ. Kiểm tra lại và xác nhận danh sách mới.');
  tx.set(ref,{merchantId,date:b.data()!.date,state:to,note:note.trim(),orderHash:hash,lastEventId:e.id,createdAt:s.data()?.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:actor()});tx.set(e.ref,e.data);
 });
}
export async function saveMember(merchantId:string,uid:string,role:Role,enabled:boolean){
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw Error('UID chưa hợp lệ.');const {db}=firebase(),ref=doc(db,'merchantUsers',uid),e=event(merchantId,'member.update','Cập nhật nhân sự '+uid.slice(0,8));
 await runTransaction(db,async tx=>{const s=await tx.get(ref);if(s.exists()&&s.data().merchantId!==merchantId)throw Error('UID đã thuộc một nhà hàng khác.');tx.set(ref,{merchantId,role,enabled,createdAt:s.data()?.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:actor()});tx.set(e.ref,e.data);});
}
