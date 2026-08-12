import { createTapRoot } from "@assistant-ui/tap";
import type { Atom } from "jotai/vanilla";
import { atomWithLazy } from "jotai/vanilla/utils";

export const atomWithHook = <Value, Args extends unknown[]>(
  hook: (...args: Args) => Value,
  ...args: Args
): Atom<Value> => {
  const root = createTapRoot(() => hook(...args), { mountOnSubscribe: true });

  const valueAtom = atomWithLazy(root.getValue);

  valueAtom.onMount = (update) => {
    const unsubscribe = root.subscribe(() => update(root.getValue()));
    update(root.getValue());
    return unsubscribe;
  };

  return valueAtom;
};
