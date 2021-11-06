var t={exports:{}};!function(t){var e=Object.prototype.hasOwnProperty,n="~";function s(){}function i(t,e,n){this.fn=t,this.context=e,this.once=n||!1}function r(t,e,s,r,a){if("function"!=typeof s)throw new TypeError("The listener must be a function");var o=new i(s,r||t,a),h=n?n+e:e;return t._events[h]?t._events[h].fn?t._events[h]=[t._events[h],o]:t._events[h].push(o):(t._events[h]=o,t._eventsCount++),t}function a(t,e){0==--t._eventsCount?t._events=new s:delete t._events[e]}function o(){this._events=new s,this._eventsCount=0}Object.create&&(s.prototype=Object.create(null),(new s).__proto__||(n=!1)),o.prototype.eventNames=function(){var t,s,i=[];if(0===this._eventsCount)return i;for(s in t=this._events)e.call(t,s)&&i.push(n?s.slice(1):s);return Object.getOwnPropertySymbols?i.concat(Object.getOwnPropertySymbols(t)):i},o.prototype.listeners=function(t){var e=n?n+t:t,s=this._events[e];if(!s)return[];if(s.fn)return[s.fn];for(var i=0,r=s.length,a=new Array(r);i<r;i++)a[i]=s[i].fn;return a},o.prototype.listenerCount=function(t){var e=n?n+t:t,s=this._events[e];return s?s.fn?1:s.length:0},o.prototype.emit=function(t,e,s,i,r,a){var o=n?n+t:t;if(!this._events[o])return!1;var h,c,u=this._events[o],l=arguments.length;if(u.fn){switch(u.once&&this.removeListener(t,u.fn,void 0,!0),l){case 1:return u.fn.call(u.context),!0;case 2:return u.fn.call(u.context,e),!0;case 3:return u.fn.call(u.context,e,s),!0;case 4:return u.fn.call(u.context,e,s,i),!0;case 5:return u.fn.call(u.context,e,s,i,r),!0;case 6:return u.fn.call(u.context,e,s,i,r,a),!0}for(c=1,h=new Array(l-1);c<l;c++)h[c-1]=arguments[c];u.fn.apply(u.context,h)}else{var f,g=u.length;for(c=0;c<g;c++)switch(u[c].once&&this.removeListener(t,u[c].fn,void 0,!0),l){case 1:u[c].fn.call(u[c].context);break;case 2:u[c].fn.call(u[c].context,e);break;case 3:u[c].fn.call(u[c].context,e,s);break;case 4:u[c].fn.call(u[c].context,e,s,i);break;default:if(!h)for(f=1,h=new Array(l-1);f<l;f++)h[f-1]=arguments[f];u[c].fn.apply(u[c].context,h)}}return!0},o.prototype.on=function(t,e,n){return r(this,t,e,n,!1)},o.prototype.once=function(t,e,n){return r(this,t,e,n,!0)},o.prototype.removeListener=function(t,e,s,i){var r=n?n+t:t;if(!this._events[r])return this;if(!e)return a(this,r),this;var o=this._events[r];if(o.fn)o.fn!==e||i&&!o.once||s&&o.context!==s||a(this,r);else{for(var h=0,c=[],u=o.length;h<u;h++)(o[h].fn!==e||i&&!o[h].once||s&&o[h].context!==s)&&c.push(o[h]);c.length?this._events[r]=1===c.length?c[0]:c:a(this,r)}return this},o.prototype.removeAllListeners=function(t){var e;return t?(e=n?n+t:t,this._events[e]&&a(this,e)):(this._events=new s,this._eventsCount=0),this},o.prototype.off=o.prototype.removeListener,o.prototype.addListener=o.prototype.on,o.prefixed=n,o.EventEmitter=o,t.exports=o}(t);class e{graph;parent;key;state;constructor(t,e,n,s){this.graph=t,this.parent=e,this.key=n,this.state=s}getPath(){return this.parent?this.parent.getPath()+"/"+this.key:this.key}toJSON(){return{state:this.state}}}class n extends e{children=new Map;getValue(){return h([],this,new Map)}toNodesJSON(){return l(this.children,{},this.getPath(),!1)}toJSON(){const t={};for(const[e,s]of this.children)t[e]=s instanceof n?{state:s.state,id:s.getPath()}:s.toJSON();return{state:this.state,children:t}}}class s extends e{value;constructor(t,e,n,s,i){super(t,e,n,s),this.state=s,this.value=i}getValue(){return h([],this,new Map)}toJSON(){return this.value instanceof i?this.value.toJSON():{state:this.state,value:this.value}}}class i{graph;path;state;constructor(t,e,n){this.graph=t,this.path=e,this.state=n}get(t){return new i(this.graph,this.path+"/"+t,this.state)}set(t){return this.graph.set(this.path,t),this}getValue(){return this.graph.getValueAtPath(this.path)}getPath(){return this.path}getNode(){return this.graph.getNodeAtPath(this.path)}getState(){return this.state}on(t){const e=this.getNode(),n=n=>{n.startsWith(e?.getPath()||this.path)&&t(this.getValue())};this.graph.listenTo(e?e.getPath():this.path),this.graph.on("change",n);const s=h([],e,new Map);return void 0!==s&&t(s),()=>{this.graph.off("change",n)}}then(t,e){const n=this.getNode(),s=h([],n,new Map);let r;return void 0!==s?r=s instanceof i?s.then():Promise.resolve(s):(this.graph.listenTo(n?n.getPath():this.path),r=new Promise((t=>{this.graph.once("change",(e=>{e.startsWith(this.path)&&t(this.getValue())}))}))),r.then(t,e)}toJSON(){return{id:this.path,state:this.state}}}class r extends t.exports.EventEmitter{listening=new Set;state=Date.now();entries=new Map;getEntries(){return this.entries}get(t){return new i(this,t,this.state)}getValueAtPath(t){const e=t.split("/"),n=this.entries.get(e.shift());return n?h(e,n,new Map):void this.listenTo(t)}getNodeAtPath(t){const e=t.split("/"),n=this.entries.get(e.shift());return c(e,n)}set(t,e){return this.state=Date.now(),this.setPathInternal(t,e,this.state),this}merge(t,e){return this.isListeningTo(t)&&this.mergePathInternal(t,e),this}listenTo(t){return this.listening.add(t),this.emit("get",t),this}isListeningTo(t){for(const e of this.listening)if(t.startsWith(e))return!0;return!1}toJSON(){return l(this.entries,{},void 0,!0)}mergePathInternal(t,e){const r=e.state;let a=this.getNodeAtPath(t);if("children"in e){if(a instanceof s?(a.value instanceof i&&a.value.getPath()===t&&a.value.getState()>=r||u(a.value,a.state,new i(this,t,r),r))&&(a=this.createNodeAt(t,r)):a||(a=this.createNodeAt(t,r)),a instanceof n){for(const[t,n]of Object.entries(e.children))this.mergePathInternal(a.getPath()+"/"+t,n);this.emit("change",a.getPath(),a.toJSON())}}else{const o="value"in e?e.value:new i(this,e.id,r);if(a instanceof s)u(a.value,a.state,o,r)&&(a.value=o,a.state=r,this.emit("change",a.getPath(),a.toJSON()));else if(a instanceof n){if(u(new i(this,a.getPath(),r),a.state,o,r)){const e=this.createEdgeAt(t,r);e.value=o,this.emit("change",e.getPath(),e.toJSON())}}else{const e=this.createEdgeAt(t,r);e.value=o,this.emit("change",e.getPath(),e.toJSON())}}return this}setPathInternal(t,e,n){if(e instanceof i)this.setEdgePathInternal(t,e,n);else if(null!=e&&"object"==typeof e)for(const[s,i]of Object.entries(e))this.setPathInternal(t+"/"+s,i,n);else this.setEdgePathInternal(t,e,n)}setEdgePathInternal(t,e,n){const s=this.createEdgeAt(t,n);s.value=e;const i=s.getPath(),r=s.toJSON();return this.emit("change",i,r),this.emit("set",i,r),s}createNodeAt(t,e){const r=t.split("/"),a=r.shift();let o=this.entries.get(a);return o instanceof n||(o=new n(this,null,a,e),this.entries.set(a,o)),r.reduce(((t,r)=>{const a=t.children.get(r);if(a instanceof n)return a;if(a instanceof s&&a.value instanceof i){const t=a.value.getNode();if(t instanceof n)return t}const o=new n(this,t,r,e);return t.children.set(r,o),o}),o)}createEdgeAt(t,e){const[n,i]=o(t),r=n?this.createNodeAt(n,e):null;let a=r?.children.get(i);return a instanceof s?(a.state=e,a):(a=new s(this,r,i,e,null),r?r?.children.set(i,a):this.entries.set(i,a),a)}}function a(t){const e=t.lastIndexOf("/");return-1===e?void 0:t.substring(e+1)}function o(t){const e=t.lastIndexOf("/");return-1===e?[void 0,t]:[t.substring(0,e),t.substring(e+1)]}function h(t,e,r){if(!e)return;const a=r.get(e);if(a)return a;if(e instanceof n){const n=t.shift();if(n){const s=e.children.get(n);return s?h(t,s,r):(e.graph.listenTo(e.getPath()+"/"+n),void r.set(e,void 0))}{const n={};r.set(e,n);for(const[a,o]of e.children){const c=e.getPath()+"/"+a;if(o instanceof s&&o.value instanceof i&&o.getPath()===c)n[a]=new i(e.graph,c,o.state);else{const s=h(t,o,r);n[a]=void 0!==s?s:new i(e.graph,c,o.state)}}return n}}if(e.value instanceof i){if(e.getPath()===e.value.getPath())return e.graph.listenTo(e.value.getPath()),void r.set(e,void 0);const n=e.value.getNode();return n?h(t,n,r):(e.graph.listenTo(e.value.getPath()),void r.set(e,void 0))}return r.set(e,e.value),e.value}function c(t,e){if(e){if(e instanceof n){const n=t.shift();if(n){const s=e.children.get(n);return s?c(t,s):void 0}return e}if(e.value instanceof i){if(e.getPath()===e.value.getPath())return e;const n=e.value.getNode();return n?c(t,n):void 0}return e}}function u(t,e,n,s){return s>=e&&(e!==s||JSON.stringify(n)>JSON.stringify(t))}function l(t,e,s,i=!1){const r=s?s+"/":"";return t.forEach(((t,s)=>{t instanceof n&&i?l(t.children,e,r+s,i):e[r+s]=t.toJSON()})),e}export{s as Edge,e as Entry,r as Graph,n as Node,i as Ref,a as getParentPath,o as getParentPathAndKey};
//# sourceMappingURL=index.js.map
