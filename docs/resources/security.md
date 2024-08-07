# Security

This section mostly contains a list of possible security problems. Note that the below flaws exist with many libraries and frameworks we use in our day-to-day when building and working with APIs. Even your vanilla Nuxt app already posesses some of these shortcoming. Missing in the below list are estimates of how likely it is that one of the list-items may occur and what impact it will have on your app. This is because that heavily depends on:

- your app: Are you building a fun project? A proof of concept? The next fort-nox money management app?
- your environment: Building a freely available app for fun? Have authentication in front of your app and trust all users that successfully authenticated? Superb! Don't trust anyone? Then please be extra-careful when using this library and when building you backend in general

Without further ado, here's some attack cases you can consider and take action against. Neither the attack vectors, the problems or the mitigations are exhaustive:

1. sending arbitrary data: Denial-of-Service by server-resource exhaustion (bandwidth, cpu, memory), arbitrary code execution (if you parse the data), ...
2. creation arbitrarily many sessions: Denial-of-Service by server-resource exhaustion (bandwidth, cpu, memory)
3. guessing correct session ids: session data can leak
4. stealing session id(s) of client(s): session data can leak

Read up how to mitigate these and more issues if you see fit. Checkout the [nuxt-security module](https://nuxt-security.vercel.app/) that may help with some of these.

## Disclosure

A last reminder: This library was not written by crypto- or security-experts. Please proceed at your own risk, inspect the code if you want to and open issues / pull requests where you see room for improvement. If you want to file a security-concern privately, please send an email to [sidebase@sidestream.tech](mailto:sidebase@sidestream.tech?subject=SECURITY-NuxtAuth) with the subject saying "SECURITY nuxt-auth" and we'll look into your request ASAP.
