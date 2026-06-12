const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MASTER: "MASTER",
  DEALER: "DEALER",
  CLIENT: "CLIENT"
};

const legacyMap = {
  super_admin: ROLES.SUPER_ADMIN,
  master: ROLES.MASTER,
  agent: ROLES.DEALER,
  dealer: ROLES.DEALER,
  client: ROLES.CLIENT
};

const apiRoleMap = {
  SUPER_ADMIN: "super_admin",
  MASTER: "master",
  DEALER: "agent",
  CLIENT: "client"
};

function normalizeRole(role) {
  if (!role) return "";
  const value = String(role).trim();
  return legacyMap[value.toLowerCase()] || value.toUpperCase();
}

function toApiRole(role) {
  return apiRoleMap[normalizeRole(role)] || String(role || "").toLowerCase();
}

function allowedChildRoles(parentRole) {
  const role = normalizeRole(parentRole);
  if (role === ROLES.SUPER_ADMIN) return [ROLES.MASTER];
  if (role === ROLES.MASTER) return [ROLES.DEALER];
  if (role === ROLES.DEALER) return [ROLES.CLIENT];
  return [];
}

function canCreateRole(parentRole, childRole) {
  return allowedChildRoles(parentRole).includes(normalizeRole(childRole));
}

function canTransferTo(fromRole, toRole) {
  return canCreateRole(fromRole, toRole);
}

module.exports = {
  ROLES,
  normalizeRole,
  toApiRole,
  allowedChildRoles,
  canCreateRole,
  canTransferTo
};
