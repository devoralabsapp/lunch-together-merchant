import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,terminate} from 'firebase/firestore';
import {assertMerchantAccount,MerchantAccessError} from '../lib/portal-access';

test('real Google-emulator sessions must pass Merchant admission before entering the portal',{
 skip:!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST,
 timeout:60000,
},async t=>{
 const project='demo-merchant-portal-admission',store=process.env.FIRESTORE_EMULATOR_HOST!,authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST!;
 assert.match(store,/^127\.0\.0\.1:\d+$/);assert.match(authHost,/^127\.0\.0\.1:\d+$/);
 const apps:FirebaseApp[]=[],databases:ReturnType<typeof getFirestore>[]=[];
 async function session(subject:string,verified=true){
  const app=initializeApp({projectId:project,apiKey:'fake-api-key'},subject);apps.push(app);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://'+authHost,{disableWarnings:true});
  const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const token=encode({alg:'none',typ:'JWT'})+'.'+encode({iss:'https://accounts.google.com',aud:'sample-client',sub:subject,email:subject+'@example.test',email_verified:verified,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})+'.';
  const {user}=await signInWithCredential(auth,GoogleAuthProvider.credential(token));
  const db=getFirestore(app),[host,port]=store.split(':');connectFirestoreEmulator(db,host,Number(port));databases.push(db);return {user,db};
 }
 // The emulator-only owner token seeds fictitious role fixtures, never production.
 async function seed(path:string,fields:Record<string,unknown>){
  const values=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,typeof v==='boolean'?{booleanValue:v}:{stringValue:String(v)}]));
  const result=await fetch(`http://${store}/v1/projects/${project}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:values})});
  assert.equal(result.ok,true,await result.text());
 }
 try{
 const admin=await session('sample-admin'),customer=await session('sample-customer'),chef=await session('sample-chef'),unverified=await session('sample-unverified',false);
 await seed('admins/'+admin.user.uid,{enabled:true});
 await seed('merchants/sample-kitchen',{active:true});
 const membership=(enabled=true)=>({merchantId:'sample-kitchen',role:'manager',enabled});
 await seed('merchantUsers/'+chef.user.uid,membership());
 await t.test('an ordinary Google account is refused instead of opening a signed-in workspace',async()=>{
  await assert.rejects(assertMerchantAccount(customer.user,customer.db),MerchantAccessError);
 });
 await t.test('assigned staff can enter their active restaurant',async()=>{await assertMerchantAccount(chef.user,chef.db);});
 await t.test('disabled staff cannot sign in',async()=>{await seed('merchantUsers/'+chef.user.uid,membership(false));await assert.rejects(assertMerchantAccount(chef.user,chef.db),MerchantAccessError);await seed('merchantUsers/'+chef.user.uid,membership());});
 await t.test('blocked staff cannot sign in',async()=>{await seed('userAccess/'+chef.user.uid,{blocked:true});await assert.rejects(assertMerchantAccount(chef.user,chef.db),MerchantAccessError);await seed('userAccess/'+chef.user.uid,{blocked:false});});
 await t.test('only verified customer admins retain the cross-portal exception',async()=>{await seed('merchantUsers/'+admin.user.uid,membership(false));await assertMerchantAccount(admin.user,admin.db);await seed('admins/'+unverified.user.uid,{enabled:true});await assert.rejects(assertMerchantAccount(unverified.user,unverified.db),MerchantAccessError);});
 await t.test('inactive restaurants refuse staff admission',async()=>{await seed('merchants/sample-kitchen',{active:false});await assert.rejects(assertMerchantAccount(chef.user,chef.db));});
 }finally{await Promise.all(databases.map(db=>terminate(db)));await Promise.all(apps.map(app=>deleteApp(app)));}
});
