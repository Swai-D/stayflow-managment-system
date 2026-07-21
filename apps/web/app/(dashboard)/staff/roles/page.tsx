'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Plus, Edit2, Trash2, Check, X, Loader2, ChevronRight } from 'lucide-react'
import { PERMISSION_GROUPS, AppPermission, hasPermission } from '@/lib/roles'
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '@/hooks/useRoles'
import { useAuthStore } from '@/store/authStore'
import AuthGuard from '@/components/shared/AuthGuard'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { toast } from 'sonner'

const emptyForm = {
  name: '',
  description: '',
  permissions: [] as AppPermission[],
}

export default function RolesPage() {
  return (
    <AuthGuard allowedPermissions={['settings:manage']}>
      <RolesPageContent />
    </AuthGuard>
  )
}

function RolesPageContent() {
  const { user } = useAuthStore()
  const isAdmin = user?.role?.name === 'admin' || hasPermission(user?.role, 'settings:manage')

  const { data: roles = [], isLoading } = useRoles()
  const { mutate: createRole, isPending: creating } = useCreateRole()
  const { mutate: updateRole, isPending: updating } = useUpdateRole()
  const { mutate: deleteRole, isPending: deleting } = useDeleteRole()

  const [selectedRole, setSelectedRole] = useState<any | null>(null)
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [form, setForm] = useState(emptyForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<any | null>(null)

  const startCreate = () => {
    setSelectedRole(null)
    setForm(emptyForm)
    setMode('create')
  }

  const selectRole = (role: any) => {
    setSelectedRole(role)
    setForm({
      name: role.name || '',
      description: role.description || '',
      permissions: role.permissions || [],
    })
    setMode('view')
  }

  const startEdit = () => {
    if (!selectedRole) return
    setForm({
      name: selectedRole.name || '',
      description: selectedRole.description || '',
      permissions: selectedRole.permissions || [],
    })
    setMode('edit')
  }

  const cancelEdit = () => {
    if (selectedRole) {
      setForm({
        name: selectedRole.name || '',
        description: selectedRole.description || '',
        permissions: selectedRole.permissions || [],
      })
      setMode('view')
    } else {
      setMode('view')
    }
  }

  const togglePermission = (perm: AppPermission) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }))
  }

  const toggleGroup = (permissions: AppPermission[], select: boolean) => {
    setForm(prev => {
      const set = new Set(prev.permissions)
      permissions.forEach(p => {
        if (select) set.add(p)
        else set.delete(p)
      })
      return { ...prev, permissions: Array.from(set) }
    })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Role name is required')
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      permissions: form.permissions,
    }

    if (mode === 'create') {
      createRole(payload, {
        onSuccess: (role) => {
          toast.success('Role created successfully')
          selectRole(role)
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error?.message || 'Failed to create role')
        }
      })
    } else if (mode === 'edit' && selectedRole) {
      updateRole({ id: selectedRole.id, data: payload }, {
        onSuccess: (role) => {
          toast.success('Role updated successfully')
          selectRole(role)
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error?.message || 'Failed to update role')
        }
      })
    }
  }

  const askDelete = (role: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setRoleToDelete(role)
    setConfirmOpen(true)
  }

  const handleDelete = () => {
    if (!roleToDelete) return
    deleteRole(roleToDelete.id, {
      onSuccess: () => {
        toast.success('Role deleted successfully')
        setConfirmOpen(false)
        setRoleToDelete(null)
        if (selectedRole?.id === roleToDelete.id) {
          setSelectedRole(null)
          setMode('view')
        }
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error?.message || 'Failed to delete role')
        setConfirmOpen(false)
      }
    })
  }

  const allPermissions = PERMISSION_GROUPS.flatMap(g => g.permissions)
  const allSelected = allPermissions.every(p => form.permissions.includes(p))

  const canEditSelected = selectedRole && !selectedRole.isSystem && isAdmin

  return (
    <div className="space-y-4 font-sans text-left pb-10 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-[#6b7280]" />
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Roles & Permissions</h1>
            <p className="text-[13px] text-[#9ca3af] font-medium">Create roles and assign permissions from the catalog.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={startCreate}
            className="bg-[#8b4530] hover:bg-[#6e3323] text-white rounded-xl px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100/50"
          >
            <Plus size={16} />
            Create Role
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0">
        {/* LEFT: Roles list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-[#111827]">Roles</h2>
            <p className="text-[11px] text-[#9ca3af]">{roles.length} role{roles.length === 1 ? '' : 's'}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                ))
              : roles.map((role: any) => {
                  const isSelected = selectedRole?.id === role.id
                  return (
                    <button
                      key={role.id}
                      onClick={() => selectRole(role)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-[#111827]">{role.name}</span>
                            {role.isSystem && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">
                                System
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6b7280] mt-0.5 line-clamp-1">
                            {role.description || `${role.permissions?.length || 0} permissions`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!role.isSystem && isAdmin && (
                            <>
                              <span
                                onClick={(e) => askDelete(role, e)}
                                className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                                title="Delete role"
                              >
                                <Trash2 size={13} />
                              </span>
                            </>
                          )}
                          <ChevronRight size={14} className={`text-[#9ca3af] transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </button>
                  )
                })}
            {!isLoading && roles.length === 0 && (
              <div className="text-center py-10 text-[#9ca3af] text-[12px]">
                No roles found.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Permissions catalog / editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
          {mode === 'view' && !selectedRole ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-[#9ca3af]">
              <Shield size={48} className="mb-4 text-[#d1d5db]" />
              <p className="text-[15px] font-bold text-[#111827]">Select a role to view permissions</p>
              <p className="text-[12px] mt-1 max-w-sm">Click a role on the left to see its permissions, or click Create Role to build a new role.</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  {mode === 'create' ? (
                    <h2 className="text-[15px] font-bold text-[#111827]">Create New Role</h2>
                  ) : mode === 'edit' ? (
                    <h2 className="text-[15px] font-bold text-[#111827]">Edit Role</h2>
                  ) : (
                    <h2 className="text-[15px] font-bold text-[#111827]">{selectedRole?.name}</h2>
                  )}
                  <p className="text-[11px] text-[#9ca3af]">
                    {mode === 'view'
                      ? `${selectedRole?.permissions?.length || 0} permission${selectedRole?.permissions?.length === 1 ? '' : 's'} assigned`
                      : 'Assign permissions from the catalog below'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {mode === 'view' && canEditSelected && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="h-9 px-3 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-bold flex items-center gap-1.5 hover:bg-blue-100"
                    >
                      <Edit2 size={13} />
                      Edit
                    </button>
                  )}
                  {(mode === 'create' || mode === 'edit') && (
                    <>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="h-9 px-3 rounded-lg border border-gray-200 text-[#6b7280] text-[12px] font-bold hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creating || updating}
                        className="h-9 px-4 rounded-lg bg-[#8b4530] text-white text-[12px] font-bold hover:bg-[#6e3323] disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {creating || updating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        {mode === 'create' ? 'Create Role' : 'Update Role'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {(mode === 'create' || mode === 'edit') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-[#6b7280] uppercase">Role Name *</label>
                      <input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                        placeholder="e.g. Floor Manager"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#6b7280] uppercase">Description</label>
                      <input
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                        placeholder="Short description"
                      />
                    </div>
                  </div>
                )}

                {mode === 'view' && selectedRole && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-[#9ca3af] uppercase">Role Name</span>
                      <p className="text-[13px] font-bold text-[#111827] mt-0.5">{selectedRole.name}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-[#9ca3af] uppercase">Description</span>
                      <p className="text-[13px] text-[#111827] mt-0.5">{selectedRole.description || '—'}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-[13px] font-bold text-[#111827]">Permissions Catalog</h3>
                  {(mode === 'create' || mode === 'edit') && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(allPermissions as AppPermission[], !allSelected)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PERMISSION_GROUPS.map(group => {
                    const groupSelected = group.permissions.every(p => form.permissions.includes(p))
                    const isEditing = mode === 'create' || mode === 'edit'
                    return (
                      <div key={group.label} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">{group.label}</h4>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.permissions, !groupSelected)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                            >
                              {groupSelected ? 'Deselect' : 'Select All'}
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {group.permissions.map(perm => {
                            const allowed = form.permissions.includes(perm)
                            return (
                              <label
                                key={perm}
                                className={`flex items-center gap-2 text-[12px] ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                {isEditing ? (
                                  <input
                                    type="checkbox"
                                    checked={allowed}
                                    onChange={() => togglePermission(perm)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className={`w-4 h-4 flex items-center justify-center rounded ${allowed ? 'text-green-600' : 'text-gray-300'}`}>
                                    {allowed ? <Check size={14} /> : <X size={14} />}
                                  </span>
                                )}
                                <span className={allowed ? 'text-[#111827] font-medium' : 'text-gray-400'}>
                                  {perm.split(':').join(' ')}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Role"
        description={roleToDelete ? `Are you sure you want to delete the role "${roleToDelete.name}"? This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isPending={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setRoleToDelete(null)
        }}
      />
    </div>
  )
}
