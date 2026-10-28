import type {User} from 'firebase/auth';
import {doc,getDoc,runTransaction,serverTimestamp,type Firestore} from 'firebase/firestore';
import type {Member} from './model';
export type Application={id:string;email:string;displayName:string;businessName:string;phone:string;note:string;status:'pending'|'approved'|'rejected'|'disabled';createdAt?:unknown;updatedAt?:unknown;reviewedBy:string;reviewedAt?:unknown;reviewNote:string;reviewEventId:string};
export type Access={admin:boolean;member:Member|null;application:Application|null;blocked:boolean;canOperate:boolean;canCreate:boolean};
export const emptyAccess:Access={admin:false,member:null,application:null,blocked:false,canOperate:false,canCreate:false};
export function accountAccess(admin:boolean,member:Member|null,application:Application|null,blocked:boolean):Access{
 const enabled=!blocked&&application?.status!=='disabled',approved=application?.status==='approved',legacy=member?.enabled===true;
 return {admin,member,application,blocked,canOperate:admin||(enabled&&legacy),canCreate:admin||(enabled&&legacy&&(approved||member?.role==='owner'))};
}
export async function readAccount(user:User,db:Firestore){
 const token=await user.getIdTokenResult();if(user.isAnonymous||token.signInProvider!=='google.com'||token.claims.email_verified!==true)throw Error('Đăng nhập Google đã xác minh để tiếp tục.');
 const [a,m,r,b]=await Promise.all([getDoc(doc(db,'admins',user.uid)),getDoc(doc(db,'merchantUsers',user.uid)),getDoc(doc(db,'merchantApplications',user.uid)),getDoc(doc(db,'userAccess',user.uid))]);
 return accountAccess(a.data()?.enabled===true,m.exists()?{id:m.id,...m.data()} as Member:null,r.exists()?{id:r.id,...r.data()} as Application:null,b.data()?.blocked===true||b.data()?.deleted===true);
}
export async function initializeMerchantAccount(user:User,db:Firestore){
 let access=await readAccount(user,db);if(access.blocked&&!access.admin)throw Error('Tài khoản đang bị khóa. Vui lòng liên hệ quản trị.');
 if(!access.admin&&!access.member&&!access.application){const ref=doc(db,'merchantApplications',user.uid);await runTransaction(db,async tx=>{if((await tx.get(ref)).exists())return;tx.set(ref,{email:user.email||'',displayName:(user.displayName||'').slice(0,100),businessName:'',phone:'',note:'',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),reviewedBy:'',reviewedAt:null,reviewNote:'',reviewEventId:''});});access=await readAccount(user,db);}
 return access;
}
