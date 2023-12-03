// Compiled by ClojureScript 1.10.773 {:static-fns true, :optimize-constants true}
goog.provide('sketches.flow');
goog.require('cljs.core');
goog.require('cljs.core.constants');
goog.require('quil.core');
goog.require('quil.middleware');
sketches.flow.body = document.body;
sketches.flow.w = sketches.flow.body.clientWidth;
sketches.flow.h = sketches.flow.body.clientHeight;
/**
 * Noise zoom level.
 */
sketches.flow.noise_zoom = 0.045;
sketches.flow.palette = new cljs.core.PersistentArrayMap(null, 3, [cljs.core.cst$kw$name,"purple haze",cljs.core.cst$kw$background,new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(10),(10),(10)], null),cljs.core.cst$kw$colors,new cljs.core.PersistentVector(null, 7, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(32),(0),(40)], null),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(82),(15),(125)], null),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(99),(53),(126)], null),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(102),(10),(150)], null),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(132),(26),(200)], null),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(165),(32),(250)], null),new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(196),(106),(251)], null)], null)], null);
/**
 * Creates a particle map.
 */
sketches.flow.particle = (function sketches$flow$particle(id){
return new cljs.core.PersistentArrayMap(null, 8, [cljs.core.cst$kw$id,id,cljs.core.cst$kw$vx,(1),cljs.core.cst$kw$vy,(1),cljs.core.cst$kw$size,(3),cljs.core.cst$kw$direction,(0),cljs.core.cst$kw$x,quil.core.random.cljs$core$IFn$_invoke$arity$1(sketches.flow.w),cljs.core.cst$kw$y,quil.core.random.cljs$core$IFn$_invoke$arity$1(sketches.flow.h),cljs.core.cst$kw$color,cljs.core.rand_nth(cljs.core.cst$kw$colors.cljs$core$IFn$_invoke$arity$1(sketches.flow.palette))], null);
});
/**
 * Returns the initial state to use for the update-render loop.
 */
sketches.flow.sketch_setup = (function sketches$flow$sketch_setup(){
cljs.core.apply.cljs$core$IFn$_invoke$arity$2(quil.core.background,cljs.core.cst$kw$background.cljs$core$IFn$_invoke$arity$1(sketches.flow.palette));

return cljs.core.map.cljs$core$IFn$_invoke$arity$2(sketches.flow.particle,cljs.core.range.cljs$core$IFn$_invoke$arity$2((0),(2000)));
});
/**
 * Calculates the next position based on the current, the speed and a max.
 */
sketches.flow.position = (function sketches$flow$position(current,delta,max){
return cljs.core.mod((current + delta),max);
});
/**
 * Calculates the next velocity by averaging the current velocity and the added delta.
 */
sketches.flow.velocity = (function sketches$flow$velocity(current,delta){
return ((current + delta) / (2));
});
/**
 * Calculates the next direction based on the previous position and id of each particle.
 */
sketches.flow.direction = (function sketches$flow$direction(x,y,z){
return (((2) * Math.PI) * (quil.core.noise.cljs$core$IFn$_invoke$arity$2((x * sketches.flow.noise_zoom),(y * sketches.flow.noise_zoom)) + (0.12 * quil.core.noise.cljs$core$IFn$_invoke$arity$3((x * sketches.flow.noise_zoom),(y * sketches.flow.noise_zoom),(z * sketches.flow.noise_zoom)))));
});
/**
 * Returns the next state to render. Receives the current state as a paramter.
 */
sketches.flow.sketch_update = (function sketches$flow$sketch_update(particles){
return cljs.core.map.cljs$core$IFn$_invoke$arity$2((function (p){
return cljs.core.assoc.cljs$core$IFn$_invoke$arity$variadic(p,cljs.core.cst$kw$x,sketches.flow.position(cljs.core.cst$kw$x.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$vx.cljs$core$IFn$_invoke$arity$1(p),sketches.flow.w),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([cljs.core.cst$kw$y,sketches.flow.position(cljs.core.cst$kw$y.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$vy.cljs$core$IFn$_invoke$arity$1(p),sketches.flow.h),cljs.core.cst$kw$direction,sketches.flow.direction(cljs.core.cst$kw$x.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$y.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$id.cljs$core$IFn$_invoke$arity$1(p)),cljs.core.cst$kw$vx,sketches.flow.velocity(cljs.core.cst$kw$vx.cljs$core$IFn$_invoke$arity$1(p),(function (){var G__7971 = cljs.core.cst$kw$direction.cljs$core$IFn$_invoke$arity$1(p);
return Math.cos(G__7971);
})()),cljs.core.cst$kw$vy,sketches.flow.velocity(cljs.core.cst$kw$vy.cljs$core$IFn$_invoke$arity$1(p),(function (){var G__7972 = cljs.core.cst$kw$direction.cljs$core$IFn$_invoke$arity$1(p);
return Math.sin(G__7972);
})())], 0));
}),particles);
});
/**
 * Draws the current state to the canvas. Called on each iteration after sketch-update.
 */
sketches.flow.sketch_draw = (function sketches$flow$sketch_draw(particles){
quil.core.no_stroke();

var seq__7973 = cljs.core.seq(particles);
var chunk__7974 = null;
var count__7975 = (0);
var i__7976 = (0);
while(true){
if((i__7976 < count__7975)){
var p = chunk__7974.cljs$core$IIndexed$_nth$arity$2(null,i__7976);
cljs.core.apply.cljs$core$IFn$_invoke$arity$2(quil.core.fill,cljs.core.conj.cljs$core$IFn$_invoke$arity$2(cljs.core.cst$kw$color.cljs$core$IFn$_invoke$arity$1(p),(5)));

quil.core.ellipse(cljs.core.cst$kw$x.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$y.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$size.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$size.cljs$core$IFn$_invoke$arity$1(p));


var G__7977 = seq__7973;
var G__7978 = chunk__7974;
var G__7979 = count__7975;
var G__7980 = (i__7976 + (1));
seq__7973 = G__7977;
chunk__7974 = G__7978;
count__7975 = G__7979;
i__7976 = G__7980;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__7973);
if(temp__5804__auto__){
var seq__7973__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__7973__$1)){
var c__4556__auto__ = cljs.core.chunk_first(seq__7973__$1);
var G__7981 = cljs.core.chunk_rest(seq__7973__$1);
var G__7982 = c__4556__auto__;
var G__7983 = cljs.core.count(c__4556__auto__);
var G__7984 = (0);
seq__7973 = G__7981;
chunk__7974 = G__7982;
count__7975 = G__7983;
i__7976 = G__7984;
continue;
} else {
var p = cljs.core.first(seq__7973__$1);
cljs.core.apply.cljs$core$IFn$_invoke$arity$2(quil.core.fill,cljs.core.conj.cljs$core$IFn$_invoke$arity$2(cljs.core.cst$kw$color.cljs$core$IFn$_invoke$arity$1(p),(5)));

quil.core.ellipse(cljs.core.cst$kw$x.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$y.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$size.cljs$core$IFn$_invoke$arity$1(p),cljs.core.cst$kw$size.cljs$core$IFn$_invoke$arity$1(p));


var G__7985 = cljs.core.next(seq__7973__$1);
var G__7986 = null;
var G__7987 = (0);
var G__7988 = (0);
seq__7973 = G__7985;
chunk__7974 = G__7986;
count__7975 = G__7987;
i__7976 = G__7988;
continue;
}
} else {
return null;
}
}
break;
}
});
sketches.flow.hello = (function sketches$flow$hello(){
return "uuuuuuuuu";
});
sketches.flow.create = (function sketches$flow$create(canvas){
cljs.core.println.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([sketches.flow.hello()], 0));

return quil.core.sketch.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([cljs.core.cst$kw$host,canvas,cljs.core.cst$kw$size,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [sketches.flow.w,sketches.flow.h], null),cljs.core.cst$kw$draw,new cljs.core.Var(function(){return sketches.flow.sketch_draw;},cljs.core.cst$sym$sketches$flow_SLASH_sketch_DASH_draw,cljs.core.PersistentHashMap.fromArrays([cljs.core.cst$kw$ns,cljs.core.cst$kw$name,cljs.core.cst$kw$file,cljs.core.cst$kw$end_DASH_column,cljs.core.cst$kw$column,cljs.core.cst$kw$line,cljs.core.cst$kw$end_DASH_line,cljs.core.cst$kw$arglists,cljs.core.cst$kw$doc,cljs.core.cst$kw$test],[cljs.core.cst$sym$sketches$flow,cljs.core.cst$sym$sketch_DASH_draw,"/home/obi/ws/plines.github.io/src/sketches/flow.cljs",18,1,80,80,cljs.core.list(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.cst$sym$particles], null)),"Draws the current state to the canvas. Called on each iteration after sketch-update.",(cljs.core.truth_(sketches.flow.sketch_draw)?sketches.flow.sketch_draw.cljs$lang$test:null)])),cljs.core.cst$kw$setup,new cljs.core.Var(function(){return sketches.flow.sketch_setup;},cljs.core.cst$sym$sketches$flow_SLASH_sketch_DASH_setup,cljs.core.PersistentHashMap.fromArrays([cljs.core.cst$kw$ns,cljs.core.cst$kw$name,cljs.core.cst$kw$file,cljs.core.cst$kw$end_DASH_column,cljs.core.cst$kw$column,cljs.core.cst$kw$line,cljs.core.cst$kw$end_DASH_line,cljs.core.cst$kw$arglists,cljs.core.cst$kw$doc,cljs.core.cst$kw$test],[cljs.core.cst$sym$sketches$flow,cljs.core.cst$sym$sketch_DASH_setup,"/home/obi/ws/plines.github.io/src/sketches/flow.cljs",19,1,39,39,cljs.core.list(cljs.core.PersistentVector.EMPTY),"Returns the initial state to use for the update-render loop.",(cljs.core.truth_(sketches.flow.sketch_setup)?sketches.flow.sketch_setup.cljs$lang$test:null)])),cljs.core.cst$kw$update,new cljs.core.Var(function(){return sketches.flow.sketch_update;},cljs.core.cst$sym$sketches$flow_SLASH_sketch_DASH_update,cljs.core.PersistentHashMap.fromArrays([cljs.core.cst$kw$ns,cljs.core.cst$kw$name,cljs.core.cst$kw$file,cljs.core.cst$kw$end_DASH_column,cljs.core.cst$kw$column,cljs.core.cst$kw$line,cljs.core.cst$kw$end_DASH_line,cljs.core.cst$kw$arglists,cljs.core.cst$kw$doc,cljs.core.cst$kw$test],[cljs.core.cst$sym$sketches$flow,cljs.core.cst$sym$sketch_DASH_update,"/home/obi/ws/plines.github.io/src/sketches/flow.cljs",20,1,67,67,cljs.core.list(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.cst$sym$particles], null)),"Returns the next state to render. Receives the current state as a paramter.",(cljs.core.truth_(sketches.flow.sketch_update)?sketches.flow.sketch_update.cljs$lang$test:null)])),cljs.core.cst$kw$middleware,new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [quil.middleware.fun_mode], null),cljs.core.cst$kw$settings,(function (){
quil.core.pixel_density((1));

quil.core.random_seed((666));

return quil.core.noise_seed((666));
})], 0));
});
if((typeof sketches !== 'undefined') && (typeof sketches.flow !== 'undefined') && (typeof sketches.flow.sketchy !== 'undefined')){
} else {
sketches.flow.sketchy = sketches.flow.create("sketch");
}
sketches.flow.startup = (function sketches$flow$startup(){
return sketches.flow.create("sketch");
});
