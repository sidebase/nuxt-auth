import { _fetch } from "../../utils/fetch";
import { jsonPointerGet } from "../../helpers";
import { defineNuxtPlugin, useAuthState } from "#imports";
export default defineNuxtPlugin({
  name: "refresh-token-plugin",
  enforce: "pre",
  async setup(nuxtApp) {
    const { rawToken, rawRefreshToken, refreshToken, lastRefreshedAt } =
      useAuthState();
    if (refreshToken.value) {
      const config = nuxtApp.$config.public.auth;

      const { path, method } = config.provider.endpoints.refresh;

      const response = await _fetch<Record<string, any>>(nuxtApp, path, {
        method,
        body: {
          refreshToken: refreshToken.value,
        },
      });

      const extractedToken = jsonPointerGet(
        response,
        config.provider.token.signInResponseTokenPointer
      );
      if (typeof extractedToken !== "string") {
        console.error(
          `Auth: string token expected, received instead: ${JSON.stringify(
            extractedToken
          )}. Tried to find token at ${
            config.token.signInResponseTokenPointer
          } in ${JSON.stringify(response)}`
        );
        return;
      }

      const extractedRefreshToken = jsonPointerGet(
        response,
        config.provider.refreshToken.signInResponseRefreshTokenPointer
      );
      if (typeof extractedRefreshToken !== "string") {
        console.error(
          `Auth: string token expected, received instead: ${JSON.stringify(
            extractedRefreshToken
          )}. Tried to find token at ${
            config.refreshToken.signInResponseRefreshTokenPointer
          } in ${JSON.stringify(response)}`
        );
        return;
      }

      rawToken.value = extractedToken;
      rawRefreshToken.value = extractedRefreshToken;

      lastRefreshedAt.value = new Date();
    }
  },
});
