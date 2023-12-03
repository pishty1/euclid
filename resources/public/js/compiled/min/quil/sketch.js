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
var G__12728 = arguments.length;
switch (G__12728) {
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
var seq__12730 = cljs.core.seq(cljs.core.PersistentHashMap.fromArrays([cljs.core.cst$kw$keyPressed,cljs.core.cst$kw$mouseOut,cljs.core.cst$kw$mouseDragged,cljs.core.cst$kw$setup,cljs.core.cst$kw$mouseWheel,cljs.core.cst$kw$keyReleased,cljs.core.cst$kw$mouseClicked,cljs.core.cst$kw$mouseReleased,cljs.core.cst$kw$mousePressed,cljs.core.cst$kw$mouseMoved,cljs.core.cst$kw$mouseOver,cljs.core.cst$kw$keyTyped,cljs.core.cst$kw$draw],[cljs.core.cst$kw$key_DASH_pressed,cljs.core.cst$kw$mouse_DASH_exited,cljs.core.cst$kw$mouse_DASH_dragged,cljs.core.cst$kw$setup,cljs.core.cst$kw$mouse_DASH_wheel,cljs.core.cst$kw$key_DASH_released,cljs.core.cst$kw$mouse_DASH_clicked,cljs.core.cst$kw$mouse_DASH_released,cljs.core.cst$kw$mouse_DASH_pressed,cljs.core.cst$kw$mouse_DASH_moved,cljs.core.cst$kw$mouse_DASH_entered,cljs.core.cst$kw$key_DASH_typed,cljs.core.cst$kw$draw]));
var chunk__12731 = null;
var count__12732 = (0);
var i__12733 = (0);
while(true){
if((i__12733 < count__12732)){
var vec__12744 = chunk__12731.cljs$core$IIndexed$_nth$arity$2(null,i__12733);
var processing_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__12744,(0),null);
var quil_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__12744,(1),null);
var temp__5804__auto___12754 = (opts.cljs$core$IFn$_invoke$arity$1 ? opts.cljs$core$IFn$_invoke$arity$1(quil_name) : opts.call(null,quil_name));
if(cljs.core.truth_(temp__5804__auto___12754)){
var handler_12755 = temp__5804__auto___12754;
(prc[cljs.core.name(processing_name)] = ((function (seq__12730,chunk__12731,count__12732,i__12733,handler_12755,temp__5804__auto___12754,vec__12744,processing_name,quil_name){
return (function() { 
var G__12756__delegate = function (args){
var _STAR_applet_STAR__orig_val__12747 = quil.sketch._STAR_applet_STAR_;
var _STAR_applet_STAR__temp_val__12748 = prc;
(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__temp_val__12748);

try{return cljs.core.apply.cljs$core$IFn$_invoke$arity$2(handler_12755,args);
}finally {(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__orig_val__12747);
}};
var G__12756 = function (var_args){
var args = null;
if (arguments.length > 0) {
var G__12757__i = 0, G__12757__a = new Array(arguments.length -  0);
while (G__12757__i < G__12757__a.length) {G__12757__a[G__12757__i] = arguments[G__12757__i + 0]; ++G__12757__i;}
  args = new cljs.core.IndexedSeq(G__12757__a,0,null);
} 
return G__12756__delegate.call(this,args);};
G__12756.cljs$lang$maxFixedArity = 0;
G__12756.cljs$lang$applyTo = (function (arglist__12758){
var args = cljs.core.seq(arglist__12758);
return G__12756__delegate(args);
});
G__12756.cljs$core$IFn$_invoke$arity$variadic = G__12756__delegate;
return G__12756;
})()
;})(seq__12730,chunk__12731,count__12732,i__12733,handler_12755,temp__5804__auto___12754,vec__12744,processing_name,quil_name))
);
} else {
}


var G__12759 = seq__12730;
var G__12760 = chunk__12731;
var G__12761 = count__12732;
var G__12762 = (i__12733 + (1));
seq__12730 = G__12759;
chunk__12731 = G__12760;
count__12732 = G__12761;
i__12733 = G__12762;
continue;
} else {
var temp__5804__auto__ = cljs.core.seq(seq__12730);
if(temp__5804__auto__){
var seq__12730__$1 = temp__5804__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__12730__$1)){
var c__4556__auto__ = cljs.core.chunk_first(seq__12730__$1);
var G__12763 = cljs.core.chunk_rest(seq__12730__$1);
var G__12764 = c__4556__auto__;
var G__12765 = cljs.core.count(c__4556__auto__);
var G__12766 = (0);
seq__12730 = G__12763;
chunk__12731 = G__12764;
count__12732 = G__12765;
i__12733 = G__12766;
continue;
} else {
var vec__12749 = cljs.core.first(seq__12730__$1);
var processing_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__12749,(0),null);
var quil_name = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__12749,(1),null);
var temp__5804__auto___12767__$1 = (opts.cljs$core$IFn$_invoke$arity$1 ? opts.cljs$core$IFn$_invoke$arity$1(quil_name) : opts.call(null,quil_name));
if(cljs.core.truth_(temp__5804__auto___12767__$1)){
var handler_12768 = temp__5804__auto___12767__$1;
(prc[cljs.core.name(processing_name)] = ((function (seq__12730,chunk__12731,count__12732,i__12733,handler_12768,temp__5804__auto___12767__$1,vec__12749,processing_name,quil_name,seq__12730__$1,temp__5804__auto__){
return (function() { 
var G__12769__delegate = function (args){
var _STAR_applet_STAR__orig_val__12752 = quil.sketch._STAR_applet_STAR_;
var _STAR_applet_STAR__temp_val__12753 = prc;
(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__temp_val__12753);

try{return cljs.core.apply.cljs$core$IFn$_invoke$arity$2(handler_12768,args);
}finally {(quil.sketch._STAR_applet_STAR_ = _STAR_applet_STAR__orig_val__12752);
}};
var G__12769 = function (var_args){
var args = null;
if (arguments.length > 0) {
var G__12770__i = 0, G__12770__a = new Array(arguments.length -  0);
while (G__12770__i < G__12770__a.length) {G__12770__a[G__12770__i] = arguments[G__12770__i + 0]; ++G__12770__i;}
  args = new cljs.core.IndexedSeq(G__12770__a,0,null);
} 
return G__12769__delegate.call(this,args);};
G__12769.cljs$lang$maxFixedArity = 0;
G__12769.cljs$lang$applyTo = (function (arglist__12771){
var args = cljs.core.seq(arglist__12771);
return G__12769__delegate(args);
});
G__12769.cljs$core$IFn$_invoke$arity$variadic = G__12769__delegate;
return G__12769;
})()
;})(seq__12730,chunk__12731,count__12732,i__12733,handler_12768,temp__5804__auto___12767__$1,vec__12749,processing_name,quil_name,seq__12730__$1,temp__5804__auto__))
);
} else {
}


var G__12772 = cljs.core.next(seq__12730__$1);
var G__12773 = null;
var G__12774 = (0);
var G__12775 = (0);
seq__12730 = G__12772;
chunk__12731 = G__12773;
count__12732 = G__12774;
i__12733 = G__12775;
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

return goog.events.listen(document,"fullscreenerror",(function (p1__12776_SHARP_){
return console.error("Error while switching to/from fullscreen: ",p1__12776_SHARP_);
}));
});
quil.sketch.make_sketch = (function quil$sketch$make_sketch(options){
var opts = cljs.core.merge.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([new cljs.core.PersistentArrayMap(null, 1, [cljs.core.cst$kw$size,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [(500),(300)], null)], null),(function (){var G__12779 = cljs.core.apply.cljs$core$IFn$_invoke$arity$2(cljs.core.comp,cljs.core.cons(quil.middlewares.deprecated_options.deprecated_options,cljs.core.cst$kw$middleware.cljs$core$IFn$_invoke$arity$2(options,cljs.core.PersistentVector.EMPTY)));
var fexpr__12778 = (function (p1__12777_SHARP_){
return (p1__12777_SHARP_.cljs$core$IFn$_invoke$arity$1 ? p1__12777_SHARP_.cljs$core$IFn$_invoke$arity$1(options) : p1__12777_SHARP_.call(null,options));
});
return fexpr__12778(G__12779);
})()], 0));
var sketch_size = cljs.core.cst$kw$size.cljs$core$IFn$_invoke$arity$1(opts);
var renderer = cljs.core.cst$kw$renderer.cljs$core$IFn$_invoke$arity$1(opts);
var features = cljs.core.set(cljs.core.cst$kw$features.cljs$core$IFn$_invoke$arity$1(opts));
var setup = (function (){
cljs.core.apply.cljs$core$IFn$_invoke$arity$2(quil.sketch.size,cljs.core.concat.cljs$core$IFn$_invoke$arity$2(sketch_size,(cljs.core.truth_(renderer)?new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [renderer], null):cljs.core.PersistentVector.EMPTY)));

if(cljs.core.truth_(cljs.core.cst$kw$settings.cljs$core$IFn$_invoke$arity$1(opts))){
var fexpr__12780_12783 = cljs.core.cst$kw$settings.cljs$core$IFn$_invoke$arity$1(opts);
(fexpr__12780_12783.cljs$core$IFn$_invoke$arity$0 ? fexpr__12780_12783.cljs$core$IFn$_invoke$arity$0() : fexpr__12780_12783.call(null));
} else {
}

if(cljs.core.truth_(cljs.core.cst$kw$setup.cljs$core$IFn$_invoke$arity$1(opts))){
var fexpr__12781 = cljs.core.cst$kw$setup.cljs$core$IFn$_invoke$arity$1(opts);
return (fexpr__12781.cljs$core$IFn$_invoke$arity$0 ? fexpr__12781.cljs$core$IFn$_invoke$arity$0() : fexpr__12781.call(null));
} else {
return null;
}
});
var mouse_wheel = (function (){var temp__5804__auto__ = cljs.core.cst$kw$mouse_DASH_wheel.cljs$core$IFn$_invoke$arity$1(opts);
if(cljs.core.truth_(temp__5804__auto__)){
var wheel_handler = temp__5804__auto__;
return (function (evt){
var G__12782 = goog.object.get(evt,"delta");
return (wheel_handler.cljs$core$IFn$_invoke$arity$1 ? wheel_handler.cljs$core$IFn$_invoke$arity$1(G__12782) : wheel_handler.call(null,G__12782));
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
var len__4736__auto___12785 = arguments.length;
var i__4737__auto___12786 = (0);
while(true){
if((i__4737__auto___12786 < len__4736__auto___12785)){
args__4742__auto__.push((arguments[i__4737__auto___12786]));

var G__12787 = (i__4737__auto___12786 + (1));
i__4737__auto___12786 = G__12787;
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
(quil.sketch.sketch.cljs$lang$applyTo = (function (seq12784){
var self__4724__auto__ = this;
return self__4724__auto__.cljs$core$IFn$_invoke$arity$variadic(cljs.core.seq(seq12784));
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
var add_elem_QMARK__12796 = quil.sketch.empty_body_QMARK_();
var seq__12788_12797 = cljs.core.seq(cljs.core.deref(quil.sketch.sketch_init_list));
var chunk__12789_12798 = null;
var count__12790_12799 = (0);
var i__12791_12800 = (0);
while(true){
if((i__12791_12800 < count__12790_12799)){
var sk_12801 = chunk__12789_12798.cljs$core$IIndexed$_nth$arity$2(null,i__12791_12800);
if(add_elem_QMARK__12796){
quil.sketch.add_canvas(cljs.core.cst$kw$host_DASH_id.cljs$core$IFn$_invoke$arity$1(sk_12801));
} else {
}

var fexpr__12794_12802 = cljs.core.cst$kw$fn.cljs$core$IFn$_invoke$arity$1(sk_12801);
(fexpr__12794_12802.cljs$core$IFn$_invoke$arity$0 ? fexpr__12794_12802.cljs$core$IFn$_invoke$arity$0() : fexpr__12794_12802.call(null));


var G__12803 = seq__12788_12797;
var G__12804 = chunk__12789_12798;
var G__12805 = count__12790_12799;
var G__12806 = (i__12791_12800 + (1));
seq__12788_12797 = G__12803;
chunk__12789_12798 = G__12804;
count__12790_12799 = G__12805;
i__12791_12800 = G__12806;
continue;
} else {
var temp__5804__auto___12807 = cljs.core.seq(seq__12788_12797);
if(temp__5804__auto___12807){
var seq__12788_12808__$1 = temp__5804__auto___12807;
if(cljs.core.chunked_seq_QMARK_(seq__12788_12808__$1)){
var c__4556__auto___12809 = cljs.core.chunk_first(seq__12788_12808__$1);
var G__12810 = cljs.core.chunk_rest(seq__12788_12808__$1);
var G__12811 = c__4556__auto___12809;
var G__12812 = cljs.core.count(c__4556__auto___12809);
var G__12813 = (0);
seq__12788_12797 = G__12810;
chunk__12789_12798 = G__12811;
count__12790_12799 = G__12812;
i__12791_12800 = G__12813;
continue;
} else {
var sk_12814 = cljs.core.first(seq__12788_12808__$1);
if(add_elem_QMARK__12796){
quil.sketch.add_canvas(cljs.core.cst$kw$host_DASH_id.cljs$core$IFn$_invoke$arity$1(sk_12814));
} else {
}

var fexpr__12795_12815 = cljs.core.cst$kw$fn.cljs$core$IFn$_invoke$arity$1(sk_12814);
(fexpr__12795_12815.cljs$core$IFn$_invoke$arity$0 ? fexpr__12795_12815.cljs$core$IFn$_invoke$arity$0() : fexpr__12795_12815.call(null));


var G__12816 = cljs.core.next(seq__12788_12808__$1);
var G__12817 = null;
var G__12818 = (0);
var G__12819 = (0);
seq__12788_12797 = G__12816;
chunk__12789_12798 = G__12817;
count__12790_12799 = G__12818;
i__12791_12800 = G__12819;
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
