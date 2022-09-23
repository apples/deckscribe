import { DependencyList, MutableRefObject, useCallback, useRef } from 'react';

/**
 * Debounces a function, and provides referentially-stable `cancel` and `flush` functions. Functions similarly to useCallback().
 *
 * Example:
 * ```ts
 * const [debouncedFunc, { cancel, flush }] = useDebounce(300, (name: string) => console.log(`hi, ${name}!`), [], { maxWait: 500 });
 * ```
 *
 * Calling the debounced function will store the arguments to later invoke the action with. The action is invoked depending on which
 * options have been set, and how much time has passed. Clusters of invocations each within `delay` milliseconds from each other are
 * referred to as "groupings". When there is no current grouping, calling the debounced function will start a new grouping, and also
 * trigger the grouping's leading edge, as well as start the interval loop for the `maxWait` option. After `delay` milliseconds have
 * passed without any calls to the debounced function, the grouping's trailing edge is triggered, and it is destroyed.
 *
 * If the `leading` option is set to `true`: The invocation that triggers a grouping's leading edge will be immediately executed and
 * will never be pending.
 *
 * If the `trailing` option is set to `true` (it is by default): If there is an action pending when the grouping's trailing edge has
 * been triggered, that action is executed immediately after the grouping is destroyed. Note: if `leading` is `true` and the current
 * grouping only ever has one invocation, then that invocation will only be executed on the leading edge.
 *
 * If the `maxWait` option is set: The action will be invoked after every `maxDelay` milliseconds, starting from the leading edge of
 * the current grouping. Each time `maxDelay` milliseconds have passed, the current pending action invocation (if it exists) will be
 * executed, and no longer be pending. The minimum `maxWait` time is 4 milliseconds. Invocations are guaranteed to happen *at least*
 * `maxWait` milliseconds apart, but may sometimes have a longer interval between them.
 *
 * NOTE: Changing the values of the `options` parameter between renders results in undefined behavior.
 *
 * Example timeline (`!` represent debounced invocations, with a "delay" of 4 characters, and "maxWait" of 15 characters):
 *
 * ```
 * |----!-!!-!--!-!-------------!---------!!-!-!--!!-!-!-!!!--!-!-!!-!!--!-!-!-----|
 *      ↑             ↑         ↑         ↑              ↑              ↑        ↑
 *      leading       trailing  leading   leading        maxWait        maxWait  trailing
 * ```
 *
 * Heavily inspired by Lodash's `_.debounce()` function and should behave the same way.
 *
 * @param delay Delay in milliseconds.
 * @param action The action to perform.
 * @param deps A list of dependencies for this hook.
 * @param options The options. Optional.
 * @returns `[func, { cancel, flush }]`
 *     - `func` - The debounced function.
 *     - `cancel` - Cancels the pending invocation and ends the grouping without triggering the trailing edge.
 *     - `flush` - Immediately triggers the trailing edge and ends the grouping.
 */
export const useDebounce = <A extends any[]>(
    delay: number,
    action: (...args: A) => void,
    deps: DependencyList,
    options: {
        /** Whether to invoke the action on the leading edge of debounced invocations. */
        leading?: boolean,
        /** Whether to invoke the action on the trailing edge of debounced invocations. */
        trailing?: boolean,
        /** Maximum time that the action is allowed to be delayed. If undefined, the action can be delayed forever. */
        maxWait?: number,
    } = {
        trailing: true,
    },
): [(...args: A) => void, { cancel: () => void, flush: () => void }] => {
    const grouping = useRef<Grouping>();

    const func = useCallback((...args: A) => {
        const invoke = () => {
            action(...args);
        };

        // initialize if at the start of a grouping
        if (!grouping.current) {
            grouping.current = new Grouping(grouping, { delay, trailing: !!options.trailing });

            if (options.leading) {
                invoke();
                grouping.current.bumpTrailingEdge();
            } else {
                grouping.current.push(invoke);
            }

            if (options.maxWait != null) {
                grouping.current.forceInterval(options.maxWait);
            }
        } else {
            // if there is already a grouping, just push the pending invocation
            grouping.current.push(invoke);
        }
    }, deps);

    const cancel = useCallback(() => {
        if (grouping.current) {
            grouping.current.teardown();
        }
    }, []);

    const flush = useCallback(() => {
        if (grouping.current?.pendingInvocation) {
            const invoke = grouping.current.pendingInvocation;
            grouping.current.pendingInvocation = null;

            // must teardown before invocation in case the pending action calls the debounced function
            grouping.current.teardown();

            if (options.trailing) {
                invoke();
            }
        } else {
            // if there is no pending invocation, just clear the grouping
            grouping.current?.teardown();
        }
    }, []);

    return [func, { cancel, flush }];
};

/** A grouping is a group of invocations which form a sequence where each adjacent invocation is no further apart than the delay. */
class Grouping {
    trailingTimeout = null as number | null;
    forceIntervalTimeout = null as number | null;
    pendingInvocation = null as (() => void) | null;
    selfRef: MutableRefObject<Grouping | undefined>;
    delay: number;
    trailing: boolean;

    constructor(selfRef: MutableRefObject<Grouping | undefined>, options: { delay: number, trailing: boolean }) {
        this.selfRef = selfRef;
        this.delay = options.delay;
        this.trailing = options.trailing;
    }

    /** Invokes the pending invocation if it exists. */
    invokePending() {
        if (this.pendingInvocation) {
            const invoke = this.pendingInvocation;
            this.pendingInvocation = null;
            invoke();
        }
    }

    /** Sets the pending invocation and bumps the trailing edge timer. */
    push(invoke: () => void) {
        this.pendingInvocation = invoke;
        this.bumpTrailingEdge();
    }

    /** Resets the trailing edge timer. */
    bumpTrailingEdge() {
        if (this.trailingTimeout != null) {
            window.clearTimeout(this.trailingTimeout);
        }

        this.trailingTimeout = window.setTimeout(() => {
            // store the pending invocation because teardown() will clear it
            const pendingInvocation = this.pendingInvocation;

            // teardown must occur before invocation, in case the pending invocation itself invokes the debounced function
            this.teardown();

            if (this.trailing) {
                pendingInvocation?.();
            }
        }, this.delay);
    }

    /** Starts the forced interval (maxWait) loop. */
    forceInterval(interval: number) {
        // This is a nested setTimeout loop instead of a setInterval loop, because setInterval can potentially
        // run the task twice back-to-back, and sometimes run the task less than maxWait time after the last task ran.
        // Using nested setTimeouts ensures that each task is executed *at least* maxWait time after each other.

        const forceIntervalProc = () => {
            this.invokePending();
            this.forceIntervalTimeout = window.setTimeout(forceIntervalProc, interval);
        };

        this.forceIntervalTimeout = window.setTimeout(forceIntervalProc, interval);
    }

    /** Destroys the Grouping and removes it from the ref. */
    teardown() {
        if (this.trailingTimeout != null) {
            window.clearTimeout(this.trailingTimeout);
            this.trailingTimeout = null;
        }

        if (this.forceIntervalTimeout != null) {
            window.clearTimeout(this.forceIntervalTimeout);
            this.forceIntervalTimeout = null;
        }

        this.pendingInvocation = null;

        if (this.selfRef.current === this) {
            this.selfRef.current = undefined;
        }
    }
}
