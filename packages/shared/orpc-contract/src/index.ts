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

const bootstrapStatus = z.enum(["pending", "ready"]);

const connectionSummary = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string(),
  schema_cached_at: z.string().nullable(),
  bootstrap_status: bootstrapStatus,
  bootstrap_verified_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const rlsSyncResult = z.object({
  success: z.boolean(),
  error: z.string().optional(),
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
        setupSql: z.string().optional(),
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
  listAccessible: oc
    .route({ method: "GET", path: "/connections/accessible" })
    .output(z.object({ connections: z.array(connectionSummary) })),
  getAccessible: oc
    .route({ method: "GET", path: "/connections/{id}/accessible" })
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        connection: z.object({
          id: z.string().uuid(),
          name: z.string(),
          url: z.string(),
          bootstrap_status: bootstrapStatus,
        }),
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
  getAnonKey: oc
    .route({ method: "GET", path: "/connections/{id}/anon-key" })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ anonKey: z.string() })),
  schemaSync: oc
    .route({ method: "POST", path: "/connections/{id}/schema-sync" })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.literal(true), tableCount: z.number() })),
  bootstrap: oc.router({
    probe: oc
      .route({ method: "POST", path: "/connections/{id}/bootstrap/probe" })
      .input(z.object({ id: z.string().uuid() }))
      .output(
        z.object({
          status: bootstrapStatus,
          setupSql: z.string().optional(),
        }),
      ),
    apply: oc
      .route({ method: "POST", path: "/connections/{id}/bootstrap/apply" })
      .input(z.object({ id: z.string().uuid() }))
      .output(z.object({ success: z.literal(true), status: bootstrapStatus })),
    verify: oc
      .route({ method: "POST", path: "/connections/{id}/bootstrap/verify" })
      .input(z.object({ id: z.string().uuid() }))
      .output(
        z.object({
          success: z.literal(true),
          status: bootstrapStatus,
        }),
      ),
  }),
  onboarding: oc.router({
    status: oc
      .route({ method: "GET", path: "/connections/{id}/onboarding" })
      .input(z.object({ id: z.string().uuid() }))
      .output(
        z.object({
          steps: z.object({
            bootstrap: z.boolean(),
            schemaSynced: z.boolean(),
            rolesConfigured: z.boolean(),
            usersProvisioned: z.boolean(),
          }),
          complete: z.boolean(),
        }),
      ),
  }),
  target: oc.router({
    syncPermissions: oc
      .route({
        method: "POST",
        path: "/connections/{connectionId}/target/sync-permissions",
      })
      .input(
        z.object({
          connectionId: z.string().uuid(),
          targetEmail: z.string().email(),
        }),
      )
      .output(
        z.object({
          success: z.literal(true),
          targetUserId: z.string().uuid(),
        }),
      ),
  }),
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
  getPermissions: oc
    .route({ method: "GET", path: "/roles/permissions" })
    .input(
      z.object({
        roleId: z.string().uuid(),
        connectionId: z.string().uuid(),
      }),
    )
    .output(z.object({ permissions: z.array(tablePermission) })),
  updatePermissions: oc
    .route({ method: "PUT", path: "/roles/permissions" })
    .input(
      z.object({
        roleId: z.string().uuid(),
        connectionId: z.string().uuid(),
        permissions: z.array(tablePermission),
      }),
    )
    .output(
      z.object({
        success: z.literal(true),
        rlsSync: rlsSyncResult,
      }),
    ),
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

export const appContract = oc.router({
  shell: oc.route({ method: "GET", path: "/app/shell" }).output(
    z.object({
      profile,
      connections: z.array(
        z.object({ id: z.string().uuid(), name: z.string() }),
      ),
    }),
  ),
});

export const dashboardContract = oc.router({
  stats: oc.route({ method: "GET", path: "/dashboard/stats" }).output(
    z.object({
      userCount: z.number(),
      roleCount: z.number(),
    }),
  ),
});

export const healthContract = oc.router({
  ping: oc
    .route({ method: "GET", path: "/health/ping" })
    .output(z.object({ ok: z.literal(true) })),
});

export const contract = oc.router({
  setup: setupContract,
  connections: connectionsContract,
  connectionsRls: connectionsRlsContract,
  roles: rolesContract,
  users: usersContract,
  provision: provisionContract,
  app: appContract,
  dashboard: dashboardContract,
  health: healthContract,
});

export type Contract = typeof contract;
