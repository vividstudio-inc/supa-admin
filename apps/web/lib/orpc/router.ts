import {
  appHandlers,
  connectionsHandlers,
  connectionsRlsHandlers,
  dashboardHandlers,
  healthHandlers,
  provisionHandlers,
  rolesHandlers,
  setupHandlers,
  usersHandlers,
} from "./handlers";

export const router = {
  setup: setupHandlers,
  connections: connectionsHandlers,
  connectionsRls: connectionsRlsHandlers,
  roles: rolesHandlers,
  users: usersHandlers,
  provision: provisionHandlers,
  app: appHandlers,
  dashboard: dashboardHandlers,
  health: healthHandlers,
};
