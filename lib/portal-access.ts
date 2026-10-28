import type {User} from 'firebase/auth';
import {doc,getDoc,type Firestore} from 'firebase/firestore';

export const customerOnlyMessage='Tài khoản này chưa được cấp quyền Merchant. Vui lòng dùng portal Cơm Nhà hoặc liên hệ quản trị; chỉ quản trị được dùng cả hai portal.';
export class MerchantAccessError extends Error{constructor(){super(customerOnlyMessage);this.name='MerchantAccessError';}}

export async function assertMerchantAccount(user:User,db:Firestore){
 const token=await user.getIdTokenResult();
 if(user.isAnonymous||token.signInProvider!=='google.com'||token.claims.email_verified!==true)throw new MerchantAccessError();
 const admin=await getDoc(doc(db,'admins',user.uid));
 if(admin.data()?.enabled===true)return;
 const [member,access]=await Promise.all([getDoc(doc(db,'merchantUsers',user.uid)),getDoc(doc(db,'userAccess',user.uid))]);
 if(member.data()?.enabled!==true||access.data()?.blocked===true)throw new MerchantAccessError();
 const restaurant=await getDoc(doc(db,'merchants',member.data()!.merchantId));
 if(restaurant.data()?.active!==true)throw new MerchantAccessError();
}
