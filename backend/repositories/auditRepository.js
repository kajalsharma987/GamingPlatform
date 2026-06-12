async function logAdminAction(
  connection,
  { adminId, targetUserId, action, entityType, entityId, oldValue, newValue, ip, browser }
) {
  await connection.query(
    `INSERT INTO admin_audit_logs
      (admin_id, target_user_id, action, entity_type, entity_id, old_value, new_value, ip, browser)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId || null,
      targetUserId || null,
      action,
      entityType || null,
      entityId || null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ip || null,
      browser || null
    ]
  );
}

module.exports = {
  logAdminAction
};
