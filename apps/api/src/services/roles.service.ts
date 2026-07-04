import { PrismaClient } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

const prisma = new PrismaClient()

export interface CreateRoleInput {
  name: string
  description?: string
  permissions: string[]
}

export interface UpdateRoleInput {
  name?: string
  description?: string
  permissions?: string[]
}

export class RolesService {
  async getRoles(hotelId: string) {
    return prisma.role.findMany({
      where: { hotelId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
    })
  }

  async getRoleById(hotelId: string, id: string) {
    const role = await prisma.role.findFirst({
      where: { id, hotelId }
    })
    if (!role) throw ApiError.notFound('Jukumu halikupatikana')
    return role
  }

  async createRole(hotelId: string, data: CreateRoleInput) {
    const existing = await prisma.role.findFirst({
      where: { hotelId, name: data.name }
    })
    if (existing) throw ApiError.conflict('Jina la jukumu tayari lipo')

    return prisma.role.create({
      data: {
        hotelId,
        name: data.name,
        description: data.description,
        permissions: data.permissions as any,
        isSystem: false
      }
    })
  }

  async updateRole(hotelId: string, id: string, data: UpdateRoleInput) {
    const role = await prisma.role.findFirst({
      where: { id, hotelId }
    })
    if (!role) throw ApiError.notFound('Jukumu halikupatikana')

    if (role.isSystem) {
      throw ApiError.forbidden('Jukumu la mfumo haliwezi kuhaririwa')
    }

    if (data.name && data.name !== role.name) {
      const existing = await prisma.role.findFirst({
        where: { hotelId, name: data.name, NOT: { id } }
      })
      if (existing) throw ApiError.conflict('Jina la jukumu tayari lipo')
    }

    return prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions !== undefined ? (data.permissions as any) : undefined,
        updatedAt: new Date()
      }
    })
  }

  async deleteRole(hotelId: string, id: string) {
    const role = await prisma.role.findFirst({
      where: { id, hotelId },
      include: { _count: { select: { users: { where: { isActive: true } } } } }
    })
    if (!role) throw ApiError.notFound('Jukumu halikupatikana')

    if (role.isSystem) {
      throw ApiError.forbidden('Jukumu la mfumo haliwezi kufutwa')
    }

    if (role._count.users > 0) {
      throw ApiError.badRequest('Jukumu hili lina watumiaji; hamisha watumiaji kwanza')
    }

    return prisma.role.delete({ where: { id } })
  }
}

export const rolesService = new RolesService()
