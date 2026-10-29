import test from 'node:test';import assert from 'node:assert/strict';
import {released,currentFulfillment} from '../lib/dispatch';import {catalogMenuDraft} from '../lib/menu-draft';
import type {Day,Dish,Fulfillment} from '../lib/model';
test('merchant release needs explicit close and stale fulfillment cannot survive redispatch',()=>{
 const day={status:'closed',closedAt:'2026-10-29T02:30:00Z',dispatchId:'a'.repeat(32)} as Day,value={state:'cooking',dispatchId:day.dispatchId} as Fulfillment;
 assert.equal(released({...day,status:'auto'}),false);assert.equal(released({...day,status:'open'}),false);assert.equal(released({...day,dispatchId:undefined}),false);
 assert.equal(currentFulfillment(day,value),value);assert.equal(currentFulfillment({...day,dispatchId:'b'.repeat(32)},value),null);assert.equal(currentFulfillment({...day,status:'open'},value),null);
 assert.equal(released({...day,changing:true}),false);assert.equal(currentFulfillment({...day,changing:true},value),null);
});
test('opening a draft loads active catalog prices, deduplicates names and preserves custom dishes',()=>{
 const previous=[{name:'Cơm A',price:30000},{name:'Món cũ',price:50000},{name:'Món riêng',price:45000}],catalog=[{id:'a',name:'Cơm A',price:40000,active:true},{id:'b',name:'Bún B',price:35000,active:true},{id:'c',name:'Món cũ',price:50000,active:false}] satisfies Dish[];
 assert.deepEqual(catalogMenuDraft(previous,catalog),[{name:'Cơm A',price:40000},{name:'Bún B',price:35000},{name:'Món riêng',price:45000}]);assert.equal(previous[0].price,30000);
});
