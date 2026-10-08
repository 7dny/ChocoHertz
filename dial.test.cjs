const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dial.js'),'utf8'),context);const d=context.window.ChocoDial;
assert.equal(d.angle(100,0,100,100),0);assert.equal(d.angle(200,100,100,100),90);assert.equal(d.delta(179,-179),2);assert.equal(d.delta(-179,179),-2);
assert.equal(d.turn(50,90,'volume'),75);assert.equal(d.turn(50,-90,'volume'),25);assert.equal(d.turn(50,90,'volume',true),52.5);assert.equal(d.turn(95,90,'volume'),100);assert.equal(d.turn(5,-90,'volume'),0);
assert.ok(Math.abs(d.turn(20,120,'hz')-200)<.001);assert.equal(d.turn(20,360,'hz'),20000);assert.equal(d.turn(20000,-360,'hz'),20);assert.ok(d.turn(440,2,'hz')>440&&d.turn(440,2,'hz')<460);
console.log('PASS: circular pointer angles, clockwise and counterclockwise seam crossing, full turns, fine control, and limits.');
