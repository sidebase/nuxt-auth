# Session data

To configure the types returned by your backend API, you can define an additional object inside the `nuxt.config.ts` that outlines the types of your session data object.

```ts
export default defineNuxtConfig({
    auth: {
        provider: {
            type: 'local',
            sessionDataType: {
                id: 'string | number',
                firstName: 'string',
                lastName: 'string'
            }
        }
    }
})
```

In the example above, NuxtAuth will properly infer the types from the configuration and return:

```ts
type SessionData = { 
    id: string | number,
    firstName: string
    lastName: string
}
```

## Complex types

In addition to using simple type such as `string`, `number` or `boolean` you can also configure more complex types such as sub-objects or arrays. 
 
```ts
export default defineNuxtConfig({
    auth: {
        provider: {
            type: 'local',
            sessionDataType: {
                id: 'string | number',
                firstName: 'string',
                lastName: 'string',
                subscriptions: "{ id: number, active: boolean}[]"
            }
        }
    }
})
```

Example above will generate the following type for your session:
```ts
type SessionConfig = {
    id: string | number,
    firstName: string
    lastName: string
    subscriptions: { id: number, status: boolean }[]
}
```


This allows you to properly match the types to the return values of `getSession`.
