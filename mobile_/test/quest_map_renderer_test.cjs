// Run: node mobile_/test/quest_map_renderer_test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function runProfile(memory, cores) {
const map = fs.readFileSync(path.join(__dirname, '../assets/maps/quest_map.html'), 'utf8');
const dart = fs.readFileSync(path.join(__dirname, '../lib/data/level_map_data.dart'), 'utf8');
const points = [...dart.matchAll(/Offset\((\d+), (\d+)\)/g)].slice(0, 52);
const levels = points.map((p, i) => ({ id: i + 1, x: +p[1], y: +p[2], status: i === 0 ? 'current' : 'unlocked', stars: 0 }));
const events = new Map(), frames = new Map();
let nextFrame = 0, paints = 0, imageDraws = 0;
const ctx = new Proxy({}, {get: (_, key) => (...args) => { if (key === 'scale') assert.ok(args[0]>0&&args[1]>0,'Scenery must never be flipped upside down'); if (key === 'fillRect') paints++; if (key === 'drawImage') imageDraws++; }});
class Element {
  constructor() { this.style = {}; this.children = []; this.dataset = {}; this.clientWidth = 320; this.clientHeight = 568; this.classList = {add(){}, remove(){}}; }
  setAttribute(k,v) { this[k] = v; }
  appendChild(n) { this.children.push(n); }
  replaceChildren() { this.children = []; }
  addEventListener(k,f) { events.set(k, f); }
  getContext() { return ctx; }
}
const ids = ['pins','status','return','camera','scene','finish-landmark'];
const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
const document = {hidden:false, referrer:'', getElementById:id=>elements[id], createElement:()=>new Element()};
const parent = {location:{origin:'http://localhost'}, postMessage(){}};
const images=[];
const scope = {navigator:{deviceMemory:memory,hardwareConcurrency:cores},document, parent, window:{}, location:parent.location, devicePixelRatio:4, URL, Date, Math, Number, Image:class {constructor(){images.push(this);}complete=true;naturalWidth=512;naturalHeight=768;},
 requestAnimationFrame:f=>{frames.set(++nextFrame,f);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(k,f)=>events.set(k,f)};
vm.createContext(scope);
vm.runInContext(map.match(/<script>([\s\S]*?)<\/script>/)[1], scope);
images[0].onload();imageDraws=0;
function flush() { const pending=[...frames.values()]; frames.clear(); pending.forEach(f=>f()); }
scope.window.QuestMap.setLevels(levels);scope.window.QuestMap.reveal(1);flush();
const density=memory<=4||cores<=4?1:1.5;
assert.equal(elements.scene.width,320*density);assert.equal(elements.scene.height,568*density);
assert.equal(frames.size,0,'Idle map must not continuously request frames');
assert.ok(imageDraws<=4,'Only visible image tiles should be drawn at default zoom');
assert.ok(elements.pins.children.filter(p=>!p.hidden).length<10,'Offscreen level markers must be culled');
const before=paints;
for(let i=0;i<100;i++) events.get('wheel')({preventDefault(){},deltaX:0,deltaY:2,deltaMode:0});
assert.equal(frames.size,1,'High-frequency input must coalesce to one pending frame');flush();assert.equal(paints,before+1);
for(const id of [1,52]) {
 scope.window.QuestMap.reveal(id);flush();
 const pin=elements.pins.children[id-1];
 assert.equal(pin.hidden,false);if(id===52)assert.equal(elements['finish-landmark'].hidden,false,'Finish house must be visible at Quest 52');assert.ok(parseFloat(pin.style.top)>100&&parseFloat(pin.style.top)<500,'Endpoint must clear the HUD and footer');
}
document.hidden=true;events.get('visibilitychange')();assert.equal(frames.size,0,'Hidden map must stop painting');
console.log('Renderer checks passed: bounded canvas, visible-only drawing, idle sleep, input batching, endpoints, hidden-page suspension.');

}
runProfile(8,8);
runProfile(4,4);
