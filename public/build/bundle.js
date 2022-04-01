
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* node_modules/svelte-icons-pack/Icon.svelte generated by Svelte v3.46.4 */

    const file$6 = "node_modules/svelte-icons-pack/Icon.svelte";

    function create_fragment$6(ctx) {
    	let svg;

    	let svg_levels = [
    		{ width: /*size*/ ctx[1] },
    		{ height: /*size*/ ctx[1] },
    		{ "stroke-width": "0" },
    		{ class: /*className*/ ctx[2] },
    		/*src*/ ctx[0].a,
    		/*attr*/ ctx[4],
    		{ xmlns: "http://www.w3.org/2000/svg" }
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$6, 26, 0, 417);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			svg.innerHTML = /*innerHtml*/ ctx[3];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*innerHtml*/ 8) svg.innerHTML = /*innerHtml*/ ctx[3];
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				dirty & /*size*/ 2 && { width: /*size*/ ctx[1] },
    				dirty & /*size*/ 2 && { height: /*size*/ ctx[1] },
    				{ "stroke-width": "0" },
    				dirty & /*className*/ 4 && { class: /*className*/ ctx[2] },
    				dirty & /*src*/ 1 && /*src*/ ctx[0].a,
    				dirty & /*attr*/ 16 && /*attr*/ ctx[4],
    				{ xmlns: "http://www.w3.org/2000/svg" }
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Icon', slots, []);
    	let { src } = $$props;
    	let { size = "1em" } = $$props;
    	let { color = undefined } = $$props;
    	let { title = undefined } = $$props;
    	let { className = "" } = $$props;
    	let innerHtml;
    	let attr;
    	const writable_props = ['src', 'size', 'color', 'title', 'className'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('src' in $$props) $$invalidate(0, src = $$props.src);
    		if ('size' in $$props) $$invalidate(1, size = $$props.size);
    		if ('color' in $$props) $$invalidate(5, color = $$props.color);
    		if ('title' in $$props) $$invalidate(6, title = $$props.title);
    		if ('className' in $$props) $$invalidate(2, className = $$props.className);
    	};

    	$$self.$capture_state = () => ({
    		src,
    		size,
    		color,
    		title,
    		className,
    		innerHtml,
    		attr
    	});

    	$$self.$inject_state = $$props => {
    		if ('src' in $$props) $$invalidate(0, src = $$props.src);
    		if ('size' in $$props) $$invalidate(1, size = $$props.size);
    		if ('color' in $$props) $$invalidate(5, color = $$props.color);
    		if ('title' in $$props) $$invalidate(6, title = $$props.title);
    		if ('className' in $$props) $$invalidate(2, className = $$props.className);
    		if ('innerHtml' in $$props) $$invalidate(3, innerHtml = $$props.innerHtml);
    		if ('attr' in $$props) $$invalidate(4, attr = $$props.attr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*color, src*/ 33) {
    			{
    				$$invalidate(4, attr = {});

    				if (color) {
    					if (src.a.stroke !== "none") {
    						$$invalidate(4, attr.stroke = color, attr);
    					}

    					if (src.a.fill !== "none") {
    						$$invalidate(4, attr.fill = color, attr);
    					}
    				}
    			}
    		}

    		if ($$self.$$.dirty & /*title, src*/ 65) {
    			{
    				$$invalidate(3, innerHtml = (title ? `<title>${title}</title>` : "") + src.c);
    			}
    		}
    	};

    	return [src, size, className, innerHtml, attr, color, title];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			src: 0,
    			size: 1,
    			color: 5,
    			title: 6,
    			className: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[0] === undefined && !('src' in props)) {
    			console.warn("<Icon> was created without expected prop 'src'");
    		}
    	}

    	get src() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get className() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set className(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // WiDaySunny
    var WiDaySunny = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M4.37,14.62c0-0.24,0.08-0.45,0.25-0.62c0.17-0.16,0.38-0.24,0.6-0.24h2.04c0.23,0,0.42,0.08,0.58,0.25\n\tc0.15,0.17,0.23,0.37,0.23,0.61S8,15.06,7.85,15.23c-0.15,0.17-0.35,0.25-0.58,0.25H5.23c-0.23,0-0.43-0.08-0.6-0.25\n\tC4.46,15.06,4.37,14.86,4.37,14.62z M7.23,21.55c0-0.23,0.08-0.43,0.23-0.61l1.47-1.43c0.15-0.16,0.35-0.23,0.59-0.23\n\tc0.24,0,0.44,0.08,0.6,0.23s0.24,0.34,0.24,0.57c0,0.24-0.08,0.46-0.24,0.64L8.7,22.14c-0.41,0.32-0.82,0.32-1.23,0\n\tC7.31,21.98,7.23,21.78,7.23,21.55z M7.23,7.71c0-0.23,0.08-0.43,0.23-0.61C7.66,6.93,7.87,6.85,8.1,6.85\n\tc0.22,0,0.42,0.08,0.59,0.24l1.43,1.47c0.16,0.15,0.24,0.35,0.24,0.59c0,0.24-0.08,0.44-0.24,0.6s-0.36,0.24-0.6,0.24\n\tc-0.24,0-0.44-0.08-0.59-0.24L7.47,8.32C7.31,8.16,7.23,7.95,7.23,7.71z M9.78,14.62c0-0.93,0.23-1.8,0.7-2.6s1.1-1.44,1.91-1.91\n\ts1.67-0.7,2.6-0.7c0.7,0,1.37,0.14,2.02,0.42c0.64,0.28,1.2,0.65,1.66,1.12c0.47,0.47,0.84,1.02,1.11,1.66\n\tc0.27,0.64,0.41,1.32,0.41,2.02c0,0.94-0.23,1.81-0.7,2.61c-0.47,0.8-1.1,1.43-1.9,1.9c-0.8,0.47-1.67,0.7-2.61,0.7\n\ts-1.81-0.23-2.61-0.7c-0.8-0.47-1.43-1.1-1.9-1.9C10.02,16.43,9.78,15.56,9.78,14.62z M11.48,14.62c0,0.98,0.34,1.81,1.03,2.5\n\tc0.68,0.69,1.51,1.04,2.49,1.04s1.81-0.35,2.5-1.04s1.04-1.52,1.04-2.5c0-0.96-0.35-1.78-1.04-2.47c-0.69-0.68-1.52-1.02-2.5-1.02\n\tc-0.97,0-1.8,0.34-2.48,1.02C11.82,12.84,11.48,13.66,11.48,14.62z M14.14,22.4c0-0.24,0.08-0.44,0.25-0.6s0.37-0.24,0.6-0.24\n\tc0.24,0,0.45,0.08,0.61,0.24s0.24,0.36,0.24,0.6v1.99c0,0.24-0.08,0.45-0.25,0.62c-0.17,0.17-0.37,0.25-0.6,0.25\n\ts-0.44-0.08-0.6-0.25c-0.17-0.17-0.25-0.38-0.25-0.62V22.4z M14.14,6.9V4.86c0-0.23,0.08-0.43,0.25-0.6C14.56,4.09,14.76,4,15,4\n\ts0.43,0.08,0.6,0.25c0.17,0.17,0.25,0.37,0.25,0.6V6.9c0,0.23-0.08,0.42-0.25,0.58S15.23,7.71,15,7.71s-0.44-0.08-0.6-0.23\n\tS14.14,7.13,14.14,6.9z M19.66,20.08c0-0.23,0.08-0.42,0.23-0.56c0.15-0.16,0.34-0.23,0.56-0.23c0.24,0,0.44,0.08,0.6,0.23\n\tl1.46,1.43c0.16,0.17,0.24,0.38,0.24,0.61c0,0.23-0.08,0.43-0.24,0.59c-0.4,0.31-0.8,0.31-1.2,0l-1.42-1.42\n\tC19.74,20.55,19.66,20.34,19.66,20.08z M19.66,9.16c0-0.25,0.08-0.45,0.23-0.59l1.42-1.47c0.17-0.16,0.37-0.24,0.59-0.24\n\tc0.24,0,0.44,0.08,0.6,0.25c0.17,0.17,0.25,0.37,0.25,0.6c0,0.25-0.08,0.46-0.24,0.62l-1.46,1.43c-0.18,0.16-0.38,0.24-0.6,0.24\n\tc-0.23,0-0.41-0.08-0.56-0.24S19.66,9.4,19.66,9.16z M21.92,14.62c0-0.24,0.08-0.44,0.24-0.62c0.16-0.16,0.35-0.24,0.57-0.24h2.02\n\tc0.23,0,0.43,0.09,0.6,0.26c0.17,0.17,0.26,0.37,0.26,0.6s-0.09,0.43-0.26,0.6c-0.17,0.17-0.37,0.25-0.6,0.25h-2.02\n\tc-0.23,0-0.43-0.08-0.58-0.25S21.92,14.86,21.92,14.62z"></path>'
    };

    // WiDayCloudy
    var WiDayCloudy = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M1.56,16.9c0,0.9,0.22,1.73,0.66,2.49s1.04,1.36,1.8,1.8c0.76,0.44,1.58,0.66,2.47,0.66h10.83c0.89,0,1.72-0.22,2.48-0.66\n\tc0.76-0.44,1.37-1.04,1.81-1.8c0.44-0.76,0.67-1.59,0.67-2.49c0-0.66-0.14-1.33-0.42-2C22.62,13.98,23,12.87,23,11.6\n\tc0-0.71-0.14-1.39-0.41-2.04c-0.27-0.65-0.65-1.2-1.12-1.67C21,7.42,20.45,7.04,19.8,6.77c-0.65-0.28-1.33-0.41-2.04-0.41\n\tc-1.48,0-2.77,0.58-3.88,1.74c-0.77-0.44-1.67-0.66-2.7-0.66c-1.41,0-2.65,0.44-3.73,1.31c-1.08,0.87-1.78,1.99-2.08,3.35\n\tc-1.12,0.26-2.03,0.83-2.74,1.73S1.56,15.75,1.56,16.9z M3.27,16.9c0-0.84,0.28-1.56,0.84-2.17c0.56-0.61,1.26-0.96,2.1-1.06\n\tl0.5-0.03c0.12,0,0.19-0.06,0.19-0.18l0.07-0.54c0.14-1.08,0.61-1.99,1.41-2.71c0.8-0.73,1.74-1.09,2.81-1.09\n\tc1.1,0,2.06,0.37,2.87,1.1c0.82,0.73,1.27,1.63,1.37,2.71l0.07,0.58c0.02,0.11,0.09,0.17,0.21,0.17h1.61c0.88,0,1.64,0.32,2.28,0.96\n\tc0.64,0.64,0.96,1.39,0.96,2.27c0,0.91-0.32,1.68-0.95,2.32c-0.63,0.64-1.4,0.96-2.28,0.96H6.49c-0.88,0-1.63-0.32-2.27-0.97\n\tC3.59,18.57,3.27,17.8,3.27,16.9z M9.97,4.63c0,0.24,0.08,0.45,0.24,0.63l0.66,0.64c0.25,0.19,0.46,0.27,0.64,0.25\n\tc0.21,0,0.39-0.09,0.55-0.26s0.24-0.38,0.24-0.62c0-0.24-0.09-0.44-0.26-0.59l-0.59-0.66c-0.18-0.16-0.38-0.24-0.61-0.24\n\tc-0.24,0-0.45,0.08-0.62,0.25C10.05,4.19,9.97,4.39,9.97,4.63z M15.31,9.06c0.69-0.67,1.51-1,2.45-1c0.99,0,1.83,0.34,2.52,1.03\n\tc0.69,0.69,1.04,1.52,1.04,2.51c0,0.62-0.17,1.24-0.51,1.84C19.84,12.48,18.68,12,17.32,12H17C16.75,10.91,16.19,9.93,15.31,9.06z\n\t M16.94,3.78c0,0.26,0.08,0.46,0.23,0.62s0.35,0.23,0.59,0.23c0.26,0,0.46-0.08,0.62-0.23c0.16-0.16,0.23-0.36,0.23-0.62V1.73\n\tc0-0.24-0.08-0.43-0.24-0.59s-0.36-0.23-0.61-0.23c-0.24,0-0.43,0.08-0.59,0.23s-0.23,0.35-0.23,0.59V3.78z M22.46,6.07\n\tc0,0.26,0.07,0.46,0.22,0.62c0.21,0.16,0.42,0.24,0.62,0.24c0.18,0,0.38-0.08,0.59-0.24l1.43-1.43c0.16-0.18,0.24-0.39,0.24-0.64\n\tc0-0.24-0.08-0.44-0.24-0.6c-0.16-0.16-0.36-0.24-0.59-0.24c-0.24,0-0.43,0.08-0.58,0.24l-1.47,1.43\n\tC22.53,5.64,22.46,5.84,22.46,6.07z M23.25,17.91c0,0.24,0.08,0.45,0.25,0.63l0.65,0.63c0.15,0.16,0.34,0.24,0.58,0.24\n\ts0.44-0.08,0.6-0.25c0.16-0.17,0.24-0.37,0.24-0.62c0-0.22-0.08-0.42-0.24-0.58l-0.65-0.65c-0.16-0.16-0.35-0.24-0.57-0.24\n\tc-0.24,0-0.44,0.08-0.6,0.24C23.34,17.47,23.25,17.67,23.25,17.91z M24.72,11.6c0,0.23,0.09,0.42,0.26,0.58\n\tc0.16,0.16,0.37,0.24,0.61,0.24h2.04c0.23,0,0.42-0.08,0.58-0.23s0.23-0.35,0.23-0.59c0-0.24-0.08-0.44-0.23-0.6\n\ts-0.35-0.25-0.58-0.25h-2.04c-0.24,0-0.44,0.08-0.61,0.25C24.8,11.17,24.72,11.37,24.72,11.6z"></path>'
    };

    // WiDayRain
    var WiDayRain = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M1.51,16.89c0,1.33,0.46,2.48,1.39,3.44s2.06,1.47,3.41,1.53c0.11,0,0.17-0.06,0.17-0.17v-1.34c0-0.11-0.06-0.17-0.17-0.17\n\tc-0.86-0.04-1.59-0.39-2.19-1.03s-0.9-1.4-0.9-2.26c0-0.82,0.28-1.54,0.85-2.16s1.27-0.97,2.1-1.07l0.53-0.05\n\tc0.13,0,0.2-0.06,0.2-0.17l0.07-0.54c0.11-1.08,0.56-1.99,1.37-2.72s1.76-1.1,2.85-1.1c1.09,0,2.04,0.37,2.86,1.1\n\ts1.28,1.64,1.4,2.72l0.07,0.57c0,0.12,0.06,0.19,0.17,0.19h1.62c0.89,0,1.65,0.32,2.3,0.96c0.65,0.64,0.97,1.39,0.97,2.27\n\tc0,0.87-0.3,1.62-0.9,2.26c-0.6,0.64-1.33,0.98-2.18,1.03c-0.12,0-0.19,0.06-0.19,0.17v1.34c0,0.11,0.06,0.17,0.19,0.17\n\tc1.33-0.04,2.46-0.55,3.39-1.51c0.93-0.97,1.39-2.12,1.39-3.45c0-0.72-0.14-1.39-0.42-2.01c0.78-0.97,1.17-2.07,1.17-3.31\n\tc0-0.95-0.24-1.83-0.71-2.64c-0.47-0.81-1.11-1.45-1.92-1.92s-1.68-0.7-2.62-0.7c-1.56,0-2.85,0.58-3.88,1.74\n\tc-0.82-0.44-1.72-0.66-2.71-0.66c-1.41,0-2.67,0.44-3.76,1.32s-1.79,2-2.1,3.36c-1.11,0.26-2.02,0.84-2.74,1.74\n\tS1.51,15.74,1.51,16.89z M6.91,23.75c0,0.17,0.05,0.33,0.16,0.49c0.11,0.16,0.27,0.27,0.49,0.33c0.11,0.02,0.2,0.04,0.27,0.04\n\tc0.39,0,0.65-0.21,0.77-0.64l1.58-5.88c0.07-0.24,0.04-0.46-0.08-0.67c-0.12-0.21-0.3-0.33-0.53-0.38\n\tc-0.22-0.07-0.43-0.05-0.63,0.07c-0.2,0.11-0.34,0.28-0.41,0.51l-1.58,5.91C6.93,23.66,6.91,23.73,6.91,23.75z M9.52,26.83\n\tc0,0.19,0.05,0.36,0.15,0.52c0.1,0.16,0.27,0.26,0.52,0.3c0.11,0.02,0.2,0.04,0.26,0.04c0.16,0,0.31-0.06,0.45-0.17\n\tc0.14-0.12,0.23-0.28,0.27-0.48l2.4-8.93c0.06-0.23,0.04-0.45-0.07-0.64s-0.28-0.33-0.5-0.4c-0.23-0.07-0.45-0.05-0.65,0.07\n\tc-0.2,0.11-0.34,0.28-0.4,0.51l-2.4,8.93C9.53,26.73,9.52,26.82,9.52,26.83z M9.94,4.6c0,0.24,0.08,0.44,0.25,0.61l0.65,0.66\n\tc0.19,0.15,0.4,0.22,0.62,0.22c0.21,0,0.41-0.08,0.58-0.23c0.17-0.16,0.26-0.35,0.26-0.59c0-0.24-0.08-0.46-0.24-0.64l-0.64-0.65\n\tc-0.18-0.17-0.38-0.25-0.6-0.25c-0.24,0-0.45,0.09-0.62,0.26C10.03,4.16,9.94,4.37,9.94,4.6z M13.67,23.77\n\tc0,0.16,0.05,0.32,0.15,0.47s0.26,0.26,0.46,0.32c0.11,0.02,0.2,0.04,0.25,0.04c0.17,0,0.34-0.05,0.49-0.15\n\tc0.15-0.1,0.25-0.26,0.3-0.49l1.58-5.88c0.06-0.23,0.04-0.45-0.07-0.64c-0.11-0.2-0.28-0.33-0.5-0.4c-0.24-0.07-0.45-0.05-0.65,0.07\n\tc-0.2,0.11-0.33,0.28-0.39,0.51l-1.58,5.91C13.69,23.68,13.67,23.76,13.67,23.77z M15.3,9.03c0.71-0.67,1.53-1,2.48-1\n\tc0.98,0,1.82,0.35,2.5,1.04c0.69,0.69,1.03,1.53,1.03,2.52c0,0.62-0.17,1.24-0.52,1.85c-0.97-0.97-2.13-1.45-3.49-1.45h-0.33\n\tC16.7,10.81,16.14,9.83,15.3,9.03z M16.92,3.78c0,0.23,0.08,0.43,0.25,0.59c0.17,0.16,0.37,0.24,0.61,0.24\n\tc0.23,0,0.43-0.08,0.59-0.23c0.16-0.16,0.24-0.35,0.24-0.59V1.73c0-0.26-0.08-0.47-0.23-0.63c-0.16-0.16-0.35-0.24-0.59-0.24\n\tc-0.25,0-0.46,0.08-0.62,0.25s-0.24,0.37-0.24,0.62V3.78z M22.45,6.06c0,0.24,0.09,0.44,0.27,0.59c0.14,0.16,0.32,0.24,0.55,0.26\n\tc0.23,0.02,0.44-0.07,0.62-0.26l1.44-1.43c0.18-0.17,0.26-0.38,0.26-0.63c0-0.24-0.08-0.45-0.25-0.61\n\tc-0.17-0.16-0.37-0.24-0.61-0.24c-0.21,0-0.4,0.08-0.58,0.25l-1.43,1.44C22.54,5.6,22.45,5.81,22.45,6.06z M23.26,17.91\n\tc0,0.24,0.08,0.45,0.24,0.63l0.65,0.63c0.18,0.14,0.38,0.21,0.6,0.21l0.02,0.02c0.23,0,0.42-0.08,0.58-0.24\n\tc0.16-0.16,0.24-0.37,0.24-0.61c0-0.24-0.09-0.43-0.26-0.58l-0.62-0.66c-0.18-0.16-0.39-0.24-0.62-0.24s-0.43,0.08-0.59,0.25\n\tS23.26,17.67,23.26,17.91z M24.72,11.58c0,0.24,0.09,0.43,0.26,0.59c0.18,0.18,0.38,0.26,0.62,0.26h2.03c0.24,0,0.44-0.08,0.61-0.25\n\tc0.17-0.17,0.25-0.37,0.25-0.6c0-0.24-0.08-0.44-0.25-0.61s-0.37-0.26-0.61-0.26H25.6c-0.24,0-0.44,0.09-0.62,0.26\n\tC24.8,11.14,24.72,11.34,24.72,11.58z"></path>'
    };

    // WiDayThunderstorm
    var WiDayThunderstorm = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M1.52,16.9c0,1.11,0.33,2.09,0.98,2.96s1.51,1.46,2.57,1.78l-0.64,1.7c-0.04,0.14,0,0.21,0.14,0.21H6.7L5.45,27.5h0.29\n\tl4.17-5.39c0.04-0.04,0.04-0.09,0.01-0.14C9.9,21.92,9.85,21.9,9.78,21.9H7.61l2.47-4.63c0.07-0.14,0.02-0.22-0.14-0.22H7\n\tc-0.09,0-0.17,0.05-0.23,0.14L5.7,20.07c-0.71-0.18-1.3-0.57-1.77-1.16c-0.47-0.59-0.7-1.26-0.7-2.01c0-0.83,0.28-1.55,0.85-2.17\n\ts1.27-0.97,2.1-1.07L6.7,13.6c0.13,0,0.2-0.06,0.2-0.18l0.06-0.51c0.11-1.08,0.57-1.99,1.38-2.72c0.81-0.73,1.77-1.1,2.86-1.1\n\tc1.09,0,2.04,0.37,2.85,1.1s1.28,1.64,1.4,2.72l0.06,0.58c0,0.11,0.06,0.17,0.18,0.17h1.61c0.91,0,1.68,0.32,2.32,0.95\n\tc0.64,0.63,0.96,1.39,0.96,2.29c0,0.85-0.3,1.59-0.89,2.21c-0.59,0.62-1.32,0.97-2.19,1.04c-0.13,0-0.2,0.06-0.2,0.18v1.37\n\tc0,0.11,0.07,0.17,0.2,0.17c1.33-0.04,2.46-0.55,3.39-1.51c0.93-0.96,1.39-2.11,1.39-3.45c0-0.74-0.14-1.41-0.43-2.01\n\tc0.79-0.96,1.18-2.06,1.18-3.32c0-0.94-0.24-1.81-0.71-2.62c-0.47-0.81-1.11-1.45-1.92-1.92c-0.81-0.47-1.68-0.71-2.62-0.71\n\tc-1.54,0-2.84,0.58-3.88,1.73c-0.81-0.43-1.71-0.65-2.7-0.65c-1.41,0-2.67,0.44-3.76,1.31s-1.79,1.99-2.1,3.36\n\tc-1.11,0.26-2.02,0.83-2.73,1.73S1.52,15.75,1.52,16.9z M9.61,26.48c-0.01,0.15,0.03,0.3,0.14,0.44s0.26,0.25,0.46,0.33\n\tc0.07,0.02,0.14,0.03,0.21,0.03c0.17,0,0.34-0.05,0.51-0.15s0.28-0.26,0.34-0.47l2.29-8.57c0.06-0.23,0.04-0.45-0.07-0.64\n\tc-0.11-0.2-0.27-0.33-0.49-0.4c-0.23-0.07-0.45-0.05-0.65,0.07c-0.2,0.11-0.34,0.28-0.4,0.51l-2.31,8.6\n\tC9.62,26.3,9.61,26.39,9.61,26.48z M9.94,4.63c0,0.24,0.08,0.43,0.25,0.59l0.64,0.66C11,6.05,11.2,6.13,11.44,6.14\n\tc0.24,0,0.43-0.08,0.57-0.26c0.19-0.15,0.28-0.35,0.28-0.6c0-0.24-0.08-0.43-0.25-0.59l-0.63-0.66c-0.17-0.16-0.38-0.24-0.61-0.24\n\tc-0.25,0-0.46,0.08-0.62,0.24C10.02,4.19,9.94,4.39,9.94,4.63z M13.77,23.43c0,0.12,0.04,0.24,0.11,0.38\n\tc0.13,0.2,0.29,0.34,0.5,0.43c0.07,0.03,0.17,0.05,0.3,0.05c0.15,0,0.26-0.02,0.33-0.06c0.2-0.08,0.34-0.28,0.41-0.58l1.49-5.55\n\tc0.06-0.24,0.04-0.45-0.07-0.65c-0.11-0.19-0.28-0.32-0.51-0.39c-0.23-0.07-0.45-0.05-0.64,0.07c-0.2,0.11-0.33,0.28-0.39,0.51\n\tL13.8,23.2c0,0.02-0.01,0.06-0.02,0.11C13.77,23.37,13.77,23.4,13.77,23.43z M15.3,9.04c0.67-0.64,1.49-0.97,2.48-0.97\n\tc0.97,0,1.81,0.34,2.5,1.02c0.69,0.68,1.04,1.51,1.04,2.48c0,0.62-0.17,1.24-0.52,1.85c-0.99-0.98-2.16-1.47-3.5-1.47h-0.31\n\tC16.68,10.78,16.11,9.81,15.3,9.04z M16.91,3.79c0,0.23,0.09,0.43,0.26,0.6s0.37,0.26,0.6,0.26c0.24,0,0.43-0.08,0.59-0.25\n\tc0.16-0.17,0.23-0.37,0.23-0.61V1.73c0-0.24-0.08-0.44-0.23-0.61s-0.35-0.25-0.59-0.25c-0.23,0-0.43,0.08-0.6,0.25\n\ts-0.26,0.37-0.26,0.61V3.79z M22.44,6.07c0,0.24,0.09,0.44,0.26,0.6c0.14,0.17,0.33,0.25,0.57,0.25s0.44-0.08,0.6-0.25l1.44-1.45\n\tc0.17-0.16,0.26-0.35,0.26-0.59c0-0.24-0.08-0.44-0.25-0.61c-0.17-0.17-0.37-0.25-0.61-0.25c-0.22,0-0.41,0.09-0.57,0.26L22.7,5.47\n\tC22.53,5.63,22.44,5.83,22.44,6.07z M23.25,17.93c0,0.22,0.08,0.42,0.24,0.6l0.66,0.63c0.12,0.14,0.31,0.23,0.54,0.24l0.01,0.01\n\tc0.01,0,0.03,0,0.05,0c0.02,0,0.03,0,0.05,0c0.19,0,0.36-0.09,0.53-0.26c0.17-0.16,0.26-0.36,0.26-0.6c0-0.23-0.09-0.43-0.26-0.61\n\tl-0.65-0.61c-0.16-0.18-0.36-0.27-0.58-0.27c-0.23,0-0.43,0.08-0.6,0.25C23.33,17.49,23.25,17.7,23.25,17.93z M24.7,11.58\n\tc0,0.23,0.09,0.43,0.27,0.6c0.18,0.18,0.38,0.27,0.61,0.27h2.03c0.23,0,0.43-0.09,0.6-0.26s0.26-0.38,0.26-0.61\n\tc0-0.23-0.08-0.43-0.25-0.59c-0.17-0.16-0.37-0.24-0.61-0.24h-2.03c-0.25,0-0.46,0.08-0.63,0.24C24.78,11.15,24.7,11.35,24.7,11.58z\n\t"></path>'
    };

    // WiDaySnow
    var WiDaySnow = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M1.58,16.93c0,0.86,0.21,1.67,0.64,2.41c0.42,0.74,1,1.34,1.74,1.79c0.73,0.45,1.54,0.69,2.4,0.71\n\tc0.11,0,0.17-0.06,0.17-0.17v-1.33c0-0.12-0.06-0.19-0.17-0.19c-0.85-0.04-1.58-0.38-2.18-1.02s-0.9-1.37-0.9-2.21\n\tc0-0.82,0.28-1.54,0.85-2.16c0.57-0.61,1.26-0.97,2.1-1.07l0.53-0.06c0.12,0,0.18-0.06,0.18-0.19l0.08-0.51\n\tc0.11-1.09,0.56-2,1.36-2.73c0.8-0.73,1.75-1.09,2.85-1.09c1.09,0,2.04,0.36,2.85,1.09c0.82,0.73,1.28,1.63,1.38,2.7l0.07,0.58\n\tc0,0.11,0.06,0.17,0.17,0.17h1.61c0.9,0,1.67,0.32,2.31,0.96c0.64,0.64,0.96,1.4,0.96,2.29c0,0.84-0.3,1.57-0.9,2.21\n\tc-0.6,0.63-1.33,0.97-2.17,1.02c-0.12,0-0.19,0.06-0.19,0.19v1.33c0,0.11,0.06,0.17,0.19,0.17c1.33-0.04,2.45-0.54,3.38-1.5\n\tc0.93-0.96,1.39-2.09,1.39-3.41c0-0.76-0.14-1.43-0.43-2.03C22.6,13.95,23,12.85,23,11.6c0-0.94-0.23-1.81-0.7-2.61\n\tc-0.47-0.8-1.11-1.44-1.91-1.91s-1.68-0.7-2.62-0.7c-1.54,0-2.83,0.58-3.87,1.73c-0.81-0.44-1.71-0.66-2.69-0.66\n\tc-1.41,0-2.65,0.44-3.74,1.31s-1.78,1.99-2.09,3.34c-1.12,0.28-2.03,0.86-2.74,1.75C1.93,14.75,1.58,15.77,1.58,16.93z M7.92,20.98\n\tc0,0.24,0.08,0.44,0.24,0.61c0.16,0.17,0.35,0.25,0.59,0.25c0.23,0,0.43-0.08,0.59-0.25c0.16-0.17,0.24-0.37,0.24-0.61\n\tc0-0.23-0.08-0.42-0.24-0.58s-0.35-0.24-0.59-0.24c-0.23,0-0.43,0.08-0.59,0.24S7.92,20.76,7.92,20.98z M7.92,24.61\n\tc0,0.21,0.08,0.4,0.24,0.57c0.18,0.16,0.37,0.24,0.58,0.24c0.24,0,0.43-0.08,0.59-0.23c0.16-0.16,0.23-0.35,0.23-0.58\n\tc0-0.24-0.08-0.43-0.24-0.59c-0.16-0.16-0.35-0.23-0.59-0.23c-0.23,0-0.43,0.08-0.59,0.23C8,24.17,7.92,24.37,7.92,24.61z\n\t M9.97,4.68c0,0.24,0.08,0.44,0.24,0.59l0.66,0.66c0.16,0.16,0.34,0.25,0.53,0.25c0.21,0.03,0.41-0.04,0.61-0.22\n\tc0.2-0.18,0.3-0.39,0.3-0.63c0-0.24-0.08-0.46-0.24-0.64l-0.64-0.61c-0.15-0.17-0.34-0.25-0.58-0.25c-0.25,0-0.46,0.08-0.63,0.25\n\tC10.05,4.24,9.97,4.44,9.97,4.68z M11.1,22.9c0,0.22,0.08,0.42,0.24,0.6c0.16,0.16,0.36,0.24,0.58,0.24c0.24,0,0.44-0.08,0.6-0.24\n\ts0.25-0.36,0.25-0.6c0-0.23-0.08-0.43-0.25-0.6s-0.37-0.25-0.6-0.25c-0.23,0-0.42,0.08-0.58,0.25S11.1,22.67,11.1,22.9z M11.1,19.3\n\tc0,0.23,0.08,0.42,0.24,0.58s0.36,0.24,0.58,0.24c0.24,0,0.44-0.08,0.6-0.24c0.17-0.16,0.25-0.35,0.25-0.59\n\tc0-0.23-0.08-0.43-0.25-0.59s-0.37-0.24-0.6-0.24c-0.23,0-0.42,0.08-0.58,0.24S11.1,19.07,11.1,19.3z M11.1,26.56\n\tc0,0.22,0.08,0.41,0.24,0.57c0.17,0.17,0.36,0.25,0.58,0.25c0.24,0,0.44-0.08,0.6-0.23c0.17-0.16,0.25-0.35,0.25-0.59\n\ts-0.08-0.44-0.25-0.6c-0.17-0.17-0.37-0.25-0.6-0.25c-0.22,0-0.41,0.08-0.58,0.25C11.18,26.13,11.1,26.33,11.1,26.56z M14.32,20.98\n\tc0,0.24,0.08,0.44,0.24,0.61c0.16,0.17,0.36,0.25,0.59,0.25s0.43-0.08,0.59-0.25c0.16-0.17,0.24-0.37,0.24-0.61\n\tc0-0.23-0.08-0.42-0.24-0.58s-0.35-0.24-0.59-0.24s-0.43,0.08-0.59,0.24S14.32,20.76,14.32,20.98z M14.32,24.61\n\tc0,0.21,0.08,0.4,0.23,0.57c0.18,0.16,0.38,0.24,0.6,0.24c0.24,0,0.43-0.08,0.59-0.23c0.16-0.16,0.23-0.35,0.23-0.58\n\tc0-0.24-0.08-0.43-0.24-0.59c-0.16-0.16-0.35-0.23-0.59-0.23c-0.24,0-0.44,0.08-0.6,0.24C14.4,24.18,14.32,24.38,14.32,24.61z\n\t M15.3,9.06c0.69-0.66,1.51-0.99,2.47-0.99c0.97,0,1.8,0.35,2.48,1.04c0.69,0.69,1.03,1.53,1.03,2.49c0,0.62-0.17,1.24-0.51,1.84\n\tC19.82,12.48,18.66,12,17.3,12h-0.32C16.68,10.83,16.12,9.85,15.3,9.06z M16.9,3.84c0,0.23,0.08,0.43,0.25,0.58s0.37,0.23,0.61,0.23\n\ts0.43-0.08,0.59-0.23c0.16-0.16,0.23-0.35,0.23-0.58V1.8c0-0.24-0.08-0.44-0.24-0.61S18,0.94,17.77,0.94s-0.43,0.09-0.6,0.26\n\tc-0.17,0.17-0.26,0.37-0.26,0.6V3.84z M22.42,6.11c0,0.23,0.08,0.43,0.25,0.59c0.15,0.16,0.34,0.24,0.56,0.26s0.43-0.07,0.62-0.26\n\tl1.43-1.43c0.18-0.18,0.26-0.38,0.26-0.61c0-0.24-0.09-0.44-0.26-0.61c-0.17-0.17-0.37-0.25-0.6-0.25c-0.22,0-0.41,0.08-0.58,0.25\n\tl-1.43,1.46C22.5,5.67,22.42,5.87,22.42,6.11z M23.22,17.91c0,0.25,0.08,0.46,0.24,0.62l0.64,0.63c0.24,0.16,0.46,0.24,0.64,0.24\n\tc0.21,0,0.39-0.09,0.56-0.26c0.17-0.17,0.25-0.38,0.25-0.61c0-0.23-0.09-0.42-0.26-0.58l-0.62-0.65c-0.18-0.16-0.38-0.24-0.61-0.24\n\ts-0.43,0.08-0.59,0.25C23.3,17.47,23.22,17.67,23.22,17.91z M24.67,11.6c0,0.24,0.09,0.43,0.26,0.59c0.17,0.18,0.38,0.27,0.62,0.27\n\th2.02c0.23,0,0.43-0.08,0.6-0.25s0.25-0.37,0.25-0.61c0-0.24-0.08-0.44-0.25-0.6s-0.37-0.25-0.6-0.25h-2.02\n\tc-0.24,0-0.44,0.08-0.62,0.25S24.67,11.37,24.67,11.6z"></path>'
    };

    // WiCloudy
    var WiCloudy = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M3.89,17.6c0-0.99,0.31-1.88,0.93-2.65s1.41-1.27,2.38-1.49c0.26-1.17,0.85-2.14,1.78-2.88c0.93-0.75,2-1.12,3.22-1.12\n\tc1.18,0,2.24,0.36,3.16,1.09c0.93,0.73,1.53,1.66,1.8,2.8h0.27c1.18,0,2.18,0.41,3.01,1.24s1.25,1.83,1.25,3\n\tc0,1.18-0.42,2.18-1.25,3.01s-1.83,1.25-3.01,1.25H8.16c-0.58,0-1.13-0.11-1.65-0.34S5.52,21,5.14,20.62\n\tc-0.38-0.38-0.68-0.84-0.91-1.36S3.89,18.17,3.89,17.6z M5.34,17.6c0,0.76,0.28,1.42,0.82,1.96s1.21,0.82,1.99,0.82h9.28\n\tc0.77,0,1.44-0.27,1.99-0.82c0.55-0.55,0.83-1.2,0.83-1.96c0-0.76-0.27-1.42-0.83-1.96c-0.55-0.54-1.21-0.82-1.99-0.82h-1.39\n\tc-0.1,0-0.15-0.05-0.15-0.15l-0.07-0.49c-0.1-0.94-0.5-1.73-1.19-2.35s-1.51-0.93-2.45-0.93c-0.94,0-1.76,0.31-2.46,0.94\n\tc-0.7,0.62-1.09,1.41-1.18,2.34l-0.07,0.42c0,0.1-0.05,0.15-0.16,0.15l-0.45,0.07c-0.72,0.06-1.32,0.36-1.81,0.89\n\tC5.59,16.24,5.34,16.87,5.34,17.6z M14.19,8.88c-0.1,0.09-0.08,0.16,0.07,0.21c0.43,0.19,0.79,0.37,1.08,0.55\n\tc0.11,0.03,0.19,0.02,0.22-0.03c0.61-0.57,1.31-0.86,2.12-0.86c0.81,0,1.5,0.27,2.1,0.81c0.59,0.54,0.92,1.21,0.99,2l0.09,0.64h1.42\n\tc0.65,0,1.21,0.23,1.68,0.7c0.47,0.47,0.7,1.02,0.7,1.66c0,0.6-0.21,1.12-0.62,1.57s-0.92,0.7-1.53,0.77c-0.1,0-0.15,0.05-0.15,0.16\n\tv1.13c0,0.11,0.05,0.16,0.15,0.16c1.01-0.06,1.86-0.46,2.55-1.19s1.04-1.6,1.04-2.6c0-1.06-0.37-1.96-1.12-2.7\n\tc-0.75-0.75-1.65-1.12-2.7-1.12h-0.15c-0.26-1-0.81-1.82-1.65-2.47c-0.83-0.65-1.77-0.97-2.8-0.97C16.28,7.29,15.11,7.82,14.19,8.88\n\tz"></path>'
    };

    // WiRain
    var WiRain = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M4.64,16.91c0-1.15,0.36-2.17,1.08-3.07c0.72-0.9,1.63-1.47,2.73-1.73c0.31-1.36,1.02-2.48,2.11-3.36s2.34-1.31,3.75-1.31\n\tc1.38,0,2.6,0.43,3.68,1.28c1.08,0.85,1.78,1.95,2.1,3.29h0.32c0.89,0,1.72,0.22,2.48,0.65s1.37,1.03,1.81,1.78\n\tc0.44,0.75,0.67,1.58,0.67,2.47c0,0.88-0.21,1.69-0.63,2.44c-0.42,0.75-1,1.35-1.73,1.8c-0.73,0.45-1.53,0.69-2.4,0.71\n\tc-0.13,0-0.2-0.06-0.2-0.17v-1.33c0-0.12,0.07-0.18,0.2-0.18c0.85-0.04,1.58-0.38,2.18-1.02s0.9-1.39,0.9-2.26s-0.33-1.62-0.98-2.26\n\ts-1.42-0.96-2.31-0.96h-1.61c-0.12,0-0.18-0.06-0.18-0.17l-0.08-0.58c-0.11-1.08-0.58-1.99-1.39-2.71\n\tc-0.82-0.73-1.76-1.09-2.85-1.09c-1.09,0-2.05,0.36-2.85,1.09c-0.81,0.73-1.26,1.63-1.36,2.71l-0.07,0.53c0,0.12-0.07,0.19-0.2,0.19\n\tl-0.53,0.03c-0.83,0.1-1.53,0.46-2.1,1.07s-0.85,1.33-0.85,2.16c0,0.87,0.3,1.62,0.9,2.26s1.33,0.98,2.18,1.02\n\tc0.11,0,0.17,0.06,0.17,0.18v1.33c0,0.11-0.06,0.17-0.17,0.17c-1.34-0.06-2.47-0.57-3.4-1.53S4.64,18.24,4.64,16.91z M9.99,23.6\n\tc0-0.04,0.01-0.11,0.04-0.2l1.63-5.77c0.06-0.19,0.17-0.34,0.32-0.44c0.15-0.1,0.31-0.15,0.46-0.15c0.07,0,0.15,0.01,0.24,0.03\n\tc0.24,0.04,0.42,0.17,0.54,0.37c0.12,0.2,0.15,0.42,0.08,0.67l-1.63,5.73c-0.12,0.43-0.4,0.64-0.82,0.64\n\tc-0.04,0-0.07-0.01-0.11-0.02c-0.06-0.02-0.09-0.03-0.1-0.03c-0.22-0.06-0.38-0.17-0.49-0.33C10.04,23.93,9.99,23.77,9.99,23.6z\n\t M12.61,26.41l2.44-8.77c0.04-0.19,0.14-0.34,0.3-0.44c0.16-0.1,0.32-0.15,0.49-0.15c0.09,0,0.18,0.01,0.27,0.03\n\tc0.22,0.06,0.38,0.19,0.49,0.39c0.11,0.2,0.13,0.41,0.07,0.64l-2.43,8.78c-0.04,0.17-0.13,0.31-0.29,0.43\n\tc-0.16,0.12-0.32,0.18-0.51,0.18c-0.09,0-0.18-0.02-0.25-0.05c-0.2-0.05-0.37-0.18-0.52-0.39C12.56,26.88,12.54,26.67,12.61,26.41z\n\t M16.74,23.62c0-0.04,0.01-0.11,0.04-0.23l1.63-5.77c0.06-0.19,0.16-0.34,0.3-0.44c0.15-0.1,0.3-0.15,0.46-0.15\n\tc0.08,0,0.17,0.01,0.26,0.03c0.21,0.06,0.36,0.16,0.46,0.31c0.1,0.15,0.15,0.31,0.15,0.47c0,0.03-0.01,0.08-0.02,0.14\n\ts-0.02,0.1-0.02,0.12l-1.63,5.73c-0.04,0.19-0.13,0.35-0.28,0.46s-0.32,0.17-0.51,0.17l-0.24-0.05c-0.2-0.06-0.35-0.16-0.46-0.32\n\tC16.79,23.94,16.74,23.78,16.74,23.62z"></path>'
    };

    // WiSnow
    var WiSnow = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M4.64,16.95c0-1.16,0.35-2.18,1.06-3.08s1.62-1.48,2.74-1.76c0.31-1.36,1.01-2.48,2.1-3.36s2.34-1.31,3.75-1.31\n\tc1.38,0,2.6,0.43,3.68,1.28c1.08,0.85,1.78,1.95,2.1,3.29h0.32c0.89,0,1.72,0.22,2.48,0.66c0.76,0.44,1.37,1.04,1.81,1.8\n\tc0.44,0.76,0.67,1.59,0.67,2.48c0,1.32-0.46,2.47-1.39,3.42c-0.92,0.96-2.05,1.46-3.38,1.5c-0.13,0-0.2-0.06-0.2-0.17v-1.33\n\tc0-0.12,0.07-0.18,0.2-0.18c0.85-0.04,1.58-0.38,2.18-1.02s0.9-1.38,0.9-2.23c0-0.89-0.32-1.65-0.97-2.3s-1.42-0.97-2.32-0.97h-1.61\n\tc-0.12,0-0.18-0.06-0.18-0.17l-0.08-0.58c-0.11-1.08-0.58-1.99-1.39-2.72c-0.82-0.73-1.76-1.1-2.85-1.1c-1.1,0-2.05,0.37-2.86,1.11\n\tc-0.81,0.74-1.27,1.65-1.37,2.75l-0.06,0.5c0,0.12-0.07,0.19-0.2,0.19l-0.53,0.07c-0.83,0.07-1.53,0.41-2.1,1.04\n\ts-0.85,1.35-0.85,2.19c0,0.85,0.3,1.59,0.9,2.23s1.33,0.97,2.18,1.02c0.11,0,0.17,0.06,0.17,0.18v1.33c0,0.11-0.06,0.17-0.17,0.17\n\tc-1.34-0.04-2.47-0.54-3.4-1.5C5.1,19.42,4.64,18.27,4.64,16.95z M11,21.02c0-0.22,0.08-0.42,0.24-0.58\n\tc0.16-0.16,0.35-0.24,0.59-0.24c0.23,0,0.43,0.08,0.59,0.24c0.16,0.16,0.24,0.36,0.24,0.58c0,0.24-0.08,0.44-0.24,0.6\n\tc-0.16,0.17-0.35,0.25-0.59,0.25c-0.23,0-0.43-0.08-0.59-0.25C11.08,21.46,11,21.26,11,21.02z M11,24.65c0-0.24,0.08-0.44,0.24-0.6\n\tc0.16-0.15,0.35-0.23,0.58-0.23c0.23,0,0.43,0.08,0.59,0.23c0.16,0.16,0.24,0.35,0.24,0.59c0,0.24-0.08,0.43-0.24,0.59\n\tc-0.16,0.16-0.35,0.23-0.59,0.23c-0.23,0-0.43-0.08-0.59-0.23C11.08,25.08,11,24.88,11,24.65z M14.19,22.95\n\tc0-0.23,0.08-0.44,0.25-0.62c0.16-0.16,0.35-0.24,0.57-0.24c0.23,0,0.43,0.09,0.6,0.26c0.17,0.17,0.26,0.37,0.26,0.6\n\tc0,0.23-0.08,0.43-0.25,0.6c-0.17,0.17-0.37,0.25-0.61,0.25c-0.23,0-0.42-0.08-0.58-0.25S14.19,23.18,14.19,22.95z M14.19,19.33\n\tc0-0.23,0.08-0.43,0.25-0.6c0.18-0.16,0.37-0.24,0.57-0.24c0.24,0,0.44,0.08,0.61,0.25c0.17,0.17,0.25,0.36,0.25,0.6\n\tc0,0.23-0.08,0.43-0.25,0.59c-0.17,0.16-0.37,0.24-0.61,0.24c-0.23,0-0.42-0.08-0.58-0.24C14.27,19.76,14.19,19.56,14.19,19.33z\n\t M14.19,26.61c0-0.23,0.08-0.43,0.25-0.61c0.16-0.16,0.35-0.24,0.57-0.24c0.24,0,0.44,0.08,0.61,0.25c0.17,0.17,0.25,0.37,0.25,0.6\n\ts-0.08,0.43-0.25,0.59c-0.17,0.16-0.37,0.24-0.61,0.24c-0.23,0-0.42-0.08-0.58-0.24C14.27,27.03,14.19,26.84,14.19,26.61z\n\t M17.41,21.02c0-0.22,0.08-0.41,0.25-0.58c0.17-0.17,0.37-0.25,0.6-0.25c0.23,0,0.43,0.08,0.59,0.24c0.16,0.16,0.24,0.36,0.24,0.58\n\tc0,0.24-0.08,0.44-0.24,0.6c-0.16,0.17-0.35,0.25-0.59,0.25c-0.24,0-0.44-0.08-0.6-0.25C17.5,21.45,17.41,21.25,17.41,21.02z\n\t M17.41,24.65c0-0.22,0.08-0.42,0.25-0.6c0.16-0.15,0.36-0.23,0.6-0.23c0.24,0,0.43,0.08,0.59,0.23s0.23,0.35,0.23,0.59\n\tc0,0.24-0.08,0.43-0.23,0.59c-0.16,0.16-0.35,0.23-0.59,0.23c-0.24,0-0.44-0.08-0.6-0.24C17.5,25.07,17.41,24.88,17.41,24.65z"></path>'
    };

    // WiCloudyWindy
    var WiCloudyWindy = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M3.1,21.04c0-0.24,0.08-0.45,0.25-0.61s0.38-0.24,0.63-0.24h8.97c0.24,0,0.43,0.08,0.59,0.24c0.16,0.16,0.23,0.36,0.23,0.61\n\tc0,0.24-0.08,0.44-0.24,0.6c-0.16,0.16-0.35,0.24-0.59,0.24H3.98c-0.25,0-0.46-0.08-0.63-0.24S3.1,21.27,3.1,21.04z M5.73,17.98\n\tc0-0.24,0.09-0.44,0.27-0.6c0.14-0.15,0.34-0.23,0.59-0.23h9c0.23,0,0.42,0.08,0.58,0.23s0.23,0.35,0.23,0.59\n\tc0,0.24-0.08,0.44-0.23,0.61c-0.15,0.17-0.35,0.25-0.58,0.25h-9c-0.23,0-0.43-0.09-0.6-0.26S5.73,18.21,5.73,17.98z M6.35,15.65\n\tc0,0.09,0.06,0.14,0.17,0.14h1.43c0.09,0,0.17-0.05,0.23-0.14c0.23-0.54,0.57-0.99,1.04-1.35s0.99-0.56,1.58-0.6l0.54-0.07\n\tc0.11,0,0.17-0.06,0.17-0.18l0.07-0.52c0.11-1.09,0.58-1.99,1.39-2.72c0.82-0.73,1.77-1.09,2.87-1.09c1.09,0,2.03,0.36,2.83,1.07\n\tc0.8,0.72,1.27,1.62,1.41,2.7l0.07,0.59c0,0.11,0.06,0.16,0.18,0.16h1.6c0.91,0,1.68,0.32,2.32,0.96c0.64,0.64,0.96,1.41,0.96,2.32\n\tc0,0.88-0.33,1.64-0.97,2.28c-0.65,0.65-1.42,0.97-2.31,0.97h-6.89c-0.12,0-0.18,0.06-0.18,0.17v1.34c0,0.12,0.06,0.18,0.18,0.18\n\th6.89c0.68,0,1.32-0.13,1.94-0.39s1.14-0.61,1.58-1.05s0.79-0.97,1.05-1.58s0.39-1.25,0.39-1.92c0-0.9-0.22-1.73-0.66-2.49\n\tc-0.44-0.76-1.04-1.36-1.8-1.8c-0.76-0.44-1.6-0.66-2.5-0.66h-0.31c-0.33-1.34-1.03-2.44-2.1-3.3c-1.08-0.85-2.3-1.28-3.68-1.28\n\tc-1.42,0-2.67,0.44-3.76,1.33c-1.09,0.88-1.78,2.01-2.08,3.39c-0.86,0.19-1.62,0.6-2.27,1.21s-1.1,1.35-1.36,2.22v0.02\n\tC6.36,15.6,6.35,15.62,6.35,15.65z M7.5,24.13c0-0.24,0.09-0.44,0.26-0.6c0.15-0.16,0.35-0.23,0.59-0.23h8.99\n\tc0.24,0,0.45,0.08,0.61,0.24c0.17,0.16,0.25,0.36,0.25,0.6c0,0.24-0.08,0.44-0.25,0.61c-0.17,0.17-0.37,0.25-0.61,0.25H8.35\n\tc-0.23,0-0.43-0.08-0.6-0.25C7.58,24.57,7.5,24.37,7.5,24.13z"></path>'
    };

    // WiNightClear
    var WiNightClear = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M7.91,14.48c0-0.96,0.19-1.87,0.56-2.75s0.88-1.63,1.51-2.26c0.63-0.63,1.39-1.14,2.27-1.52c0.88-0.38,1.8-0.57,2.75-0.57\n\th1.14c0.16,0.04,0.23,0.14,0.23,0.28l0.05,0.88c0.04,1.27,0.49,2.35,1.37,3.24c0.88,0.89,1.94,1.37,3.19,1.42l0.82,0.07\n\tc0.16,0,0.24,0.08,0.24,0.23v0.98c0.01,1.28-0.3,2.47-0.93,3.56c-0.63,1.09-1.48,1.95-2.57,2.59c-1.08,0.63-2.27,0.95-3.55,0.95\n\tc-0.97,0-1.9-0.19-2.78-0.56s-1.63-0.88-2.26-1.51c-0.63-0.63-1.13-1.39-1.5-2.26C8.1,16.37,7.91,15.45,7.91,14.48z M9.74,14.48\n\tc0,0.76,0.15,1.48,0.45,2.16c0.3,0.67,0.7,1.24,1.19,1.7c0.49,0.46,1.05,0.82,1.69,1.08c0.63,0.27,1.28,0.4,1.94,0.4\n\tc0.58,0,1.17-0.11,1.76-0.34c0.59-0.23,1.14-0.55,1.65-0.96c0.51-0.41,0.94-0.93,1.31-1.57c0.37-0.64,0.6-1.33,0.71-2.09\n\tc-1.63-0.34-2.94-1.04-3.92-2.1s-1.55-2.3-1.7-3.74C13.86,9.08,13,9.37,12.21,9.9c-0.78,0.53-1.39,1.2-1.82,2.02\n\tC9.96,12.74,9.74,13.59,9.74,14.48z"></path>'
    };

    // WiNightAltCloudy
    var WiNightAltCloudy = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M4.14,16.9c0-1.16,0.35-2.18,1.06-3.08s1.62-1.47,2.74-1.72c0.23-1.03,0.7-1.93,1.4-2.7c0.7-0.77,1.55-1.32,2.53-1.65\n\tc0.62-0.21,1.26-0.32,1.93-0.32c0.81,0,1.6,0.16,2.35,0.48c0.28-0.47,0.61-0.88,0.99-1.22c0.38-0.34,0.77-0.61,1.17-0.79\n\tc0.4-0.18,0.8-0.32,1.18-0.41s0.76-0.13,1.12-0.13c0.38,0,0.79,0.05,1.23,0.16l0.82,0.25c0.14,0.06,0.18,0.13,0.14,0.22l-0.14,0.6\n\tc-0.07,0.31-0.1,0.6-0.1,0.86c0,0.31,0.05,0.63,0.15,0.95c0.1,0.32,0.24,0.63,0.44,0.94c0.19,0.31,0.46,0.58,0.8,0.83\n\tc0.34,0.25,0.72,0.44,1.15,0.57l0.62,0.22c0.1,0.03,0.15,0.08,0.15,0.16c0,0.02-0.01,0.04-0.02,0.07l-0.18,0.67\n\tc-0.27,1.08-0.78,1.93-1.5,2.57c0.4,0.7,0.62,1.45,0.65,2.24c0.01,0.05,0.01,0.12,0.01,0.23c0,0.89-0.22,1.72-0.67,2.48\n\tc-0.44,0.76-1.05,1.36-1.8,1.8c-0.76,0.44-1.59,0.67-2.48,0.67H9.07c-0.89,0-1.72-0.22-2.48-0.67s-1.35-1.05-1.79-1.8\n\tS4.14,17.8,4.14,16.9z M5.85,16.9c0,0.89,0.32,1.66,0.96,2.31c0.64,0.65,1.39,0.98,2.26,0.98h10.81c0.89,0,1.65-0.32,2.28-0.97\n\ts0.95-1.42,0.95-2.32c0-0.88-0.32-1.63-0.96-2.26c-0.64-0.63-1.4-0.95-2.28-0.95h-1.78l-0.1-0.75c-0.1-1.01-0.52-1.88-1.26-2.59\n\ts-1.62-1.11-2.63-1.2c-0.03,0-0.08,0-0.15-0.01c-0.07-0.01-0.11-0.01-0.15-0.01c-0.51,0-1.02,0.1-1.54,0.29V9.4\n\tc-0.73,0.28-1.35,0.74-1.84,1.37c-0.5,0.63-0.8,1.35-0.9,2.17l-0.07,0.72l-0.68,0.03c-0.84,0.1-1.54,0.45-2.1,1.06\n\tS5.85,16.07,5.85,16.9z M17.6,8.79c1.06,0.91,1.72,1.97,1.97,3.18h0.32c1.24,0,2.3,0.39,3.17,1.18c0.33-0.31,0.58-0.67,0.76-1.07\n\tc-0.91-0.43-1.63-1.09-2.16-1.97c-0.52-0.88-0.79-1.81-0.79-2.78V7.09c-0.05-0.01-0.13-0.01-0.24-0.01\n\tc-0.58-0.01-1.15,0.13-1.7,0.44C18.38,7.82,17.93,8.24,17.6,8.79z"></path>'
    };

    // WiNightAltRain
    var WiNightAltRain = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M4.07,16.9c0,1.33,0.47,2.48,1.4,3.44s2.07,1.47,3.4,1.53c0.12,0,0.18-0.06,0.18-0.17v-1.34c0-0.11-0.06-0.17-0.18-0.17\n\tc-0.86-0.05-1.59-0.39-2.19-1.03c-0.6-0.64-0.9-1.39-0.9-2.26c0-0.83,0.28-1.55,0.85-2.17c0.57-0.62,1.27-0.97,2.1-1.07l0.53-0.04\n\tc0.13,0,0.2-0.06,0.2-0.17l0.07-0.54c0.11-1.08,0.57-1.99,1.38-2.72c0.81-0.73,1.77-1.1,2.86-1.1c1.09,0,2.04,0.37,2.86,1.1\n\tc0.82,0.73,1.28,1.64,1.4,2.72l0.08,0.57c0,0.12,0.06,0.18,0.17,0.18h1.62c0.89,0,1.67,0.32,2.32,0.96c0.65,0.64,0.98,1.4,0.98,2.28\n\tc0,0.87-0.3,1.62-0.9,2.26c-0.6,0.64-1.33,0.98-2.19,1.03c-0.14,0-0.21,0.06-0.21,0.17v1.34c0,0.11,0.07,0.17,0.21,0.17\n\tc1.33-0.04,2.46-0.55,3.38-1.51c0.93-0.97,1.39-2.12,1.39-3.45c0-0.88-0.23-1.7-0.68-2.46c0.81-0.73,1.33-1.6,1.58-2.62l0.14-0.72\n\tc0.01-0.01,0.02-0.03,0.02-0.07c0-0.07-0.05-0.13-0.16-0.16l-0.56-0.18c-0.57-0.16-1.06-0.44-1.46-0.83\n\tc-0.41-0.39-0.7-0.8-0.87-1.23c-0.17-0.43-0.26-0.86-0.26-1.28c-0.02-0.22,0.01-0.5,0.08-0.82l0.14-0.61c0.04-0.1,0-0.18-0.14-0.24\n\tl-0.79-0.24c-0.45-0.1-0.87-0.15-1.27-0.15c-0.38,0-0.76,0.04-1.14,0.13c-0.39,0.09-0.79,0.22-1.2,0.41\n\tc-0.41,0.18-0.81,0.45-1.2,0.8c-0.39,0.35-0.72,0.75-1,1.22c-0.82-0.3-1.6-0.45-2.33-0.45c-1.41,0-2.67,0.44-3.76,1.32\n\ts-1.8,2-2.11,3.37c-1.11,0.26-2.02,0.83-2.74,1.73C4.43,14.72,4.07,15.75,4.07,16.9z M9.63,23.74c0,0.17,0.05,0.33,0.16,0.49\n\tc0.11,0.16,0.27,0.27,0.49,0.33c0.23,0.07,0.45,0.05,0.64-0.04c0.2-0.1,0.33-0.28,0.4-0.56l1.43-5.87c0.06-0.25,0.03-0.48-0.08-0.67\n\tc-0.12-0.2-0.29-0.32-0.52-0.37c-0.22-0.07-0.43-0.05-0.63,0.07c-0.2,0.11-0.34,0.28-0.41,0.51l-1.44,5.9\n\tc0,0.01-0.01,0.04-0.02,0.09C9.64,23.67,9.63,23.71,9.63,23.74z M12.24,26.81c0,0.16,0.05,0.31,0.15,0.46\n\tc0.1,0.15,0.25,0.25,0.45,0.31c0.11,0.03,0.19,0.04,0.24,0.04c0.44,0,0.71-0.2,0.82-0.59l2.25-8.93c0.06-0.24,0.04-0.46-0.07-0.65\n\tc-0.11-0.19-0.28-0.32-0.5-0.39c-0.23-0.07-0.45-0.05-0.66,0.07s-0.34,0.28-0.39,0.5l-2.26,8.92c0,0.01,0,0.05-0.01,0.12\n\tC12.24,26.73,12.24,26.78,12.24,26.81z M16.4,23.82c0,0.36,0.21,0.6,0.63,0.74c0.14,0.04,0.24,0.06,0.3,0.06\n\tc0.11,0,0.23-0.02,0.35-0.07c0.21-0.08,0.34-0.28,0.39-0.58l1.43-5.87c0.06-0.24,0.04-0.45-0.08-0.65\n\tc-0.11-0.19-0.28-0.32-0.51-0.39c-0.23-0.07-0.45-0.05-0.66,0.07c-0.21,0.11-0.33,0.28-0.38,0.51l-1.43,5.9\n\tC16.42,23.7,16.4,23.8,16.4,23.82z M17.58,8.77c0.32-0.58,0.75-1.02,1.31-1.33c0.55-0.3,1.14-0.45,1.76-0.44\n\tc0.12,0,0.21,0,0.27,0.01v0.3c-0.01,0.97,0.24,1.88,0.77,2.75c0.52,0.86,1.26,1.52,2.21,1.97c-0.22,0.46-0.49,0.81-0.79,1.07\n\tc-0.92-0.76-1.99-1.13-3.23-1.13h-0.31C19.3,10.7,18.64,9.64,17.58,8.77z"></path>'
    };

    // WiNightAltStormShowers
    var WiNightAltStormShowers = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M4.09,16.89c0,1.11,0.33,2.1,0.99,2.97c0.66,0.87,1.52,1.47,2.58,1.79l-0.65,1.7c-0.04,0.14,0,0.21,0.14,0.21h2.12\n\tl-1.29,4.18h0.28l4.23-5.62c0.04-0.04,0.04-0.09,0.02-0.14c-0.03-0.05-0.07-0.07-0.14-0.07h-2.18l2.47-4.64\n\tc0.07-0.14,0.03-0.22-0.13-0.22H9.57c-0.09,0-0.16,0.05-0.22,0.15l-1.07,2.88c-0.71-0.18-1.3-0.57-1.78-1.17s-0.71-1.27-0.71-2.01\n\tc0-0.83,0.28-1.55,0.85-2.17c0.57-0.61,1.27-0.97,2.1-1.07l0.53-0.07c0.13,0,0.2-0.06,0.2-0.18l0.07-0.51\n\tc0.11-1.08,0.56-1.99,1.37-2.72c0.81-0.73,1.76-1.1,2.85-1.1c1.09,0,2.04,0.37,2.86,1.1c0.82,0.73,1.28,1.64,1.4,2.71l0.07,0.57\n\tc0,0.12,0.06,0.19,0.17,0.19h1.62c0.91,0,1.68,0.32,2.33,0.95s0.97,1.4,0.97,2.28c0,0.85-0.3,1.59-0.9,2.21\n\tc-0.6,0.62-1.33,0.97-2.2,1.03c-0.12,0-0.19,0.06-0.19,0.19v1.36c0,0.12,0.06,0.18,0.19,0.18c1.33-0.04,2.46-0.55,3.39-1.51\n\tc0.93-0.97,1.39-2.12,1.39-3.45c0-0.87-0.22-1.68-0.66-2.45c0.76-0.74,1.27-1.61,1.51-2.62l0.19-0.68c0.01-0.01,0.01-0.03,0.01-0.07\n\tc0-0.08-0.05-0.13-0.15-0.16l-0.62-0.17c-0.57-0.17-1.06-0.45-1.46-0.84c-0.4-0.39-0.68-0.8-0.85-1.22s-0.25-0.84-0.24-1.26\n\tc0-0.28,0.03-0.56,0.1-0.85l0.11-0.61c0.02-0.1-0.02-0.18-0.14-0.23l-0.8-0.24c-0.47-0.09-0.88-0.14-1.24-0.14\n\tc-0.37-0.01-0.75,0.03-1.13,0.12c-0.38,0.08-0.78,0.22-1.19,0.4c-0.41,0.18-0.8,0.45-1.18,0.79c-0.38,0.34-0.71,0.74-0.99,1.2\n\tC15.3,7.55,14.51,7.4,13.77,7.4c-1.41,0-2.67,0.44-3.76,1.32s-1.8,2-2.11,3.36c-1.11,0.26-2.02,0.84-2.74,1.74\n\tC4.45,14.71,4.09,15.74,4.09,16.89z M12.26,26.76c0,0.16,0.05,0.31,0.15,0.47c0.1,0.16,0.25,0.27,0.45,0.33\n\tc0.16,0.03,0.25,0.05,0.27,0.05c0.09,0,0.22-0.03,0.37-0.1c0.21-0.1,0.35-0.27,0.42-0.53l0.28-1.05c0.06-0.22,0.04-0.43-0.08-0.63\n\ts-0.29-0.34-0.53-0.41c-0.22-0.06-0.43-0.03-0.63,0.08c-0.2,0.12-0.34,0.3-0.41,0.53l-0.27,1L12.26,26.76z M13.6,22\n\tc0,0.43,0.2,0.68,0.61,0.75c0.14,0.03,0.23,0.05,0.27,0.05c0.38,0,0.63-0.21,0.77-0.63l0.3-1.02c0.06-0.22,0.03-0.43-0.08-0.63\n\ts-0.3-0.34-0.53-0.41c-0.22-0.07-0.44-0.05-0.64,0.07c-0.2,0.12-0.34,0.29-0.41,0.53l-0.25,1.01C13.61,21.81,13.6,21.9,13.6,22z\n\t M16.41,23.67c0.01,0.17,0.07,0.33,0.18,0.48s0.27,0.27,0.48,0.34c0.16,0.04,0.27,0.06,0.33,0.06c0.34,0,0.58-0.23,0.71-0.68\n\tl0.24-1.02c0.07-0.23,0.05-0.45-0.06-0.66c-0.11-0.21-0.28-0.34-0.5-0.41c-0.25-0.06-0.48-0.03-0.68,0.08\n\tc-0.2,0.12-0.33,0.3-0.37,0.53l-0.29,1.03c0,0.02-0.01,0.06-0.02,0.12C16.41,23.61,16.41,23.65,16.41,23.67z M17.59,8.77\n\tc0.33-0.56,0.78-0.99,1.34-1.29s1.15-0.45,1.76-0.45h0.22v0.32c0,0.64,0.11,1.26,0.34,1.86c0.23,0.6,0.56,1.15,1.02,1.66\n\tc0.45,0.51,0.99,0.91,1.61,1.21c-0.17,0.38-0.42,0.72-0.76,1.03c-0.91-0.78-1.98-1.17-3.22-1.17h-0.33\n\tC19.28,10.68,18.62,9.62,17.59,8.77z M17.78,18.87c0,0.43,0.22,0.71,0.65,0.82c0.14,0.02,0.24,0.04,0.3,0.04\n\tc0.36,0,0.61-0.22,0.74-0.65l0.28-1.04c0.01-0.05,0.01-0.12,0.01-0.22c0.01-0.17-0.03-0.33-0.14-0.49\n\tc-0.11-0.16-0.27-0.27-0.49-0.33c-0.01,0-0.05,0-0.1-0.01c-0.05-0.01-0.1-0.01-0.13-0.01c-0.16,0-0.32,0.05-0.48,0.15\n\ts-0.27,0.26-0.33,0.47l-0.29,1.02c0,0.01,0,0.04-0.01,0.1C17.79,18.79,17.78,18.84,17.78,18.87z"></path>'
    };

    // WiNightAltSnow
    var WiNightAltSnow = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M4.07,16.93c0,1.33,0.47,2.47,1.4,3.43s2.07,1.47,3.4,1.51c0.12,0,0.18-0.06,0.18-0.17v-1.34c0-0.11-0.06-0.17-0.18-0.17\n\tc-0.85-0.04-1.58-0.39-2.18-1.03c-0.61-0.64-0.91-1.39-0.91-2.24c0-0.85,0.28-1.58,0.85-2.2c0.57-0.62,1.27-0.96,2.1-1.03l0.53-0.07\n\tc0.13,0,0.2-0.06,0.2-0.17l0.07-0.52c0.11-1.09,0.56-2.01,1.37-2.75s1.76-1.11,2.86-1.11c1.09,0,2.04,0.37,2.86,1.1\n\tc0.82,0.73,1.28,1.64,1.4,2.72l0.08,0.57c0,0.12,0.06,0.18,0.17,0.18h1.62c0.91,0,1.68,0.32,2.33,0.97\n\tc0.65,0.64,0.97,1.41,0.97,2.31c0,0.85-0.3,1.6-0.91,2.24c-0.61,0.64-1.33,0.98-2.18,1.03c-0.14,0-0.21,0.06-0.21,0.17v1.34\n\tc0,0.11,0.07,0.17,0.21,0.17c0.88-0.02,1.68-0.26,2.41-0.71c0.73-0.45,1.31-1.05,1.73-1.8s0.63-1.56,0.63-2.43\n\tc0-0.91-0.22-1.74-0.65-2.48c0.74-0.66,1.24-1.52,1.52-2.58l0.17-0.72c0.01-0.01,0.02-0.04,0.02-0.08c0-0.07-0.05-0.13-0.16-0.16\n\tl-0.61-0.17c-0.44-0.13-0.83-0.32-1.17-0.57s-0.61-0.53-0.81-0.84c-0.2-0.31-0.34-0.62-0.44-0.95c-0.1-0.32-0.15-0.64-0.15-0.95\n\tc0-0.27,0.03-0.56,0.1-0.86l0.11-0.62c0.02-0.09-0.02-0.17-0.14-0.22l-0.8-0.24c-0.44-0.11-0.85-0.16-1.25-0.16\n\tc-0.37,0-0.74,0.04-1.12,0.13c-0.38,0.09-0.77,0.22-1.18,0.41c-0.41,0.19-0.8,0.45-1.18,0.8c-0.38,0.35-0.71,0.75-0.99,1.22\n\tc-0.81-0.33-1.6-0.5-2.38-0.5c-1.41,0-2.67,0.44-3.76,1.32s-1.8,2-2.11,3.37c-1.12,0.28-2.04,0.87-2.75,1.76\n\tC4.43,14.74,4.07,15.77,4.07,16.93z M10.46,21.02c0,0.24,0.08,0.44,0.24,0.6c0.16,0.17,0.35,0.25,0.59,0.25\n\tc0.24,0,0.44-0.08,0.6-0.25s0.24-0.37,0.24-0.6c0-0.22-0.08-0.42-0.24-0.58s-0.36-0.24-0.6-0.24c-0.23,0-0.43,0.08-0.59,0.24\n\tC10.54,20.6,10.46,20.79,10.46,21.02z M10.46,24.66c0,0.23,0.08,0.42,0.24,0.58c0.16,0.16,0.36,0.24,0.58,0.24\n\tc0.24,0,0.44-0.08,0.6-0.23c0.16-0.16,0.24-0.35,0.24-0.59c0-0.24-0.08-0.43-0.24-0.59c-0.16-0.16-0.36-0.23-0.6-0.23\n\tc-0.24,0-0.43,0.08-0.59,0.23C10.54,24.22,10.46,24.42,10.46,24.66z M13.66,22.96c0,0.24,0.08,0.44,0.24,0.59\n\tc0.16,0.16,0.36,0.24,0.58,0.24c0.24,0,0.44-0.08,0.61-0.24s0.25-0.36,0.25-0.59c0-0.24-0.08-0.44-0.25-0.61s-0.37-0.26-0.61-0.26\n\tc-0.22,0-0.41,0.09-0.58,0.26S13.66,22.72,13.66,22.96z M13.66,19.32c0,0.24,0.08,0.43,0.24,0.58c0.16,0.16,0.36,0.24,0.58,0.24\n\tc0.24,0,0.45-0.08,0.61-0.23s0.25-0.35,0.25-0.59c0-0.23-0.08-0.43-0.25-0.6s-0.37-0.25-0.61-0.25c-0.22,0-0.42,0.08-0.58,0.25\n\tS13.66,19.09,13.66,19.32z M13.66,26.63c0,0.22,0.08,0.41,0.24,0.57c0.17,0.17,0.36,0.25,0.58,0.25c0.24,0,0.44-0.08,0.61-0.24\n\tc0.17-0.16,0.25-0.35,0.25-0.59c0-0.24-0.08-0.44-0.25-0.61c-0.17-0.17-0.37-0.26-0.61-0.26c-0.22,0-0.41,0.09-0.58,0.26\n\tC13.75,26.19,13.66,26.4,13.66,26.63z M16.9,21.02c0,0.24,0.08,0.44,0.25,0.6s0.36,0.25,0.6,0.25s0.43-0.08,0.59-0.25\n\ts0.24-0.37,0.24-0.6c0-0.22-0.08-0.42-0.24-0.58s-0.35-0.24-0.59-0.24s-0.43,0.08-0.6,0.24S16.9,20.79,16.9,21.02z M16.9,24.66\n\tc0,0.23,0.08,0.42,0.24,0.58c0.16,0.16,0.36,0.24,0.6,0.24s0.43-0.08,0.59-0.24c0.16-0.16,0.23-0.35,0.23-0.59\n\tc0-0.24-0.08-0.43-0.23-0.59c-0.16-0.16-0.35-0.23-0.59-0.23s-0.44,0.08-0.6,0.23C16.98,24.22,16.9,24.42,16.9,24.66z M17.58,8.77\n\tc0.31-0.54,0.75-0.96,1.3-1.26S20,7.06,20.59,7.05c0.15,0,0.26,0.01,0.33,0.02v0.31c0,0.97,0.26,1.88,0.78,2.74s1.25,1.51,2.17,1.96\n\tc-0.16,0.36-0.41,0.72-0.76,1.07c-0.89-0.79-1.96-1.18-3.23-1.18h-0.31C19.3,10.74,18.64,9.68,17.58,8.77z"></path>'
    };

    /* src/components/CurrentTime.svelte generated by Svelte v3.46.4 */
    const file$5 = "src/components/CurrentTime.svelte";

    function create_fragment$5(ctx) {
    	let main;
    	let div;
    	let p;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			p = element("p");
    			p.textContent = `${/*day*/ ctx[1]}, ${/*month*/ ctx[0]}  ${/*date*/ ctx[2]} of '${/*year*/ ctx[3]}`;
    			attr_dev(p, "class", "date");
    			add_location(p, file$5, 51, 4, 840);
    			attr_dev(div, "class", "container svelte-l9kw2v");
    			add_location(div, file$5, 50, 2, 812);
    			attr_dev(main, "class", "svelte-l9kw2v");
    			add_location(main, file$5, 49, 0, 803);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let hours;
    	let minutes;
    	let seconds;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CurrentTime', slots, []);
    	let time = new Date();

    	onMount(() => {
    		const interval = setInterval(
    			() => {
    				$$invalidate(4, time = new Date());
    			},
    			1000
    		);

    		return () => {
    			clearInterval(interval);
    		};
    	});

    	const months = [
    		"January",
    		"February",
    		"March",
    		"April",
    		"May",
    		"June",
    		"July",
    		"August",
    		"September",
    		"October",
    		"November",
    		"December"
    	];

    	const days = ["Sunday", "Morning", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    	let month = months[time.getMonth()];
    	let day = days[time.getDay()];
    	let date = time.getDate();
    	let year = time.getFullYear();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CurrentTime> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		time,
    		months,
    		days,
    		month,
    		day,
    		date,
    		year,
    		seconds,
    		minutes,
    		hours
    	});

    	$$self.$inject_state = $$props => {
    		if ('time' in $$props) $$invalidate(4, time = $$props.time);
    		if ('month' in $$props) $$invalidate(0, month = $$props.month);
    		if ('day' in $$props) $$invalidate(1, day = $$props.day);
    		if ('date' in $$props) $$invalidate(2, date = $$props.date);
    		if ('year' in $$props) $$invalidate(3, year = $$props.year);
    		if ('seconds' in $$props) seconds = $$props.seconds;
    		if ('minutes' in $$props) minutes = $$props.minutes;
    		if ('hours' in $$props) hours = $$props.hours;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 16) {
    			hours = time.getHours();
    		}

    		if ($$self.$$.dirty & /*time*/ 16) {
    			minutes = time.getMinutes();
    		}

    		if ($$self.$$.dirty & /*time*/ 16) {
    			seconds = time.getSeconds();
    		}
    	};

    	return [month, day, date, year, time];
    }

    class CurrentTime extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CurrentTime",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Theme.svelte generated by Svelte v3.46.4 */

    const file$4 = "src/components/Theme.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (35:4) {#each data as theme}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*theme*/ ctx[5].name + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			attr_dev(option, "id", /*theme*/ ctx[5].url);
    			option.__value = /*theme*/ ctx[5].name;
    			option.value = option.__value;
    			add_location(option, file$4, 35, 6, 984);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);

    			if (!mounted) {
    				dispose = listen_dev(option, "click", /*changeTheme*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(35:4) {#each data as theme}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let main;
    	let select;
    	let option;
    	let t;
    	let mounted;
    	let dispose;
    	let each_value = /*data*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			select = element("select");
    			option = element("option");
    			t = text("Theme ⭐");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(option, "id", /*defaultTheme*/ ctx[1]);
    			option.__value = "Theme ⭐";
    			option.value = option.__value;
    			add_location(option, file$4, 33, 4, 886);
    			attr_dev(select, "name", "themes");
    			attr_dev(select, "class", "svelte-16q2xbj");
    			add_location(select, file$4, 32, 2, 859);
    			add_location(main, file$4, 31, 0, 850);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, select);
    			append_dev(select, option);
    			append_dev(option, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(option, "click", /*changeTheme*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data, changeTheme*/ 5) {
    				each_value = /*data*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Theme', slots, []);

    	let url = [
    		"bg-one.jpg",
    		"bg-two.jpg",
    		"bg-three.jpg",
    		"bg-four.jpg",
    		"bg-five.jpg",
    		"bg-six.jpeg",
    		"bg-sevent.webp"
    	];

    	let data = [
    		{ name: "Aesthetic sky", url: url[0] },
    		{
    			name: "Aesthetic Lake (night)",
    			url: url[1]
    		},
    		{
    			name: "Japanese hood (night)",
    			url: url[2]
    		},
    		{ name: "Sun and sky", url: url[3] },
    		{ name: "Plants and lake", url: url[4] },
    		{
    			name: "Night on another planet (night)",
    			url: url[5]
    		},
    		{
    			name: "Aesthetic sky landscape (night)",
    			url: url[6]
    		}
    	];

    	let currentTheme = "";
    	let defaultTheme = "default.jpg";
    	window.document.body.style.cssText = `background-image: url(${defaultTheme})`;

    	function changeTheme() {
    		currentTheme = event.target.id;
    		window.document.body.style.cssText = `background-image: url(${currentTheme})`;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Theme> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		url,
    		data,
    		currentTheme,
    		defaultTheme,
    		changeTheme
    	});

    	$$self.$inject_state = $$props => {
    		if ('url' in $$props) url = $$props.url;
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('currentTheme' in $$props) currentTheme = $$props.currentTheme;
    		if ('defaultTheme' in $$props) $$invalidate(1, defaultTheme = $$props.defaultTheme);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, defaultTheme, changeTheme];
    }

    class Theme extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Theme",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    // FaSolidSearch
    var FaSolidSearch = {
      a: {
        viewBox: '0 0 512 512'
      },
      c: '<path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"></path>'
    };

    /* src/components/Search.svelte generated by Svelte v3.46.4 */
    const file$3 = "src/components/Search.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let div1;
    	let input;
    	let t;
    	let button;
    	let div0;
    	let icon;
    	let current;
    	let mounted;
    	let dispose;

    	icon = new Icon({
    			props: {
    				class: "searchIcon",
    				color: "white",
    				size: "20",
    				src: FaSolidSearch
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			input = element("input");
    			t = space();
    			button = element("button");
    			div0 = element("div");
    			create_component(icon.$$.fragment);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Location... 📍");
    			attr_dev(input, "class", "svelte-i72v1r");
    			add_location(input, file$3, 9, 4, 201);
    			attr_dev(div0, "class", "search");
    			add_location(div0, file$3, 11, 6, 298);
    			attr_dev(button, "class", "svelte-i72v1r");
    			add_location(button, file$3, 10, 4, 274);
    			attr_dev(div1, "class", "city-input svelte-i72v1r");
    			add_location(div1, file$3, 8, 2, 172);
    			add_location(main, file$3, 7, 0, 163);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*city*/ ctx[0]);
    			append_dev(div1, t);
    			append_dev(div1, button);
    			append_dev(button, div0);
    			mount_component(icon, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(button, "click", /*click_handler*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*city*/ 1 && input.value !== /*city*/ ctx[0]) {
    				set_input_value(input, /*city*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(icon);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Search', slots, []);
    	let { city = "" } = $$props;
    	const writable_props = ['city'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_input_handler() {
    		city = this.value;
    		$$invalidate(0, city);
    	}

    	$$self.$$set = $$props => {
    		if ('city' in $$props) $$invalidate(0, city = $$props.city);
    	};

    	$$self.$capture_state = () => ({ Icon, FaSolidSearch, city });

    	$$self.$inject_state = $$props => {
    		if ('city' in $$props) $$invalidate(0, city = $$props.city);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [city, click_handler, input_input_handler];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { city: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get city() {
    		throw new Error("<Search>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set city(value) {
    		throw new Error("<Search>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // WiHumidity
    var WiHumidity = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M7.56,17.19c0-0.88,0.24-1.89,0.72-3.03s1.1-2.25,1.86-3.31c1.56-2.06,2.92-3.62,4.06-4.67l0.75-0.72\n\tc0.25,0.26,0.53,0.5,0.83,0.72c0.41,0.42,1.04,1.11,1.88,2.09s1.57,1.85,2.17,2.65c0.71,1.01,1.32,2.1,1.81,3.25\n\ts0.74,2.16,0.74,3.03c0,1-0.19,1.95-0.58,2.86c-0.39,0.91-0.91,1.7-1.57,2.36c-0.66,0.66-1.45,1.19-2.37,1.58\n\tc-0.92,0.39-1.89,0.59-2.91,0.59c-1,0-1.95-0.19-2.86-0.57c-0.91-0.38-1.7-0.89-2.36-1.55c-0.66-0.65-1.19-1.44-1.58-2.35\n\tS7.56,18.23,7.56,17.19z M9.82,14.26c0,0.83,0.17,1.49,0.52,1.99c0.35,0.49,0.88,0.74,1.59,0.74c0.72,0,1.25-0.25,1.61-0.74\n\tc0.35-0.49,0.53-1.15,0.54-1.99c-0.01-0.84-0.19-1.5-0.54-2c-0.35-0.49-0.89-0.74-1.61-0.74c-0.71,0-1.24,0.25-1.59,0.74\n\tC9.99,12.76,9.82,13.42,9.82,14.26z M11.39,14.26c0-0.15,0-0.27,0-0.35s0.01-0.19,0.02-0.33c0.01-0.14,0.02-0.25,0.05-0.32\n\ts0.05-0.16,0.09-0.24c0.04-0.08,0.09-0.15,0.15-0.18c0.07-0.04,0.14-0.06,0.23-0.06c0.14,0,0.25,0.04,0.33,0.12s0.14,0.21,0.17,0.38\n\tc0.03,0.18,0.05,0.32,0.06,0.45s0.01,0.3,0.01,0.52c0,0.23,0,0.4-0.01,0.52c-0.01,0.12-0.03,0.27-0.06,0.45\n\tc-0.03,0.17-0.09,0.3-0.17,0.38s-0.19,0.12-0.33,0.12c-0.09,0-0.16-0.02-0.23-0.06c-0.07-0.04-0.12-0.1-0.15-0.18\n\tc-0.04-0.08-0.07-0.17-0.09-0.24c-0.02-0.08-0.04-0.19-0.05-0.32c-0.01-0.14-0.02-0.25-0.02-0.32S11.39,14.41,11.39,14.26z\n\t M11.98,22.01h1.32l4.99-10.74h-1.35L11.98,22.01z M16.28,19.02c0.01,0.84,0.2,1.5,0.55,2c0.35,0.49,0.89,0.74,1.6,0.74\n\tc0.72,0,1.25-0.25,1.6-0.74c0.35-0.49,0.52-1.16,0.53-2c-0.01-0.84-0.18-1.5-0.53-1.99c-0.35-0.49-0.88-0.74-1.6-0.74\n\tc-0.71,0-1.25,0.25-1.6,0.74C16.47,17.52,16.29,18.18,16.28,19.02z M17.85,19.02c0-0.23,0-0.4,0.01-0.52\n\tc0.01-0.12,0.03-0.27,0.06-0.45s0.09-0.3,0.17-0.38s0.19-0.12,0.33-0.12c0.09,0,0.17,0.02,0.24,0.06c0.07,0.04,0.12,0.1,0.16,0.19\n\tc0.04,0.09,0.07,0.17,0.1,0.24s0.04,0.18,0.05,0.32l0.01,0.32l0,0.34c0,0.16,0,0.28,0,0.35l-0.01,0.32l-0.05,0.32l-0.1,0.24\n\tl-0.16,0.19l-0.24,0.06c-0.14,0-0.25-0.04-0.33-0.12s-0.14-0.21-0.17-0.38c-0.03-0.18-0.05-0.33-0.06-0.45S17.85,19.25,17.85,19.02z\n\t"></path>'
    };

    // WiBarometer
    var WiBarometer = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M7.69,13.2c0-0.99,0.19-1.94,0.58-2.85c0.39-0.91,0.91-1.68,1.57-2.33s1.44-1.17,2.34-1.56c0.9-0.39,1.85-0.58,2.84-0.58\n\tc0.99,0,1.94,0.19,2.85,0.58c0.9,0.39,1.68,0.91,2.33,1.56c0.65,0.65,1.17,1.43,1.56,2.33s0.58,1.85,0.58,2.85\n\tc0,1.62-0.48,3.06-1.44,4.34c-0.96,1.27-2.2,2.14-3.71,2.61v3.29h-4.24v-3.25c-1.54-0.45-2.81-1.32-3.79-2.61S7.69,14.83,7.69,13.2z\n\t M9.3,13.2c0,1.55,0.56,2.88,1.69,3.99c1.11,1.12,2.45,1.68,4.02,1.68c1.03,0,1.99-0.25,2.86-0.76c0.88-0.51,1.57-1.2,2.09-2.07\n\tc0.51-0.87,0.77-1.82,0.77-2.85c0-0.77-0.15-1.5-0.45-2.21s-0.71-1.31-1.22-1.82c-0.51-0.51-1.12-0.92-1.83-1.22\n\tc-0.71-0.3-1.44-0.45-2.21-0.45c-0.77,0-1.5,0.15-2.21,0.45s-1.31,0.71-1.82,1.22c-0.51,0.51-0.92,1.12-1.22,1.82\n\tC9.45,11.7,9.3,12.43,9.3,13.2z M9.88,13.56v-0.72h2.17v0.72H9.88z M10.97,10.02l0.52-0.52l1.52,1.52l-0.52,0.53L10.97,10.02z\n\t M13.5,14.95c0-0.42,0.15-0.78,0.44-1.09c0.29-0.31,0.65-0.47,1.06-0.48l2.73-4.49l0.66,0.35l-2.02,4.83\n\tc0.18,0.25,0.26,0.54,0.26,0.88c0,0.44-0.15,0.81-0.46,1.11c-0.31,0.3-0.68,0.45-1.12,0.45c-0.43,0-0.8-0.15-1.1-0.45\n\tC13.65,15.76,13.5,15.39,13.5,14.95z M14.81,10.28V8.12h0.69v2.17H14.81z M17.75,13.55v-0.74h2.17v0.74H17.75z"></path>'
    };

    // WiStrongWind
    var WiStrongWind = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M3.1,16.97c0,0.24,0.09,0.45,0.28,0.62c0.16,0.19,0.37,0.28,0.63,0.28H18.7c0.29,0,0.53,0.1,0.73,0.3\n\tc0.2,0.2,0.3,0.45,0.3,0.74c0,0.29-0.1,0.53-0.3,0.72c-0.2,0.19-0.44,0.29-0.74,0.29c-0.29,0-0.54-0.1-0.73-0.29\n\tc-0.16-0.18-0.36-0.26-0.6-0.26c-0.25,0-0.46,0.09-0.64,0.26s-0.27,0.38-0.27,0.61c0,0.25,0.09,0.46,0.28,0.63\n\tc0.56,0.55,1.22,0.83,1.96,0.83c0.78,0,1.45-0.27,2.01-0.81c0.56-0.54,0.83-1.19,0.83-1.97s-0.28-1.44-0.84-2\n\tc-0.56-0.56-1.23-0.84-2-0.84H4.01c-0.25,0-0.46,0.09-0.64,0.26C3.19,16.51,3.1,16.72,3.1,16.97z M3.1,13.69\n\tc0,0.23,0.09,0.43,0.28,0.61c0.17,0.18,0.38,0.26,0.63,0.26h20.04c0.78,0,1.45-0.27,2.01-0.82c0.56-0.54,0.84-1.2,0.84-1.97\n\tc0-0.77-0.28-1.44-0.84-1.99s-1.23-0.83-2.01-0.83c-0.77,0-1.42,0.27-1.95,0.8c-0.18,0.16-0.27,0.38-0.27,0.67\n\tc0,0.26,0.09,0.47,0.26,0.63c0.17,0.16,0.38,0.24,0.63,0.24c0.24,0,0.45-0.08,0.63-0.24c0.19-0.21,0.42-0.31,0.7-0.31\n\tc0.29,0,0.53,0.1,0.73,0.3c0.2,0.2,0.3,0.44,0.3,0.73c0,0.29-0.1,0.53-0.3,0.72c-0.2,0.19-0.44,0.29-0.73,0.29H4.01\n\tc-0.25,0-0.46,0.09-0.64,0.26C3.19,13.23,3.1,13.44,3.1,13.69z"></path>'
    };

    // WiThermometer
    var WiThermometer = {
      a: {
        version: '1.1',
        id: 'Layer_1',
        x: '0px',
        y: '0px',
        viewBox: '0 0 30 30',
        style: 'enable-background:new 0 0 30 30;'
      },
      c: '<path d="M9.91,19.56c0-0.85,0.2-1.64,0.59-2.38s0.94-1.35,1.65-1.84V5.42c0-0.8,0.27-1.48,0.82-2.03S14.2,2.55,15,2.55\n\tc0.81,0,1.49,0.28,2.04,0.83c0.55,0.56,0.83,1.23,0.83,2.03v9.92c0.71,0.49,1.25,1.11,1.64,1.84s0.58,1.53,0.58,2.38\n\tc0,0.92-0.23,1.78-0.68,2.56s-1.07,1.4-1.85,1.85s-1.63,0.68-2.56,0.68c-0.92,0-1.77-0.23-2.55-0.68s-1.4-1.07-1.86-1.85\n\tS9.91,20.48,9.91,19.56z M11.67,19.56c0,0.93,0.33,1.73,0.98,2.39c0.65,0.66,1.44,0.99,2.36,0.99c0.93,0,1.73-0.33,2.4-1\n\ts1.01-1.46,1.01-2.37c0-0.62-0.16-1.2-0.48-1.73c-0.32-0.53-0.76-0.94-1.32-1.23l-0.28-0.14c-0.1-0.04-0.15-0.14-0.15-0.29V5.42\n\tc0-0.32-0.11-0.59-0.34-0.81C15.62,4.4,15.34,4.29,15,4.29c-0.32,0-0.6,0.11-0.83,0.32c-0.23,0.21-0.34,0.48-0.34,0.81v10.74\n\tc0,0.15-0.05,0.25-0.14,0.29l-0.27,0.14c-0.55,0.29-0.98,0.7-1.29,1.23C11.82,18.35,11.67,18.92,11.67,19.56z M12.45,19.56\n\tc0,0.71,0.24,1.32,0.73,1.82s1.07,0.75,1.76,0.75s1.28-0.25,1.79-0.75c0.51-0.5,0.76-1.11,0.76-1.81c0-0.63-0.22-1.19-0.65-1.67\n\tc-0.43-0.48-0.96-0.77-1.58-0.85V9.69c0-0.06-0.03-0.13-0.1-0.19c-0.07-0.07-0.14-0.1-0.22-0.1c-0.09,0-0.16,0.03-0.21,0.08\n\tc-0.05,0.06-0.08,0.12-0.08,0.21v7.34c-0.61,0.09-1.13,0.37-1.56,0.85C12.66,18.37,12.45,18.92,12.45,19.56z"></path>'
    };

    /* src/components/WeatherData.svelte generated by Svelte v3.46.4 */
    const file$2 = "src/components/WeatherData.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let div1;
    	let icon0;
    	let t0;
    	let div0;
    	let p0;
    	let t2;
    	let p1;
    	let t3;
    	let t4;
    	let t5;
    	let div3;
    	let icon1;
    	let t6;
    	let div2;
    	let p2;
    	let t8;
    	let p3;
    	let t9;
    	let t10;
    	let t11;
    	let div5;
    	let icon2;
    	let t12;
    	let div4;
    	let p4;
    	let t14;
    	let p5;
    	let t15;
    	let t16;
    	let t17;
    	let div7;
    	let icon3;
    	let t18;
    	let div6;
    	let p6;
    	let t20;
    	let p7;
    	let t21;
    	let t22;
    	let current;

    	icon0 = new Icon({
    			props: {
    				src: WiHumidity,
    				color: "white",
    				size: "35",
    				class: "customIcon"
    			},
    			$$inline: true
    		});

    	icon1 = new Icon({
    			props: {
    				src: WiBarometer,
    				color: "white",
    				size: "35",
    				class: "customIcon"
    			},
    			$$inline: true
    		});

    	icon2 = new Icon({
    			props: {
    				src: WiStrongWind,
    				color: "white",
    				size: "35",
    				class: "customIcon"
    			},
    			$$inline: true
    		});

    	icon3 = new Icon({
    			props: {
    				src: WiThermometer,
    				color: "white",
    				size: "35",
    				class: "customIcon"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			create_component(icon0.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Humidity";
    			t2 = space();
    			p1 = element("p");
    			t3 = text(/*humidity*/ ctx[0]);
    			t4 = text("%");
    			t5 = space();
    			div3 = element("div");
    			create_component(icon1.$$.fragment);
    			t6 = space();
    			div2 = element("div");
    			p2 = element("p");
    			p2.textContent = "Air Pressure";
    			t8 = space();
    			p3 = element("p");
    			t9 = text(/*pressure*/ ctx[2]);
    			t10 = text("PS");
    			t11 = space();
    			div5 = element("div");
    			create_component(icon2.$$.fragment);
    			t12 = space();
    			div4 = element("div");
    			p4 = element("p");
    			p4.textContent = "Wind Speed";
    			t14 = space();
    			p5 = element("p");
    			t15 = text(/*wind*/ ctx[3]);
    			t16 = text(" km/h");
    			t17 = space();
    			div7 = element("div");
    			create_component(icon3.$$.fragment);
    			t18 = space();
    			div6 = element("div");
    			p6 = element("p");
    			p6.textContent = "Feels Like";
    			t20 = space();
    			p7 = element("p");
    			t21 = text(/*feelsLike*/ ctx[1]);
    			t22 = text("°C");
    			add_location(p0, file$2, 17, 6, 549);
    			attr_dev(p1, "class", "data svelte-10un8tl");
    			add_location(p1, file$2, 18, 6, 571);
    			attr_dev(div0, "class", "info svelte-10un8tl");
    			add_location(div0, file$2, 16, 4, 524);
    			attr_dev(div1, "class", "container svelte-10un8tl");
    			add_location(div1, file$2, 14, 2, 423);
    			add_location(p2, file$2, 24, 6, 752);
    			attr_dev(p3, "class", "data svelte-10un8tl");
    			add_location(p3, file$2, 25, 6, 778);
    			attr_dev(div2, "class", "info svelte-10un8tl");
    			add_location(div2, file$2, 23, 4, 727);
    			attr_dev(div3, "class", "container svelte-10un8tl");
    			add_location(div3, file$2, 21, 2, 625);
    			add_location(p4, file$2, 31, 6, 961);
    			attr_dev(p5, "class", "data svelte-10un8tl");
    			add_location(p5, file$2, 32, 6, 985);
    			attr_dev(div4, "class", "info svelte-10un8tl");
    			add_location(div4, file$2, 30, 4, 936);
    			attr_dev(div5, "class", "container svelte-10un8tl");
    			add_location(div5, file$2, 28, 2, 833);
    			add_location(p6, file$2, 38, 6, 1168);
    			attr_dev(p7, "class", "data svelte-10un8tl");
    			add_location(p7, file$2, 39, 6, 1192);
    			attr_dev(div6, "class", "info svelte-10un8tl");
    			add_location(div6, file$2, 37, 4, 1143);
    			attr_dev(div7, "class", "container svelte-10un8tl");
    			add_location(div7, file$2, 35, 2, 1039);
    			attr_dev(main, "class", "svelte-10un8tl");
    			add_location(main, file$2, 13, 0, 414);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			mount_component(icon0, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t2);
    			append_dev(div0, p1);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			append_dev(main, t5);
    			append_dev(main, div3);
    			mount_component(icon1, div3, null);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, p2);
    			append_dev(div2, t8);
    			append_dev(div2, p3);
    			append_dev(p3, t9);
    			append_dev(p3, t10);
    			append_dev(main, t11);
    			append_dev(main, div5);
    			mount_component(icon2, div5, null);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, p4);
    			append_dev(div4, t14);
    			append_dev(div4, p5);
    			append_dev(p5, t15);
    			append_dev(p5, t16);
    			append_dev(main, t17);
    			append_dev(main, div7);
    			mount_component(icon3, div7, null);
    			append_dev(div7, t18);
    			append_dev(div7, div6);
    			append_dev(div6, p6);
    			append_dev(div6, t20);
    			append_dev(div6, p7);
    			append_dev(p7, t21);
    			append_dev(p7, t22);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*humidity*/ 1) set_data_dev(t3, /*humidity*/ ctx[0]);
    			if (!current || dirty & /*pressure*/ 4) set_data_dev(t9, /*pressure*/ ctx[2]);
    			if (!current || dirty & /*wind*/ 8) set_data_dev(t15, /*wind*/ ctx[3]);
    			if (!current || dirty & /*feelsLike*/ 2) set_data_dev(t21, /*feelsLike*/ ctx[1]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			transition_in(icon2.$$.fragment, local);
    			transition_in(icon3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			transition_out(icon2.$$.fragment, local);
    			transition_out(icon3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(icon0);
    			destroy_component(icon1);
    			destroy_component(icon2);
    			destroy_component(icon3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WeatherData', slots, []);
    	let { humidity } = $$props;
    	let { feelsLike } = $$props;
    	let { pressure } = $$props;
    	let { wind } = $$props;
    	const writable_props = ['humidity', 'feelsLike', 'pressure', 'wind'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WeatherData> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('humidity' in $$props) $$invalidate(0, humidity = $$props.humidity);
    		if ('feelsLike' in $$props) $$invalidate(1, feelsLike = $$props.feelsLike);
    		if ('pressure' in $$props) $$invalidate(2, pressure = $$props.pressure);
    		if ('wind' in $$props) $$invalidate(3, wind = $$props.wind);
    	};

    	$$self.$capture_state = () => ({
    		Icon,
    		WiHumidity,
    		WiBarometer,
    		WiStrongWind,
    		WiThermometer,
    		humidity,
    		feelsLike,
    		pressure,
    		wind
    	});

    	$$self.$inject_state = $$props => {
    		if ('humidity' in $$props) $$invalidate(0, humidity = $$props.humidity);
    		if ('feelsLike' in $$props) $$invalidate(1, feelsLike = $$props.feelsLike);
    		if ('pressure' in $$props) $$invalidate(2, pressure = $$props.pressure);
    		if ('wind' in $$props) $$invalidate(3, wind = $$props.wind);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [humidity, feelsLike, pressure, wind];
    }

    class WeatherData extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			humidity: 0,
    			feelsLike: 1,
    			pressure: 2,
    			wind: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WeatherData",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*humidity*/ ctx[0] === undefined && !('humidity' in props)) {
    			console.warn("<WeatherData> was created without expected prop 'humidity'");
    		}

    		if (/*feelsLike*/ ctx[1] === undefined && !('feelsLike' in props)) {
    			console.warn("<WeatherData> was created without expected prop 'feelsLike'");
    		}

    		if (/*pressure*/ ctx[2] === undefined && !('pressure' in props)) {
    			console.warn("<WeatherData> was created without expected prop 'pressure'");
    		}

    		if (/*wind*/ ctx[3] === undefined && !('wind' in props)) {
    			console.warn("<WeatherData> was created without expected prop 'wind'");
    		}
    	}

    	get humidity() {
    		throw new Error("<WeatherData>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set humidity(value) {
    		throw new Error("<WeatherData>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get feelsLike() {
    		throw new Error("<WeatherData>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set feelsLike(value) {
    		throw new Error("<WeatherData>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pressure() {
    		throw new Error("<WeatherData>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pressure(value) {
    		throw new Error("<WeatherData>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wind() {
    		throw new Error("<WeatherData>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wind(value) {
    		throw new Error("<WeatherData>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Weather.svelte generated by Svelte v3.46.4 */
    const file$1 = "src/components/Weather.svelte";

    // (1:0) <script>   import Icon from "svelte-icons-pack/Icon.svelte";    import WiDaySunny from "svelte-icons-pack/wi/WiDaySunny";   import WiDayCloudy from "svelte-icons-pack/wi/WiDayCloudy";   import WiDayRain from "svelte-icons-pack/wi/WiDayRain";   import WiDayThunderstorm from "svelte-icons-pack/wi/WiDayThunderstorm";   import WiDaySnow from "svelte-icons-pack/wi/WiDaySnow";    import WiCloudy from "svelte-icons-pack/wi/WiCloudy";   import WiRain from "svelte-icons-pack/wi/WiRain";   import WiSnow from "svelte-icons-pack/wi/WiSnow";   import WiCloudyWindy from "svelte-icons-pack/wi/WiCloudyWindy";    import WiNightClear from "svelte-icons-pack/wi/WiNightClear";   import WiNightAltCloudy from "svelte-icons-pack/wi/WiNightAltCloudy";   import WiNightAltRain from "svelte-icons-pack/wi/WiNightAltRain";   import WiNightAltStormShowers from "svelte-icons-pack/wi/WiNightAltStormShowers";   import WiNightAltSnow from "svelte-icons-pack/wi/WiNightAltSnow";    import CurrentTime from "./CurrentTime.svelte";   import Theme from "./Theme.svelte";   import Search from "./Search.svelte";   import WeatherData from "./WeatherData.svelte";    let city = "";   let promise = [];    let icons = {     Sunny: [WiDaySunny, WiDayCloudy, WiDayRain, WiDayThunderstorm, WiDaySnow],     Cloudy: [WiCloudy, WiRain, WiSnow, WiCloudyWindy],     Night: [       WiNightClear,       WiNightAltCloudy,       WiNightAltRain,       WiNightAltStormShowers,       WiNightAltSnow,     ],   }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>   import Icon from \\\"svelte-icons-pack/Icon.svelte\\\";    import WiDaySunny from \\\"svelte-icons-pack/wi/WiDaySunny\\\";   import WiDayCloudy from \\\"svelte-icons-pack/wi/WiDayCloudy\\\";   import WiDayRain from \\\"svelte-icons-pack/wi/WiDayRain\\\";   import WiDayThunderstorm from \\\"svelte-icons-pack/wi/WiDayThunderstorm\\\";   import WiDaySnow from \\\"svelte-icons-pack/wi/WiDaySnow\\\";    import WiCloudy from \\\"svelte-icons-pack/wi/WiCloudy\\\";   import WiRain from \\\"svelte-icons-pack/wi/WiRain\\\";   import WiSnow from \\\"svelte-icons-pack/wi/WiSnow\\\";   import WiCloudyWindy from \\\"svelte-icons-pack/wi/WiCloudyWindy\\\";    import WiNightClear from \\\"svelte-icons-pack/wi/WiNightClear\\\";   import WiNightAltCloudy from \\\"svelte-icons-pack/wi/WiNightAltCloudy\\\";   import WiNightAltRain from \\\"svelte-icons-pack/wi/WiNightAltRain\\\";   import WiNightAltStormShowers from \\\"svelte-icons-pack/wi/WiNightAltStormShowers\\\";   import WiNightAltSnow from \\\"svelte-icons-pack/wi/WiNightAltSnow\\\";    import CurrentTime from \\\"./CurrentTime.svelte\\\";   import Theme from \\\"./Theme.svelte\\\";   import Search from \\\"./Search.svelte\\\";   import WeatherData from \\\"./WeatherData.svelte\\\";    let city = \\\"\\\";   let promise = [];    let icons = {     Sunny: [WiDaySunny, WiDayCloudy, WiDayRain, WiDayThunderstorm, WiDaySnow],     Cloudy: [WiCloudy, WiRain, WiSnow, WiCloudyWindy],     Night: [       WiNightClear,       WiNightAltCloudy,       WiNightAltRain,       WiNightAltStormShowers,       WiNightAltSnow,     ],   }",
    		ctx
    	});

    	return block;
    }

    // (112:4) {:then FULL_DATA}
    function create_then_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*FULL_DATA*/ ctx[6].city && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*FULL_DATA*/ ctx[6].city) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*promise*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(112:4) {:then FULL_DATA}",
    		ctx
    	});

    	return block;
    }

    // (113:6) {#if FULL_DATA.city}
    function create_if_block(ctx) {
    	let div0;
    	let p0;
    	let t0_value = /*FULL_DATA*/ ctx[6].city + "";
    	let t0;
    	let t1;
    	let t2_value = /*FULL_DATA*/ ctx[6].country + "";
    	let t2;
    	let t3;
    	let currenttime;
    	let t4;
    	let icon;
    	let t5;
    	let p1;
    	let t6_value = /*FULL_DATA*/ ctx[6].weather + "";
    	let t6;
    	let t7;
    	let p2;
    	let t8_value = /*FULL_DATA*/ ctx[6].description + "";
    	let t8;
    	let t9;
    	let p3;
    	let t10_value = /*FULL_DATA*/ ctx[6].temp + "";
    	let t10;
    	let t11;
    	let t12;
    	let div1;
    	let weatherdata;
    	let current;
    	currenttime = new CurrentTime({ $$inline: true });

    	icon = new Icon({
    			props: {
    				src: /*FULL_DATA*/ ctx[6].icon,
    				color: "white",
    				size: "150",
    				class: "weather-icon"
    			},
    			$$inline: true
    		});

    	weatherdata = new WeatherData({
    			props: {
    				humidity: /*FULL_DATA*/ ctx[6].humidity,
    				pressure: /*FULL_DATA*/ ctx[6].pressure,
    				wind: /*FULL_DATA*/ ctx[6].wind,
    				feelsLike: /*FULL_DATA*/ ctx[6].feels
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = text(", ");
    			t2 = text(t2_value);
    			t3 = space();
    			create_component(currenttime.$$.fragment);
    			t4 = space();
    			create_component(icon.$$.fragment);
    			t5 = space();
    			p1 = element("p");
    			t6 = text(t6_value);
    			t7 = space();
    			p2 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			p3 = element("p");
    			t10 = text(t10_value);
    			t11 = text("°C");
    			t12 = space();
    			div1 = element("div");
    			create_component(weatherdata.$$.fragment);
    			attr_dev(p0, "class", "location svelte-wv2jnb");
    			add_location(p0, file$1, 114, 10, 3666);
    			attr_dev(p1, "class", "weather svelte-wv2jnb");
    			add_location(p1, file$1, 122, 10, 3908);
    			attr_dev(p2, "class", "weather-description");
    			add_location(p2, file$1, 123, 10, 3961);
    			attr_dev(p3, "class", "temperature svelte-wv2jnb");
    			add_location(p3, file$1, 124, 10, 4030);
    			attr_dev(div0, "class", "left");
    			add_location(div0, file$1, 113, 8, 3637);
    			attr_dev(div1, "class", "right svelte-wv2jnb");
    			add_location(div1, file$1, 126, 8, 4099);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			append_dev(div0, t3);
    			mount_component(currenttime, div0, null);
    			append_dev(div0, t4);
    			mount_component(icon, div0, null);
    			append_dev(div0, t5);
    			append_dev(div0, p1);
    			append_dev(p1, t6);
    			append_dev(div0, t7);
    			append_dev(div0, p2);
    			append_dev(p2, t8);
    			append_dev(div0, t9);
    			append_dev(div0, p3);
    			append_dev(p3, t10);
    			append_dev(p3, t11);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(weatherdata, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*promise*/ 2) && t0_value !== (t0_value = /*FULL_DATA*/ ctx[6].city + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*promise*/ 2) && t2_value !== (t2_value = /*FULL_DATA*/ ctx[6].country + "")) set_data_dev(t2, t2_value);
    			const icon_changes = {};
    			if (dirty & /*promise*/ 2) icon_changes.src = /*FULL_DATA*/ ctx[6].icon;
    			icon.$set(icon_changes);
    			if ((!current || dirty & /*promise*/ 2) && t6_value !== (t6_value = /*FULL_DATA*/ ctx[6].weather + "")) set_data_dev(t6, t6_value);
    			if ((!current || dirty & /*promise*/ 2) && t8_value !== (t8_value = /*FULL_DATA*/ ctx[6].description + "")) set_data_dev(t8, t8_value);
    			if ((!current || dirty & /*promise*/ 2) && t10_value !== (t10_value = /*FULL_DATA*/ ctx[6].temp + "")) set_data_dev(t10, t10_value);
    			const weatherdata_changes = {};
    			if (dirty & /*promise*/ 2) weatherdata_changes.humidity = /*FULL_DATA*/ ctx[6].humidity;
    			if (dirty & /*promise*/ 2) weatherdata_changes.pressure = /*FULL_DATA*/ ctx[6].pressure;
    			if (dirty & /*promise*/ 2) weatherdata_changes.wind = /*FULL_DATA*/ ctx[6].wind;
    			if (dirty & /*promise*/ 2) weatherdata_changes.feelsLike = /*FULL_DATA*/ ctx[6].feels;
    			weatherdata.$set(weatherdata_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(currenttime.$$.fragment, local);
    			transition_in(icon.$$.fragment, local);
    			transition_in(weatherdata.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(currenttime.$$.fragment, local);
    			transition_out(icon.$$.fragment, local);
    			transition_out(weatherdata.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(currenttime);
    			destroy_component(icon);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div1);
    			destroy_component(weatherdata);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(113:6) {#if FULL_DATA.city}",
    		ctx
    	});

    	return block;
    }

    // (110:20)        Waiting...     {:then FULL_DATA}
    function create_pending_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Waiting...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(110:20)        Waiting...     {:then FULL_DATA}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main_1;
    	let header;
    	let theme;
    	let t0;
    	let search;
    	let updating_city;
    	let t1;
    	let div;
    	let promise_1;
    	let current;
    	theme = new Theme({ $$inline: true });

    	function search_city_binding(value) {
    		/*search_city_binding*/ ctx[3](value);
    	}

    	let search_props = {};

    	if (/*city*/ ctx[0] !== void 0) {
    		search_props.city = /*city*/ ctx[0];
    	}

    	search = new Search({ props: search_props, $$inline: true });
    	binding_callbacks.push(() => bind(search, 'city', search_city_binding));
    	search.$on("click", /*main*/ ctx[2]);

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 6,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			main_1 = element("main");
    			header = element("header");
    			create_component(theme.$$.fragment);
    			t0 = space();
    			create_component(search.$$.fragment);
    			t1 = space();
    			div = element("div");
    			info.block.c();
    			attr_dev(header, "class", "header-container svelte-wv2jnb");
    			add_location(header, file$1, 104, 2, 3417);
    			attr_dev(div, "class", "content svelte-wv2jnb");
    			add_location(div, file$1, 108, 2, 3520);
    			add_location(main_1, file$1, 103, 0, 3408);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main_1, anchor);
    			append_dev(main_1, header);
    			mount_component(theme, header, null);
    			append_dev(header, t0);
    			mount_component(search, header, null);
    			append_dev(main_1, t1);
    			append_dev(main_1, div);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			const search_changes = {};

    			if (!updating_city && dirty & /*city*/ 1) {
    				updating_city = true;
    				search_changes.city = /*city*/ ctx[0];
    				add_flush_callback(() => updating_city = false);
    			}

    			search.$set(search_changes);
    			info.ctx = ctx;

    			if (dirty & /*promise*/ 2 && promise_1 !== (promise_1 = /*promise*/ ctx[1]) && handle_promise(promise_1, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(theme.$$.fragment, local);
    			transition_in(search.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(theme.$$.fragment, local);
    			transition_out(search.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main_1);
    			destroy_component(theme);
    			destroy_component(search);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const KEY = "d4917a86ad00c8f97c306ecfa4544840";

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Weather', slots, []);
    	let city = "";
    	let promise = [];

    	let icons = {
    		Sunny: [WiDaySunny, WiDayCloudy, WiDayRain, WiDayThunderstorm, WiDaySnow],
    		Cloudy: [WiCloudy, WiRain, WiSnow, WiCloudyWindy],
    		Night: [
    			WiNightClear,
    			WiNightAltCloudy,
    			WiNightAltRain,
    			WiNightAltStormShowers,
    			WiNightAltSnow
    		]
    	};

    	function getIcon(weather) {
    		if (weather == "Clear") {
    			return icons.Sunny[0];
    		} else if (weather == "Clouds") {
    			return icons.Cloudy[0];
    		} else if (weather == "Atmosphere") {
    			return icons.Cloudy[3];
    		} else if (weather == "Snow") {
    			return icons.Sunny[4];
    		} else if (weather == "Rain") {
    			return icons.Cloudy[1];
    		} else if (weather == "Drizzle" || weather == "Fog") {
    			return icons.Sunny[2];
    		} else if (weather == "Thunderstorm") {
    			return icons.Night[3];
    		}
    	}

    	function main() {
    		if (city.length != 0) {
    			async function getLocation() {
    				const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${KEY}`);
    				const data = await response.json();
    				const location = data;

    				//console.log(location[0]);
    				return location[0];
    			}

    			async function getWeather() {
    				let location = await getLocation();
    				let lon = await location.lon;
    				let lat = await location.lat;
    				const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}`);
    				const data = await response.json();
    				const fullData = data;

    				const FULL_DATA = {
    					city: fullData.name,
    					country: location.country,
    					weather: fullData.weather[0].main,
    					description: fullData.weather[0].description,
    					wind: fullData.wind.speed,
    					temp: parseInt(fullData.main.temp - 273),
    					feels: parseInt(fullData.main.feels_like - 273),
    					icon: getIcon(fullData.weather[0].main),
    					humidity: fullData.main.humidity,
    					pressure: fullData.main.pressure
    				};

    				$$invalidate(0, city = "");
    				return FULL_DATA;
    			}

    			return $$invalidate(1, promise = getWeather());
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Weather> was created with unknown prop '${key}'`);
    	});

    	function search_city_binding(value) {
    		city = value;
    		$$invalidate(0, city);
    	}

    	$$self.$capture_state = () => ({
    		Icon,
    		WiDaySunny,
    		WiDayCloudy,
    		WiDayRain,
    		WiDayThunderstorm,
    		WiDaySnow,
    		WiCloudy,
    		WiRain,
    		WiSnow,
    		WiCloudyWindy,
    		WiNightClear,
    		WiNightAltCloudy,
    		WiNightAltRain,
    		WiNightAltStormShowers,
    		WiNightAltSnow,
    		CurrentTime,
    		Theme,
    		Search,
    		WeatherData,
    		city,
    		promise,
    		icons,
    		getIcon,
    		KEY,
    		main
    	});

    	$$self.$inject_state = $$props => {
    		if ('city' in $$props) $$invalidate(0, city = $$props.city);
    		if ('promise' in $$props) $$invalidate(1, promise = $$props.promise);
    		if ('icons' in $$props) icons = $$props.icons;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [city, promise, main, search_city_binding];
    }

    class Weather extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Weather",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.4 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let weather;
    	let current;
    	weather = new Weather({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(weather.$$.fragment);
    			add_location(main, file, 4, 0, 73);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(weather, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(weather.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(weather.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(weather);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Weather });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
