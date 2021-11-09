var t={exports:{}};!function(t){var e=Object.prototype.hasOwnProperty,n="~";function s(){}function r(t,e,n){this.fn=t,this.context=e,this.once=n||!1}function i(t,e,s,i,a){if("function"!=typeof s)throw new TypeError("The listener must be a function");var h=new r(s,i||t,a),o=n?n+e:e;return t._events[o]?t._events[o].fn?t._events[o]=[t._events[o],h]:t._events[o].push(h):(t._events[o]=h,t._eventsCount++),t}function a(t,e){0==--t._eventsCount?t._events=new s:delete t._events[e]}function h(){this._events=new s,this._eventsCount=0}Object.create&&(s.prototype=Object.create(null),(new s).__proto__||(n=!1)),h.prototype.eventNames=function(){var t,s,r=[];if(0===this._eventsCount)return r;for(s in t=this._events)e.call(t,s)&&r.push(n?s.slice(1):s);return Object.getOwnPropertySymbols?r.concat(Object.getOwnPropertySymbols(t)):r},h.prototype.listeners=function(t){var e=n?n+t:t,s=this._events[e];if(!s)return[];if(s.fn)return[s.fn];for(var r=0,i=s.length,a=new Array(i);r<i;r++)a[r]=s[r].fn;return a},h.prototype.listenerCount=function(t){var e=n?n+t:t,s=this._events[e];return s?s.fn?1:s.length:0},h.prototype.emit=function(t,e,s,r,i,a){var h=n?n+t:t;if(!this._events[h])return!1;var o,c,u=this._events[h],l=arguments.length;if(u.fn){switch(u.once&&this.removeListener(t,u.fn,void 0,!0),l){case 1:return u.fn.call(u.context),!0;case 2:return u.fn.call(u.context,e),!0;case 3:return u.fn.call(u.context,e,s),!0;case 4:return u.fn.call(u.context,e,s,r),!0;case 5:return u.fn.call(u.context,e,s,r,i),!0;case 6:return u.fn.call(u.context,e,s,r,i,a),!0}for(c=1,o=new Array(l-1);c<l;c++)o[c-1]=arguments[c];u.fn.apply(u.context,o)}else{var f,g=u.length;for(c=0;c<g;c++)switch(u[c].once&&this.removeListener(t,u[c].fn,void 0,!0),l){case 1:u[c].fn.call(u[c].context);break;case 2:u[c].fn.call(u[c].context,e);break;case 3:u[c].fn.call(u[c].context,e,s);break;case 4:u[c].fn.call(u[c].context,e,s,r);break;default:if(!o)for(f=1,o=new Array(l-1);f<l;f++)o[f-1]=arguments[f];u[c].fn.apply(u[c].context,o)}}return!0},h.prototype.on=function(t,e,n){return i(this,t,e,n,!1)},h.prototype.once=function(t,e,n){return i(this,t,e,n,!0)},h.prototype.removeListener=function(t,e,s,r){var i=n?n+t:t;if(!this._events[i])return this;if(!e)return a(this,i),this;var h=this._events[i];if(h.fn)h.fn!==e||r&&!h.once||s&&h.context!==s||a(this,i);else{for(var o=0,c=[],u=h.length;o<u;o++)(h[o].fn!==e||r&&!h[o].once||s&&h[o].context!==s)&&c.push(h[o]);c.length?this._events[i]=1===c.length?c[0]:c:a(this,i)}return this},h.prototype.removeAllListeners=function(t){var e;return t?(e=n?n+t:t,this._events[e]&&a(this,e)):(this._events=new s,this._eventsCount=0),this},h.prototype.off=h.prototype.removeListener,h.prototype.addListener=h.prototype.on,h.prefixed=n,h.EventEmitter=h,t.exports=h}(t);const e="/";class n{graph;parent;key;state;constructor(t,e,n,s){this.graph=t,this.parent=e,this.key=n,this.state=s}getValue(){return this.graph.getValueAtPath(this.getPath())}getPath(){return this.parent?this.parent.getPath()+"/"+this.key:this.key}toJSON(){return{state:this.state}}}class s extends n{children=new Map;toJSON(){const t={};for(const[e,n]of this.children)t[e]=n instanceof s?{state:n.state,id:n.getPath()}:n.toJSON();return{...super.toJSON(),children:t}}}class r extends n{value;constructor(t,e,n,s,r){super(t,e,n,s),this.value=r}getPath(){return this.value instanceof i?this.value.getPath():super.getPath()}toJSON(){return this.value instanceof i?this.value.toJSON():{...super.toJSON(),value:this.value}}}class i{graph;path;state;constructor(t,e,n){this.graph=t,this.path=e,this.state=n}get(t){return new i(this.graph,this.path+"/"+t,this.state)}set(t){return this.graph.set(this.path,t),this}getValue(){return this.graph.getValueAtPath(this.path)}getPath(){return this.path}getNode(){return this.graph.getNodeAtPath(this.path)}getState(){return this.state}on(t){const e=e=>{const n=this.getNode();n&&e.startsWith(n.getPath())&&t(n.getValue())};this.graph.on("change",e);const n=this.getValue();return void 0!==n&&t(n),()=>{this.graph.off("change",e)}}then(t,e){const n=this.getValue();let s;return s=void 0!==n?Promise.resolve(n):new Promise((t=>{const e=this.on((n=>{e(),t(n)}))})),s.then(t,e)}toJSON(){return{id:this.path,state:this.state}}}class a extends t.exports.EventEmitter{state=Date.now();entries=new Map;listeningPaths=new Set;getEntries(){return this.entries}get(t){return new i(this,t,this.state)}getValueAtPath(t){const e=this.getNodeAtPath(t);let n;return e?(n=u(this,e),void 0===n&&this.listenAtPath(t)):this.listenAtPath(t),n}getNodeAtPath(t){return o(this,t,new Map)}set(t,e){return this.state=Date.now(),this.setPathInternal(t,e,this.state),this}merge(t,e){return this.isListening(t)&&this.mergePathInternal(t,e),this}listenAtPath(t){return this.emit("get",t),this.listeningPaths.add(t),this}isListening(t){for(const e of this.listeningPaths)if(t.startsWith(e))return!0;return!1}mergePathInternal(t,e){const n=e.state;let a=this.getNodeAtPath(t);if("children"in e){if(a instanceof r?l(a.value,a.state,a.value,n)&&(a=this.createNodeAt(t,n),this.emit("change",a.getPath(),a.toJSON())):a||(a=this.createNodeAt(t,n),this.emit("change",a.getPath(),a.toJSON())),a instanceof s)for(const[t,n]of Object.entries(e.children))this.mergePathInternal(a.getPath()+"/"+t,n)}else{const h="value"in e?e.value:new i(this,e.id,n);if(a instanceof r)l(a.value,a.state,h,n)&&(a.value=h,a.state=n,this.emit("change",a.getPath(),a.toJSON()));else if(a instanceof s){if(l(new i(this,a.getPath(),n),a.state,h,n)){const e=this.createEdgeAt(t,n);e.value=h,this.emit("change",e.getPath(),e.toJSON())}}else{const e=this.createEdgeAt(t,n);e.value=h,this.emit("change",e.getPath(),e.toJSON())}}return this}setPathInternal(t,e,n){if(e instanceof i)this.setEdgePathInternal(t,e,n);else if(null!==e&&"object"==typeof e)for(const[s,r]of Object.entries(e))this.setPathInternal(t+"/"+s,r,n);else this.setEdgePathInternal(t,e,n)}setEdgePathInternal(t,e,n){const s=this.createEdgeAt(t,n);s.value=e;const r=s.getPath(),i=s.toJSON();return this.emit("change",r,i),this.emit("set",r,i),s}createNodeAt(t,e){const n=t.split("/"),a=n.shift();let h=this.entries.get(a);return h instanceof s||(h=new s(this,null,a,e),this.entries.set(a,h)),n.reduce(((t,n)=>{const a=t.children.get(n);if(a instanceof s)return a;if(a instanceof r&&a.value instanceof i){const t=a.value.getNode();if(t instanceof s)return t}const h=new s(this,t,n,e);return t.children.set(n,h),h}),h)}createEdgeAt(t,e){const[n,s]=h(t),i=n?this.createNodeAt(n,e):null;let a=i?.children.get(s);return a instanceof r?(a.state=e,a):(a=new r(this,i,s,e,null),i?i?.children.set(s,a):this.entries.set(s,a),a)}}function h(t){const e=t.lastIndexOf("/");return-1===e?[void 0,t]:[t.substring(0,e),t.substring(e+1)]}function o(t,e,n){const s=n.get(e);if(void 0!==s)return s||void 0;{const s=e.split("/"),r=s.shift(),i=t.getEntries().get(r);return i&&s.length?(n.set(r,i),c(t,r,i,s,n)):i}}function c(t,e,n,r,a=new Map){if(n instanceof s){const s=r.shift();if(s){const i=n.children.get(s),h=e+"/"+s;return i?(a.set(h,i),c(t,h,i,r,a)):void a.set(h,null)}return a.set(e,n),n}if(n.value instanceof i){const s=n.value.getPath(),i=o(t,s,a);return i&&i!==n?c(t,e,i,r,a):void a.set(s,null)}return a.set(e,n),n}function u(t,e,n=new Set){if(e){if(e instanceof s){const n={};for(const[s,a]of e.children){const e=a instanceof r?a.value:n[s]=new i(t,a.getPath(),a.state);n[s]=e}return n}if(e.value instanceof i){if(n.has(e.value.getPath()))return;return n.add(e.value.getPath()),u(t,e.value.getNode(),n)}return e.value}}function l(t,e,n,s){return s>=e&&(e!==s||JSON.stringify(n).length>JSON.stringify(t).length)}export{r as Edge,n as Entry,a as Graph,s as Node,i as Ref,e as SEPERATOR,h as getParentPathAndKey};
//# sourceMappingURL=index.js.map
