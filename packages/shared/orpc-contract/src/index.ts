import { oc } from "@orpc/contract";
import { z } from "zod/v3";

const columnMeta = z.object({
  name: z.string(),
  data_type: z.string(),
  is_nullable: z.boolean(),
  column_default: z.string().nullable(),
  is_primary_key: z.boolean(),
  is_identity: z.boolean(),
});

const connectionSummary = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string(),
  schema_cached_at: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const profile = z.object({
  id: z.string().uuid(),
  email: z.string(),
  display_name: z.string().nullable(),
  role: z.enum(["platform_admin", "member"]),
  created_at: z.string(),
});

const role = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const tablePermission = z.object({
  table_name: z.string(),
  can_read: z.boolean(),
  can_create: z.boolean(),
  can_update: z.boolean(),
  can_delete: z.boolean(),
});

export const setupContract = oc.router({
  createAdmin: oc
    .route({ method: "POST", path: "/setup/create-admin" })
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(1),
        setupSecret: z.string().min(32),
      }),
    )
    .output(z.object({ success: z.literal(true) })),
  isComplete: oc
    .route({ method: "GET", path: "/setup/is-complete" })
    .output(z.object({ complete: z.boolean() })),
});

export const connectionsContract = oc.router({
  list: oc
    .route({ method: "GET", path: "/connections" })
    .output(z.object({ connections: z.array(connectionSummary) })),
  create: oc
    .route({ method: "POST", path: "/connections" })
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        anonKey: z.string().min(1),
        serviceRoleKey: z.string().min(1),
      }),
    )
    .output(
      z.object({
        connection: connectionSummary,
        tableCount: z.number(),
      }),
    ),
  get: oc
    .route({ method: "GET", path: "/connections/{id}" })
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        connection: connectionSummary,
        tables: z.array(
          z.object({
            id: z.string().uuid(),
            connection_id: z.string().uuid(),
            table_name: z.string(),
            columns: z.array(columnMeta),
          }),
        ),
      }),
    ),
  delete: oc
    .route({ method: "DELETE", path: "/connections/{id}" })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.literal(true) })),
  schemaSync: oc
    .route({ method: "POST", path: "/connections/{id}/schema-sync" })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.literal(true), tableCount: z.number() })),
});

export const connectionsRlsContract = oc.router({
  preview: oc
    .route({ method: "POST", path: "/connections/{id}/rls/preview" })
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        sql: z.string(),
        sqlHash: z.string(),
        permissionCount: z.number(),
      }),
    ),
  apply: oc
    .route({ method: "POST", path: "/connections/{id}/rls/apply" })
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        success: z.literal(true),
        sql: z.string(),
      }),
    ),
});

export const rolesContract = oc.router({
  list: oc
    .route({ method: "GET", path: "/roles" })
    .output(z.object({ roles: z.array(role) })),
  create: oc
    .route({ method: "POST", path: "/roles" })
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .output(z.object({ role })),
  updatePermissions: oc
    .route({ method: "PUT", path: "/roles/permissions" })
    .input(
      z.object({
        roleId: z.string().uuid(),
        connectionId: z.string().uuid(),
        permissions: z.array(tablePermission),
      }),
    )
    .output(z.object({ success: z.literal(true) })),
});

export const usersContract = oc.router({
  list: oc
    .route({ method: "GET", path: "/users" })
    .output(z.object({ users: z.array(profile) })),
  create: oc
    .route({ method: "POST", path: "/users" })
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(1),
        role: z.enum(["platform_admin", "member"]).optional(),
      }),
    )
    .output(
      z.object({
        user: z.object({ id: z.string().uuid(), email: z.string() }),
      }),
    ),
  get: oc
    .route({ method: "GET", path: "/users/{id}" })
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        userRoles: z.array(z.unknown()),
        memberships: z.array(z.unknown()),
      }),
    ),
  update: oc
    .route({ method: "PUT", path: "/users/{id}" })
    .input(
      z.object({
        id: z.string().uuid(),
        roleIds: z.array(z.string().uuid()).optional(),
        connectionIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .output(z.object({ success: z.literal(true) })),
});

export const provisionContract = oc.router({
  createUser: oc
    .route({
      method: "POST",
      path: "/connections/{connectionId}/provision-user",
    })
    .input(
      z.object({
        connectionId: z.string().uuid(),
        userId: z.string().uuid(),
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    .output(
      z.object({
        success: z.literal(true),
        targetUserId: z.string().uuid(),
      }),
    ),
});

export const contract = oc.router({
  setup: setupContract,
  connections: connectionsContract,
  connectionsRls: connectionsRlsContract,
  roles: rolesContract,
  users: usersContract,
  provision: provisionContract,
});

export type Contract = typeof contract;
