import { computed, watch, ComputedRef } from "vue";
import { CookieRef } from "#app";
import { useTypedBackendConfig } from "../../helpers";
import { useAuthState as useLocalAuthState } from "../local/useAuthState";
import { useRuntimeConfig, useCookie, useState } from "#imports";

type UseAuthStateReturn = ReturnType<typeof useLocalAuthState> & {
  rawRefreshToken: CookieRef<string | null>;
  refreshToken: ComputedRef<string | null>;
  rawToken: CookieRef<string | null>;
  token: ComputedRef<string | null>;
};

export const useAuthState = (): UseAuthStateReturn => {
  const config = useTypedBackendConfig(useRuntimeConfig(), "refresh");
  const localAuthState = useLocalAuthState();
  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawRefreshTokenCookie = useCookie<string | null>(
    "auth:refresh-token",
    {
      default: () => null,
      maxAge: config.refreshToken.maxAgeInSeconds,
      sameSite: "lax",
    }
  );

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawTokenCookie = useCookie<string | null>("auth:token", {
    default: () => null,
    maxAge: config.token.maxAgeInSeconds,
    sameSite: "lax",
  });

  const rawRefreshToken = useState(
    "auth:raw-refresh-token",
    () => _rawRefreshTokenCookie.value
  );

  const rawToken = useState("auth:raw-token", () => _rawTokenCookie.value);

  watch(rawRefreshToken, () => {
    _rawRefreshTokenCookie.value = rawRefreshToken.value;
  });

  watch(rawToken, () => {
    _rawTokenCookie.value = rawToken.value;
  });

  const refreshToken = computed(() => {
    if (rawRefreshToken.value === null) {
      return null;
    }
    return rawRefreshToken.value;
  });

  const token = computed(() => {
    if (rawToken.value === null) {
      return null;
    }
    return rawToken.value;
  });

  const schemeSpecificState = {
    refreshToken,
    rawRefreshToken,
    rawToken,
    token,
  };

  return {
    ...localAuthState,
    ...schemeSpecificState,
  };
};
export default useAuthState;
