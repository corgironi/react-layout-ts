export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  // 其他 Keycloak 配置
  minTimeBetweenJwksRequests: 10,
  checkLoginIframe: true,
  onLoad: 'login-required',
  timeSkew: 0
}; 