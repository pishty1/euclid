const test = require('node:test');
const assert = require('node:assert/strict');
const {check} = require('../../src/sketches/euclid_challenges.js');
const p = (id, x, y) => ({id, pos:[x,y]});
const l = (a,b) => ({a,b});
const points = [p(0,0,0),p(1,3,0),p(2,6,0),p(3,3,3),p(4,0,3),p(5,1.5,3*Math.sqrt(3)/2)];
const base = l(0,1);
test('reference can be any scale, and a drawn segment must actually have twice its length', () => {
 assert.equal(check('double',points,[base],[0,1]),false);
 assert.equal(check('double',points,[base,l(0,2)],[0,1]),true);
 assert.equal(check('double',points,[base,l(0,2)],[0,0]),false);
});
test('triangle requires three explicitly drawn equal sides', () => {
 assert.equal(check('triangle',points,[base,l(1,5)],[0,1]),false);
 assert.equal(check('triangle',points,[base,l(1,5),l(5,0)],[0,1]),true);
});
test('square requires a closed square, not just a rhombus or missing edge', () => {
 const edges=[base,l(1,3),l(3,4),l(4,0)];
 assert.equal(check('square',points,edges,[0,1]),true);
 assert.equal(check('square',points,edges.slice(0,3),[0,1]),false);
 const rhombus=[p(0,0,0),p(1,3,0),p(2,4.5,3*Math.sqrt(3)/2),p(3,1.5,3*Math.sqrt(3)/2)];
 assert.equal(check('square',rhombus,[l(0,1),l(1,2),l(2,3),l(3,0)],[0,1]),false);
});
test('double-area square uses the square diagonal as its side', () => {
 const pts=[p(0,0,0),p(1,3,0),p(2,3,3),p(3,6,0),p(4,3,-3)];
 assert.equal(check('double-square',pts,[base,l(0,2),l(2,3),l(3,4),l(4,0)],[0,1]),true);
 assert.equal(check('square',pts,[base,l(0,2),l(2,3),l(3,4),l(4,0)],[0,1]),false);
});
test('invalidated intersection points and unknown targets never pass', () => {
 const invalid=points.map(x=>x.id===2?{...x,valid:false}:x);
 assert.equal(check('double',invalid,[base,l(0,2)],[0,1]),false);
 assert.equal(check('unknown',points,[base],[0,1]),false);
});
