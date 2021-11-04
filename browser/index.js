var t={exports:{}};!function(t){var e=Object.prototype.hasOwnProperty,n="~";function s(){}function r(t,e,n){this.fn=t,this.context=e,this.once=n||!1}function i(t,e,s,i,a){if("function"!=typeof s)throw new TypeError("The listener must be a function");var o=new r(s,i||t,a),h=n?n+e:e;return t._events[h]?t._events[h].fn?t._events[h]=[t._events[h],o]:t._events[h].push(o):(t._events[h]=o,t._eventsCount++),t}function a(t,e){0==--t._eventsCount?t._events=new s:delete t._events[e]}function o(){this._events=new s,this._eventsCount=0}Object.create&&(s.prototype=Object.create(null),(new s).__proto__||(n=!1)),o.prototype.eventNames=function(){var t,s,r=[];if(0===this._eventsCount)return r;for(s in t=this._events)e.call(t,s)&&r.push(n?s.slice(1):s);return Object.getOwnPropertySymbols?r.concat(Object.getOwnPropertySymbols(t)):r},o.prototype.listeners=function(t){var e=n?n+t:t,s=this._events[e];if(!s)return[];if(s.fn)return[s.fn];for(var r=0,i=s.length,a=new Array(i);r<i;r++)a[r]=s[r].fn;return a},o.prototype.listenerCount=function(t){var e=n?n+t:t,s=this._events[e];return s?s.fn?1:s.length:0},o.prototype.emit=function(t,e,s,r,i,a){var o=n?n+t:t;if(!this._events[o])return!1;var h,c,u=this._events[o],l=arguments.length;if(u.fn){switch(u.once&&this.removeListener(t,u.fn,void 0,!0),l){case 1:return u.fn.call(u.context),!0;case 2:return u.fn.call(u.context,e),!0;case 3:return u.fn.call(u.context,e,s),!0;case 4:return u.fn.call(u.context,e,s,r),!0;case 5:return u.fn.call(u.context,e,s,r,i),!0;case 6:return u.fn.call(u.context,e,s,r,i,a),!0}for(c=1,h=new Array(l-1);c<l;c++)h[c-1]=arguments[c];u.fn.apply(u.context,h)}else{var f,g=u.length;for(c=0;c<g;c++)switch(u[c].once&&this.removeListener(t,u[c].fn,void 0,!0),l){case 1:u[c].fn.call(u[c].context);break;case 2:u[c].fn.call(u[c].context,e);break;case 3:u[c].fn.call(u[c].context,e,s);break;case 4:u[c].fn.call(u[c].context,e,s,r);break;default:if(!h)for(f=1,h=new Array(l-1);f<l;f++)h[f-1]=arguments[f];u[c].fn.apply(u[c].context,h)}}return!0},o.prototype.on=function(t,e,n){return i(this,t,e,n,!1)},o.prototype.once=function(t,e,n){return i(this,t,e,n,!0)},o.prototype.removeListener=function(t,e,s,r){var i=n?n+t:t;if(!this._events[i])return this;if(!e)return a(this,i),this;var o=this._events[i];if(o.fn)o.fn!==e||r&&!o.once||s&&o.context!==s||a(this,i);else{for(var h=0,c=[],u=o.length;h<u;h++)(o[h].fn!==e||r&&!o[h].once||s&&o[h].context!==s)&&c.push(o[h]);c.length?this._events[i]=1===c.length?c[0]:c:a(this,i)}return this},o.prototype.removeAllListeners=function(t){var e;return t?(e=n?n+t:t,this._events[e]&&a(this,e)):(this._events=new s,this._eventsCount=0),this},o.prototype.off=o.prototype.removeListener,o.prototype.addListener=o.prototype.on,o.prefixed=n,o.EventEmitter=o,t.exports=o}(t);class e{graph;parent;key;state;constructor(t,e,n,s){this.graph=t,this.parent=e,this.key=n,this.state=s}getPath(){return this.parent?this.parent.getPath()+"/"+this.key:this.key}toJSON(){return{state:this.state}}}class n extends e{children=new Map;toNodesJSON(){return l(this.children,{},this.getPath(),!1)}toJSON(){const t={};for(const[e,s]of this.children)t[e]=s instanceof n?{state:s.state,id:s.getPath()}:s.toJSON();return{state:this.state,children:t}}}class s extends e{value;constructor(t,e,n,s,r){super(t,e,n,s),this.state=s,this.value=r}toJSON(){return this.value instanceof r?this.value.toJSON():{state:this.state,value:this.value}}}class r{graph;path;state;constructor(t,e,n){this.graph=t,this.path=e,this.state=n}get(t){return new r(this.graph,this.path+"/"+t,this.state)}set(t){return this.graph.set(this.path,t)}getValue(){return this.graph.getValueAtPath(this.path)}getPath(){return this.path}getNode(){return this.graph.getNodeAtPath(this.path)}getState(){return this.state}on(t){const e=e=>{e.startsWith(this.path)&&t(this.getValue())};this.graph.on("change",e);const n=this.getValue();return void 0!==n&&t(n),()=>{this.graph.off("change",e)}}then(t,e){const n=this.getValue();let s;return s=void 0!==n?Promise.resolve(n):new Promise((t=>{this.graph.once("change",(e=>{e.startsWith(this.path)&&t(this.getValue())}))})),s.then(t,e)}toJSON(){return{id:this.path,state:this.state}}}class i extends t.exports.EventEmitter{state=Date.now();entries=new Map;getEntries(){return this.entries}get(t){return new r(this,t,this.state)}getValueAtPath(t){const e=t.split("/"),n=this.entries.get(e.shift());return n?h(e,n,new Map):void this.emit("get",t)}getNodeAtPath(t){const e=t.split("/"),n=this.entries.get(e.shift());return c(e,n)}set(t,e){return this.state=Date.now(),this.setPathInternal(t,e,this.state),this}merge(t,e){return this.mergePathInternal(t,e),this}toJSON(){return l(this.entries,{},void 0,!0)}mergePathInternal(t,e){const i=e.state;let a=this.getNodeAtPath(t);if("children"in e){if(a instanceof s?(a.value instanceof r&&a.value.getPath()===t&&a.value.getState()>=i||u(a.value,a.state,new r(this,t,i),i))&&(a=this.createNodeAt(t,i)):a||(a=this.createNodeAt(t,i)),a instanceof n){for(const[t,n]of Object.entries(e.children))this.mergePathInternal(a.getPath()+"/"+t,n);this.emit("change",a.getPath(),a.toJSON())}}else{const o="value"in e?e.value:new r(this,e.id,i);if(a instanceof s)u(a.value,a.state,o,i)&&(a.value=o,a.state=i,this.emit("change",a.getPath(),a.toJSON()));else if(a instanceof n){if(u(new r(this,a.getPath(),i),a.state,o,i)){const e=this.createEdgeAt(t,i);e.value=o,this.emit("change",e.getPath(),e.toJSON())}}else{const e=this.createEdgeAt(t,i);e.value=o,this.emit("change",e.getPath(),e.toJSON())}}return this}setPathInternal(t,e,n){if(e instanceof r)this.setEdgePathInternal(t,e,n);else if(null!=e&&"object"==typeof e)for(const[s,r]of Object.entries(e))this.setPathInternal(t+"/"+s,r,n);else this.setEdgePathInternal(t,e,n)}setEdgePathInternal(t,e,n){const s=this.createEdgeAt(t,n);s.value=e;const r=s.getPath(),i=s.toJSON();return this.emit("change",r,i),this.emit("set",r,i),s}createNodeAt(t,e){const i=t.split("/"),a=i.shift();let o=this.entries.get(a);return o instanceof n||(o=new n(this,null,a,e),this.entries.set(a,o)),i.reduce(((t,i)=>{const a=t.children.get(i);if(a instanceof n)return a;if(a instanceof s&&a.value instanceof r){const t=a.value.getNode();if(t instanceof n)return t}const o=new n(this,t,i,e);return t.children.set(i,o),o}),o)}createEdgeAt(t,e){const[n,r]=o(t),i=n?this.createNodeAt(n,e):null;let a=i?.children.get(r);return a instanceof s?(a.state=e,a):(a=new s(this,i,r,e,null),i?.children.set(r,a),a)}}function a(t){const e=t.lastIndexOf("/");return-1===e?void 0:t.substring(e+1)}function o(t){const e=t.lastIndexOf("/");return-1===e?[void 0,t]:[t.substring(0,e),t.substring(e+1)]}function h(t,e,i){if(!e)return;const a=i.get(e);if(a)return a;if(e instanceof n){const n=t.shift();if(n){const s=e.children.get(n);return s?h(t,s,i):(e.graph.emit("get",e.getPath()+"/"+n),void i.set(e,void 0))}{const n={};i.set(e,n);for(const[a,o]of e.children){const c=e.getPath()+"/"+a;if(o instanceof s&&o.value instanceof r&&o.getPath()===c)n[a]=new r(e.graph,c,o.state);else{const s=h(t,o,i);n[a]=void 0!==s?s:new r(e.graph,c,o.state)}}return n}}if(e.value instanceof r){if(e.getPath()===e.value.getPath())return e.graph.emit("get",e.value.getPath()),void i.set(e,void 0);const n=e.value.getNode();return n?h(t,n,i):(e.graph.emit("get",e.value.getPath()),void i.set(e,void 0))}return i.set(e,e.value),e.value}function c(t,e){if(e){if(e instanceof n){const n=t.shift();if(n){const s=e.children.get(n);return s?c(t,s):void 0}return e}if(e.value instanceof r){if(e.getPath()===e.value.getPath())return e;const n=e.value.getNode();return n?c(t,n):void 0}return e}}function u(t,e,n,s){return s>=e&&(e!==s||JSON.stringify(n)>JSON.stringify(t))}function l(t,e,s,r=!1){const i=s?s+"/":"";return t.forEach(((t,s)=>{t instanceof n&&r?l(t.children,e,i+s,r):e[i+s]=t.toJSON()})),e}export{s as Edge,e as Entry,i as Graph,n as Node,r as Ref,a as getParentPath,o as getParentPathAndKey};
//# sourceMappingURL=index.js.map
