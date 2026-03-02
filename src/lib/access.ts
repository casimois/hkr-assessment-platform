import { Profile, Project, UserRole } from './supabase'

/**
 * Returns project IDs accessible to a user based on their role and assignments.
 * - Super Admin / Admin: all projects
 * - User: only projects matching their assigned teams or clients
 */
export function getAccessibleProjectIds(
  projects: Project[],
  profile: Profile | null
): string[] {
  if (!profile) return []

  if (profile.role === 'super_admin' || profile.role === 'admin') {
    return projects.map(p => p.id)
  }

  // 'user' role: filter by assigned teams/clients
  return projects
    .filter(p =>
      (p.team && profile.assigned_teams.includes(p.team)) ||
      (p.client && profile.assigned_clients.includes(p.client))
    )
    .map(p => p.id)
}

/**
 * Check if a user can access a specific project.
 */
export function canAccessProject(
  project: Project,
  profile: Profile | null
): boolean {
  if (!profile) return false
  if (profile.role === 'super_admin' || profile.role === 'admin') return true

  return (
    (!!project.team && profile.assigned_teams.includes(project.team)) ||
    (!!project.client && profile.assigned_clients.includes(project.client))
  )
}

/**
 * Check if user has at least the required role level.
 */
export function hasMinRole(userRole: UserRole | undefined, minRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    user: 0,
    admin: 1,
    super_admin: 2,
  }
  if (!userRole) return false
  return hierarchy[userRole] >= hierarchy[minRole]
}
