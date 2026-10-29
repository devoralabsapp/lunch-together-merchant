import {collection,doc,getDoc,getDocs,query,where,orderBy,limit,onSnapshot,runTransaction,serverTimestamp,Timestamp,type DocumentData,type QueryDocumentSnapshot,type Unsubscribe} from 'firebase/firestore';
import {firebase} from './firebase';
import {released} from './dispatch';
import {accountAccess,type Access,type Application} from './account';
export {emptyAccess} from './account';
export type {Access} from './account';
import {validDate,validMenu,dishId,orderFingerprint,canAdvance,type Merchant,type Dish,type Member,type Day,type Binding,type Order,type Fulfillment,type Activity,type State,type Role} from './model';
const time=(v:unknown)=>{const t=v as {toDate?:()=>Date}|null;return t&&typeof t.toDate==='function'?t.toDate().toISOString():'';};
const rows=<T>(snapshot:{docs:QueryDocumentSnapshot<DocumentData>[]})=>snapshot.docs.map(d=>({id:d.id,...d.data()}) as T);
const actor=()=>{const u=firebase().auth.currentUser;if(!u||u.isAnonymous||!u.emailVerified)throw Error('Đăng nhập Google đã xác minh để tiếp tục.');return u.uid;};
function event(merchantId:string,kind:string,message:string,dayId=''){const id=crypto.randomUUID().replaceAll('-','');return {ref:doc(firebase().db,'merchants',merchantId,'events',id),id,data:{kind,message,dayId,actorId:actor(),createdAt:serverTimestamp()}};}
export function watchAccess(uid:string,callback:(v:Access)=>void,error:(e:unknown)=>void):Unsubscribe{
 let admin=false,member:Member|null=null,application:Application|null=null,blocked=false;const db=firebase().db,ready=new Set<string>();const emit=(key:string)=>{ready.add(key);if(ready.size===4)callback(accountAccess(admin,member,application,blocked));};
 const stops=[onSnapshot(doc(db,'admins',uid),s=>{admin=s.data()?.enabled===true;emit('admin');},error),onSnapshot(doc(db,'merchantUsers',uid),s=>{member=s.exists()?{id:s.id,...s.data()} as Member:null;emit('member');},error),onSnapshot(doc(db,'merchantApplications',uid),s=>{application=s.exists()?{id:s.id,...s.data()} as Application:null;emit('application');},error),onSnapshot(doc(db,'userAccess',uid),s=>{blocked=s.data()?.blocked===true||s.data()?.deleted===true;emit('blocked');},error)];return ()=>stops.forEach(stop=>stop());
}
export function watchMerchants(access:Access,uid:string,callback:(v:Merchant[])=>void,error:(e:unknown)=>void){
 const db=firebase().db;if(!access.canOperate){callback([]);return ()=>{};}if(access.admin)return onSnapshot(collection(db,'merchants'),s=>callback(rows<Merchant>(s)),error);
 let own:Merchant[]=[],assigned=new Map<string,Merchant>(),grants:Member[]=[],stops=new Map<string,Unsubscribe>(),businessStops=new Map<string,Unsubscribe>(),businessStores=new Map<string,Merchant[]>();
 const emit=()=>callback([...new Map([...own,...assigned.values(),...[...businessStores.values()].flat()].map(m=>[m.id,m])).values()].sort((a,b)=>a.name.localeCompare(b.name,'vi')));
 const refresh=()=>{const ids=new Set(grants.filter(g=>g.enabled).map(g=>g.merchantId));if(access.member?.enabled&&!access.member.accountOnly)ids.add(access.member.merchantId);for(const [id,stop] of stops)if(!ids.has(id)){stop();stops.delete(id);assigned.delete(id);}for(const id of ids)if(!stops.has(id))stops.set(id,onSnapshot(doc(db,'merchants',id),s=>{if(s.exists())assigned.set(id,{id:s.id,...s.data()} as Merchant);else assigned.delete(id);emit();},e=>{assigned.delete(id);emit();error(e);}));emit();};
 const a=onSnapshot(query(collection(db,'merchants'),where('ownerId','==',uid)),s=>{own=rows<Merchant>(s);emit();},error);
 const b=onSnapshot(query(collection(db,'merchantStoreUsers'),where('uid','==',uid)),s=>{grants=rows<Member>(s);refresh();},error);
 const c=onSnapshot(query(collection(db,'merchantTeamUsers'),where('uid','==',uid)),s=>{const active=s.docs.filter(d=>d.data().enabled),ids=new Set(active.map(d=>d.data().businessId as string));for(const [id,stop] of businessStops)if(!ids.has(id)){stop();businessStops.delete(id);businessStores.delete(id);}for(const d of active){const v=d.data(),id=String(v.businessId);if(businessStops.has(id))continue;let branches:Merchant[]=[],source:Merchant|null=null;const update=()=>{businessStores.set(id,[...branches,...(source?[source]:[])]);emit();};const one=onSnapshot(query(collection(db,'merchants'),where('ownerId','==',id)),q=>{branches=rows<Merchant>(q);update();},e=>{branches=[];update();error(e);}),two=onSnapshot(doc(db,'merchants',v.sourceStoreId),q=>{source=q.exists()?{id:q.id,...q.data()} as Merchant:null;update();},e=>{source=null;update();error(e);});businessStops.set(id,()=>{one();two();});}emit();},error);
 refresh();return()=>{a();b();c();stops.forEach(stop=>stop());businessStops.forEach(stop=>stop());};
}
export function watchStoreRole(id:string,uid:string,callback:(role:Role|null|undefined)=>void,error:(e:unknown)=>void,businessId=id){let local:Role|null|undefined,shared:Role|null|undefined;const ready=new Set<string>(),emit=(key:string)=>{ready.add(key);if(ready.size===2)callback(shared===undefined?local:shared);};const db=firebase().db,a=onSnapshot(doc(db,'merchantStoreUsers',id+'~'+uid),s=>{local=s.exists()?(s.data().enabled?s.data().role:null):undefined;emit('local');},error),b=onSnapshot(doc(db,'merchantTeamUsers',businessId+'~'+uid),s=>{shared=s.exists()?(s.data().enabled?s.data().role:null):undefined;emit('shared');},error);return()=>{a();b();};}
export function watchMerchant(id:string,callback:(v:{bindings?:Binding[];catalog?:Dish[];events?:Activity[]})=>void,error:(e:unknown)=>void){
 const db=firebase().db;
 const a=onSnapshot(query(collection(db,'merchantDays'),where('merchantId','==',id)),s=>callback({bindings:rows<Binding>(s).sort((a,b)=>b.date.localeCompare(a.date))}),error);

 const c=onSnapshot(query(collection(db,'merchants',id,'events'),orderBy('createdAt','desc'),limit(30)),s=>callback({events:s.docs.map(d=>({id:d.id,...d.data(),createdAt:time(d.data().createdAt)}) as Activity)}),error);
 return ()=>{a();c();};
}
export function watchDay(id:string,callback:(v:{day?:Day|null;dishes?:Dish[];orders?:Order[];fulfillment?:Fulfillment|null})=>void,error:(e:unknown)=>void){
 const db=firebase().db;let children:Unsubscribe[]=[],ordersStop:Unsubscribe|undefined,ordersDispatch='',generation=0;
 const a=onSnapshot(doc(db,'days',id),s=>{
  const day=s.exists()?{id:s.id,date:s.data().date,label:s.data().label,status:s.data().status,revision:time(s.data().updatedAt),closedAt:time(s.data().closedAt),dispatchId:s.data().dispatchId,changing:s.data().changing===true}:null;
  callback({day});
  if(s.exists()&&!children.length)children=[
   onSnapshot(query(collection(db,'days',id,'dishes'),where('active','==',true)),v=>callback({dishes:rows<Dish>(v)}),error),
  ];
  if(!s.exists()){children.forEach(stop=>stop());children=[];callback({dishes:[],orders:[]});}
  if(!released(day)||ordersDispatch!==day?.dispatchId){ordersStop?.();ordersStop=undefined;ordersDispatch='';generation++;callback({orders:[]});}
  if(released(day)&&!ordersStop){ordersDispatch=day!.dispatchId!;const version=generation;ordersStop=onSnapshot(collection(db,'days',id,'orders'),v=>{if(version===generation)callback({orders:v.docs.map(d=>({id:d.id,dish:d.data().dish,quantity:d.data().quantity,price:d.data().price,note:d.data().note||'',cancelled:d.data().cancelled===true,updatedAt:time(d.data().updatedAt)}))});},e=>{if(version===generation){callback({orders:[]});error(e);}});}
 },error);
 const d=onSnapshot(doc(db,'merchantFulfillments',id),s=>callback({fulfillment:s.exists()?{...s.data(),updatedAt:time(s.data().updatedAt)} as Fulfillment:null}),error);
 return ()=>{generation++;a();children.forEach(stop=>stop());ordersStop?.();d();};
}
export function watchStaff(id:string,callback:(v:Member[])=>void,error:(e:unknown)=>void){let old:Member[]=[],current:Member[]=[];const emit=()=>callback([...new Map([...old,...current].map(m=>[m.id,m])).values()]);const a=onSnapshot(query(collection(firebase().db,'merchantUsers'),where('merchantId','==',id)),s=>{old=rows<Member>(s).filter(m=>!m.accountOnly);emit();},error),b=onSnapshot(query(collection(firebase().db,'merchantStoreUsers'),where('merchantId','==',id)),s=>{current=s.docs.map(d=>({...d.data(),id:d.data().uid}) as Member);emit();},error);return ()=>{a();b();};}
export async function createMerchant(name:string,ownerUid=''){
 if(!name.trim()||name.trim().length>100||ownerUid&&!/^[A-Za-z0-9_-]{1,128}$/.test(ownerUid))throw Error('Kiểm tra tên nhà hàng và UID chủ cửa hàng.');
 const {db}=firebase(),uid=actor(),id=crypto.randomUUID().replaceAll('-',''),ownerId=ownerUid||uid,e=event(id,'merchant.create','Tạo nhà hàng: '+name.trim());
 await runTransaction(db,async tx=>{const member=ownerUid?await tx.get(doc(db,'merchantUsers',ownerUid)):null;tx.set(doc(db,'merchants',id),{name:name.trim(),phone:'',address:'',active:true,ownerId,createdAt:serverTimestamp(),createdBy:uid,updatedAt:serverTimestamp(),updatedBy:uid});if(ownerUid&&!member?.exists())tx.set(doc(db,'merchantUsers',ownerUid),{merchantId:id,role:'owner',enabled:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:uid});tx.set(e.ref,e.data);});return id;
}
export async function saveMerchant(merchant:Merchant,input:{name:string;phone:string;address:string}){
 const {db}=firebase(),e=event(merchant.id,'merchant.update','Cập nhật thông tin nhà hàng');
 await runTransaction(db,async tx=>{const s=await tx.get(doc(db,'merchants',merchant.id));if(!s.exists())throw Error('Không tìm thấy nhà hàng.');tx.update(s.ref,{name:input.name.trim(),phone:input.phone.trim(),address:input.address.trim(),updatedAt:serverTimestamp(),updatedBy:actor()});tx.set(e.ref,e.data);});
}
export async function archiveMerchant(merchantId:string,archived:boolean){
 const {db}=firebase(),uid=actor(),e=event(merchantId,'merchant.update',archived?'Lưu trữ cửa hàng':'Khôi phục cửa hàng');
 await runTransaction(db,async tx=>{const ref=doc(db,'merchants',merchantId),s=await tx.get(ref);if(!s.exists())throw Error('Không tìm thấy nhà hàng.');tx.update(ref,{archived,active:!archived,updatedAt:serverTimestamp(),updatedBy:uid});tx.set(e.ref,e.data);});
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
  const [s,b,day]=await Promise.all([tx.get(ref),tx.get(doc(db,'merchantDays',dayId)),tx.get(doc(db,'days',dayId))]);
  if(b.data()?.merchantId!==merchantId)throw Error('Ngày không thuộc nhà hàng này.');
  if(!day.exists()||day.data().status!=='closed'||day.data().changing===true||!day.data().closedAt||!day.data().dispatchId)throw Error('Chờ quản trị Cơm Nhà chốt đơn trước khi nhận danh sách.');
  const dispatchId=day.data().dispatchId,sameDispatch=s.data()?.dispatchId===dispatchId;
  const from=sameDispatch?s.data()?.state||'new':'new',changed=sameDispatch&&!!s.exists()&&s.data()?.orderHash!==hash;
  if(!canAdvance(role,from,to,changed)||(changed&&to!=='accepted'))throw Error('Đơn đã thay đổi hoặc trạng thái không hợp lệ. Kiểm tra lại và xác nhận danh sách mới.');
  tx.set(ref,{merchantId,date:b.data()!.date,state:to,note:note.trim(),orderHash:hash,dispatchId,lastEventId:e.id,createdAt:s.data()?.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:actor()});tx.set(e.ref,e.data);
 });
}
export async function saveMember(merchantId:string,uid:string,role:Role,enabled:boolean){
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw Error('UID chưa hợp lệ.');const {db}=firebase(),ref=doc(db,'merchantStoreUsers',merchantId+'~'+uid),e=event(merchantId,'member.update','Cập nhật nhân sự '+uid.slice(0,8));
 await runTransaction(db,async tx=>{const s=await tx.get(ref);tx.set(ref,{uid,merchantId,role,enabled,createdAt:s.data()?.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:actor()});tx.set(e.ref,e.data);});
}
export function watchApplications(status:Application['status'],callback:(values:Application[])=>void,error:(e:unknown)=>void){return onSnapshot(query(collection(firebase().db,'merchantApplications'),where('status','==',status),limit(200)),s=>callback(rows<Application>(s)),error);}
export async function saveApplication(input:{businessName:string;phone:string;note:string}){const {db}=firebase(),uid=actor();await runTransaction(db,async tx=>{const ref=doc(db,'merchantApplications',uid),old=await tx.get(ref);if(!old.exists())throw Error('Không tìm thấy hồ sơ đăng ký.');tx.update(ref,{businessName:input.businessName.trim(),phone:input.phone.trim(),note:input.note.trim(),status:'pending',reviewedBy:'',reviewedAt:null,reviewNote:'',reviewEventId:'',updatedAt:serverTimestamp()});});}
export async function reviewApplication(application:Application,status:'approved'|'rejected'|'disabled',note:string){
 const {db}=firebase(),uid=actor(),ref=doc(db,'merchantApplications',application.id),eventId=crypto.randomUUID().replaceAll('-','');
 await runTransaction(db,async tx=>{const [old,member,state]=await Promise.all([tx.get(ref),tx.get(doc(db,'merchantUsers',application.id)),tx.get(doc(db,'userAccess',application.id))]);if(status==='approved'&&state.data()?.blocked===true)throw Error('Người dùng đang bị khóa. Mở lại tài khoản trước khi phê duyệt.');if(!old.exists()||time(old.data().updatedAt)!==time(application.updatedAt))throw Error('Hồ sơ vừa thay đổi. Vui lòng tải lại.');tx.update(ref,{status,reviewedBy:uid,reviewedAt:serverTimestamp(),reviewNote:note.trim(),reviewEventId:eventId,updatedAt:serverTimestamp()});if(status==='approved'||status==='disabled')tx.set(doc(db,'merchantUsers',application.id),member.exists()?{...member.data(),enabled:status==='approved',updatedAt:serverTimestamp(),updatedBy:uid}:{merchantId:application.id,role:'owner',enabled:status==='approved',accountOnly:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:uid});tx.set(doc(db,'merchantApprovalEvents',eventId),{uid:application.id,status,actorId:uid,note:note.trim(),createdAt:serverTimestamp()});});
}
export async function readBranchMenu(merchantId:string,date:string){const {db}=firebase(),ref=doc(db,'merchants',merchantId,'menus',date),header=await getDoc(ref);if(!header.exists())return {revision:'',items:[] as Dish[]};const dishes=await getDocs(query(collection(ref,'dishes'),where('active','==',true)));return {revision:time(header.data().updatedAt),items:rows<Dish>(dishes)};}
export async function saveBranchMenu(merchantId:string,date:string,items:Pick<Dish,'name'|'price'>[],expected:string){
 if(!validDate(date))throw Error('Ngày chưa hợp lệ.');const menu=items.length?validMenu(items):[],{db}=firebase(),ref=doc(db,'merchants',merchantId,'menus',date),previous=await getDoc(ref),old=previous.exists()?await getDocs(query(collection(ref,'dishes'),where('active','==',true))):null,ids=await Promise.all(menu.map(i=>dishId(i.name))),e=event(merchantId,'branch.menu','Lưu thực đơn cơ sở '+date);
 await runTransaction(db,async tx=>{const header=await tx.get(ref);if(time(header.data()?.updatedAt)!==expected)throw Error('Thực đơn vừa thay đổi ở thiết bị khác. Tải lại danh sách rồi thử lại.');tx.set(ref,{date,menuCount:menu.length,updatedAt:serverTimestamp(),updatedBy:actor()});for(const d of old?.docs||[])if(!ids.includes(d.id))tx.update(d.ref,{active:false,updatedAt:serverTimestamp()});menu.forEach((item,i)=>tx.set(doc(ref,'dishes',ids[i]),{...item,active:true,updatedAt:serverTimestamp()}));tx.set(e.ref,e.data);});
}
