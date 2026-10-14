import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roomIdFor,validPresence,roomFromUrl,roomLink} from './protocol.js';
test('matching passwords discover the same room; exact differences isolate rooms',async()=>{
  assert.equal(await roomIdFor('long secret phrase'),await roomIdFor('long secret phrase'));
  assert.notEqual(await roomIdFor('long secret phrase'),await roomIdFor('Long secret phrase'));
  assert.notEqual(await roomIdFor('long secret phrase'),await roomIdFor('long secret phrase '));
  assert.match(await roomIdFor('long secret phrase'),/^[a-f0-9]{64}$/);
});
test('validate untrusted peer positions and nicknames',()=>{
  const valid={v:2,name:'Ahiru',emoji:'🦆',position:{lat:35.36,lng:132.75,accuracy:12,timestamp:Date.now()}};
  assert.equal(validPresence(valid),true);assert.equal(validPresence({...valid,position:null}),true);
  for(const position of [{...valid.position,lat:91},{...valid.position,lng:Infinity},{...valid.position,accuracy:-1},{...valid.position,timestamp:'now'},{}])assert.equal(validPresence({...valid,position}),false);
  for(const name of ['', ' ', 'a'.repeat(33), null])assert.equal(validPresence({...valid,name}),false);
  assert.equal(validPresence(null),false);
});

test('room URL parsing and share links never carry passwords',async()=>{
  assert.equal(roomFromUrl('https://example.com/map/?room=izumo-walk'),'izumo-walk');
  assert.equal(roomFromUrl('https://example.com/map/'),'');
  assert.equal(roomFromUrl('https://example.com/?room='+ 'a'.repeat(65)),'');
  assert.equal(roomLink('https://example.com/map/?password=secret#secret','izumo walk'),'https://example.com/map/?room=izumo+walk');
  assert.notEqual(await roomIdFor('same password','room-a'),await roomIdFor('same password','room-b'));
  assert.equal(validPresence({v:2,name:'Ann',emoji:'<script>',position:null}),false);
});
