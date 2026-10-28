import {initializeApp,getApps,getApp} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
export const configured=Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID&&process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
let services:ReturnType<typeof init>|undefined;
function init(){
 if(!configured)throw new Error('Điền cấu hình Firebase Web trong biến môi trường để kết nối.');
 const app=getApps().length?getApp():initializeApp({apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID});
 const auth=getAuth(app),db=getFirestore(app,process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID||'(default)');
 const a=process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,f=process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
 if(a||f){if(process.env.NODE_ENV==='production'||!app.options.projectId?.startsWith('demo-')||!a||!f||![a,f].every(v=>/^127\.0\.0\.1:\d+$/.test(v)))throw new Error('Emulator chỉ dùng cục bộ với project demo.');connectAuthEmulator(auth,'http://'+a,{disableWarnings:true});const [host,port]=f.split(':');connectFirestoreEmulator(db,host,Number(port));}
 return {auth,db};
}
export const firebase=()=>services??=init();
