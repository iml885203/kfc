# Bug Report: Default Namespace Reset to 'default'

## Symptom

The default namespace setting in `~/.kfctl/config.json` is ignored, and the application always starts in the `default` namespace unless the `-n` flag is explicitly provided.

## Root Cause Analysis

The issue lies in the interaction between `src/cli.tsx` and the `useK8sContext` hook.

1.  **CLI Flag Defaults**: In [cli.tsx](file:///Users/logan/dev/logan/kfc/src/cli.tsx#L44-L48), the `meow` configuration specifies a default value for the `namespace` flag:

    ```typescript
    namespace: {
      type: 'string',
      shortFlag: 'n',
      default: process.env.KFCTL_NAMESPACE || 'default',
    },
    ```

    This means `cli.flags.namespace` is **never undefined**. It defaults to `'default'` if nothing is provided.

2.  **App Injection**: The [App](file:///Users/logan/dev/logan/kfc/src/components/App.tsx) component receives this value:

    ```typescript
    <App
      ...
      namespace={cli.flags.namespace}
    />
    ```

3.  **Hook Logic**: The [useK8sContext](file:///Users/logan/dev/logan/kfc/src/hooks/useK8sContext.ts) hook initializes state using the `initialNamespace` prop:
    ```typescript
    const [selectedNamespace, setSelectedNamespace] = useState<string>(() => {
      return initialNamespace || getDefaultNamespace() || "default";
    });
    ```
    Because `initialNamespace` is `'default'`, the `initialNamespace || ...` short-circuit prevents `getDefaultNamespace()` from ever being checked.

## Proposed Fix

Remove the `default` property from the `namespace` flag in `cli.tsx`. This will allow `meow` to return `undefined` when the flag is not provided, letting `useK8sContext` fall back to the saved configuration correctly.

The same applies to the `context` flag if we want it to persist as well.
