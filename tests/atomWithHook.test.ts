import { expect, test } from "vitest";
import { useEffect, useState } from "react";
import { atom, createStore, getDefaultStore } from "jotai/vanilla";
import { useAtomValue } from "jotai/react";
import { atomWithHook } from "../src/atomWithHook";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

test("lifecycle", () => {
  const log: string[] = [];
  const useLogger = () => {
    useEffect(() => {
      log.push("mount");
      return () => {
        log.push("unmount");
      };
    }, []);
    return null;
  };

  const loggerAtom = atomWithHook(useLogger);
  const store = createStore();

  store.get(loggerAtom);
  expect(log).toEqual([]);

  store.sub(loggerAtom, () => {});
  expect(log).toEqual(["mount"]);
});

test("counter list", async () => {
  const useCount = (initialValue: number) => {
    const [count, setCount] = useState(initialValue);
    const bump = () => setCount((c) => c + 1);
    return { count, bump };
  };

  const countAtom = (initialValue: number) =>
    atomWithHook(useCount, initialValue);

  const countsAtom = atom([countAtom(1), countAtom(2), countAtom(3)]);
  const store = createStore();

  store.get(countsAtom).forEach((a) => store.sub(a, () => {}));

  const [first, second, third] = store.get(countsAtom);
  expect(store.get(first!).count).toBe(1);
  expect(store.get(second!).count).toBe(2);
  expect(store.get(third!).count).toBe(3);

  store.get(second!).bump();
  await flush();

  expect(store.get(first!).count).toBe(1);
  expect(store.get(second!).count).toBe(3);
  expect(store.get(third!).count).toBe(3);
});

test("shared state across stores", async () => {
  const useCount = () => {
    const [count, setCount] = useState(0);
    return { count, bump: () => setCount((c) => c + 1) };
  };

  const countAtom = atomWithHook(useCount);
  const storeA = createStore();
  const storeB = createStore();

  const unsubA = storeA.sub(countAtom, () => {});
  storeB.sub(countAtom, () => {});

  storeA.get(countAtom).bump();
  await flush();

  expect(storeA.get(countAtom).count).toBe(1);
  expect(storeB.get(countAtom).count).toBe(1);

  unsubA();
  expect(storeA.get(countAtom).count).toBe(1);
});

test("atoms in hooks", async () => {
  const store = getDefaultStore();
  const countAtom = atom(1);

  const useDoubled = () => {
    const count = useAtomValue(countAtom);
    return count * 2;
  };

  const doubledAtom = atomWithHook(useDoubled);

  const unsub = store.sub(doubledAtom, () => {});
  expect(store.get(doubledAtom)).toBe(2);

  store.set(countAtom, 5);
  await flush();
  expect(store.get(doubledAtom)).toBe(10);
  unsub();
});

test("effects follow the subscriber lifecycle", async () => {
  const log: string[] = [];
  const useTicker = () => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      log.push("mount");
      return () => {
        log.push("unmount");
      };
    }, []);
    return { count, bump: () => setCount((c) => c + 1) };
  };

  const tickerAtom = atomWithHook(useTicker);
  const store = createStore();

  const unsub = store.sub(tickerAtom, () => {});
  store.get(tickerAtom).bump();
  await flush();
  unsub();
  await flush();
  expect(log[log.length - 1]).toBe("unmount");

  store.sub(tickerAtom, () => {});
  expect(log[log.length - 1]).toBe("mount");
  expect(store.get(tickerAtom).count).toBe(1);
});
