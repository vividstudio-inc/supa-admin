import {
  connectionsHandlers,
  connectionsRlsHandlers,
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
};
