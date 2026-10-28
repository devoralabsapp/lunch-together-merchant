import type {User} from 'firebase/auth';
import {doc,getDoc,type Firestore} from 'firebase/firestore';
import {readAccount} from './account';

export const customerOnlyMessage='Tài khoản này chưa được cấp quyền Merchant. Vui lòng dùng portal Cơm Nhà hoặc liên hệ quản trị; chỉ quản trị được dùng cả hai portal.';
export class MerchantAccessError extends Error{constructor(){super(customerOnlyMessage);this.name='MerchantAccessError';}}

export async function assertMerchantAccount(user:User,db:Firestore){
 const token=await user.getIdTokenResult();
 if(user.isAnonymous||token.signInProvider!=='google.com'||token.claims.email_verified!==true)throw new MerchantAccessError();
 const access=await readAccount(user,db);if(!access.canOperate)throw new MerchantAccessError();
 if(!access.admin&&access.application?.status!=='approved'&&access.member&&access.member.role!=='owner'){const restaurant=await getDoc(doc(db,'merchants',access.member.merchantId));if(restaurant.data()?.active!==true)throw new MerchantAccessError();}
}
