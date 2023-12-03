// Compiled by ClojureScript 1.10.773 {:static-fns true, :optimize-constants true}
goog.provide('quil.sketch');
goog.require('cljs.core');
goog.require('cljs.core.constants');
goog.require('quil.util');
goog.require('quil.middlewares.deprecated_options');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.object');
goog.require('goog.events.EventType');
quil.sketch._STAR_applet_STAR_ = null;
quil.sketch.current_applet = (function quil$sketch$current_applet(){
return quil.sketch._STAR_applet_STAR_;
});
quil.sketch.rendering_modes = new cljs.core.PersistentArrayMap(null, 4, [cljs.core.cst$kw$java2d,(p5.prototype["JAVA2D"]),cljs.core.cst$kw$p2d,(p5.prototype["P2D"]),cljs.core.cst$kw$p3d,(p5.prototype["P3D"]),cljs.core.cst$kw$opengl,(p5.prototype["OPENGL"])], null);
quil.sketch.resolve_renderer = (function quil$sketch$resolve_renderer(mode){
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(cljs.core.cst$kw$p3d,mode)){
return (p5.prototype["WEBGL"]);
} else {
return quil.util.resolve_constant_key(mode,quil.sketch.rendering_modes);
}
});
quil.sketch.set_size = (function quil$sketch$set_size(applet,width,height){
return applet.resizeCanvas(width,height);
});
quil.sketch.size = (function quil$sketch$size(var_args){
var G__6577 = arguments.length;
switch (G__6577) {
case 2:
return quil.sketch.size.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return quil.sketch.size.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(arguments.length)].join('')));

}
});

(quil.sketch.size.cljs$core$IFn$_invoke$arity$2 = (function (width,height){
return quil.sketch.current_applet().createCanvas((width | (0)),(height | (0)));
}));

(quil.sketch.size.cljs$core$IFn$_invoke$arity$3 = (function (width,height,mode){
return quil.sketch.current_applet().createCanvas((width | (0)),(height | (0)),quil.sketch.resolve_renderer(mode));
}));

(quil.sketch.size.cljs$lang$maxFixedArity = 3);

quil.sketch.bind_handlers = (function quil$sketch$bind_handlers(prc,opts){
var seq__6579 = cljs.core.seq(cljs.core.PersistentHashMap.fromArrays([cljs.core.cst$kw$keyPressed,cljs.core.cst$kw$mouseOut,cljs.core.cst$kw$mouseDragged,cljs.core.cst$kw$setup,cljs.core.cst$kw$mouseWheel,cljs.core.cst$kw$keyReleased,cljs.core.cst$kw$mouseClicked,cljs.core.cst$kw$mouseReleased,cljs.core.cst$kw$mousePressed,cljs.core.cst$kw$mouseMoved,cljs.core.cst$kw$mouseOver,cljs.core.cst$kw$keyTyped,cljs.core.cst$kw$draw],[cljs.core.cst$kw$key_DASH_pressed,cljs.core.cst$kw$mouse_DASH_exited,cljs.core.cst$kw$mouse_DASH_dragged,cljs.core.cst$kw$setup,cljs.core.cst$kw$mouse_DASH_wheel,cljs.core.cst$kw$key_DASH_released,cljs.core.cst$kw$mouse_DASH_clicked,cljs.core.cst$kw$mouse_DASH_released,cljs.core.cst$kw$mouse_DASH_pressed,cljs.core.cst$kw$mouse_DASH_moved,cljs.core.cst$kw$mouse_DASH_entered,cljs.core.cst$kw$key_DASH_typed,cljs.core.cst$kw$draw]));
var chunk__6580 = null;
var count__6581 = (0);
var i__6582 = (0);
while(true){
if((i__6582 < count__6581)){
var vec__6593 = chunk__6580.cljs$core$IIndexed$_nth$arity$2(null,i__6582);
var processing_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__6593,(0),null);
var quil_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__6593,(1),null);
var temp__5804__auto___6603 = (opts.cljs$core$IFn$_invoke$arity$1 ? opts.cljs$core$IFn$_invoke$arity$1(quil_name) : opts.call(null,quil_name));
if(cljs.core.truth_(temp__5804__auto___6603)){
var handler_6604 = temp__5804__auto___6603;
(prc[cljs.core.name(processing_name)] = ((function (seq__6579,chunk__6580,count__6581,i__6582,handler_6604,temp__5804__auto___6603,vec__6593,processing_name,quil_name){
return (function() { 
var G__6605__delegate = function (args){
var _STAR_applet_STAR__orig_val__6596 = quil.sketch._STAR_applet_STAR_;
var _STAR_applet_STAR__temp_val__6597 = prc;
(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__temp_val__6597);

try{return cljs.core.apply.cljs$core$IFn$_invoke$arity$2(handler_6604,args);
}finally {(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__orig_val__6596);
}};
var G__6605 = function (var_args){
var args = null;
if (arguments.length > 0) {
var G__6606__i = 0, G__6606__a = new Array(arguments.length -  0);
while (G__6606__i < G__6606__a.length) {G__6606__a[G__6606__i] = arguments[G__6606__i + 0]; ++G__6606__i;}
  args = new cljs.core.IndexedSeq(G__6606__a,0,null);
} 
return G__6605__delegate.call(this,args);};
G__6605.cljs$lang$maxFixedArity = 0;
G__6605.cljs$lang$applyTo = (function (arglist__6607){
var args = cljs.core.seq(arglist__6607);
return G__6605__delegate(args);
});
G__6605.cljs$core$IFn$_invoke$arity$variadic = G__6605__delegate;
return G__6605;
})()
;})(seq__6579,chunk__6580,count__6581,i__6582,handler_6604,temp__5804__auto___6603,vec__6593,processing_name,quil_name))
);
} else {
}


var G__6608 = seq__6579;
var G__6609 = chunk__6580;
var G__6610 = count__6581;
var G__6611 = (i__6582 + (1));
seq__6579 = G__6608;
chunk__6580 = G__6609;
count__6581 = G__6610;
i__6582 = G__6611;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__6579);
if(temp__5804__auto__){
var seq__6579__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__6579__$1)){
var c__4556__auto__ = cljs.core.chunk_first(seq__6579__$1);
var G__6612 = cljs.core.chunk_rest(seq__6579__$1);
var G__6613 = c__4556__auto__;
var G__6614 = cljs.core.count(c__4556__auto__);
var G__6615 = (0);
seq__6579 = G__6612;
chunk__6580 = G__6613;
count__6581 = G__6614;
i__6582 = G__6615;
continue;
} else {
var vec__6598 = cljs.core.first(seq__6579__$1);
var processing_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__6598,(0),null);
var quil_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__6598,(1),null);
var temp__5804__auto___6616__$1 = (opts.cljs$core$IFn$_invoke$arity$1 ? opts.cljs$core$IFn$_invoke$arity$1(quil_name) : opts.call(null,quil_name));
if(cljs.core.truth_(temp__5804__auto___6616__$1)){
var handler_6617 = temp__5804__auto___6616__$1;
(prc[cljs.core.name(processing_name)] = ((function (seq__6579,chunk__6580,count__6581,i__6582,handler_6617,temp__5804__auto___6616__$1,vec__6598,processing_name,quil_name,seq__6579__$1,temp__5804__auto__){
return (function() { 
var G__6618__delegate = function (args){
var _STAR_applet_STAR__orig_val__6601 = quil.sketch._STAR_applet_STAR_;
var _STAR_applet_STAR__temp_val__6602 = prc;
(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__temp_val__6602);

try{return cljs.core.apply.cljs$core$IFn$_invoke$arity$2(handler_6617,args);
}finally {(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__orig_val__6601);
}};
var G__6618 = function (var_args){
var args = null;
if (arguments.length > 0) {
var G__6619__i = 0, G__6619__a = new Array(arguments.length -  0);
while (G__6619__i < G__6619__a.length) {G__6619__a[G__6619__i] = arguments[G__6619__i + 0]; ++G__6619__i;}
  args = new cljs.core.IndexedSeq(G__6619__a,0,null);
} 
return G__6618__delegate.call(this,args);};
G__6618.cljs$lang$maxFixedArity = 0;
G__6618.cljs$lang$applyTo = (function (arglist__6620){
var args = cljs.core.seq(arglist__6620);
return G__6618__delegate(args);
});
G__6618.cljs$core$IFn$_invoke$arity$variadic = G__6618__delegate;
return G__6618;
})()
;})(seq__6579,chunk__6580,count__6581,i__6582,handler_6617,temp__5804__auto___6616__$1,vec__6598,processing_name,quil_name,seq__6579__$1,temp__5804__auto__))
);
} else {
}


var G__6621 = cljs.core.next(seq__6579__$1);
var G__6622 = null;
var G__6623 = (0);
var G__6624 = (0);
seq__6579 = G__6621;
chunk__6580 = G__6622;
count__6581 = G__6623;
i__6582 = G__6624;
continue;
}
} else {
return null;
}
}
break;
}
});
quil.sketch.in_fullscreen_QMARK_ = (function quil$sketch$in_fullscreen_QMARK_(){
var or__4126__auto__ = document.fullscreenElement;
if(cljs.core.truth_(or__4126__auto__)){
return or__4126__auto__;
} else {
return document.mozFullScreenElement;
}
});
/**
 * Adds fullscreen support for the provided `p5` object.
 *   Fullscreen is enabled when the user presses `F11`. We turn
 *   the sketch `<canvas>` element to fullscreen storing the old size
 *   in an `atom`. When the user cancels fullscreen (`F11` or `Esc`)
 *   we resize the sketch back to the old size.
 */
quil.sketch.add_fullscreen_support = (function quil$sketch$add_fullscreen_support(applet){
var old_size = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(null);
var adjust_canvas_size = (function (){
if(cljs.core.truth_(quil.sketch.in_fullscreen_QMARK_())){
cljs.core.reset_BANG_(old_size,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [applet.width,applet.height], null));

return quil.sketch.set_size(applet,window.screen.width,window.screen.height);
} else {
return cljs.core.apply.cljs$core$IFn$_invoke$arity$3(quil.sketch.set_size,applet,cljs.core.deref(old_size));
}
});
goog.events.listen(window,goog.events.EventType.KEYDOWN,(function (event){
if(((cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(event.key,"F11")) && (cljs.core.not(quil.sketch.in_fullscreen_QMARK_())))){
event.preventDefault();

var canvas = applet.quil_canvas;
if(cljs.core.truth_(canvas.requestFullscreen)){
return canvas.requestFullscreen();
} else {
if(cljs.core.truth_(canvas.mozRequestFullScreen)){
return canvas.mozRequestFullScreen();
} else {
return console.warn("Fullscreen mode is not supported in current browser.");

}
}
} else {
return null;
}
}));

goog.events.listen(document,"fullscreenchange",adjust_canvas_size);

goog.events.listen(document,"mozfullscreenchange",adjust_canvas_size);

return goog.events.listen(document,"fullscreenerror",(function (p1__6625_SHARP_){
return console.error("Error while switching to/from fullscreen: ",p1__6625_SHARP_);
}));
});
quil.sketch.make_sketch = (function quil$sketch$make_sketch(options){
var opts = cljs.core.merge.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.PersistentArrayMap(null, 1, [cljs.core.cst$kw$size,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(500),(300)], null)], null),(function (){var G__6628 = cljs.core.apply.cljs$core$IFn$_invoke$arity$2(cljs.core.comp,cljs.core.cons(quil.middlewares.deprecated_options.deprecated_options,cljs.core.cst$kw$middleware.cljs$core$IFn$_invoke$arity$2(options,cljs.core.PersistentVector.EMPTY)));
var fexpr__6627 = (function (p1__6626_SHARP_){
return (p1__6626_SHARP_.cljs$core$IFn$_invoke$arity$1 ? p1__6626_SHARP_.cljs$core$IFn$_invoke$arity$1(options) : p1__6626_SHARP_.call(null,options));
});
return fexpr__6627(G__6628);
})()], 0));
var sketch_size = cljs.core.cst$kw$size.cljs$core$IFn$_invoke$arity$1(opts);
var renderer = cljs.core.cst$kw$renderer.cljs$core$IFn$_invoke$arity$1(opts);
var features = cljs.core.set(cljs.core.cst$kw$features.cljs$core$IFn$_invoke$arity$1(opts));
var setup = (function (){
cljs.core.apply.cljs$core$IFn$_invoke$arity$2(quil.sketch.size,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(sketch_size,(cljs.core.truth_(renderer)?new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [renderer], null):cljs.core.PersistentVector.EMPTY)));

if(cljs.core.truth_(cljs.core.cst$kw$settings.cljs$core$IFn$_invoke$arity$1(opts))){
var fexpr__6629_6632 = cljs.core.cst$kw$settings.cljs$core$IFn$_invoke$arity$1(opts);
(fexpr__6629_6632.cljs$core$IFn$_invoke$arity$0 ? fexpr__6629_6632.cljs$core$IFn$_invoke$arity$0() : fexpr__6629_6632.call(null));
} else {
}

if(cljs.core.truth_(cljs.core.cst$kw$setup.cljs$core$IFn$_invoke$arity$1(opts))){
var fexpr__6630 = cljs.core.cst$kw$setup.cljs$core$IFn$_invoke$arity$1(opts);
return (fexpr__6630.cljs$core$IFn$_invoke$arity$0 ? fexpr__6630.cljs$core$IFn$_invoke$arity$0() : fexpr__6630.call(null));
} else {
return null;
}
});
var mouse_wheel = (function (){var temp__5804__auto__ = cljs.core.cst$kw$mouse_DASH_wheel.cljs$core$IFn$_invoke$arity$1(opts);
if(cljs.core.truth_(temp__5804__auto__)){
var wheel_handler = temp__5804__auto__;
return (function (evt){
var G__6631 = goog.object.get(evt,"delta");
return (wheel_handler.cljs$core$IFn$_invoke$arity$1 ? wheel_handler.cljs$core$IFn$_invoke$arity$1(G__6631) : wheel_handler.call(null,G__6631));
});
} else {
return null;
}
})();
var opts__$1 = cljs.core.assoc.cljs$core$IFn$_invoke$arity$variadic(opts,cljs.core.cst$kw$setup,setup,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([cljs.core.cst$kw$mouse_DASH_wheel,mouse_wheel], 0));
var sketch = (function (prc){
quil.sketch.bind_handlers(prc,opts__$1);

(prc.quil = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(null));

return (prc.quil_internal_state = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(quil.util.initial_internal_state));
});
return sketch;
});
quil.sketch.destroy_previous_sketch = (function quil$sketch$destroy_previous_sketch(host_elem){
var temp__5804__auto__ = host_elem.processing_obj;
if(cljs.core.truth_(temp__5804__auto__)){
var proc_obj = temp__5804__auto__;
return proc_obj.remove();
} else {
return null;
}
});
quil.sketch.sketch = (function quil$sketch$sketch(var_args){
var args__4742__auto__ = [];
var len__4736__auto___6634 = arguments.length;
var i__4737__auto___6635 = (0);
while(true){
if((i__4737__auto___6635 < len__4736__auto___6634)){
args__4742__auto__.push((arguments[i__4737__auto___6635]));

var G__6636 = (i__4737__auto___6635 + (1));
i__4737__auto___6635 = G__6636;
continue;
} else {
}
break;
}

var argseq__4743__auto__ = ((((0) < args__4742__auto__.length))?(new cljs.core.IndexedSeq(args__4742__auto__.slice((0)),(0),null)):null);
return quil.sketch.sketch.cljs$core$IFn$_invoke$arity$variadic(argseq__4743__auto__);
});

(quil.sketch.sketch.cljs$core$IFn$_invoke$arity$variadic = (function (opts){
var opts_map = cljs.core.apply.cljs$core$IFn$_invoke$arity$2(cljs.core.hash_map,opts);
var host_elem = cljs.core.cst$kw$host.cljs$core$IFn$_invoke$arity$1(opts_map);
var renderer = (function (){var or__4126__auto__ = cljs.core.cst$kw$renderer.cljs$core$IFn$_invoke$arity$1(opts_map);
if(cljs.core.truth_(or__4126__auto__)){
return or__4126__auto__;
} else {
return cljs.core.cst$kw$p2d;
}
})();
var host_elem__$1 = ((typeof host_elem === 'string')?document.getElementById(host_elem):host_elem);
if(cljs.core.truth_(host_elem__$1)){
if(cljs.core.truth_(host_elem__$1.processing_context)){
if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(renderer,host_elem__$1.processing_context)){
} else {
console.warn("WARNING: Using different context on one canvas!");
}
} else {
(host_elem__$1.processing_context = renderer);
}

quil.sketch.destroy_previous_sketch(host_elem__$1);

var proc_obj = (new p5(quil.sketch.make_sketch(opts_map),host_elem__$1));
(host_elem__$1.processing_obj = proc_obj);

(proc_obj.quil_canvas = host_elem__$1);

quil.sketch.add_fullscreen_support(proc_obj);

return proc_obj;
} else {
return console.error((cljs.core.truth_(cljs.core.cst$kw$host.cljs$core$IFn$_invoke$arity$1(opts_map))?["ERROR: Cannot find host element: ",cljs.core.str.cljs$core$IFn$_invoke$arity$1(cljs.core.cst$kw$host.cljs$core$IFn$_invoke$arity$1(opts_map))].join(''):"ERROR: Cannot create sketch. :host is not specified or element not found."));
}
}));

(quil.sketch.sketch.cljs$lang$maxFixedArity = (0));

/** @this {Function} */
(quil.sketch.sketch.cljs$lang$applyTo = (function (seq6633){
var self__4724__auto__ = this;
return self__4724__auto__.cljs$core$IFn$_invoke$arity$variadic(cljs.core.seq(seq6633));
}));

quil.sketch.sketch_init_list = cljs.core.atom.cljs$core$IFn$_invoke$arity$1(cljs.core.List.EMPTY);
quil.sketch.empty_body_QMARK_ = (function quil$sketch$empty_body_QMARK_(){
var child = document.body.childNodes;
return (child.length <= (1));
});
quil.sketch.add_canvas = (function quil$sketch$add_canvas(canvas_id){
var canvas = document.createElement("canvas");
canvas.setAttribute("id",canvas_id);

return document.body.appendChild(canvas);
});
quil.sketch.init_sketches = (function quil$sketch$init_sketches(){
var add_elem_QMARK__6645 = quil.sketch.empty_body_QMARK_();
var seq__6637_6646 = cljs.core.seq(cljs.core.deref(quil.sketch.sketch_init_list));
var chunk__6638_6647 = null;
var count__6639_6648 = (0);
var i__6640_6649 = (0);
while(true){
if((i__6640_6649 < count__6639_6648)){
var sk_6650 = chunk__6638_6647.cljs$core$IIndexed$_nth$arity$2(null,i__6640_6649);
if(add_elem_QMARK__6645){
quil.sketch.add_canvas(cljs.core.cst$kw$host_DASH_id.cljs$core$IFn$_invoke$arity$1(sk_6650));
} else {
}

var fexpr__6643_6651 = cljs.core.cst$kw$fn.cljs$core$IFn$_invoke$arity$1(sk_6650);
(fexpr__6643_6651.cljs$core$IFn$_invoke$arity$0 ? fexpr__6643_6651.cljs$core$IFn$_invoke$arity$0() : fexpr__6643_6651.call(null));


var G__6652 = seq__6637_6646;
var G__6653 = chunk__6638_6647;
var G__6654 = count__6639_6648;
var G__6655 = (i__6640_6649 + (1));
seq__6637_6646 = G__6652;
chunk__6638_6647 = G__6653;
count__6639_6648 = G__6654;
i__6640_6649 = G__6655;
continue;
} else {
var temp__5804__auto___6656 = cljs.core.seq(seq__6637_6646);
if(temp__5804__auto___6656){
var seq__6637_6657__$1 = temp__5804__auto___6656;
if(cljs.core.chunked_seq_QMARK_(seq__6637_6657__$1)){
var c__4556__auto___6658 = cljs.core.chunk_first(seq__6637_6657__$1);
var G__6659 = cljs.core.chunk_rest(seq__6637_6657__$1);
var G__6660 = c__4556__auto___6658;
var G__6661 = cljs.core.count(c__4556__auto___6658);
var G__6662 = (0);
seq__6637_6646 = G__6659;
chunk__6638_6647 = G__6660;
count__6639_6648 = G__6661;
i__6640_6649 = G__6662;
continue;
} else {
var sk_6663 = cljs.core.first(seq__6637_6657__$1);
if(add_elem_QMARK__6645){
quil.sketch.add_canvas(cljs.core.cst$kw$host_DASH_id.cljs$core$IFn$_invoke$arity$1(sk_6663));
} else {
}

var fexpr__6644_6664 = cljs.core.cst$kw$fn.cljs$core$IFn$_invoke$arity$1(sk_6663);
(fexpr__6644_6664.cljs$core$IFn$_invoke$arity$0 ? fexpr__6644_6664.cljs$core$IFn$_invoke$arity$0() : fexpr__6644_6664.call(null));


var G__6665 = cljs.core.next(seq__6637_6657__$1);
var G__6666 = null;
var G__6667 = (0);
var G__6668 = (0);
seq__6637_6646 = G__6665;
chunk__6638_6647 = G__6666;
count__6639_6648 = G__6667;
i__6640_6649 = G__6668;
continue;
}
} else {
}
}
break;
}

return cljs.core.reset_BANG_(quil.sketch.sketch_init_list,cljs.core.PersistentVector.EMPTY);
});
quil.sketch.add_sketch_to_init_list = (function quil$sketch$add_sketch_to_init_list(sk){
cljs.core.swap_BANG_.cljs$core$IFn$_invoke$arity$3(quil.sketch.sketch_init_list,cljs.core.conj,sk);

if(cljs.core._EQ_.cljs$core$IFn$_invoke$arity$2(document.readyState,"complete")){
return quil.sketch.init_sketches();
} else {
return null;
}
});
goog.events.listenOnce(window,goog.events.EventType.LOAD,quil.sketch.init_sketches);
