import test from 'node:test';import assert from 'node:assert/strict';
import {catalogBusinessId,legacyCatalogCandidates} from '../lib/restaurant-catalog';
test('branches share a business key only when their immutable owner matches',()=>{
 const store={name:'Sample',phone:'',address:'',active:true};assert.equal(catalogBusinessId({...store,id:'a',ownerId:'owner'}),catalogBusinessId({...store,id:'b',ownerId:'owner'}));assert.notEqual(catalogBusinessId({...store,id:'a',ownerId:'owner'}),catalogBusinessId({...store,id:'c',ownerId:'other'}));assert.equal(catalogBusinessId({...store,id:'legacy'}),'legacy');
});
test('legacy catalog merge normalizes names, keeps newest prices and retains inactive unique dishes',()=>{
 const item={id:'sample',active:true};const rows=legacyCatalogCandidates([{...item,name:' Cơm A ',price:40000,modified:1,storeId:'a'},{...item,name:'cơm a',price:45000,modified:2,storeId:'b'},{...item,name:'Bún B',price:30000,active:false,modified:1,storeId:'a'}]);assert.equal(rows.length,2);assert.equal(rows.find(d=>d.name==='cơm a')!.price,45000);assert.equal(rows.find(d=>d.name==='Bún B')!.active,false);
});
