import type {User} from 'firebase/auth';
import {doc,getDoc,getDocs,collection,query,where,limit,setDoc,serverTimestamp,type Firestore} from 'firebase/firestore';
import {digest} from './model';
export const normalizeMerchantEmail=(value:string)=>value.trim().toLowerCase();
export async function ensureMerchantDirectory(user:User,db:Firestore){
 if(!user.email||user.isAnonymous||!user.emailVerified)return;
 const email=normalizeMerchantEmail(user.email),ref=doc(db,'merchantEmailDirectory',await digest(email)),old=await getDoc(ref);
 if(old.data()?.uid===user.uid&&old.data()?.email===email)return;
 await setDoc(ref,{uid:user.uid,email,updatedAt:serverTimestamp()});
}
export async function resolveMerchantIdentity(db:Firestore,input:string,admin:boolean,actorId:string,sourceStoreId:string){
 const value=input.trim();if(!value.includes('@')){if(!/^[A-Za-z0-9_-]{1,128}$/.test(value))throw Error('Nhập UID hoặc email Google hợp lệ.');return {uid:value,email:''};}
 const email=normalizeMerchantEmail(value);if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error('Nhập UID hoặc email Google hợp lệ.');
 const emailHash=await digest(email);if(!admin)await setDoc(doc(db,'merchantEmailLookups',actorId),{emailHash,sourceStoreId,createdAt:serverTimestamp()});
 const ref=doc(db,'merchantEmailDirectory',emailHash);let result=await getDoc(ref);
 if(!result.exists()&&admin){const applications=await getDocs(query(collection(db,'merchantApplications'),where('email','==',email),limit(2)));if(applications.size===1&&applications.docs[0].data().status==='approved'){await setDoc(ref,{uid:applications.docs[0].id,email,updatedAt:serverTimestamp()});result=await getDoc(ref);}}
 if(!result.exists())throw Error('Chưa tìm thấy email đã xác minh. Người dùng cần đăng nhập Merchant sau khi được phê duyệt, hoặc bạn nhập UID của họ.');
 return {uid:String(result.data().uid),email};
}
