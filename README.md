# jotai-tap

A [Jotai](https://github.com/pmndrs/jotai) extension to use React hooks to power atoms. Hook runtime powered by [tap](https://github.com/assistant-ui/assistant-ui/tree/main/packages/tap).

## Install

```bash
npm install jotai jotai-tap
```

## Hooks as atoms

`atomWithHook(hook)` runs a React hook and exposes its return value as a read-only atom.

```tsx
import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atomWithHook } from "jotai-tap";

const useClock = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
};

const clockAtom = atomWithHook(useClock);

const Clock = () => {
  const now = useAtomValue(clockAtom);
  return <time>{new Date(now).toLocaleTimeString()}</time>;
};
```

The hook follows the atom's lifecycle: it renders lazily on first read, mounts with the first subscriber, and unmounts with the last one.

## Hook atoms in atoms

Hook atoms compose with the atoms-in-atom pattern: put them in a regular atom to render lists of stateful items.

```tsx
const useCount = (initialValue: number) => {
  const [count, setCount] = useState(initialValue);
  const bump = () => setCount((c) => c + 1);
  return { count, bump };
};

const atomWithCount = (initialValue: number) =>
  atomWithHook(useCount, initialValue);

const countsAtom = atom([atomWithCount(1), atomWithCount(2), atomWithCount(3)]);

type CountAtom = ReturnType<typeof atomWithCount>;

const Counter = ({ countAtom }: { countAtom: CountAtom }) => {
  const { count, bump } = useAtomValue(countAtom);
  return (
    <div>
      {count} <button onClick={bump}>+1</button>
    </div>
  );
};

const Parent = () => {
  const [counts, setCounts] = useAtom(countsAtom);
  const addNewCount = () => {
    const newAtom = atomWithCount(0);
    setCounts((prev) => [...prev, newAtom]);
  };
  return (
    <div>
      {counts.map((countAtom) => (
        <Counter countAtom={countAtom} key={`${countAtom}`} />
      ))}
      <button onClick={addNewCount}>Add</button>
    </div>
  );
};
```

## Atoms in hook atoms

`useAtom` inside the hook reads other atoms.

```tsx
const useDoubledPrice = () => {
  const [price] = useAtom(priceAtom);
  return price * 2;
};

const doubledAtom = atomWithHook(useDoubledPrice);
```

## Performance

Use React Compiler to optimize your hooks.

## Controlled Props

Hook updates are async, but controlled inputs need the new value in the same tick. Wrap updates in `flushTapSync`.

```tsx
import { flushTapSync } from "@assistant-ui/tap";

const useText = () => {
  const [text, setText] = useState("");
  return { text, setText };
};

const textAtom = atomWithHook(useText);

const Input = () => {
  const { text, setText } = useAtomValue(textAtom);
  return (
    <input
      value={text}
      onChange={(e) => flushTapSync(() => setText(e.target.value))}
    />
  );
};
```

## API

```ts
const atomWithHook: <Value, Args extends unknown[]>(
  hook: (...args: Args) => Value,
  ...args: Args
) => Atom<Value>;
```

Declare the hook at the top level with a `use` prefix, so React's lint rules check it and React Compiler optimizes it.
